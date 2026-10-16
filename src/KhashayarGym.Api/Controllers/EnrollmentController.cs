using KhashayarGym.Api.Auth;
using KhashayarGym.Api.Filters;
using KhashayarGym.Api.Infrastructure;
using KhashayarGym.Business.Dtos;
using KhashayarGym.Business.Services.Members;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Parbad;
using Parbad.Gateway.ParbadVirtual;

namespace KhashayarGym.Api.Controllers;

[ApiController]
[Route("api/v1/contracts")]
[Produces("application/json")]
public sealed class ContractsController(IContractService contracts) : ControllerBase
{
    [HttpGet("active")]
    [ProducesResponseType<ContractDto>(200)]
    public async Task<IActionResult> Active(CancellationToken ct) =>
        await contracts.GetActiveAsync(ct) is { } c ? Ok(c) : NoContent();

    /// <summary>ارسال کد امضای قرارداد به موبایل کاربر واردشده.</summary>
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

public sealed record GatewayRedirectDto(int PaymentId, bool AlreadyPaid, string? Method, string? Url, IDictionary<string, string>? Form);

/// <summary>ثبت‌نام: قیمت‌گذاری سمت سرور، شروع پرداخت (idempotent) و بازگشت از درگاه با Verify سمت سرور.</summary>
[ApiController]
[Route("api/v1")]
[Produces("application/json")]
public sealed class CheckoutController(
    ICheckoutService checkout, IPaymentService payments, IOnlinePayment onlinePayment, ILogger<CheckoutController> logger) : ControllerBase
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

        var callback = $"{Request.Scheme}://{Request.Host}/api/v1/payments/callback";
        var result = await onlinePayment.RequestAsync(invoice => invoice
            .SetTrackingNumber(s.TrackingNumber)
            .SetAmount(s.AmountToman * 10) // درگاه‌های ایرانی به ریال
            .SetCallbackUrl(callback)
            .UseParbadVirtual(), ct);

        if (result.Status == PaymentRequestResultStatus.TrackingNumberAlreadyExists)
            return Problem(statusCode: 409, title: "این پرداخت در حال انجام است؛ چند لحظه صبر کنید یا صفحه را تازه کنید.");
        if (!result.IsSucceed)
        {
            logger.LogWarning("Gateway request failed: {Message}", result.Message);
            await payments.CompleteAsync(s.TrackingNumber, false, null, result.Message, this.RequestContext(), ct);
            return Problem(statusCode: 502, title: "اتصال به درگاه پرداخت برقرار نشد. دوباره امتحان کنید.");
        }

        var d = result.GatewayTransporter.Descriptor;
        return Ok(new GatewayRedirectDto(s.PaymentId, false, d.Type.ToString().ToLowerInvariant(), d.Url,
            d.Form?.ToDictionary(k => k.Key, v => v.Value)));
    }

    /// <summary>بازگشت از درگاه. تأیید فقط سمت سرور (Fetch + Verify) و تطبیق مبلغ؛ کاربر به صفحهٔ نتیجه می‌رود.</summary>
    [HttpGet("payments/callback"), HttpPost("payments/callback")]
    [IgnoreAntiforgeryToken]
    [EnableRateLimiting("payment")]
    public async Task<IActionResult> Callback(CancellationToken ct)
    {
        var rc = this.RequestContext();
        var invoice = await onlinePayment.FetchAsync(ct);
        var payment = await payments.FindByTrackingAsync(invoice.TrackingNumber, ct);
        if (payment is null) return Redirect("/join/result?status=unknown");

        if (invoice.Status == PaymentFetchResultStatus.AlreadyProcessed)
            return Redirect($"/join/result?id={payment.Id}");

        if (invoice.Status != PaymentFetchResultStatus.ReadyForVerifying)
        {
            await payments.CompleteAsync(payment.TrackingNumber, false, invoice.TransactionCode, invoice.Message, rc, ct);
            return Redirect($"/join/result?id={payment.Id}");
        }

        // مبلغ برگشتی درگاه باید دقیقاً با مبلغ ثبت‌شده برابر باشد
        if ((long)invoice.Amount != payment.AmountToman * 10)
        {
            await onlinePayment.CancelAsync(invoice, "مبلغ با سفارش مطابقت ندارد.", ct);
            await payments.CompleteAsync(payment.TrackingNumber, false, null, "amount-mismatch", rc, ct);
            return Redirect($"/join/result?id={payment.Id}");
        }

        var verify = await onlinePayment.VerifyAsync(invoice, ct);
        await payments.CompleteAsync(payment.TrackingNumber, verify.IsSucceed, verify.TransactionCode, verify.Message, rc, ct);
        return Redirect($"/join/result?id={payment.Id}");
    }
}
