using KhashayarGym.Business.Common;
using KhashayarGym.Business.Services.Members;
using Parbad;
using Parbad.Gateway.ParbadVirtual;
using Parbad.Gateway.ZarinPal;

namespace KhashayarGym.Api.Infrastructure;

/// <summary>تنظیمات درگاه. در production درگاه آزمایشی ممنوع است (ProductionGuard).</summary>
public sealed class PaymentOptions
{
    public const string Section = "Payment";
    /// <summary>درگاه آزمایشی Parbad (فقط دمو/توسعه). پیش‌فرض خاموش.</summary>
    public bool UseVirtualGateway { get; set; }
    /// <summary>آدرس عمومی سایت برای بازگشت از بانک، مثل https://example.ir</summary>
    public string? CallbackBaseUrl { get; set; }
    public ZarinPalSettings ZarinPal { get; set; } = new();
    public sealed class ZarinPalSettings { public string MerchantId { get; set; } = ""; public bool IsSandbox { get; set; } }
}

public sealed record GatewayRedirectDto(int PaymentId, bool AlreadyPaid, string? Method, string? Url, IDictionary<string, string>? Form);

/// <summary>پاسخ مشترک شروع خرید (فروشگاه، بوفه، شارژ کیف پول)</summary>
public sealed record PurchaseResponse(bool Completed, int OrderId, string? RedirectPath, GatewayRedirectDto? Gateway);

/// <summary>
/// اتصال به درگاه با Parbad برای همهٔ انواع پرداخت. مبلغ به ریال فرستاده می‌شود.
/// برای درگاه واقعی فقط پیکربندی Parbad عوض می‌شود (زرین‌پال، ملت، سامان…)، نه این کد.
/// </summary>
public sealed class PaymentGateway(IOnlinePayment online, IPaymentService payments, Microsoft.Extensions.Options.IOptions<PaymentOptions> options, ILogger<PaymentGateway> logger)
{
    public async Task<(GatewayRedirectDto? Redirect, int Status, string? Error)> StartAsync(HttpRequest req, int paymentId, long trackingNumber, long amountToman, CancellationToken ct)
    {
        var o = options.Value;
        // آدرس بازگشت از تنظیمات (نه از هدر Host درخواست)؛ در توسعه اگر خالی بود از همان درخواست
        var callback = (string.IsNullOrWhiteSpace(o.CallbackBaseUrl) ? $"{req.Scheme}://{req.Host}" : o.CallbackBaseUrl.TrimEnd('/')) + "/api/v1/payments/callback";
        var description = (await payments.FindByTrackingAsync(trackingNumber, ct))?.Description ?? "پرداخت باشگاه";
        var result = await online.RequestAsync(invoice =>
        {
            invoice.SetTrackingNumber(trackingNumber)
                .SetAmount(amountToman * 10) // درگاه‌های ایرانی به ریال
                .SetCallbackUrl(callback);
            if (o.UseVirtualGateway) invoice.UseParbadVirtual();
            else invoice.UseZarinPal().SetZarinPalData(description.Length > 200 ? description[..200] : description, null!, null!);
        }, ct);

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
