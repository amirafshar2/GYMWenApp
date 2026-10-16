using KhashayarGym.Api.Auth;
using KhashayarGym.Api.Filters;
using KhashayarGym.Api.Infrastructure;
using KhashayarGym.Business.Dtos;
using KhashayarGym.Business.Services.Members;
using KhashayarGym.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace KhashayarGym.Api.Controllers;

/// <summary>ورود با موبایل + کد پیامکی؛ توکن دسترسی در بدنه، توکن تازه‌سازی در کوکی HttpOnly.</summary>
[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public sealed class AuthController(IOtpService otp, IAuthService auth, IWebHostEnvironment env) : ControllerBase
{
    /// <summary>ارسال کد ورود (۲ دقیقه اعتبار).</summary>
    [HttpPost("otp")]
    [ValidateCsrf]
    [EnableRateLimiting("otp")]
    [RequestSizeLimit(1024)]
    [ProducesResponseType<OtpSentDto>(200)]
    [ProducesResponseType<ValidationProblemDetails>(400)]
    [ProducesResponseType(429)]
    public async Task<IActionResult> SendOtp([FromBody] OtpRequest request, CancellationToken ct) =>
        (await otp.SendAsync(request.PhoneNumber, OtpPurpose.Login, this.RequestContext(), ct)).ToActionResult(this);

    /// <summary>بررسی کد و ورود (حساب در اولین ورود ساخته می‌شود).</summary>
    [HttpPost("verify")]
    [ValidateCsrf]
    [EnableRateLimiting("auth")]
    [RequestSizeLimit(1024)]
    [ProducesResponseType<AuthResultDto>(200)]
    [ProducesResponseType<ValidationProblemDetails>(400)]
    public async Task<IActionResult> Verify([FromBody] VerifyOtpRequest request, CancellationToken ct)
    {
        var r = await auth.LoginWithOtpAsync(request, this.RequestContext(), ct);
        return r.ToActionResult(this, s =>
        {
            RefreshCookie.Set(Response, env, s.RefreshToken, s.RefreshExpiresAtUtc);
            return Ok(s.Auth);
        });
    }

    /// <summary>تمدید توکن دسترسی با کوکی تازه‌سازی (چرخشی).</summary>
    [HttpPost("refresh")]
    [SameOriginOnly]
    [EnableRateLimiting("auth")]
    [ProducesResponseType<AuthResultDto>(200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var raw = RefreshCookie.Read(Request, env);
        if (string.IsNullOrEmpty(raw)) return Problem(statusCode: 401, title: "وارد نشده‌اید.");
        var r = await auth.RefreshAsync(raw, this.RequestContext(), ct);
        if (!r.Succeeded) RefreshCookie.Clear(Response, env);
        return r.ToActionResult(this, s =>
        {
            RefreshCookie.Set(Response, env, s.RefreshToken, s.RefreshExpiresAtUtc);
            return Ok(s.Auth);
        });
    }

    [HttpPost("logout")]
    [SameOriginOnly]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await auth.LogoutAsync(RefreshCookie.Read(Request, env), ct);
        RefreshCookie.Clear(Response, env);
        return NoContent();
    }
}

[ApiController]
[Authorize]
[Route("api/v1/me")]
[Produces("application/json")]
public sealed class MeController(IAuthService auth, IMemberService members, IPaymentService payments, IContractService contracts) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<UserDto>(200)]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        await auth.GetUserAsync(User.UserId(), ct) is { } u ? Ok(u) : Unauthorized();

    [HttpPut]
    [ValidateCsrf]
    [RequestSizeLimit(2048)]
    [ProducesResponseType<UserDto>(200)]
    public async Task<IActionResult> Update([FromBody] UpdateProfileRequest request, CancellationToken ct) =>
        (await auth.UpdateProfileAsync(User.UserId(), request, ct)).ToActionResult(this);

    [HttpGet("profile")]
    [ProducesResponseType<ProfileDto>(200)]
    public async Task<IActionResult> Profile(CancellationToken ct) =>
        await members.GetProfileAsync(User.UserId(), ct) is { } p ? Ok(p) : NotFound();

    [HttpGet("payments/{id:int}")]
    [ProducesResponseType<PaymentResultDto>(200)]
    public async Task<IActionResult> Payment(int id, CancellationToken ct) =>
        await payments.GetForUserAsync(User.UserId(), id, ct) is { } p ? Ok(p) : NotFound();

    [HttpGet("payments/{id:int}/invoice.pdf")]
    [Produces("application/pdf")]
    public async Task<IActionResult> Invoice(int id, CancellationToken ct) =>
        await contracts.GetInvoicePdfAsync(User.UserId(), id, ct) is { } f ? File(f.Pdf, "application/pdf", f.FileName) : NotFound();

    [HttpGet("contracts/{id:int}/pdf")]
    [Produces("application/pdf")]
    public async Task<IActionResult> ContractPdf(int id, CancellationToken ct) =>
        await contracts.GetPdfAsync(User.UserId(), id, ct) is { } f ? File(f.Pdf, "application/pdf", f.FileName) : NotFound();

    /// <summary>QR کارت عضویت فعال (SVG). محتوا فقط توکن تصادفی کارت است.</summary>
    [HttpGet("card.svg")]
    [Produces("image/svg+xml")]
    public async Task<IActionResult> Card(CancellationToken ct)
    {
        var m = await members.GetActiveMembershipAsync(User.UserId(), ct);
        if (m is null) return NotFound();
        using var gen = new QRCoder.QRCodeGenerator();
        using var data = gen.CreateQrCode($"KG1:{m.CardToken}", QRCoder.QRCodeGenerator.ECCLevel.M);
        var svg = new QRCoder.SvgQRCode(data).GetGraphic(8, "#2C2C2C", "#FFFFFF", drawQuietZones: true);
        Response.Headers.CacheControl = "private, no-store";
        return Content(svg, "image/svg+xml");
    }
}
