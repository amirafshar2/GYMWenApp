using GymPlatform.Business.Common;

namespace GymPlatform.Api.Infrastructure;

/// <summary>دمو: پیامک واقعی فرستاده نمی‌شود؛ کد در لاگ چاپ می‌شود (الزام سند برای دمو).</summary>
public sealed class LogSmsSender(ILogger<LogSmsSender> logger) : ISmsSender
{
    public Task SendOtpAsync(string phoneNumber, string code, string purposeLabel, CancellationToken ct)
    {
        logger.LogWarning("[SMS-DEMO] کد {Purpose} برای {Phone}: {Code}", purposeLabel, phoneNumber, code);
        return Task.CompletedTask;
    }

    public Task SendTemplateAsync(string phoneNumber, string template, IReadOnlyList<string> tokens, string preview, CancellationToken ct)
    {
        logger.LogInformation("[SMS-DEMO] {Template} → {Phone}: {Text}", template, phoneNumber, preview);
        return Task.CompletedTask;
    }
}

public sealed class KavenegarOptions
{
    public string ApiKey { get; set; } = "";
    /// <summary>نام الگوی Verify Lookup در پنل کاوه‌نگار.</summary>
    public string Template { get; set; } = "gym-otp";
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

    /// <summary>الگوهای کاوه‌نگار حداکثر ۳ توکن بدون فاصله دارند (فاصله‌ها از قبل با نیم‌فاصله جایگزین شده‌اند).</summary>
    public async Task SendTemplateAsync(string phoneNumber, string template, IReadOnlyList<string> tokens, string preview, CancellationToken ct)
    {
        var o = options.Value;
        var url = $"https://api.kavenegar.com/v1/{Uri.EscapeDataString(o.ApiKey)}/verify/lookup.json" +
                  $"?receptor={Uri.EscapeDataString(phoneNumber)}&template={Uri.EscapeDataString(template)}";
        string[] names = ["token", "token2", "token3"];
        for (var i = 0; i < Math.Min(3, tokens.Count); i++)
            url += $"&{names[i]}={Uri.EscapeDataString(tokens[i].Replace(' ', '\u200c'))}";
        using var res = await http.GetAsync(url, ct);
        if (!res.IsSuccessStatusCode)
            throw new HttpRequestException($"Kavenegar returned {(int)res.StatusCode}");
    }
}
