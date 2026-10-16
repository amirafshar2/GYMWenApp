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
using Parbad.Gateway.ZarinPal;
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
ProductionGuard.Enforce(builder.Configuration, builder.Environment);
EnsureSecret(builder, "Jwt:SigningKey");
EnsureSecret(builder, "Otp:Pepper");
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<OtpOptions>(builder.Configuration.GetSection(OtpOptions.Section));
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.Section));

// ---- اتصال به سیستم گیت/دستبند و سیستم‌های بیرونی ----
builder.Services.Configure<KhashayarGym.Business.Services.Access.AccessOptions>(builder.Configuration.GetSection(KhashayarGym.Business.Services.Access.AccessOptions.Section));
builder.Services.Configure<KhashayarGym.Api.Integrations.WebhookOptions>(builder.Configuration.GetSection(KhashayarGym.Api.Integrations.WebhookOptions.Section));
builder.Services.AddScoped<KhashayarGym.Api.Controllers.DeviceKeyFilter>();
builder.Services.AddHttpClient<KhashayarGym.Api.Integrations.IIntegrationSink, KhashayarGym.Api.Integrations.WebhookSink>(c => c.Timeout = TimeSpan.FromSeconds(10));
if (builder.Configuration.GetValue("Integrations:DispatcherEnabled", true))
{
    builder.Services.AddHostedService<KhashayarGym.Api.Integrations.IntegrationDispatcher>();
    builder.Services.AddHostedService<KhashayarGym.Api.Integrations.PendingOrderSweeper>();
    builder.Services.AddHostedService<KhashayarGym.Api.Integrations.SmsWorker>();
    builder.Services.AddHostedService<KhashayarGym.Api.Integrations.MaintenanceWorker>();
}

// ---- فاز ۳: فروشگاه، بوفه (لحظه‌ای با SignalR)، کیف پول ----
builder.Services.Configure<CommerceOptions>(builder.Configuration.GetSection(CommerceOptions.Section));
builder.Services.AddScoped<PaymentGateway>();
builder.Services.AddSignalR(o => { o.MaximumReceiveMessageSize = 4 * 1024; o.EnableDetailedErrors = builder.Environment.IsDevelopment(); });
builder.Services.AddScoped<ICanteenNotifier, KhashayarGym.Api.Hubs.SignalRCanteenNotifier>();

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
        // WebSocket هدر Authorization ندارد؛ فقط برای مسیر Hub توکن از کوئری خوانده می‌شود (لاگ درخواست‌ها کوئری را ثبت نمی‌کند)
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.HttpContext.Request.Path.StartsWithSegments("/hubs") && ctx.Request.Query["access_token"] is { Count: > 0 } t)
                    ctx.Token = t.ToString();
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAccessTokenFactory, JwtTokenFactory>();
builder.Services.AddSingleton<IPrivateFileStore, PrivateFileStore>();
builder.Services.AddSingleton<PublicImageStore>();

// ---- پیامک: Log (دمو) یا Kavenegar ----
builder.Services.Configure<KhashayarGym.Business.Services.Panel.SmsOptions>(builder.Configuration.GetSection(KhashayarGym.Business.Services.Panel.SmsOptions.Section));
builder.Services.AddScoped<KhashayarGym.Business.Services.Panel.DemoSeeder>();
if (builder.Configuration["Sms:SiteUrl"] is { Length: > 3 } smsSite) KhashayarGym.Business.Services.Panel.SmsTexts.Site = smsSite;
if (builder.Configuration["Sms:Provider"]?.Equals("Kavenegar", StringComparison.OrdinalIgnoreCase) == true)
{
    builder.Services.Configure<KavenegarOptions>(builder.Configuration.GetSection("Sms:Kavenegar"));
    builder.Services.AddHttpClient<ISmsSender, KavenegarSmsSender>(c => c.Timeout = TimeSpan.FromSeconds(10));
}
else builder.Services.AddSingleton<ISmsSender, LogSmsSender>();

// ---- درگاه پرداخت: Parbad — آزمایشی (فقط دمو) یا زرین‌پال ----
builder.Services.Configure<PaymentOptions>(builder.Configuration.GetSection(PaymentOptions.Section));
var paymentCfg = builder.Configuration.GetSection(PaymentOptions.Section).Get<PaymentOptions>() ?? new PaymentOptions();
var sqlServer = !string.Equals(builder.Configuration["Database:Provider"], "Sqlite", StringComparison.OrdinalIgnoreCase);
if (sqlServer)
    // وضعیت درگاه (Parbad) در SQL Server تا با ری‌استارت سرور پرداخت در جریان گم نشود؛ جدول ParbadCache در مایگریشن ساخته می‌شود
    builder.Services.AddDistributedSqlServerCache(o =>
    {
        o.ConnectionString = builder.Configuration.GetConnectionString("Default");
        o.SchemaName = "dbo";
        o.TableName = "ParbadCache";
    });
