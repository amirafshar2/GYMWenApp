using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GymPlatform.Business.Common;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GymPlatform.Business.Services.Access;

// ---- قراردادهای API گیت (نسخهٔ ۱). سازندهٔ گیت فقط همین‌ها را لازم دارد. ----
/// <param name="Credential">مقدار خوانده‌شده: UID دستبند/کارت RFID یا متن QR کارت عضویت (KG1:...)</param>
/// <param name="EventId">شناسهٔ یکتای رویداد از طرف دستگاه (اختیاری؛ برای جلوگیری از ثبت دوباره)</param>
/// <param name="OccurredAtUtc">زمان واقعی زدن کارت (برای رویدادهای آفلاین)؛ خالی یعنی همین الان</param>
public sealed record AccessCheckRequest(string Credential, string? EventId = null, DateTime? OccurredAtUtc = null);

public sealed record AccessCheckResult(
    bool Allowed, string Reason, string Message, string? MemberFirstName, int? DaysLeft, int? SessionsLeft, bool SessionCounted);

public sealed record WhitelistEntry(string Credential, string Type, int MemberId, DateTime ValidUntilUtc, int? SessionsLeft);
public sealed record WhitelistDto(DateTime GeneratedAtUtc, string Branch, string Section, IReadOnlyList<WhitelistEntry> Entries);
public sealed record DeviceInfo(int Id, string Name, int BranchId, GenderSection Section);

public sealed record AssignCredentialRequest(string Type, string Value, string? Label, string? ExternalRef);
public sealed record CredentialDto(int Id, string Type, string ValueHint, string? Label, string? ExternalRef, DateTime CreatedAtUtc, bool IsActive);

public sealed class AccessOptions
{
    public const string Section = "Access";
    /// <summary>عضویت یک شعبه در شعبه‌های دیگر هم معتبر باشد؟ (سیاست باشگاه)</summary>
    public bool AllowAllBranches { get; set; }
    /// <summary>کلید گیت نمایشی؛ فقط در محیط غیر production ساخته می‌شود.</summary>
    public string? DemoDeviceKey { get; set; }
}

public interface IAccessControlService
{
    Task<DeviceInfo?> AuthenticateDeviceAsync(string? rawKey, CancellationToken ct);
    Task<AccessCheckResult> CheckAsync(DeviceInfo device, AccessCheckRequest request, CancellationToken ct);
    Task<WhitelistDto> WhitelistAsync(DeviceInfo device, CancellationToken ct);
    Task<Result<CredentialDto>> AssignAsync(int userId, AssignCredentialRequest request, int staffUserId, CancellationToken ct);
    Task<bool> RevokeAsync(int userId, int credentialId, CancellationToken ct);
    Task<IReadOnlyList<CredentialDto>> ListAsync(int userId, CancellationToken ct);
    Task EnsureDemoDeviceAsync(string rawKey, CancellationToken ct);
    /// <summary>«دستگاه» مجازی پذیرش هر شعبه (اسکن QR با دوربین/اسکنر پشت پیشخوان)</summary>
    Task<DeviceInfo> ReceptionDeviceAsync(int branchId, CancellationToken ct);
    static string HashKey(string raw) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}

/// <summary>
/// تصمیم ورود سمت سرور: وسیلهٔ ورود ← عضو ← عضویت فعال در همین شعبه و سالن ← جلسهٔ باقی‌مانده.
/// هر زدن کارت ثبت می‌شود؛ در پکیج‌های جلسه‌ای، روزی یک جلسه کم می‌شود (ورود دوباره در همان روز رایگان است).
/// </summary>
public sealed class AccessControlService(GymDbContext db, IClock clock, IOptions<AccessOptions> options) : IAccessControlService
{
    public const string QrPrefix = "KG1:";

