namespace GymPlatform.Business.Common;

/// <summary>SMS-Versand. Die Demo-Implementierung schreibt den Code ins Log; Kavenegar / SMS.ir werden per Konfiguration eingesetzt.</summary>
public interface ISmsSender
{
    Task SendOtpAsync(string phoneNumber, string code, string purposeLabel, CancellationToken ct);
    /// <summary>Vorlagen-SMS (Willkommen, Erinnerung, Geburtstag, Aktion). Preview dient nur dem Demo-Log.</summary>
    Task SendTemplateAsync(string phoneNumber, string template, IReadOnlyList<string> tokens, string preview, CancellationToken ct);
}

/// <summary>Erzeugung des Zugriffstokens (JWT) — in der API-Schicht implementiert.</summary>
public interface IAccessTokenFactory
{
    (string Token, DateTime ExpiresAtUtc) Create(Domain.Entities.AppUser user, IEnumerable<string> roles);
}

/// <summary>Speichern privater Dateien (Vertrags-/Rechnungs-PDF) außerhalb von wwwroot.</summary>
public interface IPrivateFileStore
{
    Task<string> SaveAsync(string folder, string fileName, byte[] content, CancellationToken ct);
    Task<byte[]?> ReadAsync(string relativePath, CancellationToken ct);
}

/// <summary>Informationen zur aktuellen Anfrage für Audit-Log und Vertrag.</summary>
public sealed record RequestContext(string? Ip, string? UserAgent);

/// <summary>Live-Benachrichtigung bei Änderungen einer Bistro-Bestellung (mit SignalR in der API-Schicht).</summary>
public interface ICanteenNotifier
{
    Task OrderChangedAsync(Dtos.CanteenOrderDto order, CancellationToken ct);
}

/// <summary>Eindeutige Referenznummer für das Gateway (für alle Zahlungsarten).</summary>
public static class TrackingNumbers
{
    public static async Task<long> NewAsync(DataAccess.GymDbContext db, CancellationToken ct)
    {
        for (var i = 0; i < 5; i++)
        {
            var n = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100_000_000, int.MaxValue) + 10_000_000_000L;
            if (!await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(db.Payments, p => p.TrackingNumber == n, ct)) return n;
        }
        throw new InvalidOperationException("Could not allocate tracking number.");
    }
}

public sealed class CommerceOptions
{
    public const string Section = "Commerce";
    public long ShippingFeeToman { get; set; } = 490;
    public long FreeShippingFromToman { get; set; } = 5_000;
    public long MinTopUpToman { get; set; } = 1_000;
    public long MaxTopUpToman { get; set; } = 50_000;
    public List<long> TopUpPresets { get; set; } = [1_000, 2_000, 5_000, 10_000];
    /// <summary>Unbezahlte Bestellungen werden nach dieser Zeit storniert und ihr Bestand freigegeben.</summary>
    public int PendingOrderMinutes { get; set; } = 30;
    public int MaxQuantityPerLine { get; set; } = 10;
}
