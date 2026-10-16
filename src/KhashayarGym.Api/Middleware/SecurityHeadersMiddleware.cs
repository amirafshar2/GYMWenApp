namespace KhashayarGym.Api.Middleware;

/// <summary>هدرهای امنیتی (OWASP Secure Headers). CSP فقط عکس‌های موقت مربیان را از Unsplash اجازه می‌دهد.</summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment env, IConfiguration config)
{
    /// <summary>صفحهٔ درگاه آزمایشی Parbad اسکریپت درون‌خطی دارد؛ CSP شل‌تر فقط برای همین مسیر.</summary>
    public const string SandboxPath = "/payment-sandbox";

    // عکس‌های موقت مربیان تا رسیدن عکس واقعی؛ بعد از جایگزینی، این میزبان حذف شود
    // trustseal.enamad.ir: تصویر نماد اعتماد الکترونیکی در فوتر
    private const string ImageHosts = "https://images.unsplash.com https://trustseal.enamad.ir";

    private string? _csp;
    private string Csp => _csp ??= BuildCsp(config);

    private static readonly string SandboxCsp = string.Join("; ",
        "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'");

    // فرم پرداخت از سایت مستقیم به درگاه بانک (shaparak) ارسال می‌شود؛ میزبان‌ها از تنظیمات Payment:GatewayHosts
    private static string BuildCsp(IConfiguration config)
    {
        var gateways = config.GetSection("Payment:GatewayHosts").Get<string[]>() ?? ["https://*.shaparak.ir"];
        return string.Join("; ",
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        $"img-src 'self' data: blob: {ImageHosts}",
        "font-src 'self' data:",
        "connect-src 'self'",
        "worker-src 'self' blob:",
        "media-src 'self' blob:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        $"form-action 'self' {string.Join(' ', gateways)}".TrimEnd(),
        "object-src 'none'");
    }

    public Task Invoke(HttpContext ctx)
    {
        // تصمیم همین‌جا گرفته می‌شود: Parbad با Map مسیر را به PathBase منتقل می‌کند و در OnStarting دیگر دیده نمی‌شود
        var csp = ctx.Request.Path.StartsWithSegments(SandboxPath) ? SandboxCsp : Csp;
        ctx.Response.OnStarting(() =>
        {
            var h = ctx.Response.Headers;
            h["Content-Security-Policy"] = env.IsDevelopment() ? csp : csp + "; upgrade-insecure-requests";
            h["X-Content-Type-Options"] = "nosniff";
            h["X-Frame-Options"] = "DENY";
            h["Referrer-Policy"] = "strict-origin-when-cross-origin";
            h["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=(), payment=(self), usb=()";
            h["Cross-Origin-Opener-Policy"] = "same-origin";
            h.Remove("Server");
            h.Remove("X-Powered-By");
            return Task.CompletedTask;
        });
        return next(ctx);
    }
}
