namespace KhashayarGym.Domain.Entities;

/// <summary>«جشنواره» — کمپین تخفیف.</summary>
public class Campaign : BaseEntity
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }

    /// <summary>درصد تخفیف (۱ تا ۹۰).</summary>
    public int DiscountPercent { get; set; }

    /// <summary>خالی یعنی همهٔ پکیج‌ها مشمول هستند.</summary>
    public List<string> EligiblePackageSlugs { get; set; } = [];

    public bool IsActive { get; set; } = true;

    public bool IsRunningAt(DateTime utcNow) =>
        IsActive && utcNow >= StartsAtUtc && utcNow < EndsAtUtc;

    public bool AppliesTo(string packageSlug) =>
        EligiblePackageSlugs.Count == 0 || EligiblePackageSlugs.Contains(packageSlug);
}
