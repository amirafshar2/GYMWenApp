namespace GymPlatform.Api.Infrastructure;

/// <summary>
/// در محیط Production اگر حتی یکی از تنظیمات دمو یا ناامن جا مانده باشد، سرور اصلاً بالا نمی‌آید
/// (بهتر از اینکه مثلاً درگاه آزمایشی روی سایت واقعی عضویت مجانی بدهد یا کد ورود در لاگ چاپ شود).
/// </summary>
public static class ProductionGuard
{
    public static IReadOnlyList<string> Problems(IConfiguration c)
    {
        var p = new List<string>();
        if (c.GetValue("Payment:UseVirtualGateway", false)) p.Add("Payment:UseVirtualGateway باید false باشد (درگاه آزمایشی در production ممنوع است).");
        if (string.IsNullOrWhiteSpace(c["Payment:ZarinPal:MerchantId"])) p.Add("Payment:ZarinPal:MerchantId خالی است.");
        if (c.GetValue("Payment:ZarinPal:IsSandbox", false)) p.Add("Payment:ZarinPal:IsSandbox باید false باشد.");
        if (!Uri.TryCreate(c["Payment:CallbackBaseUrl"], UriKind.Absolute, out var cb) || cb.Scheme != Uri.UriSchemeHttps)
            p.Add("Payment:CallbackBaseUrl باید آدرس https سایت باشد (مثل https://example.ir).");
        if (c.GetValue("Otp:ExposeCodeInResponse", false)) p.Add("Otp:ExposeCodeInResponse باید false باشد (وگرنه هر کسی با هر شماره‌ای وارد می‌شود).");
        if (!string.Equals(c["Sms:Provider"], "Kavenegar", StringComparison.OrdinalIgnoreCase)) p.Add("Sms:Provider باید Kavenegar باشد (Log کد ورود را در لاگ می‌نویسد).");
        else if (string.IsNullOrWhiteSpace(c["Sms:Kavenegar:ApiKey"])) p.Add("Sms:Kavenegar:ApiKey خالی است.");
        if (string.Equals(c["Database:Provider"], "Sqlite", StringComparison.OrdinalIgnoreCase)) p.Add("Database:Provider در production باید SqlServer باشد.");
        if (string.IsNullOrWhiteSpace(c["AllowedHosts"]) || c["AllowedHosts"]!.Trim() == "*") p.Add("AllowedHosts را روی دامنهٔ سایت بگذارید (مثل example.ir;www.example.ir).");
        if (!string.IsNullOrEmpty(c["Access:DemoDeviceKey"])) p.Add("Access:DemoDeviceKey باید خالی باشد.");
        if (c.GetValue("Demo:SeedMembers", false) || !string.IsNullOrEmpty(c["Demo:StaffPhone"])) p.Add("تنظیمات Demo:* باید خالی باشند.");
        return p;
    }

    public static void Enforce(IConfiguration c, IHostEnvironment env)
    {
        if (!env.IsProduction()) return;
        var problems = Problems(c);
        if (problems.Count > 0)
            throw new InvalidOperationException("تنظیمات production ناامن است؛ سرور اجرا نمی‌شود:\n- " + string.Join("\n- ", problems));
    }
}
