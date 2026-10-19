using GymPlatform.Business.Services.Site;
using GymPlatform.Api.Auth;
using GymPlatform.Api.Infrastructure;
using GymPlatform.Business.Dtos;
using GymPlatform.Business.Services.Panel;
using GymPlatform.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.RateLimiting;

namespace GymPlatform.Api.Controllers;

/// <summary>
/// دسترسی پنل کارکنان. نقش‌ها و شعبه‌ها هر بار از پایگاه داده خوانده می‌شوند (نه از توکن)،
/// تا وقتی مدیر کل دسترسی کسی را برمی‌دارد، همان لحظه اعمال شود. مدیر کل همه‌جا دسترسی دارد.
/// چند ویژگی روی کلاس و متد با هم «و» می‌شوند.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class PanelAccessAttribute(params string[] roles) : Attribute, IAsyncActionFilter
{
    public const string ItemKey = "kg-staff-scope";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        if (http.User.Identity?.IsAuthenticated != true) { context.Result = new UnauthorizedResult(); return; }
        if (http.Items[ItemKey] is not StaffScope scope)
        {
            scope = await http.RequestServices.GetRequiredService<IStaffScopeService>().ResolveFromDbAsync(http.User.UserId(), http.RequestAborted);
            http.Items[ItemKey] = scope;
        }
        if (!scope.IsSuperAdmin && !roles.Any(scope.Roles.Contains))
        {
            context.Result = new ObjectResult(new ProblemDetails { Status = 403, Title = "به این بخش دسترسی ندارید." }) { StatusCode = 403 };
            return;
        }
        await next();
    }
}

internal static class PanelScope
{
    public static StaffScope Scope(this ControllerBase c) => (StaffScope)c.HttpContext.Items[PanelAccessAttribute.ItemKey]!;
}

file static class R
{
    public const string Super = Roles.SuperAdmin, Manager = Roles.BranchManager, Reception = Roles.Reception, Coach = Roles.Coach,
        Canteen = Roles.CanteenStaff, Shop = Roles.ShopStaff;
}

/// <summary>پنل: کارمند فعلی + داشبورد مدیر + خروجی اکسل</summary>
[ApiController]
[Authorize]
[Route("api/v1/panel")]
[Produces("application/json")]
[EnableRateLimiting("forms-read")]
[PanelAccess(R.Manager, R.Reception, R.Coach, R.Canteen, R.Shop)]
public sealed class PanelController(IStaffScopeService scopes, IDashboardService dashboard, IReportService reports) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct) => Ok(await scopes.MeAsync(this.Scope(), ct));

    [HttpGet("dashboard")]
    [PanelAccess(R.Manager)]
    public async Task<IActionResult> Dashboard([FromQuery] string? branch, [FromQuery] int days = 30, CancellationToken ct = default) =>
        (await dashboard.GetAsync(this.Scope(), branch, days, ct)).ToActionResult(this);

    [HttpGet("dashboard/export")]
    [PanelAccess(R.Manager)]
    [Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    public async Task<IActionResult> Export([FromQuery] string? branch, [FromQuery] int days = 30, CancellationToken ct = default) =>
        (await reports.DashboardExcelAsync(this.Scope(), branch, days, ct))
            .ToActionResult(this, f => File(f.Content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f.FileName));
}

/// <summary>پذیرش: جست‌وجوی عضو، پرونده، ثبت ورود دستی/اسکنر، ورودهای امروز</summary>
[ApiController]
[Authorize]
[Route("api/v1/panel/reception")]
[Produces("application/json")]
[PanelAccess(R.Manager, R.Reception)]
public sealed class ReceptionController(IReceptionService reception) : ControllerBase
{
    [HttpGet("members")]
    [EnableRateLimiting("forms-read")]
    public async Task<IActionResult> Search([FromQuery] string q, CancellationToken ct) =>
        Ok(await reception.SearchAsync(this.Scope(), q?.Length > 40 ? q[..40] : q ?? "", ct));

