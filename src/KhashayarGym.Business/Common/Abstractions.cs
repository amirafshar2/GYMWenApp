namespace KhashayarGym.Business.Common;

/// <summary>ارسال پیامک. پیاده‌سازی دمو کد را در لاگ می‌نویسد؛ Kavenegar / SMS.ir با تنظیمات جایگزین می‌شوند.</summary>
public interface ISmsSender
{
    Task SendOtpAsync(string phoneNumber, string code, string purposeLabel, CancellationToken ct);
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
