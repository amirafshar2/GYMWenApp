namespace GymPlatform.Domain.Entities;

/// <summary>Versionierter Vertragstext; der Admin veröffentlicht neue Versionen, frühere bleiben für unterschriebene Verträge erhalten.</summary>
public class ContractTemplate : BaseEntity
{
    public int Version { get; set; }
    public required string Title { get; set; }

    /// <summary>Vertragsklauseln, jede Klausel ein Absatz.</summary>
    public List<string> Clauses { get; set; } = [];

    /// <summary>Fragen des Gesundheitsfragebogens vor dem Training (PAR-Q) — Antwort Ja/Nein.</summary>
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

    /// <summary>Antworten des Gesundheitsfragebogens in der Reihenfolge der Fragen.</summary>
    public List<bool> HealthAnswers { get; set; } = [];
    public string? HealthNotes { get; set; }

    /// <summary>SHA-256 des exakt unterschriebenen Textes (Klauseln + Antworten) als Nachweis der Unverändertheit.</summary>
    public required string ContentHash { get; set; }

    /// <summary>Relativer Pfad des PDFs außerhalb von wwwroot.</summary>
    public string? PdfPath { get; set; }
}