    [HttpGet("members/{userId:int}")]
    public async Task<IActionResult> Member(int userId, CancellationToken ct) =>
        await reception.SummaryAsync(this.Scope(), userId, ct) is { } m ? Ok(m) : NotFound();

    [HttpPost("checkins")]
    [RequestSizeLimit(1024)]
    public async Task<IActionResult> CheckIn([FromBody] ReceptionCheckInRequest request, CancellationToken ct) =>
        (await reception.CheckInAsync(this.Scope(), request, ct)).ToActionResult(this);

    [HttpGet("checkins")]
    public async Task<IActionResult> Today([FromQuery] string branch, CancellationToken ct) =>
        (await reception.TodayAsync(this.Scope(), branch, ct)).ToActionResult(this);
}

/// <summary>مربی: شاگردها، برنامهٔ تمرین و تغذیه، ثبت وزن</summary>
[ApiController]
[Authorize]
[Route("api/v1/panel/coach")]
[Produces("application/json")]
[PanelAccess(R.Coach)]
public sealed class CoachPanelController(ICoachService coach) : ControllerBase
{
    [HttpGet("trainees")]
    public async Task<IActionResult> Trainees(CancellationToken ct) => Ok(await coach.TraineesAsync(User.UserId(), ct));

    [HttpPost("trainees")]
    [RequestSizeLimit(1024)]
    public async Task<IActionResult> Add([FromBody] AddTraineeRequest request, CancellationToken ct) =>
        (await coach.AddTraineeAsync(User.UserId(), request.Phone, ct)).ToActionResult(this, t => StatusCode(201, t));

    [HttpGet("trainees/{memberId:int}")]
    public async Task<IActionResult> Detail(int memberId, CancellationToken ct) =>
        (await coach.DetailAsync(User.UserId(), memberId, ct)).ToActionResult(this);

    [HttpPut("trainees/{memberId:int}/plan")]
    [RequestSizeLimit(32 * 1024)]
    public async Task<IActionResult> SavePlan(int memberId, [FromBody] SavePlanRequest request, CancellationToken ct) =>
        (await coach.SavePlanAsync(User.UserId(), memberId, request, ct)).ToActionResult(this);

    [HttpPost("trainees/{memberId:int}/metrics")]
    [RequestSizeLimit(1024)]
    public async Task<IActionResult> AddMetric(int memberId, [FromBody] AddMetricRequest request, CancellationToken ct) =>
        (await coach.AddMetricAsync(User.UserId(), memberId, request, ct)).ToActionResult(this, m => StatusCode(201, m));
}

