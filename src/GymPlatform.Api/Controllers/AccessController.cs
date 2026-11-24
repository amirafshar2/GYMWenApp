using GymPlatform.Api.Auth;
using GymPlatform.Api.Infrastructure;
using GymPlatform.Business.Services.Access;
using GymPlatform.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.RateLimiting;

namespace GymPlatform.Api.Controllers;

/// <summary>
/// Gate- und Drehkreuz-API (Version 1). Jedes Gerät hat einen eigenen Schlüssel im Header <c>X-Device-Key</c> .
/// Drei Anbindungsarten: Online-Abfrage (check), Whitelist für Offline-Betrieb (whitelist)
/// und Sammelversand der offline erfassten Ereignisse (events).
/// </summary>
[ApiController]
[Route("api/v1/access")]
[Produces("application/json")]
[EnableRateLimiting("device")]
[ServiceFilter(typeof(DeviceKeyFilter))]
public sealed class AccessController(IAccessControlService access) : ControllerBase
{
    private DeviceInfo Device => (DeviceInfo)HttpContext.Items[DeviceKeyFilter.ItemKey]!;

    /// <summary>Verbindung und Schlüssel prüfen</summary>
    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { device = Device.Name, branchId = Device.BranchId, section = Device.Section.ToString().ToLowerInvariant(), serverTimeUtc = DateTime.UtcNow });

    /// <summary>Karte/Armband gescannt: Zutritt erlaubt? (Antwort unter 200 ms zum Öffnen des Gates)</summary>
    [HttpPost("check")]
    [RequestSizeLimit(1024)]
    [ProducesResponseType<AccessCheckResult>(200)]
    public async Task<IActionResult> Check([FromBody] AccessCheckRequest request, CancellationToken ct) =>
        Ok(await access.CheckAsync(Device, request, ct));

    /// <summary>Während eines Internetausfalls erfasste Ereignisse (höchstens 500 pro Anfrage)</summary>
    [HttpPost("events")]
    [RequestSizeLimit(128 * 1024)]
    public async Task<IActionResult> Events([FromBody] IReadOnlyList<AccessCheckRequest> events, CancellationToken ct)
    {
        if (events.Count > 500) return Problem(statusCode: 413, title: "Höchstens 500 Ereignisse pro Anfrage.");
        var results = new List<object>(events.Count);
        foreach (var e in events)
        {
            var r = await access.CheckAsync(Device, e, ct);
            results.Add(new { e.EventId, r.Allowed, r.Reason });
        }
        return Ok(new { received = events.Count, results });
    }

    /// <summary>Whitelist der erlaubten Zutrittsmittel dieser Filiale/dieses Bereichs, für Gates mit lokaler Entscheidung</summary>
    [HttpGet("whitelist")]
    [ProducesResponseType<WhitelistDto>(200)]
    public async Task<IActionResult> Whitelist(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await access.WhitelistAsync(Device, ct));
    }
}

/// <summary>Prüft den Geräteschlüssel; falscher Schlüssel = 401 ohne weitere Erklärung.</summary>
public sealed class DeviceKeyFilter(IAccessControlService access) : IAsyncActionFilter
{
    public const string Header = "X-Device-Key";
    public const string ItemKey = "kg-device";

    public async Task OnActionExecutionAsync(ActionExecutingContext ctx, ActionExecutionDelegate next)
    {
        var device = await access.AuthenticateDeviceAsync(ctx.HttpContext.Request.Headers[Header].ToString(), ctx.HttpContext.RequestAborted);
        if (device is null) { ctx.Result = new UnauthorizedResult(); return; }
        ctx.HttpContext.Items[ItemKey] = device;
        await next();
    }
}

/// <summary>
/// Empfang: Ausgabe und Rücknahme von Armband/Karte. Rolle aus der Datenbank (PanelAccess) und nur für Mitglieder der eigenen Filialen.
/// </summary>
[ApiController]
[Route("api/v1/staff/members/{userId:int}/credentials")]
[Authorize]
[PanelAccess(Roles.BranchManager, Roles.Reception)]
[Produces("application/json")]
public sealed class StaffCredentialsController(IAccessControlService access, GymPlatform.Business.Services.Panel.IReceptionService reception) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(int userId, CancellationToken ct) =>
        await reception.CanSeeMemberAsync(this.Scope(), userId, ct) ? Ok(await access.ListAsync(userId, ct)) : NotFound();

    [HttpPost]
    [RequestSizeLimit(1024)]
    public async Task<IActionResult> Assign(int userId, [FromBody] AssignCredentialRequest request, CancellationToken ct) =>
        !await reception.CanSeeMemberAsync(this.Scope(), userId, ct) ? NotFound()
            : (await access.AssignAsync(userId, request, User.UserId(), ct)).ToActionResult(this, c => StatusCode(201, c));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Revoke(int userId, int id, CancellationToken ct) =>
        await reception.CanSeeMemberAsync(this.Scope(), userId, ct) && await access.RevokeAsync(userId, id, ct) ? NoContent() : NotFound();
}
