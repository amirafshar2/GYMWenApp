using KhashayarGym.Business.Common;

namespace KhashayarGym.Api.Infrastructure;

/// <summary>دمو: پیامک واقعی فرستاده نمی‌شود؛ کد در لاگ چاپ می‌شود (الزام سند برای دمو).</summary>
public sealed class LogSmsSender(ILogger<LogSmsSender> logger) : ISmsSender
{
    public Task SendOtpAsync(string phoneNumber, string code, string purposeLabel, CancellationToken ct)
    {
        logger.LogWarning("[SMS-DEMO] کد {Purpose} برای {Phone}: {Code}", purposeLabel, phoneNumber, code);
        return Task.CompletedTask;
    }
}

public sealed class KavenegarOptions
{
    public string ApiKey { get; set; } = "";
    /// <summary>نام الگوی Verify Lookup در پنل کاوه‌نگار.</summary>
    public string Template { get; set; } = "khashayar-otp";
}

/// <summary>ارسال واقعی با Verify Lookup کاوه‌نگار. کلید فقط از User Secrets / متغیر محیطی Sms__Kavenegar__ApiKey.</summary>
public sealed class KavenegarSmsSender(HttpClient http, Microsoft.Extensions.Options.IOptions<KavenegarOptions> options, ILogger<KavenegarSmsSender> logger) : ISmsSender
{
    public async Task SendOtpAsync(string phoneNumber, string code, string purposeLabel, CancellationToken ct)
    {
        var o = options.Value;
        var url = $"https://api.kavenegar.com/v1/{Uri.EscapeDataString(o.ApiKey)}/verify/lookup.json" +
                  $"?receptor={Uri.EscapeDataString(phoneNumber)}&token={Uri.EscapeDataString(code)}&template={Uri.EscapeDataString(o.Template)}";
        using var res = await http.GetAsync(url, ct);
        if (!res.IsSuccessStatusCode)
            logger.LogError("Kavenegar returned {Status}", (int)res.StatusCode);
        res.EnsureSuccessStatusCode();
    }
}
