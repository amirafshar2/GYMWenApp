using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymPlatform.Business.Services.Commerce;

public interface IShopService
{
    Task<ShopCatalogDto> CatalogAsync(ShopFilter filter, CancellationToken ct);
    Task<ProductDetailDto?> DetailAsync(string slug, CancellationToken ct);
    Task<Result<ShopQuoteDto>> QuoteAsync(int? userId, ShopQuoteRequest request, CancellationToken ct);
    Task<Result<PurchaseStartedDto>> CheckoutAsync(int userId, ShopCheckoutRequest request, CancellationToken ct);
    Task<IReadOnlyList<ShopOrderDto>> ListAsync(int userId, CancellationToken ct);
    Task<ShopOrderDto?> GetAsync(int userId, int orderId, CancellationToken ct);
    Task<int> ReleaseStaleAsync(CancellationToken ct);
}

/// <summary>
/// فروشگاه: موجودی به تفکیک شعبه. هنگام ثبت سفارش موجودی کنار گذاشته می‌شود (کم کردن شرطی)،
/// با پرداخت موفق قطعی و با شکست/انقضا برمی‌گردد. قیمت‌ها فقط سمت سرور حساب می‌شوند.
/// </summary>
public sealed class ShopService(GymDbContext db, IClock clock, IOptions<CommerceOptions> options, ILogger<ShopService> logger) : IShopService
{
    private CommerceOptions O => options.Value;

    public static string KindName(ProductKind k) => k switch { ProductKind.Supplement => "supplement", ProductKind.Apparel => "apparel", _ => "gear" };
    private static ProductKind? ParseKind(string? s) => s?.ToLowerInvariant() switch
    {
        "supplement" => ProductKind.Supplement, "apparel" => ProductKind.Apparel, "gear" => ProductKind.Gear, _ => null,
    };

    public async Task<ShopCatalogDto> CatalogAsync(ShopFilter f, CancellationToken ct)
    {
        var q = db.Products.AsNoTracking().Where(p => p.IsActive);
        // «مکمل‌ها» یک بخش و «پوشاک و لوازم برند باشگاه» بخش دیگر
        if (f.Kind == "merch") q = q.Where(p => p.Kind != ProductKind.Supplement);
        else if (ParseKind(f.Kind) is { } kind) q = q.Where(p => p.Kind == kind);
        var all = await q.Include(p => p.Variants).ThenInclude(v => v.Stocks).ThenInclude(s => s.Branch).AsSplitQuery()
            .OrderBy(p => p.SortOrder).ToListAsync(ct);

        var facets = all.GroupBy(p => (p.Kind, p.Category)).Select(g => new ShopFacetDto(KindName(g.Key.Kind), g.Key.Category, g.Count())).ToList();
        var brands = all.Select(p => p.BrandName).Distinct().ToList();

        IEnumerable<Product> list = all;
        if (!string.IsNullOrWhiteSpace(f.Category)) list = list.Where(p => p.Category == f.Category);
        if (!string.IsNullOrWhiteSpace(f.Q))
        {
            var term = PersianText.CleanText(f.Q)!;
            list = list.Where(p => p.Name.Contains(term, StringComparison.OrdinalIgnoreCase) || p.BrandName.Contains(term) || p.Category.Contains(term));
        }
        int Stock(Product p) => p.Variants.SelectMany(v => v.Stocks).Where(s => f.Branch is null || s.Branch!.Slug == f.Branch).Sum(s => s.Quantity);
        if (f.InStock == true) list = list.Where(p => Stock(p) > 0);
        list = f.Sort switch
        {
            "price-asc" => list.OrderBy(p => p.PriceToman),
            "price-desc" => list.OrderByDescending(p => p.PriceToman),
            _ => list,
        };

        var cards = list.Select(p =>
        {
            var prices = p.Variants.Where(v => v.PriceToman is not null).Select(v => v.PriceToman!.Value).ToList();
            return new ProductCardDto(p.Id, p.Slug, p.Name, p.BrandName, KindName(p.Kind), p.Category, p.ImagePath, p.PriceToman,
                prices.Count > 0 ? Math.Min(prices.Min(), p.PriceToman) : null, p.IsHouseBrand, Stock(p) > 0,
                p.Variants.Where(v => v.Color != null).Select(v => v.ColorHex ?? v.Color!).Distinct().ToList(),
                p.Variants.Where(v => v.Size != null).Select(v => v.Size!).Distinct().ToList(),
                p.Variants.Where(v => v.Flavor != null).Select(v => v.Flavor!).Distinct().ToList());
        }).ToList();
        return new ShopCatalogDto(cards, facets, brands);
    }

