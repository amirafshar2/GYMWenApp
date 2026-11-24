using GymPlatform.Business.Common;
using GymPlatform.Business.Services.Members;
using Parbad;
using Parbad.Gateway.ParbadVirtual;
using Parbad.Gateway.ZarinPal;

namespace GymPlatform.Api.Infrastructure;

/// <summary>Gateway-Einstellungen. In Production ist das Test-Gateway verboten (ProductionGuard).</summary>
public sealed class PaymentOptions
{
    public const string Section = "Payment";
    /// <summary>Parbad-Test-Gateway (nur Demo/Entwicklung). Standard aus.</summary>
    public bool UseVirtualGateway { get; set; }
    /// <summary>Öffentliche Adresse der Seite für die Rückkehr von der Bank, z. B. https://example.de</summary>
    public string? CallbackBaseUrl { get; set; }
    public ZarinPalSettings ZarinPal { get; set; } = new();
    public sealed class ZarinPalSettings { public string MerchantId { get; set; } = ""; public bool IsSandbox { get; set; } }
}

public sealed record GatewayRedirectDto(int PaymentId, bool AlreadyPaid, string? Method, string? Url, IDictionary<string, string>? Form);

/// <summary>Gemeinsame Antwort beim Kaufstart (Shop, Bistro, Guthaben-Aufladung)</summary>
public sealed record PurchaseResponse(bool Completed, int OrderId, string? RedirectPath, GatewayRedirectDto? Gateway);

/// <summary>
/// Anbindung ans Gateway mit Parbad für alle Zahlungsarten. Der Betrag wird in Cent übertragen.
/// Für ein echtes Gateway ändert sich nur die Parbad-Konfiguration, nicht dieser Code.
/// </summary>
public sealed class PaymentGateway(IOnlinePayment online, IPaymentService payments, Microsoft.Extensions.Options.IOptions<PaymentOptions> options, ILogger<PaymentGateway> logger)
{
    public async Task<(GatewayRedirectDto? Redirect, int Status, string? Error)> StartAsync(HttpRequest req, int paymentId, long trackingNumber, long amountToman, CancellationToken ct)
    {
        var o = options.Value;
        // Rückkehradresse aus den Einstellungen (nicht aus dem Host-Header); in der Entwicklung bei Leere aus der Anfrage
        var callback = (string.IsNullOrWhiteSpace(o.CallbackBaseUrl) ? $"{req.Scheme}://{req.Host}" : o.CallbackBaseUrl.TrimEnd('/')) + "/api/v1/payments/callback";
        var description = (await payments.FindByTrackingAsync(trackingNumber, ct))?.Description ?? "Zahlung Studio";
        var result = await online.RequestAsync(invoice =>
        {
            invoice.SetTrackingNumber(trackingNumber)
                .SetAmount(amountToman) // Betrag in Cent
                .SetCallbackUrl(callback);
            if (o.UseVirtualGateway) invoice.UseParbadVirtual();
            else invoice.UseZarinPal().SetZarinPalData(description.Length > 200 ? description[..200] : description, null!, null!);
        }, ct);

        if (result.Status == PaymentRequestResultStatus.TrackingNumberAlreadyExists)
            return (null, 409, "Diese Zahlung läuft gerade; bitte kurz warten oder die Seite neu laden.");
        if (!result.IsSucceed)
        {
            logger.LogWarning("Gateway request failed: {Message}", result.Message);
            await payments.CompleteAsync(trackingNumber, false, null, result.Message, new RequestContext(req.HttpContext.Connection.RemoteIpAddress?.ToString(), null), ct);
            return (null, 502, "Keine Verbindung zum Zahlungs-Gateway. Bitte erneut versuchen.");
        }
        var d = result.GatewayTransporter.Descriptor;
        return (new GatewayRedirectDto(paymentId, false, d.Type.ToString().ToLowerInvariant(), d.Url, d.Form?.ToDictionary(k => k.Key, v => v.Value)), 200, null);
    }
}
