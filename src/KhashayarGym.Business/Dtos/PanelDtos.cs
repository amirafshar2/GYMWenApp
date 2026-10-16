namespace KhashayarGym.Business.Dtos;

// ---- دسترسی کارمند ----
/// <summary>کارمند فعلی و شعبه‌هایی که می‌تواند ببیند. مدیر کل همهٔ شعبه‌ها را دارد.</summary>
public sealed record StaffScope(int UserId, IReadOnlyList<string> Roles, bool IsSuperAdmin, IReadOnlyList<int> BranchIds)
{
    public bool Can(int branchId) => IsSuperAdmin || BranchIds.Contains(branchId);
    public bool Has(string role) => IsSuperAdmin || Roles.Contains(role);
}
public sealed record PanelMeDto(int UserId, string? FullName, IReadOnlyList<string> Roles, IReadOnlyList<BranchRefDto> Branches, int? CoachId);
public sealed record BranchRefDto(int Id, string Slug, string Name);

// ---- داشبورد ----
public sealed record RevenueSplitDto(long Membership, long Shop, long Canteen)
{
    public long Total => Membership + Shop + Canteen;
}
public sealed record DailyRevenueDto(DateOnly Date, long Membership, long Shop, long Canteen);
public sealed record BranchStatDto(string Slug, string Name, RevenueSplitDto Revenue, int ActiveMembers, int CheckIns, int NewMembers);
public sealed record ExpiringMemberDto(int UserId, string? FullName, string Phone, string BranchName, string PackageName, DateTime EndsAtUtc, int DaysLeft);
public sealed record CampaignEffectDto(int Id, string Title, DateTime StartsAtUtc, DateTime EndsAtUtc, int Registrations, long RevenueToman, long DiscountGivenToman, bool IsRunning);
public sealed record DashboardDto(
    string? Branch, int Days, RevenueSplitDto Today, RevenueSplitDto Period, RevenueSplitDto PreviousPeriod,
    int ActiveMembers, int CheckInsToday, int NewMembers, double RenewalRate,
    IReadOnlyList<DailyRevenueDto> Daily, IReadOnlyList<BranchStatDto> Branches, IReadOnlyList<ExpiringMemberDto> Expiring,
    IReadOnlyList<CampaignEffectDto> Campaigns, IReadOnlyList<int> CheckInsByHour);

// ---- پذیرش ----
public sealed record MemberSearchRowDto(int UserId, string? FullName, string Phone, string? ActivePackage, string? ActiveBranch, int? DaysLeft);
public sealed record MemberSummaryDto(
    int UserId, string? FullName, string Phone, string? Gender, MembershipDto? Active, IReadOnlyList<MembershipDto> Memberships,
    IReadOnlyList<Services.Access.CredentialDto> Credentials, IReadOnlyList<CheckInRowDto> RecentCheckIns, long WalletToman, bool HasSignedContract);
public sealed record CheckInRowDto(int Id, DateTime OccurredAtUtc, string BranchName, string? MemberName, int? UserId, bool Allowed, string Reason, string Method);
public sealed record ReceptionCheckInRequest(string BranchSlug, string? Credential, int? UserId = null);

// ---- مربی ----
public sealed record PlanDayDto(string Day, string Focus, IReadOnlyList<string> Items);
public sealed record TrainingPlanDto(int Id, string Title, IReadOnlyList<PlanDayDto> Days, string? Nutrition, string CoachName, DateTime UpdatedAtUtc);
public sealed record SavePlanRequest(string Title, IReadOnlyList<PlanDayDto> Days, string? Nutrition);
public sealed record BodyMetricDto(int Id, DateOnly MeasuredOn, decimal WeightKg, decimal? BodyFatPercent, decimal? WaistCm);
public sealed record AddMetricRequest(decimal WeightKg, decimal? BodyFatPercent, decimal? WaistCm, DateOnly? MeasuredOn);
public sealed record TraineeRowDto(int UserId, string? FullName, string Phone, string? Gender, string? ActivePackage, int? DaysLeft, decimal? LastWeightKg, decimal? WeightChangeKg, DateTime? PlanUpdatedAtUtc, DateTime? LastCheckInUtc);
public sealed record TraineeDetailDto(TraineeRowDto Member, MembershipDto? Active, IReadOnlyList<BodyMetricDto> Metrics, TrainingPlanDto? Plan, int CheckIns30);
public sealed record AddTraineeRequest(string Phone);
public sealed record PreferencesRequest(DateOnly? BirthDate, bool MarketingSmsOptIn);
public sealed record PreferencesDto(DateOnly? BirthDate, bool MarketingSmsOptIn);

