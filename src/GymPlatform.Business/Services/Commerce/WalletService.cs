using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GymPlatform.Business.Services.Commerce;

public interface IWalletService
{
    Task<WalletDto> GetAsync(int userId, CancellationToken ct);
    Task<Result<PurchaseStartedDto>> StartTopUpAsync(int userId, TopUpRequest request, CancellationToken ct);
}

/// <summary>
/// Guthaben: Der Saldo ändert sich nur per bedingtem Update (UPDATE … WHERE Balance &gt;= Betrag), damit zwei gleichzeitige Käufe
/// den Saldo nicht negativ machen; jede Änderung hat eine Buchungszeile. Diese Methoden müssen in der Transaktion des Kaufs aufgerufen werden.
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

    /// <summary>Abbuchung; reicht der Saldo nicht, false und keine Änderung.</summary>
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
        if (key.Length is < 8 or > 64) return Result<PurchaseStartedDto>.Fail("idempotencyKey", "Ungültige Anfrage-ID.");
        if (request.AmountToman < o.MinTopUpToman || request.AmountToman > o.MaxTopUpToman || request.AmountToman % 100 != 0)
            return Result<PurchaseStartedDto>.Fail("amountToman", $"Der Aufladebetrag muss zwischen {PersianText.FaDigits(o.MinTopUpToman.ToString("N0"))} und {PersianText.FaDigits(o.MaxTopUpToman.ToString("N0"))} € liegen und ein ganzer Euro-Betrag sein.");

        var existing = await db.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId && p.IdempotencyKey == key, ct);
        if (existing is not null)
            return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(existing.Id, existing.TrackingNumber, existing.AmountToman, existing.Status == PaymentStatus.Succeeded, 0, "/wallet"));

        var payment = new Payment
        {
            UserId = userId, Purpose = PaymentPurpose.WalletTopUp, IdempotencyKey = key, BaseAmountToman = request.AmountToman,
            AmountToman = request.AmountToman, Description = "Guthaben aufladen", TrackingNumber = await TrackingNumbers.NewAsync(db, ct), CreatedAtUtc = clock.UtcNow,
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync(ct);
        return Result<PurchaseStartedDto>.Ok(new PurchaseStartedDto(payment.Id, payment.TrackingNumber, payment.AmountToman, false, 0, "/wallet"));
    }
}
