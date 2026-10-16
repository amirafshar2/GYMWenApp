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
/// API گیت و ترنستایل (نسخهٔ ۱). هر دستگاه یک کلید جدا در هدر <c>X-Device-Key</c> دارد.
/// سه حالت اتصال پشتیبانی می‌شود: پرسش آنلاین (check)، فهرست سفید برای کار آفلاین (whitelist)
/// و ارسال دسته‌ای رویدادهای ثبت‌شده در حالت آفلاین (events).
/// </summary>
[ApiController]
[Route("api/v1/access")]
[Produces("application/json")]
[EnableRateLimiting("device")]
[ServiceFilter(typeof(DeviceKeyFilter))]
public sealed class AccessController(IAccessControlService access) : ControllerBase
{
    private DeviceInfo Device => (DeviceInfo)HttpContext.Items[DeviceKeyFilter.ItemKey]!;

    /// <summary>بررسی اتصال و صحت کلید</summary>
    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { device = Device.Name, branchId = Device.BranchId, section = Device.Section.ToString().ToLowerInvariant(), serverTimeUtc = DateTime.UtcNow });

    /// <summary>کارت/دستبند زده شد: اجازهٔ ورود؟ (پاسخ زیر ۲۰۰ میلی‌ثانیه برای باز کردن گیت)</summary>
    [HttpPost("check")]
    [RequestSizeLimit(1024)]
    [ProducesResponseType<AccessCheckResult>(200)]
    public async Task<IActionResult> Check([FromBody] AccessCheckRequest request, CancellationToken ct) =>
        Ok(await access.CheckAsync(Device, request, ct));

    /// <summary>رویدادهای ثبت‌شده در زمان قطعی اینترنت (حداکثر ۵۰۰ در هر درخواست)</summary>
    [HttpPost("events")]
    [RequestSizeLimit(128 * 1024)]
    public async Task<IActionResult> Events([FromBody] IReadOnlyList<AccessCheckRequest> events, CancellationToken ct)
    {
        if (events.Count > 500) return Problem(statusCode: 413, title: "حداکثر ۵۰۰ رویداد در هر درخواست.");
        var results = new List<object>(events.Count);
        foreach (var e in events)
        {
            var r = await access.CheckAsync(Device, e, ct);
            results.Add(new { e.EventId, r.Allowed, r.Reason });
        }
        return Ok(new { received = events.Count, results });
    }

    /// <summary>فهرست سفید وسیله‌های مجاز همین شعبه/سالن، برای گیت‌هایی که تصمیم را محلی می‌گیرند</summary>
    [HttpGet("whitelist")]
    [ProducesResponseType<WhitelistDto>(200)]
    public async Task<IActionResult> Whitelist(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await access.WhitelistAsync(Device, ct));
    }
}

/// <summary>کلید دستگاه را بررسی می‌کند؛ کلید اشتباه = 401 بدون توضیح اضافه.</summary>
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
/// پذیرش: دادن و پس گرفتن دستبند/کارت. نقش از دیتابیس (PanelAccess) و فقط برای اعضای شعبه‌های خود کارمند.
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
