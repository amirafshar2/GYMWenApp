using GymPlatform.Api.Auth;
using GymPlatform.Api.Filters;
using GymPlatform.Api.Infrastructure;
using GymPlatform.Business.Dtos;
using GymPlatform.Business.Services.Members;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Parbad;
using Parbad.Gateway.ParbadVirtual;

namespace GymPlatform.Api.Controllers;

[ApiController]
[Route("api/v1/contracts")]
[Produces("application/json")]
public sealed class ContractsController(IContractService contracts) : ControllerBase
{
    [HttpGet("active")]
    [ProducesResponseType<ContractDto>(200)]
    public async Task<IActionResult> Active(CancellationToken ct) =>
        await contracts.GetActiveAsync(ct) is { } c ? Ok(c) : NoContent();

    /// <summary>Sendet den Code für die Vertragsunterschrift an das Handy des angemeldeten Benutzers.</summary>
    [Authorize]
    [HttpPost("sign/otp")]
    [ValidateCsrf]
    [EnableRateLimiting("otp")]
    [ProducesResponseType<OtpSentDto>(200)]
    public async Task<IActionResult> SendCode(CancellationToken ct) =>
        (await contracts.SendSignCodeAsync(User.UserId(), this.RequestContext(), ct)).ToActionResult(this);

    [Authorize]
    [HttpPost("sign")]
    [ValidateCsrf]
    [EnableRateLimiting("auth")]
    [RequestSizeLimit(8 * 1024)]
    [ProducesResponseType<SignedContractDto>(201)]
    public async Task<IActionResult> Sign([FromBody] SignContractRequest request, CancellationToken ct) =>
        (await contracts.SignAsync(User.UserId(), request, this.RequestContext(), ct))
            .ToActionResult(this, s => Created($"/api/v1/me/contracts/{s.Id}/pdf", s));
}

/// <summary>Anmeldung: serverseitige Preisberechnung, Zahlungsstart (idempotent) und Rückkehr vom Gateway mit serverseitigem Verify.</summary>
[ApiController]
[Route("api/v1")]
[Produces("application/json")]
public sealed class CheckoutController(
    ICheckoutService checkout, IPaymentService payments, IOnlinePayment onlinePayment, PaymentGateway gateway) : ControllerBase
{
    [HttpPost("checkout/quote")]
    [ValidateCsrf]
    [EnableRateLimiting("forms-read")]
    [RequestSizeLimit(2048)]
    [ProducesResponseType<QuoteDto>(200)]
    public async Task<IActionResult> Quote([FromBody] QuoteRequest request, CancellationToken ct) =>
        (await checkout.QuoteAsync(request, ct)).ToActionResult(this);

    [Authorize]
    [HttpPost("checkout")]
    [ValidateCsrf]
    [EnableRateLimiting("payment")]
    [RequestSizeLimit(2048)]
    [ProducesResponseType<GatewayRedirectDto>(200)]
    public async Task<IActionResult> Start([FromBody] StartCheckoutRequest request, CancellationToken ct)
    {
        var started = await checkout.StartAsync(User.UserId(), request, this.RequestContext(), ct);
        if (!started.Succeeded) return started.ToActionResult(this);
        var s = started.Value!;
        if (s.AlreadyPaid) return Ok(new GatewayRedirectDto(s.PaymentId, true, null, null, null));

        var (redirect, status, error) = await gateway.StartAsync(Request, s.PaymentId, s.TrackingNumber, s.AmountToman, ct);
        return redirect is not null ? Ok(redirect) : Problem(statusCode: status, title: error);
    }

    /// <summary>Rückkehr vom Gateway. Bestätigung nur serverseitig (Fetch + Verify) mit Betragsabgleich; der Benutzer landet auf der Ergebnisseite.</summary>
    [HttpGet("payments/callback"), HttpPost("payments/callback")]
    [RequestSizeLimit(16 * 1024)]
    [IgnoreAntiforgeryToken]
    [EnableRateLimiting("payment")]
    public async Task<IActionResult> Callback(CancellationToken ct)
    {
        var rc = this.RequestContext();
        var invoice = await onlinePayment.FetchAsync(ct);
        var payment = await payments.FindByTrackingAsync(invoice.TrackingNumber, ct);
        if (payment is null) return Redirect("/join/result?status=unknown");
        var back = ResultPath(payment);

        if (invoice.Status == PaymentFetchResultStatus.AlreadyProcessed)
            return Redirect(back);

        if (invoice.Status != PaymentFetchResultStatus.ReadyForVerifying)
        {
            await payments.CompleteAsync(payment.TrackingNumber, false, invoice.TransactionCode, invoice.Message, rc, ct);
            return Redirect(back);
        }

        // Der vom Gateway zurückgemeldete Betrag muss exakt dem gespeicherten entsprechen
        if ((long)invoice.Amount != payment.AmountToman)
        {
            await onlinePayment.CancelAsync(invoice, "Betrag stimmt nicht mit der Bestellung überein.", ct);
            await payments.CompleteAsync(payment.TrackingNumber, false, null, "amount-mismatch", rc, ct);
            return Redirect(back);
        }

        var verify = await onlinePayment.VerifyAsync(invoice, ct);
        await payments.CompleteAsync(payment.TrackingNumber, verify.IsSucceed, verify.TransactionCode, verify.Message, rc, ct);
        return Redirect(back);
    }

    /// <summary>Nach dem Gateway kehrt der Benutzer zur Ergebnisseite der jeweiligen Kaufart zurück</summary>
    private static string ResultPath(GymPlatform.Domain.Entities.Payment p) => p.Purpose switch
    {
        GymPlatform.Domain.Enums.PaymentPurpose.ShopOrder => $"/shop/orders/{p.ShopOrderId}",
        GymPlatform.Domain.Enums.PaymentPurpose.CanteenOrder => $"/canteen/orders/{p.CanteenOrderId}",
        GymPlatform.Domain.Enums.PaymentPurpose.WalletTopUp => $"/wallet?payment={p.Id}",
        _ => $"/join/result?id={p.Id}",
    };
}
