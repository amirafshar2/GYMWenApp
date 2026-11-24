using GymPlatform.Domain.Entities;

namespace GymPlatform.Business.Services;

public interface IPricingService
{
    /// <summary>Preis nach Aktionsrabatt, auf volle 10 Cent abgerundet.</summary>
    long ApplyDiscount(long priceToman, int discountPercent);
    Campaign? BestCampaignFor(string packageSlug, IEnumerable<Campaign> campaigns, DateTime utcNow);
    /// <summary>Höchster Rabatt für dieses Paket (und ggf. diese Filiale), prozentual oder als fester Betrag.</summary>
    Campaign? BestCampaignFor(string packageSlug, long basePriceToman, IEnumerable<Campaign> campaigns, DateTime utcNow, string? branchSlug);
    long MonthlyEquivalent(long priceToman, int durationMonths);
}

public sealed class PricingService : IPricingService
{
    public long ApplyDiscount(long priceToman, int discountPercent)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(priceToman);
        if (discountPercent is < 0 or > 90)
            throw new ArgumentOutOfRangeException(nameof(discountPercent), "Der Rabatt muss zwischen 0 und 90 Prozent liegen.");
        var discounted = priceToman - (priceToman * discountPercent / 100);
        return discounted / 10 * 10;
    }

    public Campaign? BestCampaignFor(string packageSlug, IEnumerable<Campaign> campaigns, DateTime utcNow) =>
        campaigns.Where(c => c.IsRunningAt(utcNow) && c.AppliesTo(packageSlug))
                 .OrderByDescending(c => c.DiscountPercent)
                 .FirstOrDefault();

    public Campaign? BestCampaignFor(string packageSlug, long basePriceToman, IEnumerable<Campaign> campaigns, DateTime utcNow, string? branchSlug) =>
        campaigns.Where(c => c.IsRunningAt(utcNow) && (branchSlug is null ? c.AppliesTo(packageSlug) : c.AppliesTo(packageSlug, branchSlug)))
                 .OrderByDescending(c => c.DiscountFor(basePriceToman))
                 .FirstOrDefault();

    public long MonthlyEquivalent(long priceToman, int durationMonths) =>
        durationMonths <= 0 ? priceToman : priceToman / durationMonths / 10 * 10;
}
