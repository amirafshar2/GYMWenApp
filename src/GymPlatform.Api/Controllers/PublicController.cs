using GymPlatform.Business.Dtos;
using GymPlatform.Business.Services;
using GymPlatform.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace GymPlatform.Api.Controllers;

/// <summary>Öffentliche Daten der Seite (nur lesend, gecacht).</summary>
[ApiController]
[Route("api/v1")]
[OutputCache(PolicyName = "public")]
public sealed class PublicController(ICatalogService catalog) : ControllerBase
{
    /// <param name="section">men | women | (leer = alle)</param>
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
        if (s == (GenderSection)(-1)) return ValidationProblem("section muss men oder women sein.");
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
    /// Versionsstatus für die Leiste „Demo-Version“. Außerhalb von Production gilt die Seite als Demo, wenn der Login-Code auf der Seite erscheint oder das Test-Gateway aktiv ist
    /// (oder Site:DemoBanner=true).
    /// </summary>
    [HttpGet("site")]
    public async Task<ActionResult<SiteInfoDto>> Site([FromServices] IConfiguration cfg, [FromServices] IHostEnvironment env,
        [FromServices] GymPlatform.Business.Services.Site.ISiteService site, CancellationToken ct)
    {
        var demo = !env.IsProduction() && (cfg.GetValue("Site:DemoBanner", false)
            || cfg.GetValue("Otp:ExposeCodeInResponse", false) || cfg.GetValue("Payment:UseVirtualGateway", false));
        var c = await site.GetAsync(ct);
        var branches = (await catalog.GetBranchesAsync(null, ct)).Count;
        return Ok(new SiteInfoDto(demo, c.Setup.Published, c.Setup.Mode, branches, c.Brand, c.Contact, c.Theme, c.Home, c.Legal, c.Modules));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<SiteStatsDto>> Stats(CancellationToken ct) =>
        Ok(await catalog.GetStatsAsync(ct));
}

/// <summary>Alle öffentlichen Einstellungen der Seite (Name, Logo, Farben, Texte, Module) + Veröffentlichungsstatus</summary>
public sealed record SiteInfoDto(bool Demo, bool Published, string Mode, int Branches,
    GymPlatform.Business.Services.Site.BrandSettings Brand, GymPlatform.Business.Services.Site.ContactSettings Contact,
    GymPlatform.Business.Services.Site.ThemeSettings Theme, GymPlatform.Business.Services.Site.HomeSettings Home,
    GymPlatform.Business.Services.Site.LegalSettings Legal, GymPlatform.Business.Services.Site.ModuleSettings Modules);
