using GymPlatform.Domain.Enums;

namespace GymPlatform.Domain.Entities;

// ================================================================ Shop
/// <summary>Shop-Produkt: Supplement, Bekleidung oder Zubehör. Grundpreis am Produkt und bei Bedarf je Variante (Größe/Farbe/Geschmack).</summary>
public class Product : BaseEntity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public required string BrandName { get; set; }
    public ProductKind Kind { get; set; }
    /// <summary>Untergruppe für den Filter: Protein, Kreatin, T-Shirt, Shaker…</summary>
    public required string Category { get; set; }
    public string? Description { get; set; }
    public required string ImagePath { get; set; }
    public long PriceToman { get; set; }
    public bool IsHouseBrand { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public List<string> Highlights { get; set; } = [];
    public ICollection<ProductVariant> Variants { get; set; } = [];
}

/// <summary>Eine verkaufbare Variante eines Produkts (z. B. T-Shirt „Schwarz, L“ oder Whey „Schokolade“). Der Bestand hängt an ihr.</summary>
public class ProductVariant : BaseEntity
{
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public required string Sku { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? ColorHex { get; set; }
    public string? Flavor { get; set; }
    /// <summary>Leer = Produktpreis</summary>
    public long? PriceToman { get; set; }
    public ICollection<BranchStock> Stocks { get; set; } = [];

    public string Label => string.Join(", ", new[] { Flavor, Color, Size }.Where(x => !string.IsNullOrEmpty(x)));
}

/// <summary>Bestand einer Variante in einer Filiale. Abzug nur per bedingtem Update (Quantity &gt;= n), damit er nicht negativ wird.</summary>
public class BranchStock : BaseEntity
{
    public int VariantId { get; set; }
    public ProductVariant? Variant { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
    public int Quantity { get; set; }
}

public class ShopOrder : BaseEntity
{
    public string? Number { get; set; }
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.PendingPayment;
    public Fulfillment Fulfillment { get; set; }
    /// <summary>Filiale, aus deren Lager die Ware kommt und (bei Abholung) Abholort ist.</summary>
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string? RecipientName { get; set; }
    public string? RecipientPhone { get; set; }
    public string? Address { get; set; }
    public string? PostalCode { get; set; }
    public long SubtotalToman { get; set; }
    public long DiscountToman { get; set; }
    public long ShippingToman { get; set; }
    public long TotalToman { get; set; }
    public string? DiscountCode { get; set; }
    public PayMethod PayMethod { get; set; }
    public required string IdempotencyKey { get; set; }
    public DateTime? PaidAtUtc { get; set; }
    /// <summary>Bestand für diese Bestellung reserviert und noch nicht zurückgebucht.</summary>
    public bool StockReserved { get; set; }
    public ICollection<ShopOrderItem> Items { get; set; } = [];
}

public class ShopOrderItem : BaseEntity
{
    public int OrderId { get; set; }
    public ShopOrder? Order { get; set; }
    public int VariantId { get; set; }
    public required string ProductName { get; set; }
    public string? VariantLabel { get; set; }
    public required string ImagePath { get; set; }
    public long UnitPriceToman { get; set; }
    public int Quantity { get; set; }
}

// ================================================================ Bistro
public class CanteenItem : BaseEntity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public CanteenCategory Category { get; set; }
    public long PriceToman { get; set; }
    public int? Kcal { get; set; }
    public int? ProteinG { get; set; }
    public required string ImagePath { get; set; }
    public bool IsAvailable { get; set; } = true;
    public int SortOrder { get; set; }
}

public class CanteenOrder : BaseEntity
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
    /// <summary>Tisch- oder Ortscode (aus dem QR), z. B. „Tisch 4“ oder „Herrenbereich“</summary>
    public string? TableCode { get; set; }
    /// <summary>Kurze Tagesnummer zum Aufrufen (1, 2, 3…)</summary>
    public int DailyNumber { get; set; }
    public CanteenOrderStatus Status { get; set; } = CanteenOrderStatus.PendingPayment;
    public long TotalToman { get; set; }
    public PayMethod PayMethod { get; set; }
    public string? Note { get; set; }
    public required string IdempotencyKey { get; set; }
    public DateTime? PaidAtUtc { get; set; }
    public DateTime? ReadyAtUtc { get; set; }
    public DateTime? CollectedAtUtc { get; set; }
    public ICollection<CanteenOrderItem> Items { get; set; } = [];
}

public class CanteenOrderItem : BaseEntity
{
    public int OrderId { get; set; }
    public CanteenOrder? Order { get; set; }
    public int ItemId { get; set; }
    public required string Name { get; set; }
    public long UnitPriceToman { get; set; }
    public int Quantity { get; set; }
}

// ================================================================ Guthaben
/// <summary>Guthaben jedes Mitglieds. Änderungen nur per bedingtem Update und immer mit einer Buchungszeile (WalletTransaction).</summary>
public class Wallet
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public long BalanceToman { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>Guthabenbuch (nur Anhängen, niemals Bearbeiten).</summary>
public class WalletTransaction : BaseEntity
{
    public int UserId { get; set; }
    /// <summary>Positiv = Gutschrift, negativ = Abbuchung</summary>
    public long AmountToman { get; set; }
    public long BalanceAfterToman { get; set; }
    public WalletTxType Type { get; set; }
    public required string Description { get; set; }
    /// <summary>Referenz: shop:12, canteen:40, payment:7</summary>
    public string? Reference { get; set; }
}