    public async Task<DeviceInfo?> AuthenticateDeviceAsync(string? rawKey, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(rawKey) || rawKey.Length is < 16 or > 200) return null;
        var hash = IAccessControlService.HashKey(rawKey.Trim());
        var d = await db.AccessDevices.FirstOrDefaultAsync(x => x.KeyHash == hash && x.IsActive, ct);
        if (d is null) return null;
        // ثبت «آخرین تماس» حداکثر هر دقیقه یک‌بار تا هر زدن کارت یک نوشتن اضافه نداشته باشد
        if (d.LastSeenAtUtc is null || clock.UtcNow - d.LastSeenAtUtc > TimeSpan.FromMinutes(1))
        {
            d.LastSeenAtUtc = clock.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        return new DeviceInfo(d.Id, d.Name, d.BranchId, d.Section);
    }

    public static string Normalize(string raw)
    {
        var s = PersianText.ToLatinDigits(raw).Trim();
        if (s.StartsWith(QrPrefix, StringComparison.OrdinalIgnoreCase)) return QrPrefix + s[QrPrefix.Length..].Trim().ToUpperInvariant();
        return new string(s.Where(c => c is not (' ' or ':' or '-')).ToArray()).ToUpperInvariant();
    }

    public async Task<AccessCheckResult> CheckAsync(DeviceInfo device, AccessCheckRequest request, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var at = request.OccurredAtUtc is { } t && t <= now.AddMinutes(5) && t > now.AddDays(-7) ? DateTime.SpecifyKind(t, DateTimeKind.Utc) : now;
        var eventId = string.IsNullOrWhiteSpace(request.EventId) ? null : request.EventId.Trim()[..Math.Min(64, request.EventId.Trim().Length)];

        // همان رویداد دوباره رسید (قطعی شبکه و ارسال مجدد): همان نتیجهٔ قبلی
        if (eventId is not null)
        {
            var prev = await db.CheckIns.AsNoTracking().FirstOrDefaultAsync(c => c.DeviceId == device.Id && c.ExternalEventId == eventId, ct);
            if (prev is not null) return Replay(prev);
        }

        var value = Normalize(request.Credential ?? "");
        var hint = value.Length <= 4 ? value : value[^4..];
        int? userId = null;
        var type = CredentialType.RfidWristband;
        var reason = AccessDenyReason.None;

        if (value.StartsWith(QrPrefix))
        {
            type = CredentialType.QrCard;
            var token = value[QrPrefix.Length..];
            userId = await db.Memberships.Where(m => m.CardToken == token && m.Status != MembershipStatus.PendingPayment)
                .Select(m => (int?)m.UserId).FirstOrDefaultAsync(ct);
            if (userId is null) reason = AccessDenyReason.UnknownCredential;
        }
        else
        {
            var cred = value.Length is >= 4 and <= 64
                ? await db.AccessCredentials.Where(c => c.Value == value && c.Type != CredentialType.QrCard)
                    .OrderBy(c => c.RevokedAtUtc != null).FirstOrDefaultAsync(ct)
                : null;
            if (cred is null) reason = AccessDenyReason.UnknownCredential;
            else if (!cred.IsActive) { reason = AccessDenyReason.CredentialRevoked; userId = cred.UserId; type = cred.Type; }
            else { userId = cred.UserId; type = cred.Type; }
        }

        Membership? membership = null;
        string? firstName = null;
        if (reason == AccessDenyReason.None && userId is not null)
        {
            firstName = (await db.Users.Where(u => u.Id == userId).Select(u => u.FullName).FirstOrDefaultAsync(ct))?.Split(' ')[0];
            var active = await db.Memberships.Include(m => m.Branch)
                .Where(m => m.UserId == userId && m.Status == MembershipStatus.Active && m.StartsAtUtc <= at && m.EndsAtUtc > at)
                .OrderBy(m => m.EndsAtUtc).ToListAsync(ct);
            if (active.Count == 0) reason = AccessDenyReason.NoActiveMembership;
            else
            {
                var inBranch = options.Value.AllowAllBranches ? active : active.Where(m => m.BranchId == device.BranchId).ToList();
                if (inBranch.Count == 0) reason = AccessDenyReason.WrongBranch;
                else
                {
                    var inSection = inBranch.Where(m => device.Section == GenderSection.Both || device.Section.HasFlag(m.Section)).ToList();
                    if (inSection.Count == 0) reason = AccessDenyReason.WrongSection;
                    else membership = inSection.FirstOrDefault(m => m.SessionsTotal is null || m.SessionsUsed < m.SessionsTotal) ?? inSection[0];
                }
            }
        }

        // پکیج جلسه‌ای: اولین ورود هر روز (به وقت تهران) یک جلسه کم می‌کند
        var counted = false;
        if (reason == AccessDenyReason.None && membership!.SessionsTotal is { } total)
        {
            var dayStart = Jalali.TehranDayStartUtc(at);
            var alreadyToday = await db.CheckIns.AnyAsync(c => c.MembershipId == membership.Id && c.SessionCounted &&
                                                             c.OccurredAtUtc >= dayStart && c.OccurredAtUtc < dayStart.AddDays(1), ct);
            if (!alreadyToday)
            {
                if (membership.SessionsUsed >= total) reason = AccessDenyReason.NoSessionsLeft;
                else { membership.SessionsUsed++; counted = true; }
            }
        }

        var allowed = reason == AccessDenyReason.None;
        var checkIn = new CheckIn
        {
            DeviceId = device.Id, BranchId = device.BranchId, UserId = userId, MembershipId = membership?.Id,
            CredentialType = type, CredentialHint = hint, Decision = allowed ? AccessDecision.Allowed : AccessDecision.Denied,
            Reason = reason, SessionCounted = counted, OccurredAtUtc = at, ExternalEventId = eventId, CreatedAtUtc = now,
        };
        db.CheckIns.Add(checkIn);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) when (eventId is not null)
        {
            // دو ارسال هم‌زمانِ یک رویداد
            db.ChangeTracker.Clear();
            var prev = await db.CheckIns.AsNoTracking().FirstAsync(c => c.DeviceId == device.Id && c.ExternalEventId == eventId, ct);
            return Replay(prev);
        }

