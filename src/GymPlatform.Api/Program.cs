using System.IO.Compression;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.RateLimiting;
using GymPlatform.Api.Auth;
using GymPlatform.Api.Infrastructure;
using GymPlatform.Api.Middleware;
using GymPlatform.Business;
using GymPlatform.Business.Common;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
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

// ---- Geheimnisse: nur aus User Secrets / Umgebungsvariablen. In der Entwicklung wird sonst ein temporärer Schlüssel erzeugt ----
ProductionGuard.Enforce(builder.Configuration, builder.Environment);
EnsureSecret(builder, "Jwt:SigningKey");
EnsureSecret(builder, "Otp:Pepper");
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<OtpOptions>(builder.Configuration.GetSection(OtpOptions.Section));
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.Section));

// ---- Anbindung an Gate-/Armbandsystem und externe Systeme ----
builder.Services.Configure<GymPlatform.Business.Services.Access.AccessOptions>(builder.Configuration.GetSection(GymPlatform.Business.Services.Access.AccessOptions.Section));
builder.Services.Configure<GymPlatform.Api.Integrations.WebhookOptions>(builder.Configuration.GetSection(GymPlatform.Api.Integrations.WebhookOptions.Section));
builder.Services.AddScoped<GymPlatform.Api.Controllers.DeviceKeyFilter>();
builder.Services.AddHttpClient<GymPlatform.Api.Integrations.IIntegrationSink, GymPlatform.Api.Integrations.WebhookSink>(c => c.Timeout = TimeSpan.FromSeconds(10));
if (builder.Configuration.GetValue("Integrations:DispatcherEnabled", true))
{
    builder.Services.AddHostedService<GymPlatform.Api.Integrations.IntegrationDispatcher>();
    builder.Services.AddHostedService<GymPlatform.Api.Integrations.PendingOrderSweeper>();
    builder.Services.AddHostedService<GymPlatform.Api.Integrations.SmsWorker>();
    builder.Services.AddHostedService<GymPlatform.Api.Integrations.MaintenanceWorker>();
}

// ---- Phase 3: Shop, Bistro (live mit SignalR), Guthaben ----
builder.Services.Configure<CommerceOptions>(builder.Configuration.GetSection(CommerceOptions.Section));
builder.Services.AddScoped<PaymentGateway>();
builder.Services.AddSignalR(o => { o.MaximumReceiveMessageSize = 4 * 1024; o.EnableDetailedErrors = builder.Environment.IsDevelopment(); });
builder.Services.AddScoped<ICanteenNotifier, GymPlatform.Api.Hubs.SignalRCanteenNotifier>();

// ---- Identity (nur Kern; Login per OTP, Rollen für Phase 4) + JWT ----
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
        // WebSocket hat keinen Authorization-Header; nur für den Hub-Pfad wird das Token aus der Query gelesen (das Request-Log speichert die Query nicht)
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
builder.Services.AddSingleton<GymPlatform.Api.Video.VideoStore>();
builder.Services.AddSingleton<GymPlatform.Business.Services.Site.IVideoLibrary>(sp => sp.GetRequiredService<GymPlatform.Api.Video.VideoStore>());
builder.Services.AddSingleton<GymPlatform.Api.Video.VideoOptimizer>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<GymPlatform.Api.Video.VideoOptimizer>());

// ---- SMS: Log (Demo) oder Kavenegar ----
builder.Services.Configure<GymPlatform.Business.Services.Panel.SmsOptions>(builder.Configuration.GetSection(GymPlatform.Business.Services.Panel.SmsOptions.Section));
builder.Services.AddScoped<GymPlatform.Business.Services.Panel.DemoSeeder>();
if (builder.Configuration["Sms:SiteUrl"] is { Length: > 3 } smsSite) GymPlatform.Business.Services.Panel.SmsTexts.Site = smsSite;
if (builder.Configuration["Sms:Provider"]?.Equals("Kavenegar", StringComparison.OrdinalIgnoreCase) == true)
{
    builder.Services.Configure<KavenegarOptions>(builder.Configuration.GetSection("Sms:Kavenegar"));
    builder.Services.AddHttpClient<ISmsSender, KavenegarSmsSender>(c => c.Timeout = TimeSpan.FromSeconds(10));
}
else builder.Services.AddSingleton<ISmsSender, LogSmsSender>();

