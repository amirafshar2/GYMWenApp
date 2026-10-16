namespace KhashayarGym.Business.Dtos;

// ---- کیف پول ----
public sealed record WalletTxDto(int Id, long AmountToman, long BalanceAfterToman, string Type, string Description, DateTime CreatedAtUtc);
public sealed record WalletDto(long BalanceToman, IReadOnlyList<WalletTxDto> Transactions, IReadOnlyList<long> TopUpPresets, long MinTopUpToman, long MaxTopUpToman);
public sealed record TopUpRequest(long AmountToman, string IdempotencyKey);

/// <summary>نتیجهٔ شروع خرید: اگر از کیف پول پرداخت شد، کامل است؛ وگرنه شمارهٔ پرداخت برای رفتن به درگاه.</summary>
public sealed record PurchaseStartedDto(int? PaymentId, long TrackingNumber, long AmountToman, bool Completed, int OrderId, string? RedirectPath);

// ---- شاپ ----
public sealed record ShopFilter(string? Kind, string? Category, string? Q, string? Branch, bool? InStock, string? Sort);
public sealed record ProductCardDto(
    int Id, string Slug, string Name, string BrandName, string Kind, string Category, string ImagePath, long PriceToman,
    long? MinVariantPriceToman, bool IsKhashayarBrand, bool InStock, IReadOnlyList<string> Colors, IReadOnlyList<string> Sizes, IReadOnlyList<string> Flavors);
public sealed record ShopCatalogDto(IReadOnlyList<ProductCardDto> Products, IReadOnlyList<ShopFacetDto> Categories, IReadOnlyList<string> Brands);
public sealed record ShopFacetDto(string Kind, string Category, int Count);
public sealed record VariantStockDto(string BranchSlug, string BranchName, int Quantity);
public sealed record VariantDto(int Id, string Sku, string? Size, string? Color, string? ColorHex, string? Flavor, string Label, long PriceToman, int TotalStock, IReadOnlyList<VariantStockDto> Stock);
public sealed record ProductDetailDto(
    int Id, string Slug, string Name, string BrandName, string Kind, string Category, string? Description, string ImagePath,
    long PriceToman, bool IsKhashayarBrand, IReadOnlyList<string> Highlights, IReadOnlyList<VariantDto> Variants);

public sealed record CartLine(int VariantId, int Quantity);
public sealed record ShopQuoteRequest(IReadOnlyList<CartLine> Items, string BranchSlug, string Fulfillment, string? DiscountCode);
public sealed record QuoteLineDto(int VariantId, string ProductSlug, string ProductName, string? VariantLabel, string ImagePath, long UnitPriceToman, int Quantity, long LineToman, int AvailableInBranch, string? Problem);
public sealed record ShopQuoteDto(
    IReadOnlyList<QuoteLineDto> Lines, long SubtotalToman, long DiscountToman, long ShippingToman, long TotalToman,
    string? DiscountCode, int? DiscountPercent, string? DiscountCodeError, bool CanCheckout, long FreeShippingFromToman);
public sealed record ShopCheckoutRequest(
    IReadOnlyList<CartLine> Items, string BranchSlug, string Fulfillment, string? DiscountCode, string PayMethod,
    string? RecipientName, string? RecipientPhone, string? Address, string? PostalCode, string IdempotencyKey);
public sealed record ShopOrderItemDto(string ProductName, string? VariantLabel, string ImagePath, long UnitPriceToman, int Quantity);
public sealed record ShopOrderDto(
    int Id, string? Number, string Status, string Fulfillment, string BranchName, string? Address, long SubtotalToman, long DiscountToman,
    long ShippingToman, long TotalToman, string PayMethod, DateTime CreatedAtUtc, DateTime? PaidAtUtc, IReadOnlyList<ShopOrderItemDto> Items);

// ---- بوفه ----
public sealed record CanteenMenuItemDto(int Id, string Slug, string Name, string? Description, string Category, long PriceToman, int? Kcal, int? ProteinG, string ImagePath, bool IsAvailable);
public sealed record CanteenMenuDto(string BranchSlug, string BranchName, string? TableCode, IReadOnlyList<CanteenMenuItemDto> Items);
public sealed record CanteenLine(int ItemId, int Quantity);
public sealed record CanteenOrderRequest(string BranchSlug, string? TableCode, IReadOnlyList<CanteenLine> Items, string? Note, string PayMethod, string IdempotencyKey);
public sealed record CanteenOrderItemDto(string Name, long UnitPriceToman, int Quantity);
public sealed record CanteenOrderDto(
    int Id, int DailyNumber, string Status, int BranchId, string BranchName, string? TableCode, string? CustomerName, long TotalToman, string PayMethod,
    string? Note, DateTime CreatedAtUtc, DateTime? PaidAtUtc, DateTime? ReadyAtUtc, IReadOnlyList<CanteenOrderItemDto> Items);
public sealed record CanteenStatusRequest(string Status);

// ---- پروفایل ----
public sealed record OrdersSummaryDto(IReadOnlyList<ShopOrderDto> Shop, IReadOnlyList<CanteenOrderDto> Canteen);
