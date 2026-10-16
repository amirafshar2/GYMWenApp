namespace GymPlatform.Business.Dtos;

public sealed record BranchDto(
    int Id, string Slug, string Name, string District, string Address, string? Phone,
    double Latitude, double Longitude, bool HasMen, bool HasWomen, bool AddressConfirmed,
    string? MenHours, string? WomenHours, IReadOnlyList<string> Disciplines);

public sealed record PackageDto(
    int Id, string Slug, string Name, string? Tagline, string Category, int DurationMonths,
    int? Sessions, long PriceToman, long? DiscountedPriceToman, int? DiscountPercent,
    long MonthlyEquivalentToman, bool IncludesPersonalCoach, bool IncludesNutritionPlan,
    bool IsFeatured, IReadOnlyList<string> Features);

public sealed record CoachDto(
    int Id, string Slug, string FullName, string Specialty, string? Bio, int YearsOfExperience,
    string Section, string BranchName, string? PhotoUrl, IReadOnlyList<string> Achievements);

public sealed record CampaignDto(
    int Id, string Title, string? Description, DateTime StartsAtUtc, DateTime EndsAtUtc,
    int DiscountPercent, IReadOnlyList<string> EligiblePackageSlugs,
    long? DiscountAmountToman = null, IReadOnlyList<string>? EligibleBranchSlugs = null, int? RemainingSlots = null);

public sealed record FaqDto(string Question, string Answer);

public sealed record SiteStatsDto(int Branches, int Members, int YearsActive, int InstagramFollowers, int Coaches);

public sealed record CreateConsultationRequest(
    string FullName, string Mobile, string? Goal, string? Message, int? BranchId);

public sealed record ConsultationCreatedDto(int Id, string Message);