/// <summary>مدیریت محتوا: پکیج، جشنواره، کد تخفیف، قرارداد، فروشگاه، بوفه، کارکنان، پیامک</summary>
[ApiController]
[Authorize]
[Route("api/v1/panel/admin")]
[Produces("application/json")]
[RequestSizeLimit(64 * 1024)]
public sealed class AdminController(IAdminService admin, ISmsService sms, PublicImageStore images, IWebHostEnvironment env,
    Microsoft.AspNetCore.OutputCaching.IOutputCacheStore cache) : ControllerBase
{
    /// <summary>صفحه‌های عمومی (پکیج‌ها، جشنواره) ۶۰ ثانیه کش می‌شوند؛ بعد از تغییر، کش همان لحظه پاک می‌شود</summary>
    private async Task<IActionResult> Fresh(IActionResult r, CancellationToken ct)
    {
        if (r is ObjectResult { StatusCode: null or < 300 } or NoContentResult or StatusCodeResult { StatusCode: < 300 }) await cache.EvictByTagAsync("public", ct);
        return r;
    }

    // ---- تنظیمات سایت (هویت، رنگ، متن و عکس صفحه‌ها، ماژول‌ها) و دستیار راه‌اندازی
    [HttpGet("site"), PanelAccess(R.Super)]
    public async Task<IActionResult> SiteSettings([FromServices] ISiteService site, CancellationToken ct) => Ok(await site.GetAsync(ct));

    [HttpPut("site"), PanelAccess(R.Super)]
    [RequestSizeLimit(160 * 1024)]
    public async Task<IActionResult> SaveSiteSettings([FromBody] SiteConfig r, [FromServices] ISiteService site, CancellationToken ct) =>
        await Fresh((await site.SaveAsync(r, User.UserId(), ct)).ToActionResult(this), ct);

    [HttpGet("setup"), PanelAccess(R.Super)]
    public async Task<IActionResult> Setup([FromServices] ISiteService site, CancellationToken ct) => Ok(await site.GetSetupStatusAsync(ct));

    [HttpPut("setup"), PanelAccess(R.Super)]
    public async Task<IActionResult> UpdateSetup([FromBody] SetupUpdateRequest r, [FromServices] ISiteService site, CancellationToken ct) =>
        await Fresh((await site.UpdateSetupAsync(r, User.UserId(), ct)).ToActionResult(this), ct);

    /// <summary>بستهٔ محتوا (zip): شعبه‌ها، پکیج‌ها، مربیان، سؤالات، قرارداد، کالاها، منو، تنظیمات سایت و عکس‌های آپلودی — بدون هیچ اطلاعات عضو</summary>
    [HttpGet("content/export"), PanelAccess(R.Super)]
    [EnableRateLimiting("payment")]
    public async Task<IActionResult> ExportContent([FromServices] SiteInstaller installer, CancellationToken ct)
    {
        var zip = await installer.ExportAsync(images.Root, ct);
        return File(zip, "application/zip", $"site-content-{DateTime.UtcNow:yyyyMMdd}.zip");
    }

    // ---- ویدیو: آپلود مستقیم روی دیسک، بهینه‌سازی در صف پس‌زمینه
    [HttpPost("videos"), PanelAccess(R.Super)]
    [RequestSizeLimit(GymPlatform.Api.Video.VideoStore.MaxBytes + 1024 * 1024)]
    [GymPlatform.Api.Video.DisableFormValueModelBinding]
    [EnableRateLimiting("payment")]
    public async Task<IActionResult> UploadVideo([FromServices] GymPlatform.Api.Video.VideoStore videos, [FromServices] GymPlatform.Api.Video.VideoOptimizer optimizer, CancellationToken ct)
    {
        var (id, error) = await videos.SaveAsync(Request, ct);
        if (id is null) return Problem(statusCode: 400, title: error);
        optimizer.Enqueue(id);
        return StatusCode(201, new { url = $"{GymPlatform.Api.Video.VideoStore.RequestPath}/{id}.mp4", video = id, optimizing = true });
    }

    [HttpGet("uploads/{id:regex(^[[a-f0-9]]{{32}}$)}/status"), PanelAccess(R.Super)]
    public IActionResult VideoStatus(string id, [FromServices] GymPlatform.Api.Video.VideoStore videos)
    {
        if (!videos.Exists(id)) return NotFound();
        var s = videos.GetStatus(id);
        return Ok(new { ready = s.Ready, poster = s.Poster, failed = s.Failed });
    }

    // ---- شعبه‌ها و سؤالات پرتکرار
    [HttpGet("branches"), PanelAccess(R.Super)]
    public async Task<IActionResult> Branches(CancellationToken ct) => Ok(await admin.BranchesAsync(ct));

    [HttpPost("branches"), PanelAccess(R.Super)]
    public async Task<IActionResult> CreateBranch([FromBody] SaveBranchRequest r, CancellationToken ct) =>
        await Fresh((await admin.SaveBranchAsync(null, r, User.UserId(), ct)).ToActionResult(this, b => StatusCode(201, b)), ct);

    [HttpPut("branches/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> EditBranch(int id, [FromBody] SaveBranchRequest r, CancellationToken ct) =>
        await Fresh((await admin.SaveBranchAsync(id, r, User.UserId(), ct)).ToActionResult(this), ct);

    [HttpDelete("branches/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> DeleteBranch(int id, CancellationToken ct) =>
        await Fresh((await admin.DeleteBranchAsync(id, User.UserId(), ct)).ToActionResult(this, _ => NoContent()), ct);

    [HttpPut("branches/order"), PanelAccess(R.Super)]
    public async Task<IActionResult> ReorderBranches([FromBody] ReorderRequest r, CancellationToken ct) =>
        await Fresh((await admin.ReorderBranchesAsync(r.Ids ?? [], User.UserId(), ct)).ToActionResult(this, _ => NoContent()), ct);

    [HttpGet("faq"), PanelAccess(R.Super)]
    public async Task<IActionResult> Faq(CancellationToken ct) => Ok(await admin.FaqAsync(ct));

    [HttpPost("faq"), PanelAccess(R.Super)]
    public async Task<IActionResult> CreateFaq([FromBody] SaveFaqRequest r, CancellationToken ct) =>
        await Fresh((await admin.SaveFaqAsync(null, r, User.UserId(), ct)).ToActionResult(this, f => StatusCode(201, f)), ct);

    [HttpPut("faq/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> EditFaq(int id, [FromBody] SaveFaqRequest r, CancellationToken ct) =>
        await Fresh((await admin.SaveFaqAsync(id, r, User.UserId(), ct)).ToActionResult(this), ct);

    [HttpDelete("faq/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> DeleteFaq(int id, CancellationToken ct) =>
        await Fresh((await admin.DeleteFaqAsync(id, User.UserId(), ct)).ToActionResult(this, _ => NoContent()), ct);

    // ---- عکس‌ها: کتابخانهٔ عکس‌های سایت + آپلود (فقط مدیر کل)
    [HttpGet("images"), PanelAccess(R.Super)]
    public IActionResult ImageLibrary()
    {
        static IReadOnlyList<string> List(string dir, string url, string pattern) =>
            Directory.Exists(dir) ? Directory.GetFiles(dir, pattern).Select(f => $"{url}/{Path.GetFileName(f)}").Order().ToList() : [];
        var web = env.WebRootPath ?? "";
        return Ok(new ImageLibraryDto(List(Path.Combine(web, "media", "canteen"), "/media/canteen", "*.svg"),
            List(Path.Combine(web, "media", "shop"), "/media/shop", "*.svg")
                .Concat(List(Path.Combine(web, "media", "coaches"), "/media/coaches", "*.*")).ToList(),
            Directory.GetFiles(images.Root).OrderByDescending(System.IO.File.GetCreationTimeUtc).Take(60).Select(f => $"{PublicImageStore.RequestPath}/{Path.GetFileName(f)}").ToList(),
            // عکس‌های خود قالب (هیرو، سالن، گالری، پوستر ویدیو، لوگوی نمونه) برای تنظیمات سایت
            new[] { "hero", "gym", "gallery", "video" }.SelectMany(d => List(Path.Combine(web, "media", d), $"/media/{d}", "*.webp"))
                .Concat(List(Path.Combine(web, "brand"), "/brand", "*.svg")).ToList()));
    }

    [HttpPost("images"), PanelAccess(R.Super)]
    [RequestSizeLimit(PublicImageStore.MaxBytes + 64 * 1024)]
    [EnableRateLimiting("payment")]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken ct)
    {
        var (path, error) = await images.SaveAsync(file, ct);
        return path is null ? Problem(statusCode: 400, title: error) : StatusCode(201, new { path });
    }

    // ---- ساخت/ویرایش/حذف (فقط مدیر کل)
    [HttpPost("packages"), PanelAccess(R.Super)]
    public async Task<IActionResult> CreatePackage([FromBody] SavePackageRequest r, CancellationToken ct) =>
        await Fresh((await admin.SavePackageAsync(null, r, User.UserId(), ct)).ToActionResult(this, p => StatusCode(201, p)), ct);

    [HttpPut("packages/{id:int}/details"), PanelAccess(R.Super)]
    public async Task<IActionResult> EditPackage(int id, [FromBody] SavePackageRequest r, CancellationToken ct) =>
        await Fresh((await admin.SavePackageAsync(id, r, User.UserId(), ct)).ToActionResult(this), ct);

    [HttpDelete("packages/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> DeletePackage(int id, CancellationToken ct) =>
        await Fresh((await admin.DeletePackageAsync(id, User.UserId(), ct)).ToActionResult(this, _ => NoContent()), ct);

    [HttpPost("products"), PanelAccess(R.Super)]
    public async Task<IActionResult> CreateProduct([FromBody] SaveProductRequest r, CancellationToken ct) =>
        (await admin.SaveProductAsync(null, r, this.Scope(), ct)).ToActionResult(this, p => StatusCode(201, p));

    [HttpPut("products/{id:int}/details"), PanelAccess(R.Super)]
    public async Task<IActionResult> EditProduct(int id, [FromBody] SaveProductRequest r, CancellationToken ct) =>
        (await admin.SaveProductAsync(id, r, this.Scope(), ct)).ToActionResult(this);

    // ---- مربیان (پروفایل سایت + حساب پنل مربی)
    [HttpGet("coaches"), PanelAccess(R.Super)]
    public async Task<IActionResult> Coaches(CancellationToken ct) => Ok(await admin.CoachesAsync(ct));

    [HttpPost("coaches"), PanelAccess(R.Super)]
    public async Task<IActionResult> CreateCoach([FromBody] SaveCoachRequest r, CancellationToken ct) =>
        await Fresh((await admin.SaveCoachAsync(null, r, User.UserId(), ct)).ToActionResult(this, c => StatusCode(201, c)), ct);

    [HttpPut("coaches/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> EditCoach(int id, [FromBody] SaveCoachRequest r, CancellationToken ct) =>
        await Fresh((await admin.SaveCoachAsync(id, r, User.UserId(), ct)).ToActionResult(this), ct);

    [HttpDelete("coaches/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> DeleteCoach(int id, CancellationToken ct) =>
        await Fresh((await admin.DeleteCoachAsync(id, User.UserId(), ct)).ToActionResult(this, _ => NoContent()), ct);

    [HttpPost("canteen-items"), PanelAccess(R.Super)]
    public async Task<IActionResult> CreateCanteenItem([FromBody] SaveCanteenItemRequest r, CancellationToken ct) =>
        (await admin.SaveCanteenItemAsync(null, r, User.UserId(), ct)).ToActionResult(this, i => StatusCode(201, i));

    [HttpPut("canteen-items/{id:int}/details"), PanelAccess(R.Super)]
    public async Task<IActionResult> EditCanteenItem(int id, [FromBody] SaveCanteenItemRequest r, CancellationToken ct) =>
        (await admin.SaveCanteenItemAsync(id, r, User.UserId(), ct)).ToActionResult(this);

    [HttpDelete("canteen-items/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> DeleteCanteenItem(int id, CancellationToken ct) =>
        (await admin.DeleteCanteenItemAsync(id, User.UserId(), ct)).ToActionResult(this, _ => NoContent());

    // ---- فقط مدیر کل
    [HttpGet("packages"), PanelAccess(R.Super)]
    public async Task<IActionResult> Packages(CancellationToken ct) => Ok(await admin.PackagesAsync(ct));

    [HttpPut("packages/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> UpdatePackage(int id, [FromBody] UpdatePackageRequest r, CancellationToken ct) =>
        await Fresh((await admin.UpdatePackageAsync(id, r, User.UserId(), ct)).ToActionResult(this), ct);

    [HttpGet("campaigns"), PanelAccess(R.Super)]
    public async Task<IActionResult> Campaigns(CancellationToken ct) => Ok(await admin.CampaignsAsync(ct));

    [HttpPost("campaigns"), PanelAccess(R.Super)]
    public async Task<IActionResult> CreateCampaign([FromBody] SaveCampaignRequest r, CancellationToken ct) =>
        await Fresh((await admin.SaveCampaignAsync(null, r, User.UserId(), ct)).ToActionResult(this, c => StatusCode(201, c)), ct);

    [HttpPut("campaigns/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> UpdateCampaign(int id, [FromBody] SaveCampaignRequest r, CancellationToken ct) =>
        await Fresh((await admin.SaveCampaignAsync(id, r, User.UserId(), ct)).ToActionResult(this), ct);

    [HttpGet("campaigns/{id:int}/audience"), PanelAccess(R.Super)]
    public async Task<IActionResult> Audience(int id, CancellationToken ct) => (await sms.CampaignAudienceAsync(this.Scope(), id, ct)).ToActionResult(this);

    [HttpPost("campaigns/{id:int}/sms"), PanelAccess(R.Super)]
    [EnableRateLimiting("payment")]
    public async Task<IActionResult> SendCampaignSms(int id, CancellationToken ct) => (await sms.SendCampaignAsync(this.Scope(), id, ct)).ToActionResult(this);

    [HttpGet("discount-codes"), PanelAccess(R.Super)]
    public async Task<IActionResult> Codes(CancellationToken ct) => Ok(await admin.CodesAsync(ct));

    [HttpPost("discount-codes"), PanelAccess(R.Super)]
    public async Task<IActionResult> CreateCode([FromBody] SaveDiscountCodeRequest r, CancellationToken ct) =>
        (await admin.SaveCodeAsync(null, r, User.UserId(), ct)).ToActionResult(this, c => StatusCode(201, c));

    [HttpPut("discount-codes/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> UpdateCode(int id, [FromBody] SaveDiscountCodeRequest r, CancellationToken ct) =>
        (await admin.SaveCodeAsync(id, r, User.UserId(), ct)).ToActionResult(this);

    [HttpGet("contracts"), PanelAccess(R.Super)]
    public async Task<IActionResult> Contracts(CancellationToken ct) => Ok(await admin.ContractsAsync(ct));

    [HttpPost("contracts"), PanelAccess(R.Super)]
    public async Task<IActionResult> PublishContract([FromBody] PublishContractRequest r, CancellationToken ct) =>
        (await admin.PublishContractAsync(r, User.UserId(), ct)).ToActionResult(this, c => StatusCode(201, c));

    [HttpGet("staff"), PanelAccess(R.Super)]
    public async Task<IActionResult> Staff(CancellationToken ct) => Ok(await admin.StaffAsync(ct));

    [HttpPut("staff"), PanelAccess(R.Super)]
    public async Task<IActionResult> SaveStaff([FromBody] SaveStaffRequest r, CancellationToken ct) =>
        (await admin.SaveStaffAsync(r, User.UserId(), ct)).ToActionResult(this);

    [HttpGet("sms"), PanelAccess(R.Super)]
    public async Task<IActionResult> Sms([FromQuery] string? kind, CancellationToken ct) => Ok(await sms.StatsAsync(kind, ct));

    /// <summary>اجرای فوری زمان‌بند پیامک (همان کاری که سرویس پس‌زمینه هر ۱۵ دقیقه می‌کند)</summary>
    [HttpPost("sms/run"), PanelAccess(R.Super)]
    public async Task<IActionResult> RunSms(CancellationToken ct)
    {
        var scheduled = await sms.ScheduleDueAsync(ct);
        var sent = await sms.DispatchAsync(200, ct);
        return Ok(new { scheduled, sent });
    }

    // ---- فروشگاه (موجودی و سفارش‌ها محدود به شعبه‌های کارمند)
    [HttpGet("products"), PanelAccess(R.Manager, R.Shop)]
    public async Task<IActionResult> Products(CancellationToken ct) => Ok(await admin.ProductsAsync(this.Scope(), ct));

    [HttpPut("products/{id:int}"), PanelAccess(R.Super)]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] UpdateProductRequest r, CancellationToken ct) =>
        (await admin.UpdateProductAsync(id, r, User.UserId(), ct)).ToActionResult(this);

    [HttpPut("variants/{id:int}/stock"), PanelAccess(R.Manager, R.Shop)]
    public async Task<IActionResult> SetStock(int id, [FromBody] SetStockRequest r, CancellationToken ct) =>
        (await admin.SetStockAsync(this.Scope(), id, r, ct)).ToActionResult(this, q => Ok(new { quantity = q }));

    [HttpGet("shop-orders"), PanelAccess(R.Manager, R.Shop)]
    public async Task<IActionResult> ShopOrders([FromQuery] string? status, CancellationToken ct) => Ok(await admin.ShopOrdersAsync(this.Scope(), status, ct));

    [HttpPost("shop-orders/{id:int}/status"), PanelAccess(R.Manager, R.Shop)]
    public async Task<IActionResult> ShopOrderStatus(int id, [FromBody] ShopOrderStatusRequest r, CancellationToken ct) =>
        (await admin.SetShopOrderStatusAsync(this.Scope(), id, r.Status, ct)).ToActionResult(this);

    // ---- بوفه
    [HttpGet("canteen-items"), PanelAccess(R.Manager, R.Canteen)]
    public async Task<IActionResult> CanteenItems(CancellationToken ct) => Ok(await admin.CanteenItemsAsync(ct));

    [HttpPut("canteen-items/{id:int}"), PanelAccess(R.Manager, R.Canteen)]
    public async Task<IActionResult> UpdateCanteenItem(int id, [FromBody] UpdateCanteenItemRequest r, CancellationToken ct) =>
        (await admin.UpdateCanteenItemAsync(id, r, this.Scope(), ct)).ToActionResult(this);
}

/// <summary>سمت عضو: برنامهٔ مربی، وزن‌ها، تنظیمات پیامک و تاریخ تولد</summary>
[ApiController]
[Authorize]
[Route("api/v1/me")]
[Produces("application/json")]
public sealed class MyCoachingController(ICoachService coach) : ControllerBase
{
    [HttpGet("plan")]
    public async Task<IActionResult> Plan(CancellationToken ct) => await coach.MyPlanAsync(User.UserId(), ct) is { } p ? Ok(p) : NoContent();

    [HttpGet("metrics")]
    public async Task<IActionResult> Metrics(CancellationToken ct) => Ok(await coach.MetricsAsync(User.UserId(), ct));

    [HttpPost("metrics")]
    [RequestSizeLimit(1024)]
    [EnableRateLimiting("forms-read")]
    public async Task<IActionResult> AddMetric([FromBody] AddMetricRequest r, CancellationToken ct) =>
        (await coach.AddMetricAsync(null, User.UserId(), r, ct)).ToActionResult(this, m => StatusCode(201, m));

    [HttpDelete("metrics/{id:int}")]
    public async Task<IActionResult> DeleteMetric(int id, CancellationToken ct) => await coach.DeleteMetricAsync(User.UserId(), id, ct) ? NoContent() : NotFound();

    [HttpGet("preferences")]
    public async Task<IActionResult> Preferences(CancellationToken ct) => Ok(await coach.PreferencesAsync(User.UserId(), ct));

    [HttpPut("preferences")]
    [RequestSizeLimit(1024)]
    public async Task<IActionResult> SavePreferences([FromBody] PreferencesRequest r, CancellationToken ct) =>
        (await coach.SavePreferencesAsync(User.UserId(), r, ct)).ToActionResult(this);
}
