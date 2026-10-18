using System.IO.Compression;
using System.Text.Json;
using GymPlatform.Business.Common;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymPlatform.Business.Services.Site;

/// <summary>
/// نصب اولیهٔ یک سایت تازه (فقط وقتی هنوز ردیف تنظیمات سایت وجود ندارد):
/// <list type="bullet">
/// <item><b>Blank</b> — دیتابیس خالی؛ فقط نقش‌ها و حساب مالک (Setup:OwnerPhone). سایت تا «انتشار» صفحهٔ «در حال راه‌اندازی» نشان می‌دهد.</item>
/// <item><b>Demo</b> — برند ساختگی و دادهٔ نمایشی کامل برای معرفی.</item>
/// <item><b>Content</b> — بستهٔ محتوایی که از پنل یک سایت دیگر گرفته شده (Setup:ContentFile، zip یا پوشه).</item>
/// </list>
/// </summary>
public sealed class SiteInstaller(GymDbContext db, DbSeeder seeder, ISiteService site, UserManager<AppUser> users, IClock clock, ILogger<SiteInstaller> logger)
{
    public static readonly string[] Modes = ["Blank", "Demo", "Content"];

    /// <param name="mode">Blank | Demo | Content</param>
    /// <param name="demoSeedDir">پوشهٔ دادهٔ نمایشی (Seed کنار برنامه)</param>
    /// <param name="contentFile">بستهٔ محتوا (zip یا پوشه) برای حالت Content</param>
    /// <param name="uploadsRoot">پوشهٔ عکس‌های آپلودی؛ عکس‌های داخل بسته این‌جا کپی می‌شوند</param>
    /// <returns>حالتی که واقعاً نصب شد، یا null اگر سایت قبلاً نصب شده بود</returns>
    public async Task<string?> InstallAsync(string mode, string demoSeedDir, string? contentFile, string uploadsRoot, string? ownerPhone, CancellationToken ct)
    {
        if (await db.SiteContents.AnyAsync(ct)) return null;
        mode = Modes.FirstOrDefault(m => m.Equals(mode, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Setup:Mode must be one of {string.Join(", ", Modes)}.");

        // دیتابیس نسخه‌های قبل از قالب: داده دارد ولی تنظیمات ندارد → همان داده منتشرشده می‌ماند
        if (await db.Branches.AnyAsync(ct))
        {
            await site.SaveRawAsync(new SiteConfig { Setup = new SetupSettings { Mode = "Content", Published = true, PublishedAtUtc = clock.UtcNow } }, null, ct);
            logger.LogInformation("Existing data found; site settings created as published");
            return "Content";
        }

        switch (mode)
        {
            case "Demo":
                await seeder.SeedAsync(demoSeedDir, demo: true, ct);
                await site.SaveRawAsync(SiteDefaults.Demo(), null, ct);
                break;

            case "Content":
                if (string.IsNullOrWhiteSpace(contentFile)) throw new InvalidOperationException("Setup:Mode=Content needs Setup:ContentFile (a .zip exported from the panel, or its extracted folder).");
                var dir = contentFile;
                string? temp = null;
                if (File.Exists(contentFile))
                {
                    temp = Path.Combine(Path.GetTempPath(), "gym-content-" + Guid.NewGuid().ToString("N"));
                    ZipFile.ExtractToDirectory(contentFile, temp);
                    dir = temp;
                }
                else if (!Directory.Exists(contentFile)) throw new FileNotFoundException("Setup:ContentFile not found.", contentFile);
                try
                {
                    CopyUploads(Path.Combine(dir, "uploads"), uploadsRoot);
                    await seeder.SeedAsync(dir, demo: false, ct);
                    var cfg = File.Exists(Path.Combine(dir, "site.json"))
                        ? SiteService.Parse(await File.ReadAllTextAsync(Path.Combine(dir, "site.json"), ct))
                        : new SiteConfig();
                    cfg.Setup = new SetupSettings { Mode = "Content", Published = cfg.Setup.Published, PublishedAtUtc = cfg.Setup.Published ? clock.UtcNow : null, DoneSteps = cfg.Setup.DoneSteps };
                    await site.SaveRawAsync(cfg, null, ct);
                }
                finally { if (temp is not null) try { Directory.Delete(temp, true); } catch (IOException) { } }
                break;

            default:
                await seeder.SeedAsync(Path.Combine(Path.GetTempPath(), "gym-blank-none"), demo: false, ct); // فقط نقش‌ها
                await site.SaveRawAsync(new SiteConfig(), null, ct);
                break;
        }

        if (!string.IsNullOrWhiteSpace(ownerPhone)) await EnsureOwnerAsync(ownerPhone, ct);
        logger.LogInformation("Site installed in {Mode} mode", mode);
        return mode;
    }

    /// <summary>مالک سایت: مدیر کل با شمارهٔ موبایل خودش (ورود با کد پیامکی)</summary>
    public async Task EnsureOwnerAsync(string phone, CancellationToken ct)
    {
        phone = PersianText.ToLatinDigits(phone).Trim();
        if (!System.Text.RegularExpressions.Regex.IsMatch(phone, @"^09\d{9}$")) throw new InvalidOperationException("Setup:OwnerPhone must look like 09121234567.");
        var u = await users.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phone, ct);
        if (u is null)
        {
            u = new AppUser { UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true, FullName = "مدیر سایت", CreatedAtUtc = clock.UtcNow };
            var r = await users.CreateAsync(u);
            if (!r.Succeeded) throw new InvalidOperationException(string.Join("; ", r.Errors.Select(e => e.Description)));
        }
        var missing = new[] { Roles.Member, Roles.SuperAdmin }.Except(await users.GetRolesAsync(u)).ToList();
        if (missing.Count > 0) await users.AddToRolesAsync(u, missing);
    }

    private static void CopyUploads(string from, string to)
    {
        if (!Directory.Exists(from)) return;
        Directory.CreateDirectory(to);
        foreach (var f in Directory.EnumerateFiles(from))
        {
            var name = Path.GetFileName(f);
            if (!System.Text.RegularExpressions.Regex.IsMatch(name, @"^[A-Za-z0-9._-]+\.(webp|png|jpe?g)$")) continue;
            var dest = Path.Combine(to, name);
            if (!File.Exists(dest)) File.Copy(f, dest);
        }
    }

    /// <summary>بستهٔ محتوا به‌شکل zip: فایل‌های Seed + site.json + عکس‌های آپلودی استفاده‌شده</summary>
    public async Task<byte[]> ExportAsync(string uploadsRoot, CancellationToken ct)
    {
        var files = await ContentExporter.ExportAsync(db, ct);
        var cfg = SiteService.Clone(await site.GetAsync(ct));
        cfg.Setup = new SetupSettings { Mode = "Content", Published = cfg.Setup.Published };
        var siteJson = JsonSerializer.Serialize(cfg, new JsonSerializerOptions(SiteService.Json) { WriteIndented = true });
        files["site.json"] = siteJson;

        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, json) in files)
            {
                var e = zip.CreateEntry(name, CompressionLevel.Optimal);
                await using var w = new StreamWriter(e.Open());
                await w.WriteAsync(json);
            }
            // فقط عکس‌های آپلودی که در محتوا ارجاع شده‌اند
            var all = string.Join("\n", files.Values);
            foreach (System.Text.RegularExpressions.Match m in System.Text.RegularExpressions.Regex.Matches(all, @"/media/uploads/([A-Za-z0-9._-]+\.(?:webp|png|jpe?g))"))
            {
                var name = m.Groups[1].Value;
                var path = Path.Combine(uploadsRoot, name);
                if (!File.Exists(path) || zip.GetEntry("uploads/" + name) is not null) continue;
                zip.CreateEntryFromFile(path, "uploads/" + name, CompressionLevel.NoCompression);
            }
        }
        return ms.ToArray();
    }
}
