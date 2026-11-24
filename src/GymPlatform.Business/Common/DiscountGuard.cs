using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Business.Common;

/// <summary>
/// Nutzungslimit des Rabattcodes und Kapazität der Aktion zum Zeitpunkt des Zahlungsstarts.
/// Zähler steigen erst nach erfolgreicher Zahlung; damit niemand das Limit mit mehreren gleichzeitigen Zahlungen umgeht,
/// zählen offene Zahlungen/Bestellungen mit demselben Code mit (abgebrochene Bestellungen werden nach 30 Minuten frei).
/// Codes mit Limit (z. B. Geburtstagscode) sind pro Person nur einmal nutzbar.
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
        if (used + pending >= max) return "Dieser Rabattcode ist ausgeschöpft.";
        var mine = await db.Payments.AnyAsync(p => p.UserId == userId && p.DiscountCode == code && p.Purpose == PaymentPurpose.Membership
                       && (p.Status == PaymentStatus.Succeeded || (p.Status == PaymentStatus.Pending && p.CreatedAtUtc > since)), ct)
                   || await db.ShopOrders.AnyAsync(o => o.UserId == userId && o.DiscountCode == code && o.Status != OrderStatus.Cancelled, ct);
        return mine ? "Sie haben diesen Rabattcode bereits genutzt." : null;
    }

    public static async Task<string?> CampaignErrorAsync(GymDbContext db, int campaignId, DateTime now, CancellationToken ct)
    {
        var c = await db.Campaigns.AsNoTracking().FirstOrDefaultAsync(x => x.Id == campaignId, ct);
        if (c?.MaxRedemptions is not { } max) return null;
        var since = now - PendingWindow;
        var pending = await db.Payments.CountAsync(p => p.CampaignId == campaignId && p.Status == PaymentStatus.Pending && p.CreatedAtUtc > since, ct);
        return c.RedemptionCount + pending >= max ? "Die Aktion ist gerade ausgebucht; bitte die Seite neu laden, um den Preis ohne Rabatt zu sehen." : null;
    }

    public static Task<bool> IsActiveMemberAsync(GymDbContext db, int userId, DateTime now, CancellationToken ct) =>
        db.Memberships.AnyAsync(m => m.UserId == userId && m.Status == MembershipStatus.Active && m.StartsAtUtc <= now && m.EndsAtUtc > now, ct);
}
