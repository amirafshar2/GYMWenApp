using GymPlatform.Domain.Enums;

namespace GymPlatform.Domain.Entities;

/// <summary>Mitgliedschaft eines Benutzers in einer Filiale mit einem Paket.</summary>
public class Membership : BaseEntity
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
    public int PackageId { get; set; }
    public MembershipPackage? Package { get; set; }

    /// <summary>Herren- oder Damenbereich (ein Wert, keine Kombination).</summary>
    public GenderSection Section { get; set; }
    public MembershipStatus Status { get; set; } = MembershipStatus.PendingPayment;
    public DateTime? StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }
    public int? SessionsTotal { get; set; }
    public int SessionsUsed { get; set; }

    /// <summary>Zufälliges Token der Mitgliedskarte (QR); nicht erratbar und ohne Bezug zur ID.</summary>
    public required string CardToken { get; set; }

    public ICollection<Payment> Payments { get; set; } = [];

    public bool IsActiveAt(DateTime utcNow) =>
        Status == MembershipStatus.Active && StartsAtUtc <= utcNow && EndsAtUtc > utcNow;
}

public class Payment : BaseEntity
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public PaymentPurpose Purpose { get; set; } = PaymentPurpose.Membership;
    public int? MembershipId { get; set; }
    public Membership? Membership { get; set; }
    public int? ShopOrderId { get; set; }
    public ShopOrder? ShopOrder { get; set; }
    public int? CanteenOrderId { get; set; }
    public CanteenOrder? CanteenOrder { get; set; }
    /// <summary>Lesbare Beschreibung für die Zahlungsliste (Paketname, „Shop-Bestellung KS-…“, „Guthaben aufladen“)</summary>
    public string? Description { get; set; }

    public long BaseAmountToman { get; set; }
    public long CampaignDiscountToman { get; set; }
    public long CodeDiscountToman { get; set; }
    public long AmountToman { get; set; }
    public int? CampaignId { get; set; }
    public string? DiscountCode { get; set; }

    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    /// <summary>Eindeutige Referenznummer für das Gateway (Parbad TrackingNumber).</summary>
    public long TrackingNumber { get; set; }
    public string Gateway { get; set; } = "ParbadVirtual";
    public string? TransactionCode { get; set; }
    public string? GatewayMessage { get; set; }

    /// <summary>Eindeutiger Schlüssel der Benutzeranfrage; eine Wiederholung mit demselben Schlüssel erzeugt keine neue Zahlung.</summary>
    public required string IdempotencyKey { get; set; }
    public DateTime? PaidAtUtc { get; set; }
    public string? InvoiceNumber { get; set; }
}

public class DiscountCode : BaseEntity
{
    public required string Code { get; set; }
    public int Percent { get; set; }
    public int? MaxUses { get; set; }
    public int UsedCount { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public DiscountScope Scope { get; set; } = DiscountScope.Membership;
    /// <summary>Nur Mitglieder mit aktiver Mitgliedschaft</summary>
    public bool MembersOnly { get; set; }

    public bool AppliesTo(DiscountScope s) => Scope == DiscountScope.Any || Scope == s;

    public bool IsUsableAt(DateTime utcNow) =>
        IsActive && (ExpiresAtUtc is null || utcNow < ExpiresAtUtc) && (MaxUses is null || UsedCount < MaxUses);
}
