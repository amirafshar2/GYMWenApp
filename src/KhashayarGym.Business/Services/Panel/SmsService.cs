using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace KhashayarGym.Business.Services.Panel;

public sealed class SmsOptions
{
    public const string Section = "Sms";
    /// <summary>نام الگوها در پنل سامانهٔ پیامک (کاوه‌نگار: Verify Lookup). هر الگو ۳ توکن می‌گیرد.</summary>
    public string WelcomeTemplate { get; set; } = "khashayar-welcome";
    public string RenewTemplate { get; set; } = "khashayar-renew";
    public string BirthdayTemplate { get; set; } = "khashayar-birthday";
    public string CampaignTemplate { get; set; } = "khashayar-campaign";
    /// <summary>پیامک‌های یادآوری/تبلیغی فقط در این بازه (ساعت تهران) ارسال می‌شوند.</summary>
    public int QuietBeforeHour { get; set; } = 9;
    public int QuietAfterHour { get; set; } = 21;
    public int MaxAttempts { get; set; } = 3;
    public int BirthdayDiscountPercent { get; set; } = 20;
}

/// <summary>متن پیامک‌ها. سامانهٔ واقعی فقط نام الگو و توکن‌ها را می‌گیرد؛ Preview برای گزارش پنل است.</summary>
public static class SmsTexts
{
    /// <summary>آدرس سایت در پیامک‌ها (از تنظیم Sms:SiteUrl، مثلاً example.ir/join). تا دامنه تعیین نشده، متن عمومی.</summary>
    public static string Site { get; set; } = "سایت باشگاه";

    public static string Token(string? s) => string.IsNullOrWhiteSpace(s) ? "عضو" : s.Trim().Replace(' ', '‌');

    public static string Welcome(string name, string branch, string until, bool renewal) => renewal
        ? $"{name} عزیز، عضویتت در خشایار {branch} تمدید شد و تا {until} اعتبار دارد. ممنون که همراه ما هستی."
        : $"{name} عزیز، به باشگاه خشایار {branch} خوش آمدی! عضویتت تا {until} فعال است. کارت ورود در پروفایلت است.";
    public static string Renew(string name, int days, string date) => days <= 1
        ? $"{name} عزیز، عضویتت در خشایار فردا ({date}) تمام می‌شود. برای تمدید: {Site}"
        : $"{name} عزیز، {PersianText.FaDigits(days.ToString())} روز دیگر ({date}) عضویتت در خشایار تمام می‌شود. تمدید آنلاین: {Site}";
    public static string Birthday(string name, string code, int percent) =>
        $"{name} عزیز، تولدت مبارک! هدیهٔ خشایار: کد {code} با {PersianText.FaDigits(percent.ToString())}٪ تخفیف شاپ تا یک هفته.";
    public static string Campaign(string name, string title, string offer, string until) =>
        $"{name} عزیز، دلمان برایت تنگ شده! {title}: {offer} تا {until}. {Site} لغو11";
}

public interface ISmsService
{
    /// <summary>اضافه به صف (بدون SaveChanges)؛ تکراری بودن با DedupeKey کنترل می‌شود.</summary>
    Task<bool> EnqueueAsync(int? userId, string phone, SmsKind kind, string template, IReadOnlyList<string> tokens, string preview, string dedupeKey, int? campaignId, CancellationToken ct);
    /// <summary>یادآوری‌های ۷ و ۱ روز مانده و تبریک تولد امروز را در صف می‌گذارد.</summary>
    Task<int> ScheduleDueAsync(CancellationToken ct);
    /// <summary>ارسال صف. پیامک‌های غیرفوری خارج از ساعت مجاز می‌مانند.</summary>
    Task<int> DispatchAsync(int batch, CancellationToken ct);
    Task<Result<CampaignAudienceDto>> CampaignAudienceAsync(StaffScope scope, int campaignId, CancellationToken ct);
    Task<Result<CampaignAudienceDto>> SendCampaignAsync(StaffScope scope, int campaignId, CancellationToken ct);
    Task<SmsStatsDto> StatsAsync(string? kind, CancellationToken ct);
}

public sealed class SmsService(GymDbContext db, ISmsSender sender, IClock clock, IOptions<SmsOptions> options, ILogger<SmsService> logger) : ISmsService
{
    private static readonly PersianCalendar Pc = new();
    private static readonly MembershipStatus[] Paid = [MembershipStatus.Active, MembershipStatus.Expired];
    private SmsOptions O => options.Value;

