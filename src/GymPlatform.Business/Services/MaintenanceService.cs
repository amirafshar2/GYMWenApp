using GymPlatform.Business.Common;
using GymPlatform.DataAccess;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymPlatform.Business.Services;

public interface IMaintenanceService
{
    Task<MaintenanceReport> CleanupAsync(CancellationToken ct);
}

public sealed record MaintenanceReport(int OtpCodes, int RefreshTokens, int IntegrationEvents);

/// <summary>
/// Tägliches Aufräumen von Daten, die nur kurz gebraucht werden, damit die Datenbank nicht unnötig wächst.
/// Geschäftsdaten (Mitgliedschaft, Zahlung, Check-in, Bestellung, Guthabenbuch, Audit-Log, SMS) werden nie gelöscht.
/// </summary>
public sealed class MaintenanceService(GymDbContext db, IClock clock, ILogger<MaintenanceService> logger) : IMaintenanceService
{
    public async Task<MaintenanceReport> CleanupAsync(CancellationToken ct)
    {
        var now = clock.UtcNow;
        // Login-Code: 2 Minuten gültig; die Grenze „5 Codes pro Stunde“ betrachtet nur die letzte Stunde
        var otp = await db.OtpCodes.Where(o => o.CreatedAtUtc < now.AddDays(-2)).ExecuteDeleteAsync(ct);
        // Abgelaufene Sitzungen (widerrufene Tokens bleiben bis zum Ablauf, damit Wiederverwendung erkannt wird)
        var tokens = await db.RefreshTokens.Where(t => t.ExpiresAtUtc < now.AddDays(-1)).ExecuteDeleteAsync(ct);
        // An das Gate-/Buchhaltungssystem gesendete Ereignisse
        var events = await db.IntegrationEvents.Where(e => e.ProcessedAtUtc != null && e.ProcessedAtUtc < now.AddDays(-30)).ExecuteDeleteAsync(ct);
        if (otp + tokens + events > 0)
            logger.LogInformation("Maintenance removed {Otp} OTP codes, {Tokens} refresh tokens, {Events} integration events", otp, tokens, events);
        return new MaintenanceReport(otp, tokens, events);
    }
}
