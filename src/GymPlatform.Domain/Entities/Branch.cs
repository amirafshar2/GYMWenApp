using GymPlatform.Domain.Enums;

namespace GymPlatform.Domain.Entities;

public class Branch : BaseEntity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public required string District { get; set; }
    public required string Address { get; set; }
    public string? Phone { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public GenderSection Sections { get; set; }

    /// <summary>false یعنی آدرس/مختصات هنوز تأیید نشده (دادهٔ تقریبی دمو).</summary>
    public bool AddressConfirmed { get; set; }

    public string? MenHours { get; set; }
    public string? WomenHours { get; set; }
    public List<string> Disciplines { get; set; } = [];
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    public ICollection<Coach> Coaches { get; set; } = [];
}
