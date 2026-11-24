using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GymPlatform.Api.Filters;

/// <summary>
/// Prüfung des CSRF-Tokens (Cookie + Header X-XSRF-TOKEN) für anonyme Anfragen (Formulare, Login).
/// Anfragen mit Bearer-Token (JWT im Authorization-Header) sind nicht CSRF-gefährdet,
/// weil der Browser diesen Header nicht automatisch sendet; dort ist keine Prüfung nötig.
/// Das Token kommt von GET /api/v1/security/csrf.
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
                Title = "Ungültiges Sicherheitstoken. Bitte die Seite neu laden."
            });
    }
}

/// <summary>
/// Für Endpoints mit Cookie (refresh/logout): nur Same-Origin-Anfragen mit eigenem Header werden akzeptiert.
/// Das Cookie ist SameSite=Strict; diese Prüfung ist die zweite Verteidigungslinie gegen CSRF.
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
            context.Result = new ObjectResult(new ProblemDetails { Status = 403, Title = "Anfrage von ungültigem Ursprung." }) { StatusCode = 403 };
    }
}
