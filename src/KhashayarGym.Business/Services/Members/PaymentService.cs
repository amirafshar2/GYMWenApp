using KhashayarGym.Business.Common;
using KhashayarGym.Business.Services.Access;
using KhashayarGym.Business.Dtos;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace KhashayarGym.Business.Services.Members;

public interface IPaymentService
{
    Task<Payment?> FindByTrackingAsync(long trackingNumber, CancellationToken ct);
    /// <summary>نتیجهٔ تأییدشدهٔ درگاه (Verify سمت سرور) را ثبت می‌کند. تکراری بودن بی‌اثر است.</summary>
    Task<Result<int>> CompleteAsync(long trackingNumber, bool succeeded, string? transactionCode, string? message, RequestContext rc, CancellationToken ct);
    Task<PaymentResultDto?> GetForUserAsync(int userId, int paymentId, CancellationToken ct);
}

public sealed class PaymentService(GymDbContext db, IClock clock, ILogger<PaymentService> logger) : IPaymentService
{
    public Task<Payment?> FindByTrackingAsync(long trackingNumber, CancellationToken ct) =>
        db.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.TrackingNumber == trackingNumber, ct);

    public Task<Result<int>> CompleteAsync(long trackingNumber, bool succeeded, string? transactionCode, string? message, RequestContext rc, CancellationToken ct) =>
        // تراکنش داخل execution strategy (سازگار با EnableRetryOnFailure در SQL Server)
        db.Database.CreateExecutionStrategy().ExecuteAsync(() => CompleteCoreAsync(trackingNumber, succeeded, transactionCode, message, rc, ct));

    private async Task<Result<int>> CompleteCoreAsync(long trackingNumber, bool succeeded, string? transactionCode, string? message, RequestContext rc, CancellationToken ct)
    {
        db.ChangeTracker.Clear();
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var payment = await db.Payments.Include(p => p.Membership).ThenInclude(m => m!.Package)
            .FirstOrDefaultAsync(p => p.TrackingNumber == trackingNumber, ct);
        if (payment?.Membership?.Package is null)
            return Result<int>.Fail("payment", "پرداخت پیدا نشد.", ErrorType.NotFound);

        // idempotency: پرداختی که قبلاً نهایی شده دوباره پردازش نمی‌شود
        if (payment.Status != PaymentStatus.Pending)
            return Result<int>.Ok(payment.Id);

        var now = clock.UtcNow;
        payment.TransactionCode = transactionCode;
        payment.GatewayMessage = message?.Length > 300 ? message[..300] : message;
        var m = payment.Membership;

        if (succeeded)
        {
            payment.Status = PaymentStatus.Succeeded;
            payment.PaidAtUtc = now;
            payment.InvoiceNumber = $"KG-{Jalali.Year(now)}-{payment.Id:D6}";

            // تمدید: اگر عضویت فعالی در همین شعبه دارد، عضویت تازه از پایان آن شروع می‌شود
            var lastEnd = await db.Memberships.AsNoTracking()
                .Where(x => x.UserId == payment.UserId && x.Id != m.Id && x.Status == MembershipStatus.Active && x.EndsAtUtc > now)
                .MaxAsync(x => (DateTime?)x.EndsAtUtc, ct);
            var start = lastEnd ?? now;
            m.Status = MembershipStatus.Active;
            m.StartsAtUtc = start;
            m.EndsAtUtc = start.AddMonths(m.Package.DurationMonths);

            // برای نرم‌افزار گیت/حسابداری: عضویت فعال شد (از صف خروجی ارسال می‌شود)
            IntegrationEvents.Add(db, "membership.activated", new
            {
                memberId = payment.UserId, membershipId = m.Id, branchId = m.BranchId, section = m.Section.ToString().ToLowerInvariant(),
                startsAtUtc = m.StartsAtUtc, endsAtUtc = m.EndsAtUtc, sessionsTotal = m.SessionsTotal, qr = AccessControlService.QrPrefix + m.CardToken,
            });

            if (payment.DiscountCode is not null)
                await db.DiscountCodes.Where(d => d.Code == payment.DiscountCode)
                    .ExecuteUpdateAsync(s => s.SetProperty(d => d.UsedCount, d => d.UsedCount + 1), ct);
        }
        else
        {
            payment.Status = PaymentStatus.Failed;
            m.Status = MembershipStatus.Cancelled;
        }

        db.AuditLogs.Add(new AuditLog
        {
            Action = succeeded ? "payment.succeeded" : "payment.failed", EntityType = "Payment", EntityId = payment.Id.ToString(),
            UserId = payment.UserId, Ip = rc.Ip, Data = $"tracking={trackingNumber};tx={transactionCode};amount={payment.AmountToman}"
        });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        logger.LogInformation("Payment {Id} completed: {Status}", payment.Id, payment.Status);
        return Result<int>.Ok(payment.Id);
    }

    public async Task<PaymentResultDto?> GetForUserAsync(int userId, int paymentId, CancellationToken ct)
    {
        var p = await db.Payments.AsNoTracking()
            .Include(x => x.Membership).ThenInclude(m => m!.Package)
            .Include(x => x.Membership).ThenInclude(m => m!.Branch)
            .FirstOrDefaultAsync(x => x.Id == paymentId && x.UserId == userId, ct);
        if (p?.Membership is null) return null;
        var m = p.Membership;
        return new PaymentResultDto(
            p.Id, p.Status.ToString().ToLowerInvariant(), p.AmountToman, p.BaseAmountToman, p.CampaignDiscountToman, p.CodeDiscountToman,
            p.DiscountCode, p.TransactionCode, p.InvoiceNumber, p.CreatedAtUtc, p.PaidAtUtc,
            m.Package!.Name, m.Branch!.Name, m.Section == GenderSection.Women ? "women" : "men", p.GatewayMessage,
            p.Status == PaymentStatus.Succeeded ? MemberService.ToDto(m, clock.UtcNow) : null);
    }
}
