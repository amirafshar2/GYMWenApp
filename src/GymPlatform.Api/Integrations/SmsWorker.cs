using GymPlatform.Business.Services.Panel;

namespace GymPlatform.Api.Integrations;

/// <summary>
/// SMS-Warteschlange: jede Minute Versand (Willkommen sofort, sonst nur 9 bis 21 Uhr),
/// alle 15 Minuten Prüfung der Erinnerungen für 7 und 1 Resttag sowie der Geburtstage (Duplikate per DedupeKey entfernt).
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
