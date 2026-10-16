using KhashayarGym.Business.Services;

namespace KhashayarGym.Api.Integrations;

/// <summary>روزی یک بار پاک‌سازی داده‌های موقت (کدهای ورود، نشست‌های منقضی، رویدادهای ارسال‌شده).</summary>
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
