using GymPlatform.Domain.Enums;

namespace GymPlatform.Domain.Entities;

public class MembershipPackage : BaseEntity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string? Tagline { get; set; }
    public PackageCategory Category { get; set; }
    public int DurationMonths { get; set; }

    /// <summary>null یعنی جلسات نامحدود.</summary>
    public int? Sessions { get; set; }

    /// <summary>قیمت به تومان.</summary>
    public long PriceToman { get; set; }

    public bool IncludesPersonalCoach { get; set; }
    public bool IncludesNutritionPlan { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public List<string> Features { get; set; } = [];
}