        return Result(allowed, reason, firstName, membership, at, counted);
    }

    private AccessCheckResult Replay(CheckIn c)
    {
        var m = c.MembershipId is null ? null : db.Memberships.AsNoTracking().FirstOrDefault(x => x.Id == c.MembershipId);
        var name = c.UserId is null ? null : db.Users.Where(u => u.Id == c.UserId).Select(u => u.FullName).FirstOrDefault()?.Split(' ')[0];
        return Result(c.Decision == AccessDecision.Allowed, c.Reason, name, m, c.OccurredAtUtc, c.SessionCounted);
    }

    private static AccessCheckResult Result(bool allowed, AccessDenyReason reason, string? name, Membership? m, DateTime at, bool counted)
    {
        int? daysLeft = m?.EndsAtUtc is { } end ? Math.Max(0, (int)Math.Ceiling((end - at).TotalDays)) : null;
        int? sessionsLeft = m?.SessionsTotal is { } t ? Math.Max(0, t - m.SessionsUsed) : null;
        var msg = reason switch
        {
            AccessDenyReason.None => name is null ? "خوش آمدید" : $"خوش آمدی {name}",
            AccessDenyReason.UnknownCredential => "این کارت/دستبند ثبت نشده است. به پذیرش مراجعه کنید.",
            AccessDenyReason.CredentialRevoked => "این کارت/دستبند غیرفعال شده است.",
            AccessDenyReason.NoActiveMembership => "عضویت فعال ندارید. برای تمدید به پذیرش یا سایت مراجعه کنید.",
            AccessDenyReason.WrongBranch => "عضویت شما مربوط به شعبهٔ دیگری است.",
            AccessDenyReason.WrongSection => "این ورودی مربوط به سالن دیگری است.",
            AccessDenyReason.NoSessionsLeft => "جلسات پکیج شما تمام شده است.",
            _ => "ورود مجاز نیست.",
        };
        var code = reason == AccessDenyReason.None ? "ok" : JsonNamingPolicy.SnakeCaseLower.ConvertName(reason.ToString());
        return new AccessCheckResult(allowed, code, msg, name, daysLeft, sessionsLeft, counted);
    }

    /// <summary>فهرست سفید برای گیت‌هایی که آفلاین تصمیم می‌گیرند (هر چند دقیقه یک‌بار دریافت کنند).</summary>
    public async Task<WhitelistDto> WhitelistAsync(DeviceInfo device, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var q = db.Memberships.AsNoTracking()
            .Where(m => m.Status == MembershipStatus.Active && m.StartsAtUtc <= now && m.EndsAtUtc > now &&
                        (m.SessionsTotal == null || m.SessionsUsed < m.SessionsTotal));
        if (!options.Value.AllowAllBranches) q = q.Where(m => m.BranchId == device.BranchId);
        var ms = await q.Select(m => new { m.UserId, m.CardToken, m.Section, m.EndsAtUtc, m.SessionsTotal, m.SessionsUsed }).ToListAsync(ct);
        ms = ms.Where(m => device.Section == GenderSection.Both || device.Section.HasFlag(m.Section)).ToList();

        var users = ms.Select(m => m.UserId).Distinct().ToList();
        var creds = await db.AccessCredentials.AsNoTracking()
            .Where(c => users.Contains(c.UserId) && c.RevokedAtUtc == null && c.Type != CredentialType.QrCard)
            .Select(c => new { c.UserId, c.Value, c.Type }).ToListAsync(ct);

        var entries = new List<WhitelistEntry>();
        foreach (var g in ms.GroupBy(m => m.UserId))
        {
            var until = g.Max(m => m.EndsAtUtc!.Value);
            var left = g.Any(m => m.SessionsTotal is null) ? (int?)null : g.Sum(m => m.SessionsTotal!.Value - m.SessionsUsed);
            entries.AddRange(g.Select(m => new WhitelistEntry(QrPrefix + m.CardToken, "qr", g.Key, until, left)));
            entries.AddRange(creds.Where(c => c.UserId == g.Key)
                .Select(c => new WhitelistEntry(c.Value, TypeName(c.Type), g.Key, until, left)));
        }
        var branch = await db.Branches.Where(b => b.Id == device.BranchId).Select(b => b.Slug).FirstAsync(ct);
        return new WhitelistDto(now, branch, device.Section.ToString().ToLowerInvariant(), entries);
    }

    public static string TypeName(CredentialType t) => t switch
    {
        CredentialType.QrCard => "qr", CredentialType.RfidWristband => "wristband", CredentialType.RfidCard => "card", _ => "external",
    };

    private static CredentialType? ParseType(string? s) => s?.ToLowerInvariant() switch
    {
        "wristband" => CredentialType.RfidWristband, "card" => CredentialType.RfidCard, "external" => CredentialType.External, _ => null,
    };

    public async Task<Result<CredentialDto>> AssignAsync(int userId, AssignCredentialRequest request, int staffUserId, CancellationToken ct)
    {
        var type = ParseType(request.Type);
        if (type is null) return Result<CredentialDto>.Fail("type", "نوع باید wristband، card یا external باشد.");
        var value = Normalize(request.Value ?? "");
        if (value.Length is < 4 or > 64 || value.StartsWith(QrPrefix) || !value.All(char.IsAsciiLetterOrDigit))
            return Result<CredentialDto>.Fail("value", "شناسهٔ دستبند/کارت معتبر نیست (۴ تا ۶۴ حرف یا رقم لاتین).");
        if (!await db.Users.AnyAsync(u => u.Id == userId, ct))
            return Result<CredentialDto>.Fail("user", "عضو پیدا نشد.", ErrorType.NotFound);
        if (await db.AccessCredentials.AnyAsync(c => c.Value == value && c.RevokedAtUtc == null, ct))
            return Result<CredentialDto>.Fail("value", "این دستبند/کارت به عضو دیگری داده شده است. اول آن را غیرفعال کنید.", ErrorType.Conflict);

        var label = PersianText.CleanText(request.Label);
        var extRef = request.ExternalRef?.Trim();
        var c = new AccessCredential
        {
            UserId = userId, Type = type.Value, Value = value, Label = label?.Length > 60 ? label[..60] : label,
            ExternalRef = string.IsNullOrEmpty(extRef) ? null : extRef.Length > 64 ? extRef[..64] : extRef,
            IssuedByUserId = staffUserId, CreatedAtUtc = clock.UtcNow,
        };
        db.AccessCredentials.Add(c);
        db.AuditLogs.Add(new AuditLog { Action = "access.credential_assigned", EntityType = "User", EntityId = userId.ToString(), UserId = staffUserId, Data = $"type={TypeName(c.Type)};hint={value[^4..]}" });
        IntegrationEvents.Add(db, "credential.assigned", new { memberId = userId, type = TypeName(c.Type), credential = value, externalRef = c.ExternalRef });
        await db.SaveChangesAsync(ct);
        return Result<CredentialDto>.Ok(ToDto(c));
    }

    public async Task<bool> RevokeAsync(int userId, int credentialId, CancellationToken ct)
    {
        var c = await db.AccessCredentials.FirstOrDefaultAsync(x => x.Id == credentialId && x.UserId == userId, ct);
        if (c is null) return false;
        if (c.RevokedAtUtc is null)
        {
            c.RevokedAtUtc = clock.UtcNow;
            IntegrationEvents.Add(db, "credential.revoked", new { memberId = userId, type = TypeName(c.Type), credential = c.Value, externalRef = c.ExternalRef });
            await db.SaveChangesAsync(ct);
        }
        return true;
    }

    public async Task<IReadOnlyList<CredentialDto>> ListAsync(int userId, CancellationToken ct) =>
        (await db.AccessCredentials.AsNoTracking().Where(c => c.UserId == userId).OrderByDescending(c => c.Id).ToListAsync(ct)).Select(ToDto).ToList();

    private static CredentialDto ToDto(AccessCredential c) =>
        new(c.Id, TypeName(c.Type), "…" + (c.Value.Length > 4 ? c.Value[^4..] : c.Value), c.Label, c.ExternalRef, c.CreatedAtUtc, c.IsActive);

    public async Task<DeviceInfo> ReceptionDeviceAsync(int branchId, CancellationToken ct)
    {
        var d = await db.AccessDevices.FirstOrDefaultAsync(x => x.BranchId == branchId && x.Vendor == "reception", ct);
        if (d is null)
        {
            // کلید تصادفی که هیچ‌جا استفاده نمی‌شود: این دستگاه فقط از داخل پنل پذیرش (با ورود کارمند) صدا زده می‌شود
            d = new AccessDevice { Name = "پذیرش", BranchId = branchId, Section = GenderSection.Both, Vendor = "reception",
                KeyHash = IAccessControlService.HashKey(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))) };
            db.AccessDevices.Add(d);
            await db.SaveChangesAsync(ct);
        }
        return new DeviceInfo(d.Id, d.Name, d.BranchId, d.Section);
    }

    public async Task EnsureDemoDeviceAsync(string rawKey, CancellationToken ct)
    {
        var hash = IAccessControlService.HashKey(rawKey.Trim());
        if (await db.AccessDevices.AnyAsync(d => d.KeyHash == hash, ct)) return;
        var branch = await db.Branches.OrderBy(b => b.Id).FirstOrDefaultAsync(ct);
        if (branch is null) return;
        db.AccessDevices.Add(new AccessDevice { Name = "گیت نمایشی", BranchId = branch.Id, Section = GenderSection.Both, KeyHash = hash, Vendor = "demo" });
        await db.SaveChangesAsync(ct);
    }
}

/// <summary>ثبت رویداد در صف خروجی؛ همراه همان SaveChanges/تراکنش صاحب رویداد ذخیره می‌شود.</summary>
public static class IntegrationEvents
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static void Add(GymDbContext db, string type, object payload) =>
        db.IntegrationEvents.Add(new IntegrationEvent { Type = type, Payload = JsonSerializer.Serialize(payload, Json) });
}
