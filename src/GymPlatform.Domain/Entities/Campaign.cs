namespace GymPlatform.Domain.Entities;

/// <summary>„Aktion“ — Rabattkampagne.</summary>
public class Campaign : BaseEntity
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }

    /// <summary>Rabatt in Prozent (1 bis 90).</summary>
    public int DiscountPercent { get; set; }

    /// <summary>Statt Prozent: fester Rabattbetrag (Cent). Ist er gesetzt, hat er Vorrang vor dem Prozentsatz.</summary>
    public long? DiscountAmountToman { get; set; }

    /// <summary>Leer = alle Pakete sind berechtigt.</summary>
    public List<string> EligiblePackageSlugs { get; set; } = [];

    /// <summary>Leer = alle Filialen.</summary>
    public List<string> EligibleBranchSlugs { get; set; } = [];

    /// <summary>Maximale Anmeldungen mit dieser Aktion (leer = unbegrenzt)</summary>
    public int? MaxRedemptions { get; set; }
    public int RedemptionCount { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsRunningAt(DateTime utcNow) =>
        IsActive && utcNow >= StartsAtUtc && utcNow < EndsAtUtc && (MaxRedemptions is null || RedemptionCount < MaxRedemptions);

    public bool AppliesTo(string packageSlug) =>
        EligiblePackageSlugs.Count == 0 || EligiblePackageSlugs.Contains(packageSlug);

    public bool AppliesTo(string packageSlug, string branchSlug) =>
        AppliesTo(packageSlug) && (EligibleBranchSlugs.Count == 0 || EligibleBranchSlugs.Contains(branchSlug));

    /// <summary>Rabattbetrag auf den Grundpreis (auf volle 10 Cent gerundet, nie höher als der Preis)</summary>
    public long DiscountFor(long baseToman) =>
        Math.Min(baseToman, DiscountAmountToman is { } a ? a : baseToman * DiscountPercent / 100 / 10 * 10);
}
