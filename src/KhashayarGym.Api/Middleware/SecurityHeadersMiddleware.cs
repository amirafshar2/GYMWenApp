namespace KhashayarGym.Api.Middleware;

/// <summary>هدرهای امنیتی (OWASP Secure Headers). CSP فقط عکس‌های موقت مربیان را از Unsplash اجازه می‌دهد.</summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment env)
{
    // عکس‌های موقت مربیان تا رسیدن عکس واقعی؛ بعد از جایگزینی، این میزبان حذف شود
    private const string ImageHosts = "https://images.unsplash.com";

    private static readonly string Csp = string.Join("; ",
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
        "form-action 'self'",
        "object-src 'none'");

    public Task Invoke(HttpContext ctx)
    {
        ctx.Response.OnStarting(() =>
        {
            var h = ctx.Response.Headers;
            h["Content-Security-Policy"] = env.IsDevelopment() ? Csp : Csp + "; upgrade-insecure-requests";
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
