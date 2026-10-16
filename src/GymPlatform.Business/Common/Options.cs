namespace GymPlatform.Business.Common;

public sealed class OtpOptions
{
    public const string Section = "Otp";
    public int CodeLength { get; set; } = 5;
    /// <summary>انقضای ۲ دقیقه‌ای (الزام سند امنیت).</summary>
    public int LifetimeSeconds { get; set; } = 120;
    public int MaxAttempts { get; set; } = 5;
    public int ResendCooldownSeconds { get; set; } = 60;
    public int MaxPerHour { get; set; } = 5;
    /// <summary>فقط حالت دمو: کد در پاسخ API هم برگردانده شود. در production همیشه false.</summary>
    public bool ExposeCodeInResponse { get; set; }
    /// <summary>کلید HMAC برای هش کد؛ از User Secrets / متغیر محیطی Otp__Pepper.</summary>
    public string Pepper { get; set; } = "";
}

public sealed class AuthOptions
{
    public const string Section = "Auth";
    public int RefreshTokenDays { get; set; } = 30;
    /// <summary>
    /// مهلت کوتاه برای حالتی که پاسخِ تازه‌سازی به مرورگر نرسیده (رفرش صفحه وسط درخواست):
    /// اگر توکن قبلی چند ثانیه پیش چرخانده شده، از همان IP آمده و توکن جانشین هنوز استفاده نشده، سرقت حساب نمی‌شود.
    /// </summary>
    public int ReuseGraceSeconds { get; set; } = 30;
}