    public async Task<ProductDetailDto?> DetailAsync(string slug, CancellationToken ct)
    {
        var p = await db.Products.AsNoTracking().Where(x => x.Slug == slug && x.IsActive)
            .Include(x => x.Variants).ThenInclude(v => v.Stocks).ThenInclude(s => s.Branch).AsSplitQuery().FirstOrDefaultAsync(ct);
        if (p is null) return null;
        return new ProductDetailDto(p.Id, p.Slug, p.Name, p.BrandName, KindName(p.Kind), p.Category, p.Description, p.ImagePath, p.PriceToman,
            p.IsHouseBrand, p.Highlights,
            p.Variants.OrderBy(v => v.Id).Select(v => new VariantDto(v.Id, v.Sku, v.Size, v.Color, v.ColorHex, v.Flavor, v.Label, v.PriceToman ?? p.PriceToman,
                v.Stocks.Sum(s => s.Quantity),
                v.Stocks.OrderBy(s => s.Branch!.SortOrder).Select(s => new VariantStockDto(s.Branch!.Slug, s.Branch.Name, s.Quantity)).ToList())).ToList());
    }

    private sealed record Priced(ShopQuoteDto Quote, Branch Branch, Fulfillment Fulfillment, DiscountCode? Code, List<(ProductVariant V, int Qty, long Unit)> Lines);

    private async Task<Result<Priced>> PriceAsync(int? userId, IReadOnlyList<CartLine>? items, string? branchSlug, string? fulfillment, string? discountCode, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Slug == branchSlug && b.IsActive, ct);
        if (branch is null) errors["branchSlug"] = ["شعبهٔ تحویل یا ارسال را انتخاب کنید."];
        Fulfillment? ful = fulfillment?.ToLowerInvariant() switch { "pickup" => Fulfillment.Pickup, "delivery" => Fulfillment.Delivery, _ => null };
        if (ful is null) errors["fulfillment"] = ["روش تحویل را انتخاب کنید."];
        var merged = (items ?? []).Where(i => i.Quantity > 0).GroupBy(i => i.VariantId).Select(g => (Id: g.Key, Qty: g.Sum(x => x.Quantity))).ToList();
        if (merged.Count == 0) errors["items"] = ["سبد خرید خالی است."];
        else if (merged.Count > 30) errors["items"] = ["حداکثر ۳۰ کالای متفاوت در یک سفارش."];
        if (errors.Count > 0) return Result<Priced>.Fail(errors);

        var ids = merged.Select(m => m.Id).ToList();
        var variants = await db.ProductVariants.AsNoTracking().Include(v => v.Product).Include(v => v.Stocks)
            .Where(v => ids.Contains(v.Id) && v.Product!.IsActive).ToListAsync(ct);

