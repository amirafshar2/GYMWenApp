using GymPlatform.Api.Filters;
using GymPlatform.Business.Dtos;
using GymPlatform.Business.Services;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GymPlatform.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class ConsultationsController(IConsultationService service, IAntiforgery antiforgery) : ControllerBase
{
    /// <summary>CSRF-Token: setzt das Cookie und gibt das Token für den Header X-XSRF-TOKEN zurück.</summary>
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
