using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace KhashayarGym.Api.Filters;

/// <summary>
/// بررسی توکن CSRF (کوکی + هدر X-XSRF-TOKEN) برای درخواست‌های بی‌نام (فرم‌ها، ورود).
/// درخواست‌هایی که با توکن Bearer (JWT در هدر Authorization) احراز شده‌اند در معرض CSRF نیستند،
/// چون مرورگر این هدر را خودکار نمی‌فرستد؛ برای آن‌ها بررسی لازم نیست.
/// توکن از GET /api/v1/security/csrf گرفته می‌شود.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class ValidateCsrfAttribute : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;
        if (http.User.Identity?.IsAuthenticated == true &&
            http.Request.Headers.Authorization.ToString().StartsWith(JwtBearerDefaults.AuthenticationScheme + " ", StringComparison.Ordinal))
            return;

        var antiforgery = http.RequestServices.GetRequiredService<IAntiforgery>();
        if (!await antiforgery.IsRequestValidAsync(http))
            context.Result = new BadRequestObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "توکن امنیتی نامعتبر است. صفحه را دوباره بارگذاری کنید."
            });
    }
}

/// <summary>
/// برای endpointهایی که با کوکی کار می‌کنند (refresh/logout): فقط درخواست هم‌مبدأ با هدر سفارشی پذیرفته می‌شود.
/// کوکی SameSite=Strict است؛ این بررسی لایهٔ دوم دفاع در برابر CSRF است.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class SameOriginOnlyAttribute : Attribute, IAuthorizationFilter
{
    public const string Header = "X-KG-Client";

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var req = context.HttpContext.Request;
        var site = req.Headers["Sec-Fetch-Site"].ToString();
        var origin = req.Headers.Origin.ToString();
        var sameOrigin = site is "" or "same-origin" or "none" &&
                         (origin.Length == 0 || Uri.TryCreate(origin, UriKind.Absolute, out var o) && o.Authority == req.Host.Value);
        if (!sameOrigin || req.Headers[Header].ToString() != "web")
            context.Result = new ObjectResult(new ProblemDetails { Status = 403, Title = "درخواست از مبدأ نامعتبر." }) { StatusCode = 403 };
    }
}
