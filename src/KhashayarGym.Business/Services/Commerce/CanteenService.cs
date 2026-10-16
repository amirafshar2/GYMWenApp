using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KhashayarGym.Business.Services.Commerce;

public interface ICanteenService
{
    Task<CanteenMenuDto?> MenuAsync(string branchSlug, string? table, CancellationToken ct);
    Task<Result<PurchaseStartedDto>> PlaceAsync(int userId, CanteenOrderRequest request, CancellationToken ct);
    Task<CanteenOrderDto?> GetAsync(int userId, int orderId, CancellationToken ct);
    Task<IReadOnlyList<CanteenOrderDto>> ListAsync(int userId, CancellationToken ct);
    Task<IReadOnlyList<CanteenOrderDto>> BoardAsync(string branchSlug, CancellationToken ct);
    Task<Result<CanteenOrderDto>> UpdateStatusAsync(int orderId, string status, int staffUserId, CancellationToken ct);
    Task<int> ReleaseStaleAsync(CancellationToken ct);
    Task NotifyPaidAsync(int orderId, CancellationToken ct);
}

/// <summary>
/// منوی آنلاین بوفه: QR میز ← منو ← سفارش ← پرداخت از کیف پول یا درگاه ← نمایش لحظه‌ای روی تابلوی بوفه.
/// وضعیت‌ها: در صف ← در حال آماده‌سازی ← آماده ← تحویل شد (یا لغو با بازگشت وجه به کیف پول).
/// </summary>
public sealed class CanteenService(GymDbContext db, IClock clock, ICanteenNotifier notifier, IOptions<CommerceOptions> options) : ICanteenService
{
    public static string CategoryName(CanteenCategory c) => c switch
    {
        CanteenCategory.Coffee => "coffee", CanteenCategory.Shake => "shake", CanteenCategory.Drink => "drink", CanteenCategory.Snack => "snack", _ => "meal",
    };
    public static string StatusName(CanteenOrderStatus s) => s switch
    {
        CanteenOrderStatus.PendingPayment => "pending", CanteenOrderStatus.Queued => "queued", CanteenOrderStatus.Preparing => "preparing",
        CanteenOrderStatus.Ready => "ready", CanteenOrderStatus.Collected => "collected", _ => "cancelled",
    };

    private static string? CleanTable(string? t)
    {
        var s = PersianText.CleanText(t);
        return s is null ? null : s.Length > 30 ? s[..30] : s;
    }

