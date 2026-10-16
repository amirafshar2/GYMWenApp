using KhashayarGym.Business.Common;
using KhashayarGym.DataAccess;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace KhashayarGym.Business.Services;

public interface IMaintenanceService
{
    Task<MaintenanceReport> CleanupAsync(CancellationToken ct);
}

public sealed record MaintenanceReport(int OtpCodes, int RefreshTokens, int IntegrationEvents);

/// <summary>
/// پاک‌سازی روزانهٔ داده‌هایی که فقط مدت کوتاهی لازم‌اند تا دیتابیس بی‌دلیل بزرگ نشود.
/// داده‌های کسب‌وکار (عضویت، پرداخت، ورود، سفارش، دفتر کیف پول، لاگ ممیزی، پیامک‌ها) هرگز پاک نمی‌شوند.
/// </summary>
public sealed class MaintenanceService(GymDbContext db, IClock clock, ILogger<MaintenanceService> logger) : IMaintenanceService
{
    public async Task<MaintenanceReport> CleanupAsync(CancellationToken ct)
    {
        var now = clock.UtcNow;
        // کد ورود: ۲ دقیقه اعتبار دارد؛ سقف «۵ کد در ساعت» فقط به یک ساعت اخیر نگاه می‌کند
        var otp = await db.OtpCodes.Where(o => o.CreatedAtUtc < now.AddDays(-2)).ExecuteDeleteAsync(ct);
        // نشست‌های منقضی (توکن باطل‌شده تا وقت انقضا نگه داشته می‌شود تا استفادهٔ دوباره از آن تشخیص داده شود)
        var tokens = await db.RefreshTokens.Where(t => t.ExpiresAtUtc < now.AddDays(-1)).ExecuteDeleteAsync(ct);
        // رویدادهای ارسال‌شده به سیستم گیت/حسابداری
        var events = await db.IntegrationEvents.Where(e => e.ProcessedAtUtc != null && e.ProcessedAtUtc < now.AddDays(-30)).ExecuteDeleteAsync(ct);
        if (otp + tokens + events > 0)
            logger.LogInformation("Maintenance removed {Otp} OTP codes, {Tokens} refresh tokens, {Events} integration events", otp, tokens, events);
        return new MaintenanceReport(otp, tokens, events);
    }
}
