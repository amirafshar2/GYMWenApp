namespace KhashayarGym.Api.Auth;

/// <summary>کوکی توکن تازه‌سازی: HttpOnly، SameSite=Strict، Secure در production، محدود به مسیر auth.</summary>
public static class RefreshCookie
{
    public const string Path = "/api/v1/auth";
    public static string Name(IWebHostEnvironment env) => env.IsDevelopment() ? "kg-rt" : "__Secure-kg-rt";

    public static void Set(HttpResponse res, IWebHostEnvironment env, string token, DateTime expiresUtc) =>
        res.Cookies.Append(Name(env), token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !env.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = Path,
            Expires = expiresUtc,
            IsEssential = true,
        });

    public static void Clear(HttpResponse res, IWebHostEnvironment env) =>
        res.Cookies.Delete(Name(env), new CookieOptions { Path = Path, Secure = !env.IsDevelopment(), SameSite = SameSiteMode.Strict, HttpOnly = true });

    public static string? Read(HttpRequest req, IWebHostEnvironment env) => req.Cookies[Name(env)];
}