    public async Task<CanteenMenuDto?> MenuAsync(string branchSlug, string? table, CancellationToken ct)
    {
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Slug == branchSlug && b.IsActive, ct);
        if (branch is null) return null;
        var items = await db.CanteenItems.AsNoTracking().OrderBy(i => i.SortOrder).ToListAsync(ct);
        return new CanteenMenuDto(branch.Slug, branch.Name, CleanTable(table),
            items.Select(i => new CanteenMenuItemDto(i.Id, i.Slug, i.Name, i.Description, CategoryName(i.Category), i.PriceToman, i.Kcal, i.ProteinG, i.ImagePath, i.IsAvailable)).ToList());
    }

    public async Task<Result<PurchaseStartedDto>> PlaceAsync(int userId, CanteenOrderRequest r, CancellationToken ct)
    {
        var key = (r.IdempotencyKey ?? "").Trim();
        if (key.Length is < 8 or > 64) return Result<PurchaseStartedDto>.Fail("idempotencyKey", "شناسهٔ درخواست نامعتبر است.");
        var existing = await db.CanteenOrders.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == userId && o.IdempotencyKey == key, ct);
        if (existing is not null)
        {
            var pay = await db.Payments.AsNoTracking().Where(p => p.CanteenOrderId == existing.Id).OrderByDescending(p => p.Id).FirstOrDefaultAsync(ct);
            var done = existing.Status != CanteenOrderStatus.PendingPayment;
            return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(done ? null : pay?.Id, pay?.TrackingNumber ?? 0, existing.TotalToman, done, existing.Id, $"/canteen/orders/{existing.Id}"));
        }

        PayMethod? method = r.PayMethod?.ToLowerInvariant() switch { "wallet" => PayMethod.Wallet, "gateway" => PayMethod.Gateway, _ => null };
        if (method is null) return Result<PurchaseStartedDto>.Fail("payMethod", "روش پرداخت را انتخاب کنید.");
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Slug == r.BranchSlug && b.IsActive, ct);
        if (branch is null) return Result<PurchaseStartedDto>.Fail("branchSlug", "شعبه پیدا نشد. QR را دوباره اسکن کنید.");
        var lines = (r.Items ?? []).Where(i => i.Quantity > 0).GroupBy(i => i.ItemId).Select(g => (Id: g.Key, Qty: g.Sum(x => x.Quantity))).ToList();
        if (lines.Count == 0) return Result<PurchaseStartedDto>.Fail("items", "چیزی انتخاب نشده است.");
        if (lines.Any(l => l.Qty > options.Value.MaxQuantityPerLine)) return Result<PurchaseStartedDto>.Fail("items", "تعداد هر آیتم حداکثر ۱۰ است.");
        var ids = lines.Select(l => l.Id).ToList();
        var items = await db.CanteenItems.AsNoTracking().Where(i => ids.Contains(i.Id)).ToListAsync(ct);
        var missing = lines.FirstOrDefault(l => items.FirstOrDefault(i => i.Id == l.Id) is not { IsAvailable: true });
        if (missing != default) return Result<PurchaseStartedDto>.Fail("items", $"«{items.FirstOrDefault(i => i.Id == missing.Id)?.Name ?? "یکی از آیتم‌ها"}» الان موجود نیست.");
        var note = PersianText.CleanText(r.Note);
        if (note?.Length > 200) note = note[..200];

        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var now = clock.UtcNow;
            var dayStart = Jalali.TehranDayStartUtc(now);
            var order = new CanteenOrder
            {
                UserId = userId, BranchId = branch.Id, TableCode = CleanTable(r.TableCode), PayMethod = method.Value, Note = note, IdempotencyKey = key, CreatedAtUtc = now,
                DailyNumber = await db.CanteenOrders.CountAsync(o => o.BranchId == branch.Id && o.CreatedAtUtc >= dayStart, ct) + 1,
                Items = lines.Select(l => { var i = items.First(x => x.Id == l.Id); return new CanteenOrderItem { ItemId = i.Id, Name = i.Name, UnitPriceToman = i.PriceToman, Quantity = l.Qty, CreatedAtUtc = now }; }).ToList(),
            };
            order.TotalToman = order.Items.Sum(i => i.UnitPriceToman * i.Quantity);
            db.CanteenOrders.Add(order);
            await db.SaveChangesAsync(ct);

            if (method == PayMethod.Wallet)
            {
                if (!await WalletLedger.TryDebitAsync(db, userId, order.TotalToman, WalletTxType.CanteenPurchase, $"بوفه — سفارش شمارهٔ {order.DailyNumber}", $"canteen:{order.Id}", now, ct))
                {
                    await tx.RollbackAsync(ct);
                    return Result<PurchaseStartedDto>.Fail("payMethod", "موجودی کیف پول کافی نیست.");
                }
                order.Status = CanteenOrderStatus.Queued;
                order.PaidAtUtc = now;
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                await NotifyAsync(order.Id, ct);
                return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(null, 0, order.TotalToman, true, order.Id, $"/canteen/orders/{order.Id}"));
            }

            var payment = new Payment
            {
                UserId = userId, Purpose = PaymentPurpose.CanteenOrder, CanteenOrderId = order.Id, IdempotencyKey = "cafe-" + key[..Math.Min(58, key.Length)],
                BaseAmountToman = order.TotalToman, AmountToman = order.TotalToman, Description = $"بوفه — سفارش شمارهٔ {order.DailyNumber}",
                TrackingNumber = await TrackingNumbers.NewAsync(db, ct), CreatedAtUtc = now,
            };
            db.Payments.Add(payment);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(payment.Id, payment.TrackingNumber, payment.AmountToman, false, order.Id, $"/canteen/orders/{order.Id}"));
        });
    }

    /// <summary>پرداخت درگاه سفارش بوفه نهایی شد (داخل تراکنش PaymentService). true یعنی سفارش وارد صف شد و باید اعلان شود.</summary>
    internal static async Task<bool> OnPaymentCompletedAsync(GymDbContext db, Payment payment, bool succeeded, DateTime now, CancellationToken ct)
    {
        var o = await db.CanteenOrders.FirstAsync(x => x.Id == payment.CanteenOrderId, ct);
        if (!succeeded)
        {
            if (o.Status == CanteenOrderStatus.PendingPayment) o.Status = CanteenOrderStatus.Cancelled;
            return false;
        }
        if (o.Status == CanteenOrderStatus.PendingPayment)
        {
            o.Status = CanteenOrderStatus.Queued;
            o.PaidAtUtc = now;
            return true;
        }
        if (o.Status == CanteenOrderStatus.Cancelled) // منقضی شده بود؛ پول به کیف پول برمی‌گردد
            await WalletLedger.CreditAsync(db, o.UserId, payment.AmountToman, WalletTxType.Refund, $"بازگشت وجه سفارش بوفه {o.DailyNumber}", $"canteen:{o.Id}", now, ct);
        return false;
    }

    private IQueryable<CanteenOrder> WithDetails() => db.CanteenOrders.AsNoTracking().Include(o => o.Items).Include(o => o.Branch).Include(o => o.User).AsSplitQuery();

    private static CanteenOrderDto ToDto(CanteenOrder o, bool forStaff) => new(
        o.Id, o.DailyNumber, StatusName(o.Status), o.BranchId, o.Branch?.Name ?? "", o.TableCode,
        forStaff ? o.User?.FullName?.Split(' ')[0] : null, o.TotalToman, o.PayMethod == PayMethod.Wallet ? "wallet" : "gateway", o.Note,
        o.CreatedAtUtc, o.PaidAtUtc, o.ReadyAtUtc, o.Items.Select(i => new CanteenOrderItemDto(i.Name, i.UnitPriceToman, i.Quantity)).ToList());

    public async Task<CanteenOrderDto?> GetAsync(int userId, int orderId, CancellationToken ct) =>
        await WithDetails().FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, ct) is { } o ? ToDto(o, false) : null;

    public async Task<IReadOnlyList<CanteenOrderDto>> ListAsync(int userId, CancellationToken ct) =>
        (await WithDetails().Where(o => o.UserId == userId && o.Status != CanteenOrderStatus.PendingPayment).OrderByDescending(o => o.Id).Take(30).ToListAsync(ct))
            .Select(o => ToDto(o, false)).ToList();

    public async Task<IReadOnlyList<CanteenOrderDto>> BoardAsync(string branchSlug, CancellationToken ct)
    {
        var dayStart = Jalali.TehranDayStartUtc(clock.UtcNow);
        var recent = clock.UtcNow.AddMinutes(-30);
        var list = await WithDetails().Where(o => o.Branch!.Slug == branchSlug && o.CreatedAtUtc >= dayStart &&
                (o.Status == CanteenOrderStatus.Queued || o.Status == CanteenOrderStatus.Preparing || o.Status == CanteenOrderStatus.Ready ||
                 o.Status == CanteenOrderStatus.Collected && o.CollectedAtUtc > recent))
            .OrderBy(o => o.Id).ToListAsync(ct);
        return list.Select(o => ToDto(o, true)).ToList();
    }

    public async Task<Result<CanteenOrderDto>> UpdateStatusAsync(int orderId, string status, int staffUserId, CancellationToken ct)
    {
        CanteenOrderStatus? target = status?.ToLowerInvariant() switch
        {
            "preparing" => CanteenOrderStatus.Preparing, "ready" => CanteenOrderStatus.Ready, "collected" => CanteenOrderStatus.Collected,
            "cancelled" => CanteenOrderStatus.Cancelled, _ => null,
        };
        if (target is null) return Result<CanteenOrderDto>.Fail("status", "وضعیت نامعتبر است.");

        var result = await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var o = await db.CanteenOrders.FirstOrDefaultAsync(x => x.Id == orderId, ct);
            if (o is null) return Result<CanteenOrderDto>.Fail("order", "سفارش پیدا نشد.", ErrorType.NotFound);
            var allowed = (o.Status, target.Value) switch
            {
                (CanteenOrderStatus.Queued, CanteenOrderStatus.Preparing) => true,
                (CanteenOrderStatus.Queued or CanteenOrderStatus.Preparing, CanteenOrderStatus.Ready) => true,
                (CanteenOrderStatus.Ready, CanteenOrderStatus.Collected) => true,
                (CanteenOrderStatus.Queued or CanteenOrderStatus.Preparing, CanteenOrderStatus.Cancelled) => true,
                _ => false,
            };
            if (!allowed) return Result<CanteenOrderDto>.Fail("status", "این تغییر وضعیت ممکن نیست.", ErrorType.Conflict);

            var now = clock.UtcNow;
            // تغییر وضعیت شرطی و اتمی: دو «لغو» هم‌زمان (دوبار کلیک) فقط یک بار وجه برمی‌گرداند
            var from = o.Status; var to = target.Value;
            if (await db.CanteenOrders.Where(x => x.Id == orderId && x.Status == from)
                    .ExecuteUpdateAsync(x => x.SetProperty(c => c.Status, to), ct) == 0)
                return Result<CanteenOrderDto>.Fail("status", "وضعیت سفارش همین الان عوض شد؛ صفحه را تازه کنید.", ErrorType.Conflict);
            o.Status = target.Value;
            if (target == CanteenOrderStatus.Ready) o.ReadyAtUtc = now;
            if (target == CanteenOrderStatus.Collected) o.CollectedAtUtc = now;
            if (target == CanteenOrderStatus.Cancelled)
                await WalletLedger.CreditAsync(db, o.UserId, o.TotalToman, WalletTxType.Refund, $"بازگشت وجه سفارش بوفه {o.DailyNumber} (لغو توسط بوفه)", $"canteen:{o.Id}", now, ct);
            db.AuditLogs.Add(new AuditLog { Action = $"canteen.{StatusName(target.Value)}", EntityType = "CanteenOrder", EntityId = o.Id.ToString(), UserId = staffUserId });
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Result<CanteenOrderDto>.Ok(null!);
        });
        if (!result.Succeeded) return result;
        var dto = await NotifyAsync(orderId, ct);
        return Result<CanteenOrderDto>.Ok(dto!);
    }

    private async Task<CanteenOrderDto?> NotifyAsync(int orderId, CancellationToken ct)
    {
        var o = await WithDetails().FirstOrDefaultAsync(x => x.Id == orderId, ct);
        if (o is null) return null;
        var dto = ToDto(o, true);
        await notifier.OrderChangedAsync(dto, ct);
        return dto;
    }

    public async Task<int> ReleaseStaleAsync(CancellationToken ct)
    {
        var cutoff = clock.UtcNow.AddMinutes(-options.Value.PendingOrderMinutes);
        return await db.CanteenOrders.Where(o => o.Status == CanteenOrderStatus.PendingPayment && o.CreatedAtUtc < cutoff)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, CanteenOrderStatus.Cancelled), ct);
    }

    /// <summary>بعد از پرداخت موفق درگاه، از PaymentService صدا زده می‌شود.</summary>
    public Task NotifyPaidAsync(int orderId, CancellationToken ct) => NotifyAsync(orderId, ct);
}