builder.Services.AddParbad()
    .ConfigureGateways(g =>
    {
        if (paymentCfg.UseVirtualGateway) g.AddParbadVirtual().WithOptions(o => o.GatewayPath = "/payment-sandbox");
        g.AddZarinPal().WithAccounts(a => a.AddInMemory(acc =>
        {
            acc.MerchantId = paymentCfg.ZarinPal.MerchantId;
            acc.IsSandbox = paymentCfg.ZarinPal.IsSandbox;
        }));
    })
    .ConfigureHttpContext(h => h.UseDefaultAspNetCore())
    .ConfigureStorage(s => { if (sqlServer) s.UseDistributedCache(); else s.UseMemoryCache(); });

// ---- سلامت سرویس برای مانیتورینگ: /health/live (برنامه بالاست) و /health/ready (دیتابیس هم جواب می‌دهد)
builder.Services.AddHealthChecks().AddDbContextCheck<GymDbContext>("database", tags: ["ready"]);

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
    // هر گیت با کلید خودش: تا ۶۰۰ درخواست در دقیقه (ساعت شلوغ)
    o.AddPolicy("device", ctx => RateLimitPartition.GetFixedWindowLimiter(
        "dev:" + (ctx.Request.Headers["X-Device-Key"].ToString() is { Length: > 0 } k ? k.GetHashCode().ToString() : ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 600 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
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
        // فقط هدرهای پراکسی‌های شناخته‌شده پذیرفته می‌شود (ReverseProxy:KnownNetworks، مثل 172.16.0.0/12).
        // اگر خالی باشد هر فرستنده‌ای قبول می‌شود؛ آن‌وقت پورت اپ حتماً باید فقط روی 127.0.0.1 یا شبکهٔ داخلی Docker باز باشد
        // (در docker-compose همین‌طور است)، وگرنه با X-Forwarded-For جعلی محدودیت تعداد درخواست دور زده می‌شود.
        o.KnownIPNetworks.Clear();
        o.KnownProxies.Clear();
        foreach (var cidr in builder.Configuration.GetSection("ReverseProxy:KnownNetworks").Get<string[]>() ?? [])
            o.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(cidr));
    });

var app = builder.Build();
if (app.Configuration.GetValue("ReverseProxy:Enabled", false)) app.UseForwardedHeaders();

// ساخت/به‌روزرسانی دیتابیس و دادهٔ نمونهٔ دمو
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
    // Database:AutoMigrate=false یعنی مایگریشن با اسکریپت بازبینی‌شده (docs/database/migrate.sql) اجرا می‌شود
    if (db.Database.IsSqlServer()) { if (app.Configuration.GetValue("Database:AutoMigrate", true)) await db.Database.MigrateAsync(); }
    else
    {
        // Sqlite فقط برای دموست: اگر فایل دیتابیس از نسخهٔ قبلی (بدون جداول فاز ۲) باشد، از نو ساخته می‌شود
        await db.Database.EnsureCreatedAsync();
        try { _ = await db.SmsMessages.AnyAsync(); } // جدیدترین جدول؛ نبودش یعنی فایل دمو قدیمی است
        catch (Microsoft.Data.Sqlite.SqliteException)
        {
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
        }
    }

    if (app.Configuration.GetValue("Database:SeedDemoData", true))
        await scope.ServiceProvider.GetRequiredService<DbSeeder>()
            .SeedAsync(Path.Combine(AppContext.BaseDirectory, "Seed"), includeDemoCodes: !app.Environment.IsProduction());

    // گیت نمایشی برای تست اتصال (هرگز در production)
    if (!app.Environment.IsProduction() && app.Configuration["Access:DemoDeviceKey"] is { Length: >= 16 } demoKey)
        await scope.ServiceProvider.GetRequiredService<KhashayarGym.Business.Services.Access.IAccessControlService>().EnsureDemoDeviceAsync(demoKey, CancellationToken.None);

    // کارمندان نمایشی و ۲۰۰ عضو ساختگی با ۶ ماه سابقه برای پرزنت؛ هرگز در production
    if (!app.Environment.IsProduction() && app.Configuration["Demo:StaffPhone"] is { Length: 11 } staffPhone)
    {
        var demo = scope.ServiceProvider.GetRequiredService<KhashayarGym.Business.Services.Panel.DemoSeeder>();
        if (app.Configuration.GetValue("Demo:SeedMembers", false)) await demo.SeedAsync(staffPhone, app.Configuration.GetValue("Demo:SeedMemberCount", 200), app.Configuration.GetValue("Demo:SeedDays", 182));
        else await demo.EnsureStaffAsync(staffPhone, CancellationToken.None);
    }
}

app.UseExceptionHandler();
if (!app.Environment.IsDevelopment()) app.UseHsts();
else app.MapOpenApi();

app.UseHttpsRedirection();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseResponseCompression();
app.UseSerilogRequestLogging();

app.UseMiddleware<PrecompressedStaticFilesMiddleware>();
// عکس‌های آپلودی مدیر (بیرون از wwwroot)
var uploads = app.Services.GetRequiredService<PublicImageStore>();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = uploads.FileProvider,
    RequestPath = PublicImageStore.RequestPath,
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable", // نام فایل تصادفی و تغییرناپذیر
});
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
if (paymentCfg.UseVirtualGateway) app.UseParbadVirtualGateway();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions { Predicate = c => c.Tags.Contains("ready") });
app.MapControllers();
app.MapHub<KhashayarGym.Api.Hubs.CanteenHub>(KhashayarGym.Api.Hubs.CanteenHub.Path);
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
