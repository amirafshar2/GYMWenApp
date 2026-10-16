using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KhashayarGym.Business.Services.Commerce;

public interface IWalletService
{
    Task<WalletDto> GetAsync(int userId, CancellationToken ct);
    Task<Result<PurchaseStartedDto>> StartTopUpAsync(int userId, TopUpRequest request, CancellationToken ct);
}

/// <summary>
/// کیف پول: موجودی فقط با به‌روزرسانی شرطی تغییر می‌کند (UPDATE … WHERE Balance &gt;= مبلغ) تا دو خرید هم‌زمان
/// موجودی را منفی نکنند؛ هر تغییر یک ردیف دفتر دارد. این متدها باید داخل تراکنشِ صاحب خرید صدا زده شوند.
/// </summary>
public static class WalletLedger
{
    public static async Task EnsureAsync(GymDbContext db, int userId, CancellationToken ct)
    {
        if (await db.Wallets.AnyAsync(w => w.UserId == userId, ct)) return;
        db.Wallets.Add(new Wallet { UserId = userId });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { db.ChangeTracker.Entries<Wallet>().Where(e => e.Entity.UserId == userId).ToList().ForEach(e => e.State = EntityState.Detached); }
    }

    /// <summary>برداشت؛ اگر موجودی کافی نباشد false و هیچ تغییری نمی‌دهد.</summary>
    public static async Task<bool> TryDebitAsync(GymDbContext db, int userId, long amount, WalletTxType type, string description, string reference, DateTime now, CancellationToken ct)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        await EnsureAsync(db, userId, ct);
        var rows = await db.Wallets.Where(w => w.UserId == userId && w.BalanceToman >= amount)
            .ExecuteUpdateAsync(s => s.SetProperty(w => w.BalanceToman, w => w.BalanceToman - amount).SetProperty(w => w.UpdatedAtUtc, now), ct);
        if (rows == 0) return false;
        var balance = await db.Wallets.Where(w => w.UserId == userId).Select(w => w.BalanceToman).FirstAsync(ct);
        db.WalletTransactions.Add(new WalletTransaction { UserId = userId, AmountToman = -amount, BalanceAfterToman = balance, Type = type, Description = description, Reference = reference, CreatedAtUtc = now });
        return true;
    }

    public static async Task CreditAsync(GymDbContext db, int userId, long amount, WalletTxType type, string description, string reference, DateTime now, CancellationToken ct)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        await EnsureAsync(db, userId, ct);
        await db.Wallets.Where(w => w.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(w => w.BalanceToman, w => w.BalanceToman + amount).SetProperty(w => w.UpdatedAtUtc, now), ct);
        var balance = await db.Wallets.Where(w => w.UserId == userId).Select(w => w.BalanceToman).FirstAsync(ct);
        db.WalletTransactions.Add(new WalletTransaction { UserId = userId, AmountToman = amount, BalanceAfterToman = balance, Type = type, Description = description, Reference = reference, CreatedAtUtc = now });
    }

    public static string TypeName(WalletTxType t) => t switch
    {
        WalletTxType.TopUp => "topup", WalletTxType.ShopPurchase => "shop", WalletTxType.CanteenPurchase => "canteen",
        WalletTxType.Refund => "refund", _ => "adjustment",
    };
}

public sealed class WalletService(GymDbContext db, IClock clock, IOptions<CommerceOptions> options) : IWalletService
{
    public async Task<WalletDto> GetAsync(int userId, CancellationToken ct)
    {
        var o = options.Value;
        var balance = await db.Wallets.Where(w => w.UserId == userId).Select(w => (long?)w.BalanceToman).FirstOrDefaultAsync(ct) ?? 0;
        var txs = await db.WalletTransactions.AsNoTracking().Where(t => t.UserId == userId)
            .OrderByDescending(t => t.Id).Take(50)
            .Select(t => new { t.Id, t.AmountToman, t.BalanceAfterToman, t.Type, t.Description, t.CreatedAtUtc }).ToListAsync(ct);
        return new WalletDto(balance, txs.Select(t => new WalletTxDto(t.Id, t.AmountToman, t.BalanceAfterToman, WalletLedger.TypeName(t.Type), t.Description, t.CreatedAtUtc)).ToList(),
            o.TopUpPresets, o.MinTopUpToman, o.MaxTopUpToman);
    }

    public async Task<Result<PurchaseStartedDto>> StartTopUpAsync(int userId, TopUpRequest request, CancellationToken ct)
    {
        var o = options.Value;
        var key = (request.IdempotencyKey ?? "").Trim();
        if (key.Length is < 8 or > 64) return Result<PurchaseStartedDto>.Fail("idempotencyKey", "شناسهٔ درخواست نامعتبر است.");
        if (request.AmountToman < o.MinTopUpToman || request.AmountToman > o.MaxTopUpToman || request.AmountToman % 1000 != 0)
            return Result<PurchaseStartedDto>.Fail("amountToman", $"مبلغ شارژ باید بین {PersianText.FaDigits(o.MinTopUpToman.ToString("N0"))} و {PersianText.FaDigits(o.MaxTopUpToman.ToString("N0"))} تومان و مضرب هزار باشد.");

        var existing = await db.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId && p.IdempotencyKey == key, ct);
        if (existing is not null)
            return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(existing.Id, existing.TrackingNumber, existing.AmountToman, existing.Status == PaymentStatus.Succeeded, 0, "/wallet"));

        var payment = new Payment
        {
            UserId = userId, Purpose = PaymentPurpose.WalletTopUp, IdempotencyKey = key, BaseAmountToman = request.AmountToman,
            AmountToman = request.AmountToman, Description = "شارژ کیف پول", TrackingNumber = await TrackingNumbers.NewAsync(db, ct), CreatedAtUtc = clock.UtcNow,
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync(ct);
        return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(payment.Id, payment.TrackingNumber, payment.AmountToman, false, 0, "/wallet"));
    }
}
