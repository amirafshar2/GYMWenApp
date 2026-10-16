using KhashayarGym.Business.Common;
using KhashayarGym.Business.Services.Access;
using KhashayarGym.Business.Services.Commerce;
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

public sealed class PaymentService(GymDbContext db, IClock clock, ICanteenService canteen, ILogger<PaymentService> logger) : IPaymentService
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
        var payment = await db.Payments.FirstOrDefaultAsync(p => p.TrackingNumber == trackingNumber, ct);
        if (payment is null)
            return Result<int>.Fail("payment", "پرداخت پیدا نشد.", ErrorType.NotFound);

        // idempotency: پرداختی که قبلاً نهایی شده دوباره پردازش نمی‌شود
        if (payment.Status != PaymentStatus.Pending)
            return Result<int>.Ok(payment.Id);

        var now = clock.UtcNow;
        payment.TransactionCode = transactionCode;
        payment.GatewayMessage = message?.Length > 300 ? message[..300] : message;
        payment.Status = succeeded ? PaymentStatus.Succeeded : PaymentStatus.Failed;
        if (succeeded)
        {
            payment.PaidAtUtc = now;
            payment.InvoiceNumber = $"KG-{Jalali.Year(now)}-{payment.Id:D6}";
        }

        var notifyCanteen = false;
        switch (payment.Purpose)
        {
            case PaymentPurpose.Membership:
                await CompleteMembershipAsync(payment, succeeded, now, ct);
                break;
            case PaymentPurpose.ShopOrder:
                await ShopService.OnPaymentCompletedAsync(db, payment, succeeded, now, ct);
                break;
            case PaymentPurpose.CanteenOrder:
                notifyCanteen = await CanteenService.OnPaymentCompletedAsync(db, payment, succeeded, now, ct);
                break;
            case PaymentPurpose.WalletTopUp:
                if (succeeded)
                    await WalletLedger.CreditAsync(db, payment.UserId, payment.AmountToman, WalletTxType.TopUp, "شارژ کیف پول", $"payment:{payment.Id}", now, ct);
                break;
        }

        db.AuditLogs.Add(new AuditLog
        {
            Action = succeeded ? "payment.succeeded" : "payment.failed", EntityType = "Payment", EntityId = payment.Id.ToString(),
            UserId = payment.UserId, Ip = rc.Ip, Data = $"purpose={payment.Purpose};tracking={trackingNumber};tx={transactionCode};amount={payment.AmountToman}"
        });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        logger.LogInformation("Payment {Id} ({Purpose}) completed: {Status}", payment.Id, payment.Purpose, payment.Status);

        if (notifyCanteen && payment.CanteenOrderId is { } orderId)
            await canteen.NotifyPaidAsync(orderId, ct);
        return Result<int>.Ok(payment.Id);
    }

    private async Task CompleteMembershipAsync(Payment payment, bool succeeded, DateTime now, CancellationToken ct)
    {
        var m = await db.Memberships.Include(x => x.Package).FirstAsync(x => x.Id == payment.MembershipId, ct);
        if (!succeeded)
        {
            m.Status = MembershipStatus.Cancelled;
            return;
        }

        // تمدید: اگر عضویت فعالی دارد، عضویت تازه از پایان آن شروع می‌شود
        var lastEnd = await db.Memberships.AsNoTracking()
            .Where(x => x.UserId == payment.UserId && x.Id != m.Id && x.Status == MembershipStatus.Active && x.EndsAtUtc > now)
            .MaxAsync(x => (DateTime?)x.EndsAtUtc, ct);
        var start = lastEnd ?? now;
        m.Status = MembershipStatus.Active;
        m.StartsAtUtc = start;
        m.EndsAtUtc = start.AddMonths(m.Package!.DurationMonths);

        // برای نرم‌افزار گیت/حسابداری: عضویت فعال شد (از صف خروجی ارسال می‌شود)
        IntegrationEvents.Add(db, "membership.activated", new
        {
            memberId = payment.UserId, membershipId = m.Id, branchId = m.BranchId, section = m.Section.ToString().ToLowerInvariant(),
            startsAtUtc = m.StartsAtUtc, endsAtUtc = m.EndsAtUtc, sessionsTotal = m.SessionsTotal, qr = AccessControlService.QrPrefix + m.CardToken,
        });

        // پیامک خوش‌آمد / تأیید تمدید (از صف پیامک ارسال می‌شود)
        var who = await db.Users.AsNoTracking().Where(u => u.Id == payment.UserId).Select(u => new { u.FullName, u.PhoneNumber }).FirstAsync(ct);
        var branchName = await db.Branches.AsNoTracking().Where(b => b.Id == m.BranchId).Select(b => b.Name).FirstAsync(ct);
        if (who.PhoneNumber is not null)
        {
            var renewal = await db.Memberships.AnyAsync(x => x.UserId == payment.UserId && x.Id != m.Id && (x.Status == MembershipStatus.Active || x.Status == MembershipStatus.Expired), ct);
            var name = Panel.SmsTexts.Token(Panel.SmsService.FirstName(who.FullName)); var until = Jalali.Date(m.EndsAtUtc!.Value);
            Panel.SmsService.Add(db, payment.UserId, who.PhoneNumber, SmsKind.Welcome, "khashayar-welcome", [name, Panel.SmsTexts.Token(branchName), until],
                Panel.SmsTexts.Welcome(name, branchName, until, renewal), $"welcome:{m.Id}");
        }

        if (payment.DiscountCode is not null)
            await db.DiscountCodes.Where(d => d.Code == payment.DiscountCode)
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.UsedCount, d => d.UsedCount + 1), ct);
        // سقف ثبت‌نام جشنواره
        if (payment.CampaignId is { } campaignId)
            await db.Campaigns.Where(c => c.Id == campaignId)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.RedemptionCount, c => c.RedemptionCount + 1), ct);
    }

    public async Task<PaymentResultDto?> GetForUserAsync(int userId, int paymentId, CancellationToken ct)
    {
        var p = await db.Payments.AsNoTracking()
            .Include(x => x.Membership).ThenInclude(m => m!.Package)
            .Include(x => x.Membership).ThenInclude(m => m!.Branch)
            .FirstOrDefaultAsync(x => x.Id == paymentId && x.UserId == userId, ct);
        if (p is null) return null;
        if (p.Membership is null)
            return new PaymentResultDto(p.Id, p.Status.ToString().ToLowerInvariant(), p.AmountToman, p.BaseAmountToman, p.CampaignDiscountToman, p.CodeDiscountToman,
                p.DiscountCode, p.TransactionCode, p.InvoiceNumber, p.CreatedAtUtc, p.PaidAtUtc, p.Description ?? "", "", "", p.GatewayMessage, null);
        var m = p.Membership;
        return new PaymentResultDto(
            p.Id, p.Status.ToString().ToLowerInvariant(), p.AmountToman, p.BaseAmountToman, p.CampaignDiscountToman, p.CodeDiscountToman,
            p.DiscountCode, p.TransactionCode, p.InvoiceNumber, p.CreatedAtUtc, p.PaidAtUtc,
            m.Package!.Name, m.Branch!.Name, m.Section == GenderSection.Women ? "women" : "men", p.GatewayMessage,
            p.Status == PaymentStatus.Succeeded ? MemberService.ToDto(m, clock.UtcNow) : null);
    }
}
