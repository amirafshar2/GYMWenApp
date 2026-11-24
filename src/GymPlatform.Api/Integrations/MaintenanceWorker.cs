using GymPlatform.Business.Services;

namespace GymPlatform.Api.Integrations;

/// <summary>Einmal täglich temporäre Daten aufräumen (Login-Codes, abgelaufene Sitzungen, gesendete Ereignisse).</summary>
public sealed class MaintenanceWorker(IServiceScopeFactory scopes, ILogger<MaintenanceWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        try { await Task.Delay(TimeSpan.FromMinutes(5), stop); } catch (OperationCanceledException) { return; }
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<IMaintenanceService>().CleanupAsync(stop);
            }
            catch (Exception ex) when (!stop.IsCancellationRequested) { logger.LogWarning(ex, "Maintenance failed"); }
        } while (await timer.WaitForNextTickAsync(stop));
    }
}
