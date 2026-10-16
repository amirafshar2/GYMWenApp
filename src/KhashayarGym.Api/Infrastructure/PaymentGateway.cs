using KhashayarGym.Business.Common;
using KhashayarGym.Business.Services.Members;
using Parbad;
using Parbad.Gateway.ParbadVirtual;

namespace KhashayarGym.Api.Infrastructure;

public sealed record GatewayRedirectDto(int PaymentId, bool AlreadyPaid, string? Method, string? Url, IDictionary<string, string>? Form);

/// <summary>پاسخ مشترک شروع خرید (فروشگاه، بوفه، شارژ کیف پول)</summary>
public sealed record PurchaseResponse(bool Completed, int OrderId, string? RedirectPath, GatewayRedirectDto? Gateway);

/// <summary>
/// اتصال به درگاه با Parbad برای همهٔ انواع پرداخت. مبلغ به ریال فرستاده می‌شود.
/// برای درگاه واقعی فقط پیکربندی Parbad عوض می‌شود (زرین‌پال، ملت، سامان…)، نه این کد.
/// </summary>
public sealed class PaymentGateway(IOnlinePayment online, IPaymentService payments, ILogger<PaymentGateway> logger)
{
    public async Task<(GatewayRedirectDto? Redirect, int Status, string? Error)> StartAsync(HttpRequest req, int paymentId, long trackingNumber, long amountToman, CancellationToken ct)
    {
        var callback = $"{req.Scheme}://{req.Host}/api/v1/payments/callback";
        var result = await online.RequestAsync(invoice => invoice
            .SetTrackingNumber(trackingNumber)
            .SetAmount(amountToman * 10) // درگاه‌های ایرانی به ریال
            .SetCallbackUrl(callback)
            .UseParbadVirtual(), ct);

        if (result.Status == PaymentRequestResultStatus.TrackingNumberAlreadyExists)
            return (null, 409, "این پرداخت در حال انجام است؛ چند لحظه صبر کنید یا صفحه را تازه کنید.");
        if (!result.IsSucceed)
        {
            logger.LogWarning("Gateway request failed: {Message}", result.Message);
            await payments.CompleteAsync(trackingNumber, false, null, result.Message, new RequestContext(req.HttpContext.Connection.RemoteIpAddress?.ToString(), null), ct);
            return (null, 502, "اتصال به درگاه پرداخت برقرار نشد. دوباره امتحان کنید.");
        }
        var d = result.GatewayTransporter.Descriptor;
        return (new GatewayRedirectDto(paymentId, false, d.Type.ToString().ToLowerInvariant(), d.Url, d.Form?.ToDictionary(k => k.Key, v => v.Value)), 200, null);
    }
}