// ---- Zahlungs-Gateway: Parbad — Test (nur Demo) oder Zahlungsanbieter ----
builder.Services.Configure<PaymentOptions>(builder.Configuration.GetSection(PaymentOptions.Section));
var paymentCfg = builder.Configuration.GetSection(PaymentOptions.Section).Get<PaymentOptions>() ?? new PaymentOptions();
var sqlServer = !string.Equals(builder.Configuration["Database:Provider"], "Sqlite", StringComparison.OrdinalIgnoreCase);
if (sqlServer)
    // Gateway-Status (Parbad) in SQL Server, damit laufende Zahlungen einen Serverneustart überstehen; die Tabelle ParbadCache entsteht per Migration
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

// ---- Health-Checks fürs Monitoring: /health/live (App läuft) und /health/ready (Datenbank antwortet auch)
builder.Services.AddHealthChecks().AddDbContextCheck<GymDbContext>("database", tags: ["ready"]);

builder.Services.AddAntiforgery(o =>
{
    o.HeaderName = "X-XSRF-TOKEN";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Strict;
    // In der Entwicklung (http) Cookie ohne Secure; in Production nur HTTPS mit Präfix __Host-
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

// Rate Limiting: Formulare (und später OTP/Zahlung) werden pro IP begrenzt.
// Faktor der Limits nur für Integrationstests (alle Testanfragen kommen von einer IP); in Production immer 1
var rl = (builder.Environment.IsEnvironment("Testing") || builder.Environment.IsDevelopment()) ? builder.Configuration.GetValue("RateLimiting:PermitMultiplier", 1) : 1;
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("forms", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    // OTP: höchstens 5 Anfragen pro Minute und IP (das Limit pro Nummer greift zusätzlich im Service)
    o.AddPolicy("otp", ctx => RateLimitPartition.GetFixedWindowLimiter(
        "otp:" + (ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        "auth:" + (ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 15 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("payment", ctx => RateLimitPartition.GetFixedWindowLimiter(
        "pay:" + (ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10 * rl, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    // Jedes Gate mit eigenem Schlüssel: bis zu 600 Anfragen pro Minute (Stoßzeit)
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

// Data-Protection-Schlüssel (Anti-CSRF-Token) im persistenten Volume, damit sie einen Container-Neustart überstehen
if (builder.Configuration["DataProtection:KeysPath"] is { Length: > 0 } keysPath)
    builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(keysPath)).SetApplicationName("GymPlatform");

// Hinter einem Reverse Proxy (Caddy/Nginx in Docker): echte Client-IP für Rate Limit und HTTPS für Secure-Cookies
if (builder.Configuration.GetValue("ReverseProxy:Enabled", false))
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.ForwardLimit = 1;
        // Nur Header bekannter Proxys werden akzeptiert (ReverseProxy:KnownNetworks, z. B. 172.16.0.0/12).
        // Ist die Liste leer, wird jeder Absender akzeptiert; dann darf der App-Port nur auf 127.0.0.1 oder im internen Docker-Netz offen sein
        // (so ist es in docker-compose), sonst umgeht ein gefälschtes X-Forwarded-For das Anfragelimit.
        o.KnownIPNetworks.Clear();
        o.KnownProxies.Clear();
        foreach (var cidr in builder.Configuration.GetSection("ReverseProxy:KnownNetworks").Get<string[]>() ?? [])
            o.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(cidr));
    });

var app = builder.Build();
if (app.Configuration.GetValue("ReverseProxy:Enabled", false)) app.UseForwardedHeaders();

// Datenbank anlegen/aktualisieren und Demodaten
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
    // Database:AutoMigrate=false = Migration per geprüftem Skript (docs/database/migrate.sql)
    if (db.Database.IsSqlServer()) { if (app.Configuration.GetValue("Database:AutoMigrate", true)) await db.Database.MigrateAsync(); }
    else
    {
        // Sqlite nur für Demos: stammt die Datei aus einer älteren Version (ohne Phase-2-Tabellen), wird sie neu angelegt
        await db.Database.EnsureCreatedAsync();
        try { _ = await db.SiteContents.AnyAsync(); } // Neueste Tabelle; fehlt sie, ist die Demodatei veraltet
        catch (Microsoft.Data.Sqlite.SqliteException)
        {
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
        }
    }

    // Erstinstallation (nur beim ersten Mal): Setup:Mode = Blank (leer, für neue Kunden) | Demo (Marke und Demodaten) | Content (aus dem Panel exportiertes Inhaltspaket)
    var setupMode = app.Configuration["Setup:Mode"] is { Length: > 0 } m ? m
        : !app.Configuration.GetValue("Database:SeedDemoData", true) || app.Environment.IsProduction() ? "Blank" : "Demo";
    var installed = await scope.ServiceProvider.GetRequiredService<GymPlatform.Business.Services.Site.SiteInstaller>().InstallAsync(
        setupMode, Path.Combine(AppContext.BaseDirectory, "Seed"), app.Configuration["Setup:ContentFile"],
        app.Services.GetRequiredService<PublicImageStore>().Root, app.Configuration["Setup:OwnerPhone"], CancellationToken.None,
        demoData: !app.Environment.IsProduction() && app.Configuration.GetValue("Setup:DemoData", false));
    // Der Inhaber kann auch später mit Setup:OwnerPhone hinzugefügt werden (z. B. falls er beim ersten Mal fehlte)
    if (installed is null && app.Configuration["Setup:OwnerPhone"] is { Length: > 0 } owner)
        await scope.ServiceProvider.GetRequiredService<GymPlatform.Business.Services.Site.SiteInstaller>().EnsureOwnerAsync(owner, CancellationToken.None);
    // Seiteneinstellungen von Anfang an im Speicher (der Studioname wird auch in geplanten SMS gebraucht)
    await scope.ServiceProvider.GetRequiredService<GymPlatform.Business.Services.Site.ISiteService>().GetAsync(CancellationToken.None);

    // Demo-Gate zum Testen der Anbindung (niemals in Production)
    if (!app.Environment.IsProduction() && app.Configuration["Access:DemoDeviceKey"] is { Length: >= 16 } demoKey)
        await scope.ServiceProvider.GetRequiredService<GymPlatform.Business.Services.Access.IAccessControlService>().EnsureDemoDeviceAsync(demoKey, CancellationToken.None);

    // Demo-Mitarbeiter und 200 fiktive Mitglieder mit 6 Monaten Verlauf für Präsentationen; niemals in Production
    if (!app.Environment.IsProduction() && app.Configuration["Demo:StaffPhone"] is { Length: 11 } staffPhone)
    {
        var demo = scope.ServiceProvider.GetRequiredService<GymPlatform.Business.Services.Panel.DemoSeeder>();
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
// Vom Admin hochgeladene Bilder (außerhalb von wwwroot)
var uploads = app.Services.GetRequiredService<PublicImageStore>();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = uploads.FileProvider,
    RequestPath = PublicImageStore.RequestPath,
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable", // zufälliger, unveränderlicher Dateiname
});
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Vite-Dateien mit Hash werden ein Jahr gecacht; index.html und Medien (Video, Bild, Logo) werden jedes Mal per ETag
        // validiert, damit der Browser nach einer Dateiänderung keine alte Version zeigt.
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

// Seite des Parbad-Test-Gateways (nur wenn Payment:UseVirtualGateway an ist)
if (paymentCfg.UseVirtualGateway) app.UseParbadVirtualGateway();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions { Predicate = c => c.Tags.Contains("ready") });
app.MapControllers();
// Hochgeladene Videos und ihre optimierten Versionen: nur erlaubte Namen, mit Range (Vor-/Zurückspulen) und einstündigem Cache
app.MapMethods(GymPlatform.Api.Video.VideoStore.RequestPath + "/{name}", ["GET", "HEAD"], (string name, GymPlatform.Api.Video.VideoStore videos, HttpContext http) =>
{
    if (!GymPlatform.Api.Video.VideoStore.PublicName().IsMatch(name)) return Results.NotFound();
    var path = Path.Combine(videos.Root, name);
    if (!File.Exists(path)) return Results.NotFound();
    http.Response.Headers.CacheControl = "public, max-age=3600";
    return Results.File(path, name.EndsWith(".mp4") ? "video/mp4" : "image/jpeg", enableRangeProcessing: true);
}).ExcludeFromDescription();
app.MapHub<GymPlatform.Api.Hubs.CanteenHub>(GymPlatform.Api.Hubs.CanteenHub.Path);
app.MapFallbackToFile("index.html");

app.Run();

// In der Entwicklung wird ein fehlendes Geheimnis durch einen temporären Zufallsschlüssel ersetzt; in Production gibt es einen Fehler.
static void EnsureSecret(WebApplicationBuilder b, string key)
{
    if (!string.IsNullOrWhiteSpace(b.Configuration[key])) return;
    if (!b.Environment.IsDevelopment() && !b.Environment.IsEnvironment("Testing"))
        throw new InvalidOperationException($"{key} ist nicht gesetzt (User Secrets oder Umgebungsvariable {key.Replace(":", "__")}).");
    b.Configuration[key] = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
    Console.WriteLine($"[warn] {key} not configured; using an ephemeral development key.");
}

public partial class Program;
