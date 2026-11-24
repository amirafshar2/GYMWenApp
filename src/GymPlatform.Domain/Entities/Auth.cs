using GymPlatform.Domain.Enums;

namespace GymPlatform.Domain.Entities;

/// <summary>SMS-Einmalcode. Der Code selbst wird nicht gespeichert; nur sein HMAC.</summary>
public class OtpCode : BaseEntity
{
    public required string PhoneNumber { get; set; }
    public OtpPurpose Purpose { get; set; }
    public required string CodeHash { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public int Attempts { get; set; }
    public DateTime? ConsumedAtUtc { get; set; }
    public string? RequestIp { get; set; }
}

/// <summary>Refresh-Token (im HttpOnly-Cookie). Nur der SHA-256-Hash wird gespeichert; bei jeder Nutzung rotiert.</summary>
public class RefreshToken : BaseEntity
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public required string TokenHash { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? ReplacedByHash { get; set; }
    public string? CreatedIp { get; set; }

    public bool IsActive(DateTime utcNow) => RevokedAtUtc is null && utcNow < ExpiresAtUtc;
}

/// <summary>Audit-Log (Vertrag, Zahlung, Preis, Rollen…).</summary>
public class AuditLog : BaseEntity
{
    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public string? EntityId { get; set; }
    public int? UserId { get; set; }
    public string? Data { get; set; }
    public string? Ip { get; set; }
}
