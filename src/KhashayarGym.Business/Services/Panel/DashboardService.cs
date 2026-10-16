using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.Business.Services.Panel;

public interface IStaffScopeService
{
    Task<StaffScope> ResolveAsync(int userId, IReadOnlyList<string> roles, CancellationToken ct);
    Task<PanelMeDto> MeAsync(StaffScope scope, CancellationToken ct);
    /// <summary>نقش‌ها از پایگاه داده (نه از توکن) تا گرفتن دسترسی کارمند فوراً اعمال شود.</summary>
    Task<StaffScope> ResolveFromDbAsync(int userId, CancellationToken ct);
    Task<int?> BranchIdAsync(string slug, CancellationToken ct);
    Task<int?> CanteenOrderBranchAsync(int orderId, CancellationToken ct);
}

public sealed class StaffScopeService(GymDbContext db) : IStaffScopeService
{
    public async Task<StaffScope> ResolveAsync(int userId, IReadOnlyList<string> roles, CancellationToken ct)
    {
        var super = roles.Contains(Roles.SuperAdmin);
        var ids = super ? await db.Branches.Select(b => b.Id).ToListAsync(ct)
                        : await db.StaffBranches.Where(s => s.UserId == userId).Select(s => s.BranchId).ToListAsync(ct);
        return new StaffScope(userId, roles, super, ids);
    }

    public async Task<StaffScope> ResolveFromDbAsync(int userId, CancellationToken ct)
    {
        var roles = await (from ur in db.UserRoles join r in db.Roles on ur.RoleId equals r.Id where ur.UserId == userId select r.Name!).ToListAsync(ct);
        return await ResolveAsync(userId, roles, ct);
    }

    public Task<int?> BranchIdAsync(string slug, CancellationToken ct) =>
        db.Branches.Where(b => b.Slug == slug).Select(b => (int?)b.Id).FirstOrDefaultAsync(ct);

    public Task<int?> CanteenOrderBranchAsync(int orderId, CancellationToken ct) =>
        db.CanteenOrders.Where(o => o.Id == orderId).Select(o => (int?)o.BranchId).FirstOrDefaultAsync(ct);

    public async Task<PanelMeDto> MeAsync(StaffScope scope, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().FirstAsync(u => u.Id == scope.UserId, ct);
        var branches = await db.Branches.AsNoTracking().Where(b => scope.BranchIds.Contains(b.Id)).OrderBy(b => b.SortOrder)
            .Select(b => new BranchRefDto(b.Id, b.Slug, b.Name)).ToListAsync(ct);
        var coachId = await db.Coaches.Where(c => c.UserId == scope.UserId).Select(c => (int?)c.Id).FirstOrDefaultAsync(ct);
        return new PanelMeDto(scope.UserId, user.FullName, scope.Roles, branches, coachId);
    }
}

public interface IDashboardService
{
    Task<Result<DashboardDto>> GetAsync(StaffScope scope, string? branchSlug, int days, CancellationToken ct);
}

/// <summary>
/// داشبورد مدیر: درآمد بر اساس زمان پرداخت (به وقت تهران) و شعبه.
/// عضویت از پرداخت‌های موفق، فروشگاه و بوفه از سفارش‌های پرداخت‌شده (چه درگاه چه کیف پول).
/// شارژ کیف پول درآمد حساب نمی‌شود (پیش‌پرداخت است)؛ خرج آن در بوفه/فروشگاه حساب می‌شود.
/// </summary>
public sealed class DashboardService(GymDbContext db, IClock clock) : IDashboardService
{
    private static readonly OrderStatus[] PaidShop = [OrderStatus.Paid, OrderStatus.ReadyForPickup, OrderStatus.Shipped, OrderStatus.Completed];
    private static readonly CanteenOrderStatus[] PaidCanteen = [CanteenOrderStatus.Queued, CanteenOrderStatus.Preparing, CanteenOrderStatus.Ready, CanteenOrderStatus.Collected];
    private static readonly MembershipStatus[] Paid = [MembershipStatus.Active, MembershipStatus.Expired];

    private sealed record Rev(int BranchId, DateTime At, long Amount, int Source);