    /// <summary>نسخهٔ ایستا برای استفاده درون تراکنش‌های دیگر (مثل فعال شدن عضویت).</summary>
    public static void Add(GymDbContext db, int? userId, string phone, SmsKind kind, string template, IReadOnlyList<string> tokens, string preview, string dedupeKey, int? campaignId = null) =>
        db.SmsMessages.Add(new SmsMessage
        {
            UserId = userId, Phone = phone, Kind = kind, Template = template, TokensJson = JsonSerializer.Serialize(tokens),
            Preview = preview, DedupeKey = dedupeKey, CampaignId = campaignId,
        });

    public async Task<bool> EnqueueAsync(int? userId, string phone, SmsKind kind, string template, IReadOnlyList<string> tokens, string preview, string dedupeKey, int? campaignId, CancellationToken ct)
    {
        if (await db.SmsMessages.AnyAsync(s => s.DedupeKey == dedupeKey, ct) || db.SmsMessages.Local.Any(s => s.DedupeKey == dedupeKey)) return false;
        Add(db, userId, phone, kind, template, tokens, preview, dedupeKey, campaignId);
        return true;
    }

    public async Task<int> ScheduleDueAsync(CancellationToken ct)
    {
        var now = clock.UtcNow;
        var today = Jalali.TehranDayStartUtc(now);
        var added = 0;

        // ---- یادآوری پایان عضویت: آخرین عضویت هر نفر که ۷ یا ۱ روز دیگر تمام می‌شود
        foreach (var days in new[] { 7, 1 })
        {
            var from = today.AddDays(days); var to = from.AddDays(1);
            var due = await db.Memberships.AsNoTracking().Where(m => m.Status == MembershipStatus.Active && m.EndsAtUtc >= from && m.EndsAtUtc < to)
                .Where(m => !db.Memberships.Any(n => n.UserId == m.UserId && n.Id != m.Id && n.Status == MembershipStatus.Active && n.EndsAtUtc > m.EndsAtUtc))
                .Select(m => new { m.Id, m.UserId, m.EndsAtUtc, m.User!.FullName, m.User.PhoneNumber }).ToListAsync(ct);
            foreach (var m in due.Where(m => m.PhoneNumber is not null))
            {
                var name = SmsTexts.Token(FirstName(m.FullName)); var date = Jalali.Date(m.EndsAtUtc!.Value);
                if (await EnqueueAsync(m.UserId, m.PhoneNumber!, days == 7 ? SmsKind.Reminder7 : SmsKind.Reminder1, O.RenewTemplate,
                        [name, PersianText.FaDigits(days.ToString()), date], SmsTexts.Renew(name, days, date), $"r{days}:{m.Id}", null, ct)) added++;
            }
        }

        // ---- تولد (بر اساس روز و ماه شمسی، چون ایرانی‌ها تولد شمسی جشن می‌گیرند)
        var t = Jalali.ToTehran(now);
        var (jm, jd, jy) = (Pc.GetMonth(t), Pc.GetDayOfMonth(t), Pc.GetYear(t));
        var withBirth = await db.Users.AsNoTracking().Where(u => u.BirthDate != null && u.PhoneNumber != null)
            .Select(u => new { u.Id, u.FullName, u.PhoneNumber, u.BirthDate }).ToListAsync(ct);
        foreach (var u in withBirth)
        {
            var b = u.BirthDate!.Value.ToDateTime(TimeOnly.MinValue);
            if (Pc.GetMonth(b) != jm || Pc.GetDayOfMonth(b) != jd) continue;
            var key = $"bd:{u.Id}:{jy}";
            if (await db.SmsMessages.AnyAsync(s => s.DedupeKey == key, ct)) continue;
            // هدیه: کد یک‌بارمصرف شخصی شاپ
            var code = "BD" + RandomNumberGenerator.GetString("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
            db.DiscountCodes.Add(new DiscountCode { Code = code, Percent = O.BirthdayDiscountPercent, MaxUses = 1, ExpiresAtUtc = today.AddDays(8), IsActive = true, Scope = DiscountScope.Shop, MembersOnly = true });
            var name = SmsTexts.Token(FirstName(u.FullName));
            if (await EnqueueAsync(u.Id, u.PhoneNumber!, SmsKind.Birthday, O.BirthdayTemplate, [name, code, PersianText.FaDigits(O.BirthdayDiscountPercent.ToString())],
                    SmsTexts.Birthday(name, code, O.BirthdayDiscountPercent), key, null, ct)) added++;
        }
        await db.SaveChangesAsync(ct);
        if (added > 0) logger.LogInformation("Scheduled {Count} SMS (reminders/birthdays)", added);
        return added;
    }

    public async Task<int> DispatchAsync(int batch, CancellationToken ct)
    {
        var hour = Jalali.ToTehran(clock.UtcNow).Hour;
        var quiet = hour < O.QuietBeforeHour || hour >= O.QuietAfterHour;
        var q = db.SmsMessages.Where(s => s.Status == SmsStatus.Queued && s.Attempts < O.MaxAttempts);
        if (quiet) q = q.Where(s => s.Kind == SmsKind.Welcome); // خوش‌آمد بلافاصله؛ بقیه صبح
        var list = await q.OrderBy(s => s.Id).Take(batch).ToListAsync(ct);
        var sent = 0;
        foreach (var s in list)
        {
            s.Attempts++;
            try
            {
                var tokens = JsonSerializer.Deserialize<List<string>>(s.TokensJson) ?? [];
                await sender.SendTemplateAsync(s.Phone, s.Template, tokens, s.Preview, ct);
                s.Status = SmsStatus.Sent; s.SentAtUtc = clock.UtcNow; s.Error = null; sent++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                s.Error = ex.Message.Length > 300 ? ex.Message[..300] : ex.Message;
                if (s.Attempts >= O.MaxAttempts) s.Status = SmsStatus.Failed;
                logger.LogWarning(ex, "SMS {Id} attempt {N} failed", s.Id, s.Attempts);
            }
        }
        await db.SaveChangesAsync(ct);
        return sent;
    }

    // ---------------- پیامک جشنواره: فقط اعضای منقضی‌شده‌ای که پیامک تبلیغاتی را قبول کرده‌اند
    private async Task<(Campaign? C, List<(int UserId, string Phone, string? Name)> To, int Expired, int OptedOut)> AudienceAsync(StaffScope scope, int campaignId, CancellationToken ct)
    {
        var c = await db.Campaigns.AsNoTracking().FirstOrDefaultAsync(x => x.Id == campaignId, ct);
        if (c is null) return (null, [], 0, 0);
        var now = clock.UtcNow;
        var branchIds = c.EligibleBranchSlugs.Count == 0
            ? scope.BranchIds.ToList()
            : await db.Branches.Where(b => c.EligibleBranchSlugs.Contains(b.Slug)).Select(b => b.Id).ToListAsync(ct);
        branchIds = branchIds.Where(scope.Can).ToList();
        var last = await db.Memberships.AsNoTracking().Where(m => Paid.Contains(m.Status))
            .GroupBy(m => m.UserId).Select(g => new { UserId = g.Key, End = g.Max(m => m.EndsAtUtc) }).ToListAsync(ct);
        var expiredIds = last.Where(x => x.End <= now && x.End > now.AddDays(-365)).Select(x => x.UserId).ToHashSet();
        var lastBranch = await db.Memberships.AsNoTracking().Where(m => Paid.Contains(m.Status) && expiredIds.Contains(m.UserId))
            .OrderByDescending(m => m.EndsAtUtc).Select(m => new { m.UserId, m.BranchId }).ToListAsync(ct);
        var inBranch = lastBranch.GroupBy(x => x.UserId).Select(g => g.First()).Where(x => branchIds.Contains(x.BranchId)).Select(x => x.UserId).ToList();
        var users = await db.Users.AsNoTracking().Where(u => inBranch.Contains(u.Id) && u.PhoneNumber != null)
            .Select(u => new { u.Id, u.PhoneNumber, u.FullName, u.MarketingSmsOptIn }).ToListAsync(ct);
        var to = users.Where(u => u.MarketingSmsOptIn).Select(u => (u.Id, u.PhoneNumber!, u.FullName)).ToList();
        return (c, to, users.Count, users.Count - to.Count);
    }

    private static string Offer(Campaign c) => c.DiscountAmountToman is { } a
        ? PersianText.FaDigits((a / 1000).ToString("N0", CultureInfo.InvariantCulture).Replace(",", "٬")) + " هزار تومان تخفیف"
        : PersianText.FaDigits(c.DiscountPercent.ToString()) + "٪ تخفیف";

    public async Task<Result<CampaignAudienceDto>> CampaignAudienceAsync(StaffScope scope, int campaignId, CancellationToken ct)
    {
        var (c, to, expired, optedOut) = await AudienceAsync(scope, campaignId, ct);
        if (c is null) return Result<CampaignAudienceDto>.Fail("id", "جشنواره پیدا نشد.", ErrorType.NotFound);
        return Result<CampaignAudienceDto>.Ok(new CampaignAudienceDto(to.Count, expired, optedOut, SmsTexts.Campaign("[نام]", c.Title, Offer(c), Jalali.Date(c.EndsAtUtc))));
    }

    public async Task<Result<CampaignAudienceDto>> SendCampaignAsync(StaffScope scope, int campaignId, CancellationToken ct)
    {
        var (c, to, expired, optedOut) = await AudienceAsync(scope, campaignId, ct);
        if (c is null) return Result<CampaignAudienceDto>.Fail("id", "جشنواره پیدا نشد.", ErrorType.NotFound);
        if (!c.IsActive || c.EndsAtUtc <= clock.UtcNow) return Result<CampaignAudienceDto>.Fail("id", "جشنوارهٔ تمام‌شده یا غیرفعال را نمی‌شود اطلاع‌رسانی کرد.", ErrorType.Conflict);
        var existing = (await db.SmsMessages.Where(s => s.CampaignId == c.Id).Select(s => s.DedupeKey).ToListAsync(ct)).ToHashSet();
        var added = 0;
        var until = Jalali.Date(c.EndsAtUtc); var offer = Offer(c);
        foreach (var (userId, phone, fullName) in to)
        {
            var key = $"cmp:{c.Id}:{userId}";
            if (existing.Contains(key)) continue;
            var name = SmsTexts.Token(FirstName(fullName));
            Add(db, userId, phone, SmsKind.Campaign, O.CampaignTemplate, [name, SmsTexts.Token(c.Title), until], SmsTexts.Campaign(name, c.Title, offer, until), key, c.Id);
            added++;
        }
        db.AuditLogs.Add(new AuditLog { Action = "campaign.sms_queued", EntityType = "Campaign", EntityId = c.Id.ToString(), UserId = scope.UserId, Data = $"count={added}" });
        await db.SaveChangesAsync(ct);
        return Result<CampaignAudienceDto>.Ok(new CampaignAudienceDto(added, expired, optedOut, SmsTexts.Campaign("[نام]", c.Title, offer, until)));
    }

    public async Task<SmsStatsDto> StatsAsync(string? kind, CancellationToken ct)
    {
        var today = Jalali.TehranDayStartUtc(clock.UtcNow);
        var q = db.SmsMessages.AsNoTracking();
        if (Enum.TryParse<SmsKind>(kind, true, out var k)) q = q.Where(s => s.Kind == k);
        var recent = await q.OrderByDescending(s => s.Id).Take(100).ToListAsync(ct);
        return new SmsStatsDto(
            await db.SmsMessages.CountAsync(s => s.Status == SmsStatus.Queued, ct),
            await db.SmsMessages.CountAsync(s => s.Status == SmsStatus.Sent && s.SentAtUtc >= today, ct),
            await db.SmsMessages.CountAsync(s => s.Status == SmsStatus.Failed, ct),
            recent.Select(s => new SmsRowDto(s.Id, MaskPhone(s.Phone), KindName(s.Kind), s.Preview, s.Status.ToString().ToLowerInvariant(), s.CreatedAtUtc, s.SentAtUtc, s.Error)).ToList());
    }

    public static string KindName(SmsKind k) => k switch
    {
        SmsKind.Welcome => "welcome", SmsKind.Reminder7 => "reminder7", SmsKind.Reminder1 => "reminder1",
        SmsKind.Birthday => "birthday", SmsKind.Campaign => "campaign", _ => "custom",
    };

    public static string MaskPhone(string p) => p.Length >= 11 ? p[..4] + "***" + p[^4..] : p;
    public static string? FirstName(string? full) => full?.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
}
