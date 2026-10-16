using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GymPlatform.Api.Integrations;

/// <summary>
/// مقصدی که رویدادهای صف خروجی را می‌گیرد. برای هر سیستم بیرونی (نرم‌افزار گیت شرکت X، حسابداری، …)
/// یک پیاده‌سازی جدا نوشته و ثبت می‌شود؛ بقیهٔ سیستم تغییری نمی‌کند.
/// </summary>
public interface IIntegrationSink
{
    string Name { get; }
    bool Enabled { get; }
    Task SendAsync(IntegrationEvent e, CancellationToken ct);
}

public sealed class WebhookOptions
{
    public const string Section = "Integrations:Webhook";
    /// <summary>آدرس HTTPS گیرنده (مثلاً میان‌افزار نرم‌افزار گیت). خالی = غیرفعال.</summary>
    public string? Url { get; set; }
    /// <summary>کلید امضای HMAC (در User Secrets / متغیر محیطی)</summary>
    public string? Secret { get; set; }
}

/// <summary>
/// وب‌هوک عمومی: هر رویداد با POST و امضای HMAC-SHA256 در هدر <c>X-KG-Signature</c> ارسال می‌شود.
/// گیرنده با همان کلید، بدنه را امضا و مقایسه می‌کند تا جعلی نباشد.
/// </summary>
public sealed class WebhookSink(HttpClient http, IOptions<WebhookOptions> options) : IIntegrationSink
{
    public string Name => "webhook";
    public bool Enabled => !string.IsNullOrWhiteSpace(options.Value.Url) && !string.IsNullOrWhiteSpace(options.Value.Secret);

    public async Task SendAsync(IntegrationEvent e, CancellationToken ct)
    {
        var body = $$"""{"id":{{e.Id}},"type":"{{e.Type}}","occurredAtUtc":"{{e.CreatedAtUtc:O}}","data":{{e.Payload}}}""";
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var sig = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(options.Value.Secret!), Encoding.UTF8.GetBytes($"{ts}.{body}"))).ToLowerInvariant();
        using var req = new HttpRequestMessage(HttpMethod.Post, options.Value.Url) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
        req.Headers.Add("X-KG-Event", e.Type);
        req.Headers.Add("X-KG-Delivery", e.Id.ToString());
        req.Headers.Add("X-KG-Timestamp", ts);
        req.Headers.Add("X-KG-Signature", $"sha256={sig}");
        req.Headers.UserAgent.Add(new ProductInfoHeaderValue("GymPlatform-Webhook", "1.0"));
        using var res = await http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
    }
}

/// <summary>
/// هر چند ثانیه رویدادهای ارسال‌نشده را به همهٔ مقصدهای فعال می‌فرستد. شکست = تلاش دوباره با فاصلهٔ افزایشی
/// (۱۰ ثانیه، ۴۰ ثانیه، … تا یک ساعت)؛ بعد از ۲۰ تلاش رها و در لاگ ثبت می‌شود.
/// </summary>
public sealed class IntegrationDispatcher(IServiceScopeFactory scopes, ILogger<IntegrationDispatcher> logger) : BackgroundService
{
    private const int MaxAttempts = 20;

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        do
        {
            try { await DispatchOnceAsync(stop); }
            catch (Exception ex) when (!stop.IsCancellationRequested) { logger.LogWarning(ex, "Integration dispatch cycle failed"); }
        } while (await timer.WaitForNextTickAsync(stop));
    }

    public async Task DispatchOnceAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var sinks = scope.ServiceProvider.GetServices<IIntegrationSink>().Where(s => s.Enabled).ToList();
        var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
        var now = DateTime.UtcNow;
        var batch = await db.IntegrationEvents
            .Where(e => e.ProcessedAtUtc == null && e.Attempts < MaxAttempts && e.NextAttemptAtUtc <= now)
            .OrderBy(e => e.Id).Take(50).ToListAsync(ct);
        foreach (var e in batch)
        {
            if (sinks.Count == 0) { e.ProcessedAtUtc = now; e.LastError = "no-sink"; continue; } // مقصدی تعریف نشده: فقط آرشیو
            try
            {
                foreach (var s in sinks) await s.SendAsync(e, ct);
                e.ProcessedAtUtc = DateTime.UtcNow;
                e.LastError = null;
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                e.Attempts++;
                e.NextAttemptAtUtc = DateTime.UtcNow.AddSeconds(Math.Min(3600, 10 * Math.Pow(4, Math.Min(e.Attempts - 1, 6))));
                e.LastError = ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
                logger.LogWarning("Integration event {Id} ({Type}) failed, attempt {Attempt}: {Error}", e.Id, e.Type, e.Attempts, e.LastError);
            }
        }
        if (batch.Count > 0) await db.SaveChangesAsync(ct);
    }
}
