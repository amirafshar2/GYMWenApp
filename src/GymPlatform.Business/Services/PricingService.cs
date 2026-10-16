using GymPlatform.Domain.Entities;

namespace GymPlatform.Business.Services;

public interface IPricingService
{
    /// <summary>قیمت پس از تخفیف کمپین، گرد به پایین تا هزار تومان.</summary>
    long ApplyDiscount(long priceToman, int discountPercent);
    Campaign? BestCampaignFor(string packageSlug, IEnumerable<Campaign> campaigns, DateTime utcNow);
    /// <summary>بیشترین تخفیف برای این پکیج (و در صورت مشخص بودن، این شعبه)، با درنظر گرفتن تخفیف درصدی یا مبلغ ثابت.</summary>
    Campaign? BestCampaignFor(string packageSlug, long basePriceToman, IEnumerable<Campaign> campaigns, DateTime utcNow, string? branchSlug);
    long MonthlyEquivalent(long priceToman, int durationMonths);
}

public sealed class PricingService : IPricingService
{
    public long ApplyDiscount(long priceToman, int discountPercent)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(priceToman);
        if (discountPercent is < 0 or > 90)
            throw new ArgumentOutOfRangeException(nameof(discountPercent), "تخفیف باید بین ۰ تا ۹۰ درصد باشد.");
        var discounted = priceToman - (priceToman * discountPercent / 100);
        return discounted / 1000 * 1000;
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
        durationMonths <= 0 ? priceToman : priceToman / durationMonths / 1000 * 1000;
}
