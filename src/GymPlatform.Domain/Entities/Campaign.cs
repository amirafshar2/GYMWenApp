namespace GymPlatform.Domain.Entities;

/// <summary>«جشنواره» — کمپین تخفیف.</summary>
public class Campaign : BaseEntity
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }

    /// <summary>درصد تخفیف (۱ تا ۹۰).</summary>
    public int DiscountPercent { get; set; }

    /// <summary>به‌جای درصد: مبلغ ثابت تخفیف (تومان). اگر پر باشد بر درصد مقدم است.</summary>
    public long? DiscountAmountToman { get; set; }

    /// <summary>خالی یعنی همهٔ پکیج‌ها مشمول هستند.</summary>
    public List<string> EligiblePackageSlugs { get; set; } = [];

    /// <summary>خالی یعنی همهٔ شعبه‌ها.</summary>
    public List<string> EligibleBranchSlugs { get; set; } = [];

    /// <summary>سقف تعداد ثبت‌نام با این جشنواره (خالی = بی‌سقف)</summary>
    public int? MaxRedemptions { get; set; }
    public int RedemptionCount { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsRunningAt(DateTime utcNow) =>
        IsActive && utcNow >= StartsAtUtc && utcNow < EndsAtUtc && (MaxRedemptions is null || RedemptionCount < MaxRedemptions);

    public bool AppliesTo(string packageSlug) =>
        EligiblePackageSlugs.Count == 0 || EligiblePackageSlugs.Contains(packageSlug);

    public bool AppliesTo(string packageSlug, string branchSlug) =>
        AppliesTo(packageSlug) && (EligibleBranchSlugs.Count == 0 || EligibleBranchSlugs.Contains(branchSlug));

    /// <summary>مبلغ تخفیف روی قیمت پایه (گرد به هزار تومان، بیشتر از قیمت نمی‌شود)</summary>
    public long DiscountFor(long baseToman) =>
        Math.Min(baseToman, DiscountAmountToman is { } a ? a : baseToman * DiscountPercent / 100 / 1000 * 1000);
}
