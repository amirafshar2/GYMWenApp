using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.Business.Common;

/// <summary>
/// سقف استفاده از کد تخفیف و ظرفیت جشنواره در لحظهٔ شروع پرداخت.
/// شمارنده‌ها بعد از پرداخت موفق زیاد می‌شوند؛ برای اینکه کسی با باز کردن چند پرداخت هم‌زمان از سقف رد نشود،
/// پرداخت‌ها/سفارش‌های در انتظارِ همین کد هم جزو ظرفیت حساب می‌شوند (سفارش‌های رهاشده بعد از ۳۰ دقیقه آزاد می‌شوند).
/// کدهای سقف‌دار (مثل کد تولد) برای هر نفر فقط یک بار قابل استفاده‌اند.
/// </summary>
public static class DiscountGuard
{
    public static readonly TimeSpan PendingWindow = TimeSpan.FromMinutes(30);

    public static async Task<string?> CodeErrorAsync(GymDbContext db, DiscountCode dc, int userId, DateTime now, CancellationToken ct)
    {
        if (dc.MaxUses is not { } max) return null;
        var since = now - PendingWindow;
        var code = dc.Code;
        var pending = await db.Payments.CountAsync(p => p.DiscountCode == code && p.Status == PaymentStatus.Pending && p.Purpose == PaymentPurpose.Membership && p.CreatedAtUtc > since, ct)
                    + await db.ShopOrders.CountAsync(o => o.DiscountCode == code && o.Status == OrderStatus.PendingPayment, ct);
        var used = await db.DiscountCodes.Where(d => d.Id == dc.Id).Select(d => d.UsedCount).FirstAsync(ct);
        if (used + pending >= max) return "ظرفیت این کد تخفیف تمام شده است.";
        var mine = await db.Payments.AnyAsync(p => p.UserId == userId && p.DiscountCode == code && p.Purpose == PaymentPurpose.Membership
                       && (p.Status == PaymentStatus.Succeeded || (p.Status == PaymentStatus.Pending && p.CreatedAtUtc > since)), ct)
                   || await db.ShopOrders.AnyAsync(o => o.UserId == userId && o.DiscountCode == code && o.Status != OrderStatus.Cancelled, ct);
        return mine ? "این کد تخفیف را قبلاً استفاده کرده‌اید." : null;
    }

    public static async Task<string?> CampaignErrorAsync(GymDbContext db, int campaignId, DateTime now, CancellationToken ct)
    {
        var c = await db.Campaigns.AsNoTracking().FirstOrDefaultAsync(x => x.Id == campaignId, ct);
        if (c?.MaxRedemptions is not { } max) return null;
        var since = now - PendingWindow;
        var pending = await db.Payments.CountAsync(p => p.CampaignId == campaignId && p.Status == PaymentStatus.Pending && p.CreatedAtUtc > since, ct);
        return c.RedemptionCount + pending >= max ? "ظرفیت جشنواره همین الان تکمیل شد؛ صفحه را تازه کنید تا قیمت بدون تخفیف را ببینید." : null;
    }

    public static Task<bool> IsActiveMemberAsync(GymDbContext db, int userId, DateTime now, CancellationToken ct) =>
        db.Memberships.AnyAsync(m => m.UserId == userId && m.Status == MembershipStatus.Active && m.StartsAtUtc <= now && m.EndsAtUtc > now, ct);
}
