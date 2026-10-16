using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.Business.Services.Access;
using KhashayarGym.Business.Services.Members;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.Business.Services.Panel;

public interface IReceptionService
{
    Task<IReadOnlyList<MemberSearchRowDto>> SearchAsync(string q, CancellationToken ct);
    Task<MemberSummaryDto?> SummaryAsync(int userId, CancellationToken ct);
    Task<Result<AccessCheckResult>> CheckInAsync(StaffScope scope, ReceptionCheckInRequest request, CancellationToken ct);
    Task<Result<IReadOnlyList<CheckInRowDto>>> TodayAsync(StaffScope scope, string branchSlug, CancellationToken ct);
}

/// <summary>پذیرش: جست‌وجوی عضو، خلاصهٔ پرونده، ثبت ورود با اسکن QR/دستبند در پیشخوان (همان منطق گیت).</summary>
public sealed class ReceptionService(GymDbContext db, IAccessControlService access, IClock clock) : IReceptionService
{
    public async Task<IReadOnlyList<MemberSearchRowDto>> SearchAsync(string q, CancellationToken ct)
    {
        var term = PersianText.CleanText(q) ?? "";
        if (term.Length < 2) return [];
        var digits = PersianText.ToLatinDigits(term).Replace(" ", "");
        var now = clock.UtcNow;
        var users = await db.Users.AsNoTracking()
            .Where(u => (digits.Length >= 4 && u.PhoneNumber!.Contains(digits)) || (u.FullName != null && u.FullName.Contains(term)))
            .OrderBy(u => u.FullName).Take(20).Select(u => new { u.Id, u.FullName, u.PhoneNumber }).ToListAsync(ct);
        var ids = users.Select(u => u.Id).ToList();
        var active = await db.Memberships.AsNoTracking()
            .Where(m => ids.Contains(m.UserId) && m.Status == MembershipStatus.Active && m.StartsAtUtc <= now && m.EndsAtUtc > now)
            .Select(m => new { m.UserId, Package = m.Package!.Name, Branch = m.Branch!.Name, m.EndsAtUtc }).ToListAsync(ct);
        return users.Select(u =>
        {
            var a = active.Where(x => x.UserId == u.Id).OrderByDescending(x => x.EndsAtUtc).FirstOrDefault();
            return new MemberSearchRowDto(u.Id, u.FullName, u.PhoneNumber ?? "", a?.Package, a?.Branch, a is null ? null : (int)Math.Ceiling((a.EndsAtUtc!.Value - now).TotalDays));
        }).ToList();
    }

    public async Task<MemberSummaryDto?> SummaryAsync(int userId, CancellationToken ct)
    {
        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (u is null) return null;
        var now = clock.UtcNow;
        var ms = await db.Memberships.AsNoTracking().Include(m => m.Branch).Include(m => m.Package)
            .Where(m => m.UserId == userId && m.Status != MembershipStatus.PendingPayment && m.Status != MembershipStatus.Cancelled)
            .OrderByDescending(m => m.StartsAtUtc).AsSplitQuery().ToListAsync(ct);
        var dtos = ms.Select(m => MemberService.ToDto(m, now)).ToList();
        var checkIns = await db.CheckIns.AsNoTracking().Where(c => c.UserId == userId).OrderByDescending(c => c.Id).Take(10)
            .Select(c => new { c.Id, c.OccurredAtUtc, c.BranchId, c.Decision, c.Reason, c.CredentialType }).ToListAsync(ct);
        var branchNames = await db.Branches.AsNoTracking().ToDictionaryAsync(b => b.Id, b => b.Name, ct);
        var wallet = await db.Wallets.Where(w => w.UserId == userId).Select(w => (long?)w.BalanceToman).FirstOrDefaultAsync(ct) ?? 0;
        var activeVersion = await db.ContractTemplates.Where(t => t.IsActive).Select(t => (int?)t.Version).MaxAsync(ct);
        var signed = activeVersion is null || await db.SignedContracts.AnyAsync(s => s.UserId == userId && s.Version == activeVersion, ct);
        return new MemberSummaryDto(u.Id, u.FullName, u.PhoneNumber ?? "", u.Gender?.ToString().ToLowerInvariant(),
            dtos.Where(d => d.IsActive).OrderBy(d => d.EndsAtUtc).FirstOrDefault(), dtos, await access.ListAsync(userId, ct),
            checkIns.Select(c => new CheckInRowDto(c.Id, c.OccurredAtUtc, branchNames.GetValueOrDefault(c.BranchId, ""), u.FullName, u.Id,
                c.Decision == AccessDecision.Allowed, c.Reason.ToString(), AccessControlService.TypeName(c.CredentialType))).ToList(),
            wallet, signed);
    }

    public async Task<Result<AccessCheckResult>> CheckInAsync(StaffScope scope, ReceptionCheckInRequest r, CancellationToken ct)
    {
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Slug == r.BranchSlug, ct);
        if (branch is null) return Result<AccessCheckResult>.Fail("branchSlug", "شعبه پیدا نشد.", ErrorType.NotFound);
        if (!scope.Can(branch.Id)) return Result<AccessCheckResult>.Fail("branchSlug", "به این شعبه دسترسی ندارید.", ErrorType.Forbidden);
        if (string.IsNullOrWhiteSpace(r.Credential)) return Result<AccessCheckResult>.Fail("credential", "QR یا شمارهٔ دستبند را اسکن کنید.");
        var device = await access.ReceptionDeviceAsync(branch.Id, ct);
        return Result<AccessCheckResult>.Ok(await access.CheckAsync(device, new AccessCheckRequest(r.Credential), ct));
    }

    public async Task<Result<IReadOnlyList<CheckInRowDto>>> TodayAsync(StaffScope scope, string branchSlug, CancellationToken ct)
    {
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Slug == branchSlug, ct);
        if (branch is null) return Result<IReadOnlyList<CheckInRowDto>>.Fail("branch", "شعبه پیدا نشد.", ErrorType.NotFound);
        if (!scope.Can(branch.Id)) return Result<IReadOnlyList<CheckInRowDto>>.Fail("branch", "به این شعبه دسترسی ندارید.", ErrorType.Forbidden);
        var start = Jalali.TehranDayStartUtc(clock.UtcNow);
        var rows = await db.CheckIns.AsNoTracking().Where(c => c.BranchId == branch.Id && c.OccurredAtUtc >= start)
            .OrderByDescending(c => c.Id).Take(100)
            .Select(c => new { c.Id, c.OccurredAtUtc, c.UserId, c.Decision, c.Reason, c.CredentialType }).ToListAsync(ct);
        var uids = rows.Where(r => r.UserId != null).Select(r => r.UserId!.Value).Distinct().ToList();
        var names = await db.Users.AsNoTracking().Where(u => uids.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        return Result<IReadOnlyList<CheckInRowDto>>.Ok(rows.Select(c => new CheckInRowDto(c.Id, c.OccurredAtUtc, branch.Name,
            c.UserId is { } id ? names.GetValueOrDefault(id) : null, c.UserId, c.Decision == AccessDecision.Allowed, c.Reason.ToString(),
            AccessControlService.TypeName(c.CredentialType))).ToList());
    }
}
