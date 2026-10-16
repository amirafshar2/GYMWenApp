namespace GymPlatform.Domain.Entities;

public class FaqItem : BaseEntity
{
    public required string Question { get; set; }
    public required string Answer { get; set; }
    public int SortOrder { get; set; }
}
