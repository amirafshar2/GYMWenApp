using KhashayarGym.Api.Filters;
using KhashayarGym.Business.Dtos;
using KhashayarGym.Business.Services;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace KhashayarGym.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class ConsultationsController(IConsultationService service, IAntiforgery antiforgery) : ControllerBase
{
    /// <summary>توکن CSRF: کوکی را ست می‌کند و توکن را برای هدر X-XSRF-TOKEN برمی‌گرداند.</summary>
    [HttpGet("security/csrf")]
    public IActionResult Csrf()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        Response.Headers.CacheControl = "no-store";
        return Ok(new { token = tokens.RequestToken });
    }

    [HttpPost("consultations")]
    [ValidateCsrf]
    [EnableRateLimiting("forms")]
    [RequestSizeLimit(8 * 1024)]
    public async Task<IActionResult> Create([FromBody] CreateConsultationRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        if (!result.Succeeded)
            return ValidationProblem(new ValidationProblemDetails(
                result.Errors.ToDictionary(k => k.Key, v => v.Value)));
        return Ok(result.Value);
    }
}
