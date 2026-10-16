namespace GymPlatform.Business.Dtos;

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
public sealed record AdminPackageDto(int Id, string Slug, string Name, string? Tagline, string Category, int DurationMonths, int? Sessions, long PriceToman, bool IsActive, bool IsFeatured, int SortOrder, IReadOnlyList<string> Features, int Memberships);
/// <summary>ساخت/ویرایش کامل پکیج (فقط مدیر کل)</summary>
public sealed record SavePackageRequest(string Name, string? Tagline, string Category, int DurationMonths, int? Sessions, long PriceToman, IReadOnlyList<string>? Features, bool IsActive, bool IsFeatured);
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
public sealed record AdminProductDto(int Id, string Slug, string Name, string Kind, string Category, string ImagePath, long PriceToman, bool IsActive, IReadOnlyList<AdminVariantDto> Variants,
    string BrandName = "", string? Description = null, IReadOnlyList<string>? Highlights = null, IReadOnlyList<SaveVariantDto>? VariantDetails = null);
public sealed record SaveVariantDto(int? Id, string? Size, string? Color, string? ColorHex, string? Flavor, long? PriceToman);
/// <summary>ساخت/ویرایش کامل کالا (فقط مدیر کل). مدل‌ها اضافه/ویرایش می‌شوند ولی حذف نمی‌شوند (سفارش‌های قبلی به آن‌ها اشاره دارند)؛ برای برداشتن کالا «نمایش در سایت» را خاموش کنید.</summary>
public sealed record SaveProductRequest(string Name, string BrandName, string Kind, string Category, string? Description, long PriceToman, string ImagePath, bool IsActive,
    IReadOnlyList<string>? Highlights, IReadOnlyList<SaveVariantDto>? Variants);
public sealed record UpdateProductRequest(long PriceToman, bool IsActive);
public sealed record SetStockRequest(string BranchSlug, int Quantity);
public sealed record AdminShopOrderDto(int Id, string? Number, string Status, string Fulfillment, string BranchName, string? CustomerName, string CustomerPhone,
    string? Address, long TotalToman, DateTime CreatedAtUtc, IReadOnlyList<ShopOrderItemDto> Items);
public sealed record ShopOrderStatusRequest(string Status);
public sealed record AdminCanteenItemDto(int Id, string Name, string Category, long PriceToman, bool IsAvailable, string ImagePath, string? Description = null, int? Kcal = null, int? ProteinG = null);
/// <summary>ساخت/ویرایش کامل آیتم منو (فقط مدیر کل؛ منو برای همهٔ شعبه‌ها یکی است)</summary>
public sealed record SaveCanteenItemRequest(string Name, string? Description, string Category, long PriceToman, int? Kcal, int? ProteinG, string ImagePath, bool IsAvailable);
public sealed record ImageLibraryDto(IReadOnlyList<string> Canteen, IReadOnlyList<string> Shop, IReadOnlyList<string> Uploads);
public sealed record UpdateCanteenItemRequest(long PriceToman, bool IsAvailable);

// ---- کارکنان ----
public sealed record StaffRowDto(int UserId, string? FullName, string Phone, IReadOnlyList<string> Roles, IReadOnlyList<BranchRefDto> Branches, DateTime? LastLoginAtUtc);
public sealed record SaveStaffRequest(string Phone, string? FullName, IReadOnlyList<string> Roles, IReadOnlyList<string> BranchSlugs);

// ---- پیامک ----
public sealed record SmsRowDto(int Id, string Phone, string Kind, string Preview, string Status, DateTime CreatedAtUtc, DateTime? SentAtUtc, string? Error);
public sealed record SmsStatsDto(int Queued, int SentToday, int Failed, IReadOnlyList<SmsRowDto> Recent);

// ---- مربیان (مدیر کل) ----
public sealed record AdminCoachDto(int Id, string Slug, string FullName, string Specialty, string? Bio, int YearsOfExperience, string Section,
    string BranchSlug, string BranchName, string? PhotoUrl, IReadOnlyList<string> Achievements, bool IsActive, string? LinkedPhone, string? LinkedName, int Trainees);
/// <summary>LinkedPhone: موبایل حساب ورود مربی به پنل مربی (خالی = هنوز حساب ندارد)</summary>
public sealed record SaveCoachRequest(string FullName, string Specialty, string? Bio, int YearsOfExperience, string Section, string BranchSlug,
    string? PhotoUrl, IReadOnlyList<string>? Achievements, bool IsActive, string? LinkedPhone);
