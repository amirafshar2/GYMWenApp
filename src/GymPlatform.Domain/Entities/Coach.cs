using GymPlatform.Domain.Enums;

namespace GymPlatform.Domain.Entities;

public class Coach : BaseEntity
{
    public required string Slug { get; set; }
    public required string FullName { get; set; }
    public required string Specialty { get; set; }
    public string? Bio { get; set; }
    public int YearsOfExperience { get; set; }
    public GenderSection Section { get; set; }
    public string? PhotoUrl { get; set; }
    public List<string> Achievements { get; set; } = [];
    public int SortOrder { get; set; }
    /// <summary>false یعنی در سایت نمایش داده نمی‌شود (مربی رفته یا موقتاً نیست)؛ سابقهٔ شاگردها می‌ماند.</summary>
    public bool IsActive { get; set; } = true;

    public int BranchId { get; set; }
    public Branch? Branch { get; set; }

    /// <summary>حساب ورود مربی (برای پنل مربی)</summary>
    public int? UserId { get; set; }
    public AppUser? User { get; set; }
}