    public async Task<Result<DashboardDto>> GetAsync(StaffScope scope, string? branchSlug, int days, CancellationToken ct)
    {
        days = Math.Clamp(days, 7, 180);
        var branches = await db.Branches.AsNoTracking().OrderBy(b => b.SortOrder).Select(b => new { b.Id, b.Slug, b.Name }).ToListAsync(ct);
        List<int> ids;
        if (!string.IsNullOrEmpty(branchSlug))
        {
            var b = branches.FirstOrDefault(x => x.Slug == branchSlug);
            if (b is null) return Result<DashboardDto>.Fail("branch", "شعبه پیدا نشد.", ErrorType.NotFound);
            if (!scope.Can(b.Id)) return Result<DashboardDto>.Fail("branch", "به این شعبه دسترسی ندارید.", ErrorType.Forbidden);
            ids = [b.Id];
        }
        else ids = branches.Where(b => scope.Can(b.Id)).Select(b => b.Id).ToList();

        var now = clock.UtcNow;
        var todayStart = Jalali.TehranDayStartUtc(now);
        var periodStart = todayStart.AddDays(-(days - 1));
        var prevStart = periodStart.AddDays(-days);

        // ---- درآمد: جمع روزانه در خود دیتابیس (نه آوردن تک‌تک سفارش‌ها) تا با چند سال داده هم سریع بماند.
        // روز به وقت تهران = UTC + ۳:۳۰ (ایران از ۱۴۰۱ ساعت تابستانی ندارد)
        const int tehranMinutes = 210;
        var mem = await db.Payments.AsNoTracking()
            .Where(p => p.Purpose == PaymentPurpose.Membership && p.Status == PaymentStatus.Succeeded && p.PaidAtUtc >= prevStart && ids.Contains(p.Membership!.BranchId))
            .GroupBy(p => new { p.Membership!.BranchId, Day = p.PaidAtUtc!.Value.AddMinutes(tehranMinutes).Date })
            .Select(g => new { g.Key.BranchId, g.Key.Day, Amount = g.Sum(x => x.AmountToman) }).ToListAsync(ct);
        var shop = await db.ShopOrders.AsNoTracking()
            .Where(o => PaidShop.Contains(o.Status) && o.PaidAtUtc >= prevStart && ids.Contains(o.BranchId))
            .GroupBy(o => new { o.BranchId, Day = o.PaidAtUtc!.Value.AddMinutes(tehranMinutes).Date })
            .Select(g => new { g.Key.BranchId, g.Key.Day, Amount = g.Sum(x => x.TotalToman) }).ToListAsync(ct);
        var cafe = await db.CanteenOrders.AsNoTracking()
            .Where(o => PaidCanteen.Contains(o.Status) && o.PaidAtUtc >= prevStart && ids.Contains(o.BranchId))
            .GroupBy(o => new { o.BranchId, Day = o.PaidAtUtc!.Value.AddMinutes(tehranMinutes).Date })
            .Select(g => new { g.Key.BranchId, g.Key.Day, Amount = g.Sum(x => x.TotalToman) }).ToListAsync(ct);
        var all = mem.Select(x => new Rev(x.BranchId, x.Day, x.Amount, 0))
            .Concat(shop.Select(x => new Rev(x.BranchId, x.Day, x.Amount, 1)))
            .Concat(cafe.Select(x => new Rev(x.BranchId, x.Day, x.Amount, 2))).ToList();
        // از اینجا «At» روزِ تهران است؛ مرزها هم به روز تهران
        var todayDay = Jalali.ToTehran(now).Date;
        var periodDay = todayDay.AddDays(-(days - 1));

        static RevenueSplitDto Split(IEnumerable<Rev> r)
        {
            var l = r.ToList();
            return new RevenueSplitDto(l.Where(x => x.Source == 0).Sum(x => x.Amount), l.Where(x => x.Source == 1).Sum(x => x.Amount), l.Where(x => x.Source == 2).Sum(x => x.Amount));
        }
        var period = all.Where(r => r.At >= periodDay).ToList();
        var daily = Enumerable.Range(0, days).Select(i =>
        {
            var d = periodDay.AddDays(i);
            var sp = Split(period.Where(r => r.At == d));
            return new DailyRevenueDto(DateOnly.FromDateTime(d), sp.Membership, sp.Shop, sp.Canteen);
        }).ToList();

        // ---- اعضا: فقط عضویت‌های مرتبط (فعال، تمام‌شده در ۹۰ روز اخیر، یا شروع در همین بازه)
        var recentEnd = now.AddDays(-90);
        var ms = await db.Memberships.AsNoTracking()
            .Where(m => Paid.Contains(m.Status) && ids.Contains(m.BranchId) && (m.EndsAtUtc > recentEnd || m.StartsAtUtc >= periodStart))
            .Select(m => new { m.Id, m.UserId, m.BranchId, m.StartsAtUtc, m.EndsAtUtc, Package = m.Package!.Name }).ToListAsync(ct);
        var active = ms.Where(m => m.StartsAtUtc <= now && m.EndsAtUtc > now).ToList();

        // عضو جدید: اولین عضویتش در همین بازه شروع شده
        var candidates = ms.Where(m => m.StartsAtUtc >= periodStart).Select(m => m.UserId).Distinct().ToList();
        var returning = (await db.Memberships.AsNoTracking()
            .Where(m => Paid.Contains(m.Status) && candidates.Contains(m.UserId) && m.StartsAtUtc < periodStart)
            .Select(m => m.UserId).Distinct().ToListAsync(ct)).ToHashSet();
        var newMembers = candidates.Where(u => !returning.Contains(u)).ToHashSet();

        // نرخ تمدید و «در آستانهٔ پایان»: عضویت‌های بعدی همین افراد (گروه‌بندی‌شده، نه جست‌وجوی تو در تو)
        var ended = ms.Where(m => m.EndsAtUtc <= now && m.EndsAtUtc > recentEnd).ToList();
        var soonCandidates = active.Where(m => m.EndsAtUtc <= now.AddDays(7)).ToList();
        var watch = ended.Select(m => m.UserId).Concat(soonCandidates.Select(m => m.UserId)).Distinct().ToList();
        var byUser = (await db.Memberships.AsNoTracking().Where(m => Paid.Contains(m.Status) && watch.Contains(m.UserId))
            .Select(m => new { m.Id, m.UserId, m.StartsAtUtc }).ToListAsync(ct))
            .ToLookup(m => m.UserId);
        var renewed = ended.Count(e => byUser[e.UserId].Any(x => x.Id != e.Id && x.StartsAtUtc >= e.StartsAtUtc));
        var renewalRate = ended.Count == 0 ? 0 : Math.Round(100.0 * renewed / ended.Count, 1);

        var soon = soonCandidates.Where(m => !byUser[m.UserId].Any(x => x.Id != m.Id && x.StartsAtUtc >= m.EndsAtUtc!.Value.AddDays(-1)))
            .OrderBy(m => m.EndsAtUtc).Take(50).ToList();
        var soonUsers = soon.Select(s => s.UserId).ToList();
        var users = await db.Users.AsNoTracking().Where(u => soonUsers.Contains(u.Id)).Select(u => new { u.Id, u.FullName, u.PhoneNumber }).ToDictionaryAsync(u => u.Id, ct);
        var expiring = soon.Select(m => new ExpiringMemberDto(m.UserId, users[m.UserId].FullName, users[m.UserId].PhoneNumber ?? "",
            branches.First(b => b.Id == m.BranchId).Name, m.Package, m.EndsAtUtc!.Value, Math.Max(0, (int)Math.Ceiling((m.EndsAtUtc.Value - now).TotalDays)))).ToList();

        // ---- ورودها: شمارش بر حسب شعبه و ساعت در خود دیتابیس
        var checkIns = await db.CheckIns.AsNoTracking()
            .Where(c => c.Decision == AccessDecision.Allowed && c.OccurredAtUtc >= periodStart && ids.Contains(c.BranchId))
            .GroupBy(c => new { c.BranchId, Hour = c.OccurredAtUtc.AddMinutes(tehranMinutes).Hour })
            .Select(g => new { g.Key.BranchId, g.Key.Hour, Count = g.Count() }).ToListAsync(ct);
        var checkInsToday = await db.CheckIns.CountAsync(c => c.Decision == AccessDecision.Allowed && c.OccurredAtUtc >= todayStart && ids.Contains(c.BranchId), ct);
        var byHour = new int[24];
        foreach (var c in checkIns) byHour[c.Hour] += c.Count;

        var branchStats = branches.Where(b => ids.Contains(b.Id)).Select(b => new BranchStatDto(b.Slug, b.Name,
            Split(period.Where(r => r.BranchId == b.Id)), active.Where(m => m.BranchId == b.Id).Select(m => m.UserId).Distinct().Count(),
            checkIns.Where(c => c.BranchId == b.Id).Sum(c => c.Count), ms.Where(m => m.BranchId == b.Id && m.StartsAtUtc >= periodStart && newMembers.Contains(m.UserId)).Select(m => m.UserId).Distinct().Count()))
            .OrderByDescending(s => s.Revenue.Total).ToList();

        // ---- اثر جشنواره‌ها
        var camps = await db.Campaigns.AsNoTracking().OrderByDescending(c => c.StartsAtUtc).Take(6).ToListAsync(ct);
        var campIds = camps.Select(c => c.Id).ToList();
        var campPays = await db.Payments.AsNoTracking()
            .Where(p => p.CampaignId != null && campIds.Contains(p.CampaignId.Value) && p.Status == PaymentStatus.Succeeded && ids.Contains(p.Membership!.BranchId))
            .Select(p => new { p.CampaignId, p.AmountToman, p.CampaignDiscountToman }).ToListAsync(ct);
        var campaigns = camps.Select(c => new CampaignEffectDto(c.Id, c.Title, c.StartsAtUtc, c.EndsAtUtc,
            campPays.Count(p => p.CampaignId == c.Id), campPays.Where(p => p.CampaignId == c.Id).Sum(p => p.AmountToman),
            campPays.Where(p => p.CampaignId == c.Id).Sum(p => p.CampaignDiscountToman), c.IsRunningAt(now))).ToList();

        return Result<DashboardDto>.Ok(new DashboardDto(
            branchSlug, days, Split(all.Where(r => r.At >= todayDay)), Split(period), Split(all.Where(r => r.At < periodDay)),
            active.Select(m => m.UserId).Distinct().Count(), checkInsToday, newMembers.Count, renewalRate,
            daily, branchStats, expiring, campaigns, byHour));
    }
}
