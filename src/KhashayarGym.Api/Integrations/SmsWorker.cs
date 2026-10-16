using KhashayarGym.Business.Services.Panel;

namespace KhashayarGym.Api.Integrations;

/// <summary>
/// صف پیامک: هر دقیقه ارسال (خوش‌آمد فوری، بقیه فقط ۹ صبح تا ۹ شب)،
/// هر ۱۵ دقیقه بررسی یادآوری‌های ۷ و ۱ روز مانده و تولدها (تکراری‌ها با DedupeKey حذف می‌شوند).
/// </summary>
public sealed class SmsWorker(IServiceScopeFactory scopes, ILogger<SmsWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        var tick = 0;
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var sms = scope.ServiceProvider.GetRequiredService<ISmsService>();
                if (tick++ % 15 == 0) await sms.ScheduleDueAsync(stop);
                await sms.DispatchAsync(100, stop);
            }
            catch (Exception ex) when (!stop.IsCancellationRequested) { logger.LogWarning(ex, "SMS worker failed"); }
        } while (await timer.WaitForNextTickAsync(stop));
    }
}
