namespace KhashayarGym.Domain.Entities;

/// <summary>درخواست مشاورهٔ رایگان از فرم سایت.</summary>
public class ConsultationRequest : BaseEntity
{
    public required string FullName { get; set; }
    public required string Mobile { get; set; }
    public string? Goal { get; set; }
    public string? Message { get; set; }
    public int? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public bool IsHandled { get; set; }
}
