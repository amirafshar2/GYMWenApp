namespace GymPlatform.Api.Middleware;

/// <summary>Sicherheitsheader (OWASP Secure Headers). CSP erlaubt nur die vorläufigen Trainerfotos von Unsplash. Kamera nur für die Seite selbst (QR-Scan am Empfang).</summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment env, IConfiguration config)
{
    /// <summary>Die Seite des Parbad-Test-Gateways hat ein Inline-Skript; die lockere CSP gilt nur für diesen Pfad.</summary>
    public const string SandboxPath = "/payment-sandbox";

    // Vorläufige Trainerfotos bis zu echten Fotos; danach diesen Host entfernen
    // trustseal.enamad.ir: Bild des Vertrauenssiegels im Footer
    private const string ImageHosts = "https://images.unsplash.com https://trustseal.enamad.ir";

    private string? _csp;
    private string Csp => _csp ??= BuildCsp(config, InlineScriptHashes(env));

    /// <summary>
    /// Das kleine Inline-Skript in index.html (Vorladen des Hero-Bildes nur auf der Startseite) wird per Hash erlaubt,
    /// nicht mit 'unsafe-inline'. Der Hash wird zur Laufzeit aus derselben Datei erzeugt, damit er bei jedem Build stimmt.
    /// </summary>
    private static string InlineScriptHashes(IWebHostEnvironment env)
    {
        var path = Path.Combine(env.WebRootPath ?? "", "index.html");
        if (!File.Exists(path)) return "";
        var html = File.ReadAllText(path);
        var hashes = System.Text.RegularExpressions.Regex.Matches(html, @"<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>")
            .Select(m => m.Groups[1].Value).Where(js => js.Trim().Length > 0)
            .Select(js => $"'sha256-{Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(js)))}'");
        return string.Join(' ', hashes);
    }

    private static readonly string SandboxCsp = string.Join("; ",
        "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'");

    // Das Zahlungsformular wird direkt an das Bank-Gateway gesendet; Hosts aus der Einstellung Payment:GatewayHosts
    private static string BuildCsp(IConfiguration config, string scriptHashes)
    {
        var gateways = config.GetSection("Payment:GatewayHosts").Get<string[]>() ?? ["https://*.shaparak.ir"];
        return string.Join("; ",
        "default-src 'self'",
        $"script-src 'self' {scriptHashes}".TrimEnd(),
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
        // Die Entscheidung fällt hier: Parbad verschiebt den Pfad mit Map nach PathBase und in OnStarting ist er nicht mehr sichtbar
        var csp = ctx.Request.Path.StartsWithSegments(SandboxPath) ? SandboxCsp : Csp;
        ctx.Response.OnStarting(() =>
        {
            var h = ctx.Response.Headers;
            h["Content-Security-Policy"] = env.IsDevelopment() ? csp : csp + "; upgrade-insecure-requests";
            h["X-Content-Type-Options"] = "nosniff";
            h["X-Frame-Options"] = "DENY";
            h["Referrer-Policy"] = "strict-origin-when-cross-origin";
            h["Permissions-Policy"] = "geolocation=(self), camera=(self), microphone=(), payment=(self), usb=()";
            h["Cross-Origin-Opener-Policy"] = "same-origin";
            h.Remove("Server");
            h.Remove("X-Powered-By");
            return Task.CompletedTask;
        });
        return next(ctx);
    }
}
