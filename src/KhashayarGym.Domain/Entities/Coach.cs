using KhashayarGym.Domain.Enums;

namespace KhashayarGym.Domain.Entities;

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

    public int BranchId { get; set; }
    public Branch? Branch { get; set; }

    /// <summary>حساب ورود مربی (برای پنل مربی)</summary>
    public int? UserId { get; set; }
    public AppUser? User { get; set; }
}
