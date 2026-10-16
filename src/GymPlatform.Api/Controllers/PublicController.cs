using GymPlatform.Business.Dtos;
using GymPlatform.Business.Services;
using GymPlatform.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace GymPlatform.Api.Controllers;

/// <summary>داده‌های عمومی سایت (فقط خواندنی، کش‌شده).</summary>
[ApiController]
[Route("api/v1")]
[OutputCache(PolicyName = "public")]
public sealed class PublicController(ICatalogService catalog) : ControllerBase
{
    /// <param name="section">men | women | (خالی = همه)</param>
    [HttpGet("branches")]
    public async Task<ActionResult<IReadOnlyList<BranchDto>>> Branches([FromQuery] string? section, CancellationToken ct)
    {
        GenderSection? s = section?.ToLowerInvariant() switch
        {
            "men" => GenderSection.Men,
            "women" => GenderSection.Women,
            null or "" or "all" => null,
            _ => (GenderSection?)(-1)
        };
        if (s == (GenderSection)(-1)) return ValidationProblem("section باید men یا women باشد.");
        return Ok(await catalog.GetBranchesAsync(s, ct));
    }

    [HttpGet("branches/{slug:regex(^[[a-z0-9-]]{{1,80}}$)}")]
    public async Task<ActionResult<BranchDto>> Branch(string slug, CancellationToken ct) =>
        await catalog.GetBranchAsync(slug, ct) is { } b ? Ok(b) : NotFound();

    [HttpGet("packages")]
    public async Task<ActionResult<IReadOnlyList<PackageDto>>> Packages(CancellationToken ct) =>
        Ok(await catalog.GetPackagesAsync(ct));

    [HttpGet("coaches")]
    public async Task<ActionResult<IReadOnlyList<CoachDto>>> Coaches(CancellationToken ct) =>
        Ok(await catalog.GetCoachesAsync(ct));

    [HttpGet("campaigns/active")]
    public async Task<ActionResult<CampaignDto>> ActiveCampaign(CancellationToken ct) =>
        await catalog.GetActiveCampaignAsync(ct) is { } c ? Ok(c) : NoContent();

    [HttpGet("faq")]
    public async Task<ActionResult<IReadOnlyList<FaqDto>>> Faq(CancellationToken ct) =>
        Ok(await catalog.GetFaqAsync(ct));

    /// <summary>
    /// وضعیت نسخه برای نمایش نوار «نسخهٔ نمایشی». خارج از Production، وقتی کد ورود روی صفحه یا درگاه آزمایشی فعال است
    /// (یا Site:DemoBanner=true)، سایت دمو حساب می‌شود.
    /// </summary>
    [HttpGet("site")]
    public ActionResult<SiteInfoDto> Site([FromServices] IConfiguration cfg, [FromServices] IHostEnvironment env)
    {
        var demo = !env.IsProduction() && (cfg.GetValue("Site:DemoBanner", false)
            || cfg.GetValue("Otp:ExposeCodeInResponse", false) || cfg.GetValue("Payment:UseVirtualGateway", false));
        return Ok(new SiteInfoDto(demo));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<SiteStatsDto>> Stats(CancellationToken ct) =>
        Ok(await catalog.GetStatsAsync(ct));
}

public sealed record SiteInfoDto(bool Demo);
