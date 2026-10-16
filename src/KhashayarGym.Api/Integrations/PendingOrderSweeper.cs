using KhashayarGym.Business.Services.Commerce;

namespace KhashayarGym.Api.Integrations;

/// <summary>هر دقیقه سفارش‌های پرداخت‌نشدهٔ قدیمی را لغو و موجودی کنارگذاشته‌شده را آزاد می‌کند.</summary>
public sealed class PendingOrderSweeper(IServiceScopeFactory scopes, ILogger<PendingOrderSweeper> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<IShopService>().ReleaseStaleAsync(stop);
                await scope.ServiceProvider.GetRequiredService<ICanteenService>().ReleaseStaleAsync(stop);
            }
            catch (Exception ex) when (!stop.IsCancellationRequested) { logger.LogWarning(ex, "Pending order sweep failed"); }
        } while (await timer.WaitForNextTickAsync(stop));
    }
}
