namespace GymPlatform.Domain.Entities;

/// <summary>متن قرارداد نسخه‌دار؛ مدیر نسخهٔ تازه منتشر می‌کند و نسخه‌های قبلی برای قراردادهای امضاشده می‌مانند.</summary>
public class ContractTemplate : BaseEntity
{
    public int Version { get; set; }
    public required string Title { get; set; }

    /// <summary>بندهای قرارداد، هر بند یک پاراگراف.</summary>
    public List<string> Clauses { get; set; } = [];

    /// <summary>پرسش‌های فرم سلامت پیش از ورزش (PAR-Q) — پاسخ بله/خیر.</summary>
    public List<string> HealthQuestions { get; set; } = [];
    public bool IsActive { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
}

public class SignedContract : BaseEntity
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public int TemplateId { get; set; }
    public ContractTemplate? Template { get; set; }
    public int Version { get; set; }
    public required string SignerName { get; set; }
    public required string SignerPhone { get; set; }
    public DateTime SignedAtUtc { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    /// <summary>پاسخ‌های فرم سلامت به ترتیب پرسش‌ها.</summary>
    public List<bool> HealthAnswers { get; set; } = [];
    public string? HealthNotes { get; set; }

    /// <summary>SHA-256 متن دقیق امضاشده (بندها + پاسخ‌ها) برای اثبات عدم تغییر.</summary>
    public required string ContentHash { get; set; }

    /// <summary>مسیر نسبی PDF بیرون از wwwroot.</summary>
    public string? PdfPath { get; set; }
}
