using GymPlatform.Domain.Enums;

namespace GymPlatform.Domain.Entities;

/// <summary>Filialen, auf die ein Mitarbeiter (Filialleitung, Empfang, Bistro, Shop) Zugriff hat. Der Gesamtadmin hat Zugriff auf alle.</summary>
public class StaffBranch
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
}

/// <summary>Schüler eines Trainers</summary>
public class CoachAssignment : BaseEntity
{
    public int CoachId { get; set; }
    public Coach? Coach { get; set; }
    public int MemberUserId { get; set; }
    public AppUser? Member { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>Trainings- und Ernährungsplan, den der Trainer für den Schüler schreibt (nur der letzte aktive Plan wird angezeigt).</summary>
public class TrainingPlan : BaseEntity
{
    public int MemberUserId { get; set; }
    public int CoachId { get; set; }
    public Coach? Coach { get; set; }
    public required string Title { get; set; }
    /// <summary>Tage als JSON: [{ "day": "Montag", "focus": "...", "items": ["..."] }]</summary>
    public required string DaysJson { get; set; }
    public string? Nutrition { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>Gewicht und Maße (vom Mitglied oder Trainer erfasst)</summary>
public class BodyMetric : BaseEntity
{
    public int UserId { get; set; }
    public DateOnly MeasuredOn { get; set; }
    public decimal WeightKg { get; set; }
    public decimal? BodyFatPercent { get; set; }
    public decimal? WaistCm { get; set; }
    public int? RecordedByUserId { get; set; }
}

/// <summary>Warteschlange und Protokoll der SMS. Ein eindeutiger DedupeKey verhindert doppelte Erinnerungen.</summary>
public class SmsMessage : BaseEntity
{
    public int? UserId { get; set; }
    public required string Phone { get; set; }
    public SmsKind Kind { get; set; }
    public required string Template { get; set; }
    /// <summary>Vorlagenwerte (JSON-Array)</summary>
    public required string TokensJson { get; set; }
    /// <summary>Volltext zur Anzeige im Bericht</summary>
    public required string Preview { get; set; }
    public SmsStatus Status { get; set; } = SmsStatus.Queued;
    public int Attempts { get; set; }
    public DateTime? SentAtUtc { get; set; }
    public string? Error { get; set; }
    public required string DedupeKey { get; set; }
    public int? CampaignId { get; set; }
}
