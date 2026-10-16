namespace KhashayarGym.Business.Dtos;

// ---- احراز هویت ----
public sealed record OtpRequest(string PhoneNumber);
public sealed record OtpSentDto(int ExpiresInSeconds, int ResendInSeconds, string? DemoCode);
public sealed record VerifyOtpRequest(string PhoneNumber, string Code);
public sealed record UserDto(int Id, string PhoneNumber, string? FullName, string? Gender, IReadOnlyList<string> Roles);
public sealed record AuthResultDto(string AccessToken, DateTime AccessTokenExpiresAtUtc, UserDto User);
/// <summary>نتیجهٔ داخلی ورود: توکن تازه‌سازی خام فقط به کوکی می‌رود، نه به بدنهٔ پاسخ.</summary>
public sealed record AuthSession(AuthResultDto Auth, string RefreshToken, DateTime RefreshExpiresAtUtc);
public sealed record UpdateProfileRequest(string FullName, string? Gender);

// ---- ثبت‌نام و پرداخت ----
public sealed record QuoteRequest(string BranchSlug, string PackageSlug, string Section, string? DiscountCode);
public sealed record QuoteDto(
    string BranchName, string PackageName, string Section, int DurationMonths, int? Sessions,
    long BaseAmountToman, int? CampaignPercent, string? CampaignTitle, long CampaignDiscountToman,
    string? DiscountCode, int? DiscountCodePercent, long CodeDiscountToman, long TotalToman,
    string? DiscountCodeError);
public sealed record StartCheckoutRequest(string BranchSlug, string PackageSlug, string Section, string? DiscountCode, string IdempotencyKey);
public sealed record CheckoutStartedDto(int PaymentId, long TrackingNumber, long AmountToman, bool AlreadyPaid);
public sealed record PaymentResultDto(
    int Id, string Status, long AmountToman, long BaseAmountToman, long CampaignDiscountToman, long CodeDiscountToman,
    string? DiscountCode, string? TransactionCode, string? InvoiceNumber, DateTime CreatedAtUtc, DateTime? PaidAtUtc,
    string PackageName, string BranchName, string Section, string? GatewayMessage, MembershipDto? Membership);

// ---- عضویت و پروفایل ----
public sealed record MembershipDto(
    int Id, string Status, string BranchName, string BranchSlug, string PackageName, string PackageSlug, string Section,
    DateTime? StartsAtUtc, DateTime? EndsAtUtc, int? DaysLeft, int TotalDays, int? SessionsTotal, int SessionsUsed,
    bool IsActive, string CardToken);
public sealed record PaymentRowDto(int Id, string Status, long AmountToman, string PackageName, string? InvoiceNumber, DateTime CreatedAtUtc, DateTime? PaidAtUtc);
public sealed record SignedContractRowDto(int Id, int Version, string Title, DateTime SignedAtUtc);
public sealed record ProfileDto(
    UserDto User, MembershipDto? Active, IReadOnlyList<MembershipDto> Memberships, IReadOnlyList<PaymentRowDto> Payments,
    IReadOnlyList<SignedContractRowDto> Contracts, bool HasSignedLatestContract);

// ---- قرارداد ----
public sealed record ContractDto(int Id, int Version, string Title, IReadOnlyList<string> Clauses, IReadOnlyList<string> HealthQuestions);
public sealed record SignContractRequest(int Version, string FullName, bool Accepted, IReadOnlyList<bool> HealthAnswers, string? HealthNotes, string Code);
public sealed record SignedContractDto(int Id, int Version, DateTime SignedAtUtc, string ContentHash, bool HealthWarning);
