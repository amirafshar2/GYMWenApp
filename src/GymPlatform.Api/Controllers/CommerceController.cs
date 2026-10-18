using GymPlatform.Api.Auth;
using GymPlatform.Api.Filters;
using GymPlatform.Api.Infrastructure;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.Business.Services.Commerce;
using GymPlatform.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.RateLimiting;

namespace GymPlatform.Api.Controllers;

internal static class PurchaseResults
{
    /// <summary>کیف پول ← نتیجهٔ نهایی؛ درگاه ← فرم رفتن به بانک</summary>
    public static async Task<IActionResult> ToResponseAsync(this Result<PurchaseStartedDto> r, ControllerBase c, PaymentGateway gateway, CancellationToken ct)
    {
        if (!r.Succeeded) return r.ToActionResult(c);
        var s = r.Value!;
        if (s.Completed || s.PaymentId is null) return c.Ok(new PurchaseResponse(true, s.OrderId, s.RedirectPath, null));
        var (redirect, status, error) = await gateway.StartAsync(c.Request, s.PaymentId.Value, s.TrackingNumber, s.AmountToman, ct);
        return redirect is null ? c.Problem(statusCode: status, title: error) : c.Ok(new PurchaseResponse(false, s.OrderId, s.RedirectPath, redirect));
    }
}

/// <summary>فروشگاه: فهرست و جزئیات کالا (عمومی)، پیش‌فاکتور، سفارش (نیازمند ورود)</summary>
[ApiController]
[Route("api/v1/shop")]
[Produces("application/json")]
public sealed class ShopController(IShopService shop, PaymentGateway gateway) : ControllerBase
{
    [HttpGet("products")]
    [EnableRateLimiting("forms-read")]
    public async Task<IActionResult> Products([FromQuery] string? kind, [FromQuery] string? category, [FromQuery] string? q,
        [FromQuery] string? branch, [FromQuery] bool? inStock, [FromQuery] string? sort, CancellationToken ct) =>
        Ok(await shop.CatalogAsync(new ShopFilter(kind, category, q?.Length > 50 ? q[..50] : q, branch, inStock, sort), ct));

    [HttpGet("products/{slug}")]
    public async Task<IActionResult> Product(string slug, CancellationToken ct) =>
        await shop.DetailAsync(slug, ct) is { } p ? Ok(p) : NotFound();

    [HttpPost("quote")]
    [ValidateCsrf]
    [EnableRateLimiting("forms-read")]
    [RequestSizeLimit(8 * 1024)]
    public async Task<IActionResult> Quote([FromBody] ShopQuoteRequest request, CancellationToken ct) =>
        (await shop.QuoteAsync(User.Identity?.IsAuthenticated == true ? User.UserId() : null, request, ct)).ToActionResult(this);

    [Authorize]
    [HttpPost("orders")]
    [ValidateCsrf]
    [EnableRateLimiting("payment")]
    [RequestSizeLimit(8 * 1024)]
    public async Task<IActionResult> Checkout([FromBody] ShopCheckoutRequest request, CancellationToken ct) =>
        await (await shop.CheckoutAsync(User.UserId(), request, ct)).ToResponseAsync(this, gateway, ct);
}

/// <summary>بوفه: منوی هر شعبه (عمومی، از QR)، ثبت سفارش، پیگیری؛ و تابلوی کارکنان بوفه</summary>
[ApiController]
[Route("api/v1/canteen")]
[Produces("application/json")]
public sealed class CanteenController(ICanteenService canteen, PaymentGateway gateway, GymPlatform.Business.Services.Panel.IStaffScopeService scopes) : ControllerBase
{
    [HttpGet("{branchSlug}/menu")]
    public async Task<IActionResult> Menu(string branchSlug, [FromQuery] string? table, CancellationToken ct) =>
        await canteen.MenuAsync(branchSlug, table, ct) is { } m ? Ok(m) : NotFound();

    [Authorize]
    [HttpPost("orders")]
    [ValidateCsrf]
    [EnableRateLimiting("payment")]
    [RequestSizeLimit(4 * 1024)]
    public async Task<IActionResult> Place([FromBody] CanteenOrderRequest request, CancellationToken ct) =>
        await (await canteen.PlaceAsync(User.UserId(), request, ct)).ToResponseAsync(this, gateway, ct);

    /// <summary>تابلوی بوفه فقط برای شعبه‌هایی که کارمند به آن‌ها وصل است</summary>
    [Authorize]
    [PanelAccess(Roles.CanteenStaff, Roles.BranchManager)]
    [HttpGet("staff/{branchSlug}/orders")]
    public async Task<IActionResult> Board(string branchSlug, CancellationToken ct)
    {
        var id = await scopes.BranchIdAsync(branchSlug, ct);
        if (id is null) return NotFound();
        if (!this.Scope().Can(id.Value)) return Problem(statusCode: 403, title: "به بوفهٔ این شعبه دسترسی ندارید.");
        return Ok(await canteen.BoardAsync(branchSlug, ct));
    }

    [Authorize]
    [PanelAccess(Roles.CanteenStaff, Roles.BranchManager)]
    [HttpPost("staff/orders/{id:int}/status")]
    [ValidateCsrf]
    [RequestSizeLimit(1024)]
    public async Task<IActionResult> Status(int id, [FromBody] CanteenStatusRequest request, CancellationToken ct)
    {
        var branchId = await scopes.CanteenOrderBranchAsync(id, ct);
        if (branchId is null || !this.Scope().Can(branchId.Value)) return NotFound();
        return (await canteen.UpdateStatusAsync(id, request.Status, User.UserId(), ct)).ToActionResult(this);
    }
}

/// <summary>خریدها و کیف پول عضو</summary>
[ApiController]
[Authorize]
[Route("api/v1/me")]
[Produces("application/json")]
public sealed class MyCommerceController(IWalletService wallet, IShopService shop, ICanteenService canteen, PaymentGateway gateway) : ControllerBase
{
    [HttpGet("wallet")]
    public async Task<IActionResult> Wallet(CancellationToken ct) => Ok(await wallet.GetAsync(User.UserId(), ct));

    [HttpPost("wallet/topups")]
    [ValidateCsrf]
    [EnableRateLimiting("payment")]
    [RequestSizeLimit(1024)]
    public async Task<IActionResult> TopUp([FromBody] TopUpRequest request, CancellationToken ct) =>
        await (await wallet.StartTopUpAsync(User.UserId(), request, ct)).ToResponseAsync(this, gateway, ct);

    [HttpGet("orders")]
    public async Task<IActionResult> Orders(CancellationToken ct) =>
        Ok(new OrdersSummaryDto(await shop.ListAsync(User.UserId(), ct), await canteen.ListAsync(User.UserId(), ct)));

    [HttpGet("shop-orders/{id:int}")]
    public async Task<IActionResult> ShopOrder(int id, CancellationToken ct) =>
        await shop.GetAsync(User.UserId(), id, ct) is { } o ? Ok(o) : NotFound();

    [HttpGet("canteen-orders/{id:int}")]
    public async Task<IActionResult> CanteenOrder(int id, CancellationToken ct) =>
        await canteen.GetAsync(User.UserId(), id, ct) is { } o ? Ok(o) : NotFound();
}
