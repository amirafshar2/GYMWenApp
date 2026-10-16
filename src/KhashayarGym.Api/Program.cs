using System.IO.Compression;
using System.Threading.RateLimiting;
using KhashayarGym.Api.Middleware;
using KhashayarGym.Business;
using KhashayarGym.DataAccess;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

builder.Services.AddDataAccess(builder.Configuration);
builder.Services.AddBusiness();

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

builder.Services.AddAntiforgery(o =>
{
    o.HeaderName = "X-XSRF-TOKEN";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Strict;
    // در توسعه (http) کوکی بدون Secure؛ در production فقط HTTPS با پیشوند __Host-
    if (builder.Environment.IsDevelopment())
    {
        o.Cookie.Name = "kg-af";
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    }
    else
    {
        o.Cookie.Name = "__Host-kg-af";
        o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    }
});

// Rate limiting: فرم‌ها (و بعداً OTP/پرداخت) بر اساس IP محدود می‌شوند.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("forms", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 300, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddOutputCache(o =>
{
    o.AddPolicy("public", p => p.Expire(TimeSpan.FromSeconds(60)).Tag("public"));
});

builder.Services.AddResponseCompression(o =>
{
    o.EnableForHttps = true;
    o.Providers.Add<BrotliCompressionProvider>();
    o.Providers.Add<GzipCompressionProvider>();
    o.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/json", "image/svg+xml"]);
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
builder.Services.AddHsts(o => { o.MaxAge = TimeSpan.FromDays(365); o.IncludeSubDomains = true; });

var app = builder.Build();

// ساخت/به‌روزرسانی دیتابیس و دادهٔ نمونهٔ دمو
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
    if (db.Database.IsSqlServer()) await db.Database.MigrateAsync();
    else await db.Database.EnsureCreatedAsync();

    if (app.Configuration.GetValue("Database:SeedDemoData", true))
        await scope.ServiceProvider.GetRequiredService<DbSeeder>()
            .SeedAsync(Path.Combine(AppContext.BaseDirectory, "Seed"));
}

app.UseExceptionHandler();
if (!app.Environment.IsDevelopment()) app.UseHsts();
else app.MapOpenApi();

app.UseHttpsRedirection();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseResponseCompression();
app.UseSerilogRequestLogging();

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // فایل‌های هش‌دار Vite یک سال کش می‌شوند؛ index.html و رسانه‌ها (ویدیو، عکس، لوگو) هر بار با ETag
        // اعتبارسنجی می‌شوند تا با عوض شدن فایل، مرورگر نسخهٔ قدیمی را نشان ندهد.
        var path = ctx.File.Name;
        var req = ctx.Context.Request.Path;
        ctx.Context.Response.Headers.CacheControl =
            path.EndsWith(".html") || req.StartsWithSegments("/media") || req.StartsWithSegments("/brand")
                ? "no-cache"
                : req.StartsWithSegments("/assets")
                    ? "public, max-age=31536000, immutable"
                    : "public, max-age=86400";
    }
});

app.UseRateLimiter();
app.UseOutputCache();

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
