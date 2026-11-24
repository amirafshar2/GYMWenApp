using GymPlatform.Domain.Enums;

namespace GymPlatform.Domain.Entities;

/// <summary>
/// Zutrittsmittel eines Mitglieds: digitale QR-Karte (automatisch aus der Mitgliedschaft), RFID-Armband oder -Karte vom Empfang,
/// oder die Mitglieds-ID im Gate-System eines anderen Herstellers. Ein Mitglied kann mehrere Mittel haben.
/// </summary>
public class AccessCredential : BaseEntity
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public CredentialType Type { get; set; }

    /// <summary>Normalisierter Wert (Armband-UID in Großbuchstaben ohne Leerzeichen/Doppelpunkte).</summary>
    public required string Value { get; set; }
    public string? Label { get; set; }

    /// <summary>ID dieses Mitglieds in der Gate-Software des Herstellers (zur Synchronisierung).</summary>
    public string? ExternalRef { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public int? IssuedByUserId { get; set; }

    public bool IsActive => RevokedAtUtc is null;
}

/// <summary>Gate, Drehkreuz oder Kartenleser einer Filiale. Authentifizierung per API-Schlüssel (nur der Hash wird gespeichert).</summary>
public class AccessDevice : BaseEntity
{
    public required string Name { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }

    /// <summary>Bereich, vor dem dieses Gate steht; Both = gemeinsamer Eingang.</summary>
    public GenderSection Section { get; set; } = GenderSection.Both;
    public required string KeyHash { get; set; }
    public string? Vendor { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastSeenAtUtc { get; set; }
}

/// <summary>Jeder Karten-/Armband-Scan (erlaubt oder abgelehnt); Grundlage für Anwesenheit und Berichte.</summary>
public class CheckIn : BaseEntity
{
    public int DeviceId { get; set; }
    public AccessDevice? Device { get; set; }
    public int BranchId { get; set; }
    public int? UserId { get; set; }
    public int? MembershipId { get; set; }
    public CredentialType CredentialType { get; set; }

    /// <summary>Nur die letzten vier Zeichen des Mittels (zur Nachverfolgung, ohne den vollen Wert zu speichern).</summary>
    public string? CredentialHint { get; set; }
    public AccessDecision Decision { get; set; }
    public AccessDenyReason Reason { get; set; }
    public bool SessionCounted { get; set; }
    public DateTime OccurredAtUtc { get; set; }

    /// <summary>Ereignis-ID vom Gerät; ein erneut gesendetes Ereignis wird nicht doppelt erfasst.</summary>
    public string? ExternalEventId { get; set; }
}

/// <summary>
/// Ausgangswarteschlange (Outbox): Ereignisse wie „Mitgliedschaft aktiviert“ werden in derselben Transaktion gespeichert und später an externe Systeme
/// (Gate-Software, Buchhaltung, SMS) gesendet; ist das System nicht erreichbar, geht nichts verloren.
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