        var lines = new List<QuoteLineDto>();
        var priced = new List<(ProductVariant, int, long)>();
        foreach (var (id, qty) in merged)
        {
            var v = variants.FirstOrDefault(x => x.Id == id);
            if (v is null) { lines.Add(new QuoteLineDto(id, "", "کالای نامعتبر", null, "", 0, qty, 0, 0, "این کالا دیگر موجود نیست.")); continue; }
            var unit = v.PriceToman ?? v.Product!.PriceToman;
            var available = v.Stocks.Where(s => s.BranchId == branch!.Id).Sum(s => s.Quantity);
            string? problem = qty > O.MaxQuantityPerLine ? $"حداکثر {PersianText.FaDigits(O.MaxQuantityPerLine.ToString())} عدد از هر کالا."
                : available < qty ? (available == 0 ? "در این شعبه موجود نیست." : $"فقط {PersianText.FaDigits(available.ToString())} عدد در این شعبه موجود است.") : null;
            lines.Add(new QuoteLineDto(v.Id, v.Product!.Slug, v.Product.Name, v.Label.Length > 0 ? v.Label : null, v.Product.ImagePath, unit, qty, unit * qty, available, problem));
            if (problem is null) priced.Add((v, qty, unit));
        }

        var subtotal = lines.Where(l => l.Problem is null).Sum(l => l.LineToman);
        DiscountCode? dc = null; string? codeError = null; long discount = 0;
        var code = string.IsNullOrWhiteSpace(discountCode) ? null : discountCode.Trim().ToUpperInvariant();
        if (code is not null)
        {
            var now = clock.UtcNow;
            dc = await db.DiscountCodes.AsNoTracking().FirstOrDefaultAsync(d => d.Code == code, ct);
            if (dc is null || !dc.IsUsableAt(now) || !dc.AppliesTo(DiscountScope.Shop)) { codeError = "کد تخفیف برای فروشگاه معتبر نیست."; dc = null; }
            else if (dc.MembersOnly)
            {
                var isMember = userId is not null && await db.Memberships.AnyAsync(m => m.UserId == userId && m.Status == MembershipStatus.Active && m.StartsAtUtc <= now && m.EndsAtUtc > now, ct);
                if (!isMember) { codeError = userId is null ? "این کد مخصوص اعضای باشگاه است؛ اول وارد شوید." : "این کد فقط برای اعضای دارای عضویت فعال است."; dc = null; }
            }
            if (dc is not null) discount = subtotal * dc.Percent / 100 / 1000 * 1000;
        }
        var afterDiscount = subtotal - discount;
        var shipping = ful == Fulfillment.Delivery && afterDiscount > 0 && afterDiscount < O.FreeShippingFromToman ? O.ShippingFeeToman : 0;
        var quote = new ShopQuoteDto(lines, subtotal, discount, shipping, afterDiscount + shipping, dc?.Code, dc?.Percent, codeError,
            lines.All(l => l.Problem is null) && subtotal > 0, O.FreeShippingFromToman);
        return Result<Priced>.Ok(new Priced(quote, branch!, ful!.Value, dc, priced));
    }

    public async Task<Result<ShopQuoteDto>> QuoteAsync(int? userId, ShopQuoteRequest r, CancellationToken ct)
    {
        var p = await PriceAsync(userId, r.Items, r.BranchSlug, r.Fulfillment, r.DiscountCode, ct);
        return p.Succeeded ? Result<ShopQuoteDto>.Ok(p.Value!.Quote) : Result<ShopQuoteDto>.Fail(p.Errors.ToDictionary(), p.ErrorType);
    }

    public async Task<Result<PurchaseStartedDto>> CheckoutAsync(int userId, ShopCheckoutRequest r, CancellationToken ct)
    {
        var key = (r.IdempotencyKey ?? "").Trim();
        if (key.Length is < 8 or > 64) return Result<PurchaseStartedDto>.Fail("idempotencyKey", "شناسهٔ درخواست نامعتبر است.");
        var existing = await db.ShopOrders.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == userId && o.IdempotencyKey == key, ct);
        if (existing is not null) return await ExistingAsync(existing, ct);

        PayMethod? method = r.PayMethod?.ToLowerInvariant() switch { "wallet" => PayMethod.Wallet, "gateway" => PayMethod.Gateway, _ => null };
        if (method is null) return Result<PurchaseStartedDto>.Fail("payMethod", "روش پرداخت را انتخاب کنید.");

        var priced = await PriceAsync(userId, r.Items, r.BranchSlug, r.Fulfillment, r.DiscountCode, ct);
        if (!priced.Succeeded) return Result<PurchaseStartedDto>.Fail(priced.Errors.ToDictionary(), priced.ErrorType);
        var p = priced.Value!;
        if (!p.Quote.CanCheckout) return Result<PurchaseStartedDto>.Fail("items", p.Quote.Lines.FirstOrDefault(l => l.Problem is not null)?.Problem ?? "سبد خرید معتبر نیست.");
        if (p.Quote.DiscountCodeError is not null) return Result<PurchaseStartedDto>.Fail("discountCode", p.Quote.DiscountCodeError);
        if (p.Code is not null && await DiscountGuard.CodeErrorAsync(db, p.Code, userId, clock.UtcNow, ct) is { } codeLimit)
            return Result<PurchaseStartedDto>.Fail("discountCode", codeLimit, ErrorType.Conflict);

        string? name = null, phone = null, address = null, postal = null;
        if (p.Fulfillment == Fulfillment.Delivery)
        {
            var errors = new Dictionary<string, string[]>();
            name = PersianText.CleanText(r.RecipientName);
            phone = PersianText.NormalizeMobile(r.RecipientPhone);
            address = PersianText.CleanText(r.Address);
            postal = PersianText.ToLatinDigits(r.PostalCode ?? "").Replace(" ", "").Replace("-", "");
            if (name is null || name.Length is < 3 or > 100) errors["recipientName"] = ["نام گیرنده را کامل بنویسید."];
            if (!PersianText.IsValidMobile(phone)) errors["recipientPhone"] = ["موبایل گیرنده معتبر نیست."];
            if (address is null || address.Length is < 10 or > 400) errors["address"] = ["نشانی کامل را بنویسید (حداقل ۱۰ حرف)."];
            if (postal.Length != 10 || !postal.All(char.IsAsciiDigit)) errors["postalCode"] = ["کد پستی ۱۰ رقمی است."];
            if (errors.Count > 0) return Result<PurchaseStartedDto>.Fail(errors);
        }

        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var now = clock.UtcNow;

            // کنار گذاشتن موجودی: اگر هم‌زمان کس دیگری آخرین عدد را برداشته باشد، به‌روزرسانی شرطی صفر ردیف برمی‌گرداند
            foreach (var (v, qty, _) in p.Lines)
            {
                var rows = await db.BranchStocks.Where(s => s.VariantId == v.Id && s.BranchId == p.Branch.Id && s.Quantity >= qty)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.Quantity, x => x.Quantity - qty), ct);
                if (rows == 0)
                {
                    await tx.RollbackAsync(ct);
                    return Result<PurchaseStartedDto>.Fail("items", $"موجودی «{v.Product!.Name}» همین الان تمام شد. سبد را دوباره بررسی کنید.", ErrorType.Conflict);
                }
            }

            var order = new ShopOrder
            {
                UserId = userId, Fulfillment = p.Fulfillment, BranchId = p.Branch.Id, RecipientName = name, RecipientPhone = phone, Address = address, PostalCode = postal,
                SubtotalToman = p.Quote.SubtotalToman, DiscountToman = p.Quote.DiscountToman, ShippingToman = p.Quote.ShippingToman, TotalToman = p.Quote.TotalToman,
                DiscountCode = p.Code?.Code, PayMethod = method.Value, IdempotencyKey = key, StockReserved = true, CreatedAtUtc = now,
                Items = p.Lines.Select(l => new ShopOrderItem
                {
                    VariantId = l.V.Id, ProductName = l.V.Product!.Name, VariantLabel = l.V.Label.Length > 0 ? l.V.Label : null,
                    ImagePath = l.V.Product.ImagePath, UnitPriceToman = l.Unit, Quantity = l.Qty, CreatedAtUtc = now,
                }).ToList(),
            };
            db.ShopOrders.Add(order);
            await db.SaveChangesAsync(ct);
            order.Number = $"KS-{Jalali.Year(now)}-{order.Id:D5}";

            if (method == PayMethod.Wallet)
            {
                if (!await WalletLedger.TryDebitAsync(db, userId, order.TotalToman, WalletTxType.ShopPurchase, $"سفارش فروشگاه {order.Number}", $"shop:{order.Id}", now, ct))
                {
                    await tx.RollbackAsync(ct);
                    return Result<PurchaseStartedDto>.Fail("payMethod", "موجودی کیف پول کافی نیست. کیف پول را شارژ کنید یا با درگاه پرداخت کنید.");
                }
                MarkPaid(order, now);
                await IncrementCodeAsync(order.DiscountCode, ct);
                db.AuditLogs.Add(new AuditLog { Action = "shop.order_paid_wallet", EntityType = "ShopOrder", EntityId = order.Id.ToString(), UserId = userId, Data = $"total={order.TotalToman}" });
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(null, 0, order.TotalToman, true, order.Id, $"/shop/orders/{order.Id}"));
            }

            var payment = new Payment
            {
                UserId = userId, Purpose = PaymentPurpose.ShopOrder, ShopOrderId = order.Id, IdempotencyKey = "shop-" + key[..Math.Min(58, key.Length)],
                BaseAmountToman = order.SubtotalToman, CodeDiscountToman = order.DiscountToman, AmountToman = order.TotalToman, DiscountCode = order.DiscountCode,
                Description = $"سفارش فروشگاه {order.Number}", TrackingNumber = await TrackingNumbers.NewAsync(db, ct), CreatedAtUtc = now,
            };
            db.Payments.Add(payment);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(payment.Id, payment.TrackingNumber, payment.AmountToman, false, order.Id, $"/shop/orders/{order.Id}"));
        });
    }

    private async Task<Result<PurchaseStartedDto>> ExistingAsync(ShopOrder o, CancellationToken ct)
    {
        var pay = await db.Payments.AsNoTracking().Where(x => x.ShopOrderId == o.Id).OrderByDescending(x => x.Id).FirstOrDefaultAsync(ct);
        var done = o.Status != OrderStatus.PendingPayment;
        return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(done ? null : pay?.Id, pay?.TrackingNumber ?? 0, o.TotalToman, done, o.Id, $"/shop/orders/{o.Id}"));
    }

    internal static void MarkPaid(ShopOrder o, DateTime now)
    {
        o.Status = o.Fulfillment == Fulfillment.Pickup ? OrderStatus.ReadyForPickup : OrderStatus.Paid;
        o.PaidAtUtc = now;
        o.StockReserved = false; // قطعی شد
    }

    private Task IncrementCodeAsync(string? code, CancellationToken ct) => code is null ? Task.CompletedTask :
        db.DiscountCodes.Where(d => d.Code == code).ExecuteUpdateAsync(s => s.SetProperty(d => d.UsedCount, d => d.UsedCount + 1), ct);

    /// <summary>برگرداندن موجودی کنارگذاشته‌شده (پرداخت ناموفق یا منقضی)</summary>
    internal static async Task ReleaseStockAsync(GymDbContext db, ShopOrder o, CancellationToken ct)
    {
        if (!o.StockReserved) return;
        var items = await db.Set<ShopOrderItem>().Where(i => i.OrderId == o.Id).ToListAsync(ct);
        foreach (var i in items)
            await db.BranchStocks.Where(s => s.VariantId == i.VariantId && s.BranchId == o.BranchId)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Quantity, x => x.Quantity + i.Quantity), ct);
        o.StockReserved = false;
    }

    /// <summary>پرداخت درگاهِ سفارش فروشگاه نهایی شد (داخل تراکنش PaymentService)</summary>
    internal static async Task OnPaymentCompletedAsync(GymDbContext db, Payment payment, bool succeeded, DateTime now, CancellationToken ct)
    {
        var o = await db.ShopOrders.FirstAsync(x => x.Id == payment.ShopOrderId, ct);
        if (o.Status != OrderStatus.PendingPayment && o.Status != OrderStatus.Cancelled) return;
        if (!succeeded)
        {
            await ReleaseStockAsync(db, o, ct);
            o.Status = OrderStatus.Cancelled;
            return;
        }
        if (o.Status == OrderStatus.Cancelled)
        {
            // سفارش منقضی شده بود ولی کاربر بعداً در درگاه پرداخت کرد: مبلغ به کیف پول برمی‌گردد
            await WalletLedger.CreditAsync(db, o.UserId, payment.AmountToman, WalletTxType.Refund, $"بازگشت وجه سفارش منقضی‌شدهٔ {o.Number}", $"shop:{o.Id}", now, ct);
            return;
        }
        MarkPaid(o, now);
        if (o.DiscountCode is not null)
            await db.DiscountCodes.Where(d => d.Code == o.DiscountCode).ExecuteUpdateAsync(s => s.SetProperty(d => d.UsedCount, d => d.UsedCount + 1), ct);
    }

    public async Task<int> ReleaseStaleAsync(CancellationToken ct)
    {
        var cutoff = clock.UtcNow.AddMinutes(-O.PendingOrderMinutes);
        var stale = await db.ShopOrders.Where(o => o.Status == OrderStatus.PendingPayment && o.CreatedAtUtc < cutoff).Take(100).ToListAsync(ct);
        foreach (var o in stale)
        {
            await ReleaseStockAsync(db, o, ct);
            o.Status = OrderStatus.Cancelled;
        }
        if (stale.Count > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Released {Count} stale shop orders", stale.Count);
        }
        return stale.Count;
    }

    public async Task<IReadOnlyList<ShopOrderDto>> ListAsync(int userId, CancellationToken ct) =>
        (await db.ShopOrders.AsNoTracking().Include(o => o.Items).Include(o => o.Branch)
            .Where(o => o.UserId == userId && o.Status != OrderStatus.PendingPayment || o.UserId == userId && o.CreatedAtUtc > clock.UtcNow.AddHours(-1))
            .OrderByDescending(o => o.Id).Take(30).AsSplitQuery().ToListAsync(ct)).Select(ToDto).ToList();

    public async Task<ShopOrderDto?> GetAsync(int userId, int orderId, CancellationToken ct)
    {
        var o = await db.ShopOrders.AsNoTracking().Include(x => x.Items).Include(x => x.Branch).AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == orderId && x.UserId == userId, ct);
        return o is null ? null : ToDto(o);
    }

    public static string StatusName(OrderStatus s) => s switch
    {
        OrderStatus.PendingPayment => "pending", OrderStatus.Paid => "paid", OrderStatus.ReadyForPickup => "ready",
        OrderStatus.Shipped => "shipped", OrderStatus.Completed => "completed", _ => "cancelled",
    };

    private static ShopOrderDto ToDto(ShopOrder o) => new(
        o.Id, o.Number, StatusName(o.Status), o.Fulfillment == Fulfillment.Pickup ? "pickup" : "delivery", o.Branch?.Name ?? "",
        o.Address, o.SubtotalToman, o.DiscountToman, o.ShippingToman, o.TotalToman, o.PayMethod == PayMethod.Wallet ? "wallet" : "gateway",
        o.CreatedAtUtc, o.PaidAtUtc, o.Items.Select(i => new ShopOrderItemDto(i.ProductName, i.VariantLabel, i.ImagePath, i.UnitPriceToman, i.Quantity)).ToList());
}
