using System.IO.Compression;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.RateLimiting;
using KhashayarGym.Api.Auth;
using KhashayarGym.Api.Infrastructure;
using KhashayarGym.Api.Middleware;
using KhashayarGym.Business;
using KhashayarGym.Business.Common;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Parbad.Builder;
using Parbad.Gateway.ParbadVirtual;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

builder.Services.AddDataAccess(builder.Configuration);
builder.Services.AddBusiness();

builder.Services.AddControllers();
builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = ProblemDetailsSetup.Customize);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddOpenApi(o => o.AddDocumentTransformer<BearerSecuritySchemeTransformer>());

// ---- رمزها: فقط از User Secrets / متغیر محیطی. در توسعه اگر نبود، کلید موقت ساخته می‌شود ----
EnsureSecret(builder, "Jwt:SigningKey");
EnsureSecret(builder, "Otp:Pepper");
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<OtpOptions>(builder.Configuration.GetSection(OtpOptions.Section));
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.Section));

// ---- Identity (فقط هسته؛ ورود با OTP، نقش‌ها برای فاز ۴) + JWT ----
builder.Services.AddIdentityCore<AppUser>(o =>
    {
        o.User.RequireUniqueEmail = false;
        o.User.AllowedUserNameCharacters = "0123456789";
        o.Password.RequiredLength = 10;
    })
    .AddRoles<AppRole>()
    .AddEntityFrameworkStores<GymDbContext>();

var jwt = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = jwt.Key(),
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "sub",
            RoleClaimType = ClaimTypes.Role,
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAccessTokenFactory, JwtTokenFactory>();
builder.Services.AddSingleton<IPrivateFileStore, PrivateFileStore>();

// ---- پیامک: Log (دمو) یا Kavenegar ----
if (builder.Configuration["Sms:Provider"]?.Equals("Kavenegar", StringComparison.OrdinalIgnoreCase) == true)
{
    builder.Services.Configure<KavenegarOptions>(builder.Configuration.GetSection("Sms:Kavenegar"));
    builder.Services.AddHttpClient<ISmsSender, KavenegarSmsSender>(c => c.Timeout = TimeSpan.FromSeconds(10));
}
else builder.Services.AddSingleton<ISmsSender, LogSmsSender>();

// ---- درگاه پرداخت: Parbad (دمو: درگاه مجازی Parbad؛ بعداً زرین‌پال/IDPay/بانک‌ها) ----
builder.Services.AddParbad()
    .ConfigureGateways(g => g.AddParbadVirtual().WithOptions(o => o.GatewayPath = "/payment-sandbox"))
    .ConfigureHttpContext(h => h.UseDefaultAspNetCore())
    .ConfigureStorage(s => s.UseMemoryCache());

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
// ضریب سقف‌ها فقط برای تست‌های یکپارچه (همهٔ درخواست‌های تست از یک IP می‌آیند)؛ در production همیشه ۱
var rl = (builder.Environment.IsEnvironment("Testing") || builder.Environment.IsDevelopment()) ? builder.Configuration.GetValue("RateLimiting:PermitMultiplier", 1) : 1;
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("forms", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    // OTP: هر IP حداکثر ۵ درخواست در دقیقه (محدودیت هر شماره هم در سرویس اعمال می‌شود)
    o.AddPolicy("otp", ctx => RateLimitPartition.GetFixedWindowLimiter(
        "otp:" + (ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        "auth:" + (ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 15 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("payment", ctx => RateLimitPartition.GetFixedWindowLimiter(
        "pay:" + (ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("forms-read", ctx => RateLimitPartition.GetFixedWindowLimiter(
        "read:" + (ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 60 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 300 * rl, Window = TimeSpan.FromMinutes(1) }));
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

// کلیدهای Data Protection (توکن ضد CSRF) در volume پایدار تا با ری‌استارت کانتینر باطل نشوند
if (builder.Configuration["DataProtection:KeysPath"] is { Length: > 0 } keysPath)
    builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(keysPath)).SetApplicationName("KhashayarGym");

// پشت reverse proxy (Caddy/Nginx در Docker): IP واقعی کاربر برای rate limit و HTTPS برای کوکی‌های Secure
if (builder.Configuration.GetValue("ReverseProxy:Enabled", false))
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.ForwardLimit = 1;
        o.KnownIPNetworks.Clear(); // پراکسی در شبکهٔ داخلی Docker است؛ پورت اپ نباید مستقیم به اینترنت باز باشد
        o.KnownProxies.Clear();
    });

var app = builder.Build();
if (app.Configuration.GetValue("ReverseProxy:Enabled", false)) app.UseForwardedHeaders();

// ساخت/به‌روزرسانی دیتابیس و دادهٔ نمونهٔ دمو
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
    if (db.Database.IsSqlServer()) await db.Database.MigrateAsync();
    else
    {
        // Sqlite فقط برای دموست: اگر فایل دیتابیس از نسخهٔ قبلی (بدون جداول فاز ۲) باشد، از نو ساخته می‌شود
        await db.Database.EnsureCreatedAsync();
        try { _ = await db.Memberships.AnyAsync(); }
        catch (Microsoft.Data.Sqlite.SqliteException)
        {
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
        }
    }

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

// صفحهٔ درگاه آزمایشی Parbad (فقط وقتی Payment:UseVirtualGateway روشن است)
if (app.Configuration.GetValue("Payment:UseVirtualGateway", true)) app.UseParbadVirtualGateway();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();

// در توسعه، نبودِ رمز با کلید تصادفی موقت جبران می‌شود؛ در production خطا می‌دهد.
static void EnsureSecret(WebApplicationBuilder b, string key)
{
    if (!string.IsNullOrWhiteSpace(b.Configuration[key])) return;
    if (!b.Environment.IsDevelopment() && !b.Environment.IsEnvironment("Testing"))
        throw new InvalidOperationException($"{key} تنظیم نشده است (User Secrets یا متغیر محیطی {key.Replace(":", "__")}).");
    b.Configuration[key] = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
    Console.WriteLine($"[warn] {key} not configured; using an ephemeral development key.");
}

public partial class Program;
