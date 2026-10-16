using KhashayarGym.Domain.Enums;

namespace KhashayarGym.Domain.Entities;

/// <summary>
/// وسیلهٔ ورود عضو: کارت QR دیجیتال (خودکار از عضویت)، دستبند یا کارت RFID که پذیرش تحویل می‌دهد،
/// یا شناسهٔ عضو در سیستم گیتِ شرکت دیگر. یک عضو می‌تواند چند وسیله داشته باشد.
/// </summary>
public class AccessCredential : BaseEntity
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public CredentialType Type { get; set; }

    /// <summary>مقدار نرمال‌شده (UID دستبند با حروف بزرگ و بدون فاصله/دونقطه).</summary>
    public required string Value { get; set; }
    public string? Label { get; set; }

    /// <summary>شناسهٔ همین عضو در نرم‌افزار گیتِ شرکت سازنده (برای همگام‌سازی).</summary>
    public string? ExternalRef { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public int? IssuedByUserId { get; set; }

    public bool IsActive => RevokedAtUtc is null;
}

/// <summary>گیت، ترنستایل یا کارت‌خوان یک شعبه. با کلید API (فقط هش آن ذخیره می‌شود) احراز می‌شود.</summary>
public class AccessDevice : BaseEntity
{
    public required string Name { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }

    /// <summary>سالنی که این گیت جلویش است؛ Both یعنی ورودی مشترک.</summary>
    public GenderSection Section { get; set; } = GenderSection.Both;
    public required string KeyHash { get; set; }
    public string? Vendor { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastSeenAtUtc { get; set; }
}

/// <summary>هر بار که کسی کارت/دستبند می‌زند (مجاز یا غیرمجاز)؛ پایهٔ حضور و غیاب و گزارش‌ها.</summary>
public class CheckIn : BaseEntity
{
    public int DeviceId { get; set; }
    public AccessDevice? Device { get; set; }
    public int BranchId { get; set; }
    public int? UserId { get; set; }
    public int? MembershipId { get; set; }
    public CredentialType CredentialType { get; set; }

    /// <summary>فقط چهار نویسهٔ آخر وسیله (برای پیگیری، بدون نگه‌داشتن مقدار کامل).</summary>
    public string? CredentialHint { get; set; }
    public AccessDecision Decision { get; set; }
    public AccessDenyReason Reason { get; set; }
    public bool SessionCounted { get; set; }
    public DateTime OccurredAtUtc { get; set; }

    /// <summary>شناسهٔ رویداد از طرف دستگاه؛ ارسال دوباره همان رویداد دوبار ثبت نمی‌شود.</summary>
    public string? ExternalEventId { get; set; }
}

/// <summary>
/// صف خروجی (Outbox): رویدادهایی مثل «عضویت فعال شد» داخل همان تراکنش ثبت و بعداً به سیستم‌های بیرونی
/// (نرم‌افزار گیت، حسابداری، پیامک) فرستاده می‌شوند؛ اگر آن سیستم قطع باشد چیزی گم نمی‌شود.
/// </summary>
public class IntegrationEvent : BaseEntity
{
    public required string Type { get; set; }
    public required string Payload { get; set; }
    public DateTime? ProcessedAtUtc { get; set; }
    public int Attempts { get; set; }
    public DateTime NextAttemptAtUtc { get; set; } = DateTime.UtcNow;
    public string? LastError { get; set; }
}
