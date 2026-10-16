using GymPlatform.Domain.Enums;

namespace GymPlatform.Domain.Entities;

/// <summary>شعبه‌هایی که یک کارمند (مدیر شعبه، پذیرش، بوفه، فروشگاه) به آن‌ها دسترسی دارد. مدیر کل به همه دسترسی دارد.</summary>
public class StaffBranch
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
}

/// <summary>شاگردِ یک مربی</summary>
public class CoachAssignment : BaseEntity
{
    public int CoachId { get; set; }
    public Coach? Coach { get; set; }
    public int MemberUserId { get; set; }
    public AppUser? Member { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>برنامهٔ تمرینی و غذایی که مربی برای شاگرد می‌نویسد (فقط آخرین برنامهٔ فعال نمایش داده می‌شود).</summary>
public class TrainingPlan : BaseEntity
{
    public int MemberUserId { get; set; }
    public int CoachId { get; set; }
    public Coach? Coach { get; set; }
    public required string Title { get; set; }
    /// <summary>روزها به‌صورت JSON: [{ "day": "شنبه", "focus": "...", "items": ["..."] }]</summary>
    public required string DaysJson { get; set; }
    public string? Nutrition { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>وزن و اندازه‌ها (عضو یا مربی ثبت می‌کند)</summary>
public class BodyMetric : BaseEntity
{
    public int UserId { get; set; }
    public DateOnly MeasuredOn { get; set; }
    public decimal WeightKg { get; set; }
    public decimal? BodyFatPercent { get; set; }
    public decimal? WaistCm { get; set; }
    public int? RecordedByUserId { get; set; }
}

/// <summary>صف و گزارش پیامک‌ها. DedupeKey یکتا جلوی ارسال دوبارهٔ یک یادآوری را می‌گیرد.</summary>
public class SmsMessage : BaseEntity
{
    public int? UserId { get; set; }
    public required string Phone { get; set; }
    public SmsKind Kind { get; set; }
    public required string Template { get; set; }
    /// <summary>مقادیر الگو (JSON آرایه)</summary>
    public required string TokensJson { get; set; }
    /// <summary>متن کامل برای نمایش در گزارش</summary>
    public required string Preview { get; set; }
    public SmsStatus Status { get; set; } = SmsStatus.Queued;
    public int Attempts { get; set; }
    public DateTime? SentAtUtc { get; set; }
    public string? Error { get; set; }
    public required string DedupeKey { get; set; }
    public int? CampaignId { get; set; }
}
