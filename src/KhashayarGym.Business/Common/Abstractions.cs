namespace KhashayarGym.Business.Common;

/// <summary>ارسال پیامک. پیاده‌سازی دمو کد را در لاگ می‌نویسد؛ Kavenegar / SMS.ir با تنظیمات جایگزین می‌شوند.</summary>
public interface ISmsSender
{
    Task SendOtpAsync(string phoneNumber, string code, string purposeLabel, CancellationToken ct);
    /// <summary>پیامک الگودار (خوش‌آمد، یادآوری، تولد، جشنواره). preview فقط برای لاگ دمو است.</summary>
    Task SendTemplateAsync(string phoneNumber, string template, IReadOnlyList<string> tokens, string preview, CancellationToken ct);
}

/// <summary>ساخت توکن دسترسی (JWT) — در لایهٔ API پیاده‌سازی می‌شود.</summary>
public interface IAccessTokenFactory
{
    (string Token, DateTime ExpiresAtUtc) Create(Domain.Entities.AppUser user, IEnumerable<string> roles);
}

/// <summary>ذخیرهٔ فایل‌های خصوصی (PDF قرارداد/فاکتور) بیرون از wwwroot.</summary>
public interface IPrivateFileStore
{
    Task<string> SaveAsync(string folder, string fileName, byte[] content, CancellationToken ct);
    Task<byte[]?> ReadAsync(string relativePath, CancellationToken ct);
}

/// <summary>اطلاعات درخواست جاری برای لاگ ممیزی و قرارداد.</summary>
public sealed record RequestContext(string? Ip, string? UserAgent);

/// <summary>اعلان لحظه‌ای تغییر سفارش بوفه (پیاده‌سازی با SignalR در لایهٔ API).</summary>
public interface ICanteenNotifier
{
    Task OrderChangedAsync(Dtos.CanteenOrderDto order, CancellationToken ct);
}

/// <summary>شمارهٔ پیگیری یکتا برای درگاه (برای همهٔ انواع پرداخت).</summary>
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
    public long ShippingFeeToman { get; set; } = 150_000;
    public long FreeShippingFromToman { get; set; } = 3_000_000;
    public long MinTopUpToman { get; set; } = 100_000;
    public long MaxTopUpToman { get; set; } = 20_000_000;
    public List<long> TopUpPresets { get; set; } = [300_000, 500_000, 1_000_000, 2_000_000];
    /// <summary>سفارش پرداخت‌نشده بعد از این مدت لغو و موجودی‌اش آزاد می‌شود.</summary>
    public int PendingOrderMinutes { get; set; } = 30;
    public int MaxQuantityPerLine { get; set; } = 10;
}
