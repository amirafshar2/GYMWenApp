using KhashayarGym.Domain.Enums;

namespace KhashayarGym.Domain.Entities;

// ================================================================ شاپ خشایار
/// <summary>کالای فروشگاه: مکمل، پوشاک یا لوازم. قیمت پایه روی کالا و در صورت نیاز روی هر مدل (سایز/رنگ/طعم).</summary>
public class Product : BaseEntity
{
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public required string BrandName { get; set; }
    public ProductKind Kind { get; set; }
    /// <summary>زیرگروه برای فیلتر: پروتئین، کراتین، تیشرت، شیکر…</summary>
    public required string Category { get; set; }
    public string? Description { get; set; }
    public required string ImagePath { get; set; }
    public long PriceToman { get; set; }
    public bool IsKhashayarBrand { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public List<string> Highlights { get; set; } = [];
    public ICollection<ProductVariant> Variants { get; set; } = [];
}

/// <summary>یک مدل قابل‌فروش از کالا (مثلاً تیشرت «مشکی، L» یا وی «شکلات»). موجودی روی همین ثبت می‌شود.</summary>
public class ProductVariant : BaseEntity
{
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public required string Sku { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? ColorHex { get; set; }
    public string? Flavor { get; set; }
    /// <summary>خالی = قیمت کالا</summary>
    public long? PriceToman { get; set; }
    public ICollection<BranchStock> Stocks { get; set; } = [];

    public string Label => string.Join(" · ", new[] { Flavor, Color, Size }.Where(x => !string.IsNullOrEmpty(x)));
}

/// <summary>موجودی یک مدل کالا در یک شعبه. کم شدن فقط با به‌روزرسانی شرطی (Quantity &gt;= n) انجام می‌شود تا منفی نشود.</summary>
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
    /// <summary>شعبه‌ای که کالا از انبارش برداشته می‌شود و (در تحویل حضوری) محل تحویل است.</summary>
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
    /// <summary>موجودی برای این سفارش کنار گذاشته شده و هنوز برنگشته است.</summary>
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

// ================================================================ بوفه
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
    /// <summary>کد میز یا محل (از QR)، مثل «میز ۴» یا «سالن آقایان»</summary>
    public string? TableCode { get; set; }
    /// <summary>شمارهٔ کوتاه روزانه برای صدا زدن (۱، ۲، ۳…)</summary>
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

// ================================================================ کیف پول
/// <summary>موجودی کیف پول هر عضو. تغییر فقط با به‌روزرسانی شرطی و همیشه همراه یک ردیف دفتر (WalletTransaction).</summary>
public class Wallet
{
    public int UserId { get; set; }
    public AppUser? User { get; set; }
    public long BalanceToman { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>دفتر کیف پول (فقط اضافه می‌شود، هرگز ویرایش نمی‌شود).</summary>
public class WalletTransaction : BaseEntity
{
    public int UserId { get; set; }
    /// <summary>مثبت = واریز، منفی = برداشت</summary>
    public long AmountToman { get; set; }
    public long BalanceAfterToman { get; set; }
    public WalletTxType Type { get; set; }
    public required string Description { get; set; }
    /// <summary>مرجع: shop:12، canteen:40، payment:7</summary>
    public string? Reference { get; set; }
}