// ---- مدیریت محتوا ----
public sealed record AdminPackageDto(int Id, string Slug, string Name, string? Tagline, string Category, int DurationMonths, int? Sessions, long PriceToman, bool IsActive, bool IsFeatured, int SortOrder);
public sealed record UpdatePackageRequest(long PriceToman, bool IsActive, bool IsFeatured, string? Tagline);
public sealed record AdminCampaignDto(int Id, string Title, string? Description, DateTime StartsAtUtc, DateTime EndsAtUtc, int DiscountPercent, long? DiscountAmountToman,
    IReadOnlyList<string> EligiblePackageSlugs, IReadOnlyList<string> EligibleBranchSlugs, int? MaxRedemptions, int RedemptionCount, bool IsActive, bool IsRunning);
public sealed record SaveCampaignRequest(string Title, string? Description, DateTime StartsAtUtc, DateTime EndsAtUtc, int DiscountPercent, long? DiscountAmountToman,
    IReadOnlyList<string>? EligiblePackageSlugs, IReadOnlyList<string>? EligibleBranchSlugs, int? MaxRedemptions, bool IsActive);
public sealed record CampaignAudienceDto(int Recipients, int ExpiredMembers, int OptedOut, string Preview);
public sealed record AdminDiscountCodeDto(int Id, string Code, int Percent, int? MaxUses, int UsedCount, DateTime? ExpiresAtUtc, bool IsActive, string Scope, bool MembersOnly);
public sealed record SaveDiscountCodeRequest(string Code, int Percent, int? MaxUses, DateTime? ExpiresAtUtc, bool IsActive, string Scope, bool MembersOnly);
public sealed record AdminContractDto(int Id, int Version, string Title, IReadOnlyList<string> Clauses, IReadOnlyList<string> HealthQuestions, bool IsActive, DateTime? PublishedAtUtc, int Signatures);
public sealed record PublishContractRequest(string Title, IReadOnlyList<string> Clauses, IReadOnlyList<string> HealthQuestions);
public sealed record AdminStockDto(string BranchSlug, string BranchName, int Quantity);
public sealed record AdminVariantDto(int Id, string Sku, string Label, long? PriceToman, IReadOnlyList<AdminStockDto> Stock);
public sealed record AdminProductDto(int Id, string Slug, string Name, string Kind, string Category, string ImagePath, long PriceToman, bool IsActive, IReadOnlyList<AdminVariantDto> Variants);
public sealed record UpdateProductRequest(long PriceToman, bool IsActive);
public sealed record SetStockRequest(string BranchSlug, int Quantity);
public sealed record AdminShopOrderDto(int Id, string? Number, string Status, string Fulfillment, string BranchName, string? CustomerName, string CustomerPhone,
    string? Address, long TotalToman, DateTime CreatedAtUtc, IReadOnlyList<ShopOrderItemDto> Items);
public sealed record ShopOrderStatusRequest(string Status);
public sealed record AdminCanteenItemDto(int Id, string Name, string Category, long PriceToman, bool IsAvailable, string ImagePath);
public sealed record UpdateCanteenItemRequest(long PriceToman, bool IsAvailable);

// ---- کارکنان ----
public sealed record StaffRowDto(int UserId, string? FullName, string Phone, IReadOnlyList<string> Roles, IReadOnlyList<BranchRefDto> Branches, DateTime? LastLoginAtUtc);
public sealed record SaveStaffRequest(string Phone, string? FullName, IReadOnlyList<string> Roles, IReadOnlyList<string> BranchSlugs);

// ---- پیامک ----
public sealed record SmsRowDto(int Id, string Phone, string Kind, string Preview, string Status, DateTime CreatedAtUtc, DateTime? SentAtUtc, string? Error);
public sealed record SmsStatsDto(int Queued, int SentToday, int Failed, IReadOnlyList<SmsRowDto> Recent);
