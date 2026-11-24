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
/// Erstinstallation einer neuen Seite (nur solange noch keine Zeile mit Seiteneinstellungen existiert):
/// <list type="bullet">
/// <item><b>Blank</b> — leere Datenbank; nur Rollen und das Inhaberkonto (Setup:OwnerPhone). Bis zum „Veröffentlichen“ zeigt die Seite „Im Aufbau“.</item>
/// <item><b>Demo</b> — fiktive Marke und vollständige Demodaten zur Präsentation.</item>
/// <item><b>Content</b> — Inhaltspaket aus dem Panel einer anderen Seite (Setup:ContentFile, zip oder Ordner).</item>
/// </list>
/// </summary>
public sealed class SiteInstaller(GymDbContext db, DbSeeder seeder, ISiteService site, UserManager<AppUser> users, IClock clock, ILogger<SiteInstaller> logger)
{
    public static readonly string[] Modes = ["Blank", "Demo", "Content"];

    /// <param name="mode">Blank | Demo | Content</param>
    /// <param name="demoSeedDir">Ordner mit Demodaten (Seed neben der Anwendung)</param>
    /// <param name="contentFile">Inhaltspaket (zip oder Ordner) für den Modus Content</param>
    /// <param name="uploadsRoot">Ordner für hochgeladene Bilder; Bilder aus dem Paket werden hierher kopiert</param>
    /// <returns>Tatsächlich installierter Modus, oder null, wenn die Seite schon installiert war</returns>
    /// <param name="demoData">Auch im Modus Content Demodaten erzeugen (Lagerbestand, Rabattcode, aktive Aktion) — für Präsentationen mit echtem Studioinhalt</param>
    public async Task<string?> InstallAsync(string mode, string demoSeedDir, string? contentFile, string uploadsRoot, string? ownerPhone, CancellationToken ct, bool demoData = false)
    {
        if (await db.SiteContents.AnyAsync(ct)) return null;
        mode = Modes.FirstOrDefault(m => m.Equals(mode, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Setup:Mode must be one of {string.Join(", ", Modes)}.");

        // Datenbank aus Versionen vor der Vorlage: Daten vorhanden, aber keine Einstellungen → die Daten bleiben veröffentlicht
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
                    using (var zip = OpenPackage(contentFile)) zip.ExtractToDirectory(temp);
                    dir = temp;
                }
                else if (!Directory.Exists(contentFile)) throw new FileNotFoundException("Setup:ContentFile not found.", contentFile);
                try
                {
                    CopyUploads(Path.Combine(dir, "uploads"), uploadsRoot);
                    await seeder.SeedAsync(dir, demo: demoData, ct);
                    var cfg = File.Exists(Path.Combine(dir, "site.json"))
                        ? SiteService.Parse(await File.ReadAllTextAsync(Path.Combine(dir, "site.json"), ct))
                        : new SiteConfig();
                    cfg.Setup = new SetupSettings { Mode = "Content", Published = cfg.Setup.Published, PublishedAtUtc = cfg.Setup.Published ? clock.UtcNow : null, DoneSteps = cfg.Setup.DoneSteps };
                    await site.SaveRawAsync(cfg, null, ct);
                }
                finally { if (temp is not null) try { Directory.Delete(temp, true); } catch (IOException) { } }
                break;

            default:
                await seeder.SeedAsync(Path.Combine(Path.GetTempPath(), "gym-blank-none"), demo: false, ct); // nur Rollen
                await site.SaveRawAsync(new SiteConfig(), null, ct);
                break;
        }

        if (!string.IsNullOrWhiteSpace(ownerPhone)) await EnsureOwnerAsync(ownerPhone, ct);
        logger.LogInformation("Site installed in {Mode} mode", mode);
        return mode;
    }

    /// <summary>Seiteninhaber: Gesamtadmin mit eigener Handynummer (Login per SMS-Code)</summary>
    public async Task EnsureOwnerAsync(string phone, CancellationToken ct)
    {
        phone = PersianText.ToLatinDigits(phone).Trim();
        if (!System.Text.RegularExpressions.Regex.IsMatch(phone, @"^01[5-7]\d{8,9}$")) throw new InvalidOperationException("Setup:OwnerPhone must look like 015112345678.");
        var u = await users.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phone, ct);
        if (u is null)
        {
            u = new AppUser { UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true, FullName = "Seitenadmin", CreatedAtUtc = clock.UtcNow };
            var r = await users.CreateAsync(u);
            if (!r.Succeeded) throw new InvalidOperationException(string.Join("; ", r.Errors.Select(e => e.Description)));
        }
        var missing = new[] { Roles.Member, Roles.SuperAdmin }.Except(await users.GetRolesAsync(u)).ToList();
        if (missing.Count > 0) await users.AddToRolesAsync(u, missing);
    }

    /// <summary>zip-Paket, oder dasselbe zip als base64-Text (für „Secret File“ bei Hostern, die nur Text akzeptieren)</summary>
    private static ZipArchive OpenPackage(string path)
    {
        var bytes = File.ReadAllBytes(path);
        if (bytes.Length < 2 || bytes[0] != 'P' || bytes[1] != 'K')
            bytes = Convert.FromBase64String(System.Text.Encoding.ASCII.GetString(bytes).Trim());
        return new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read);
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

    /// <summary>Inhaltspaket als zip: Seed-Dateien + site.json + verwendete hochgeladene Bilder</summary>
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
            // Nur hochgeladene Bilder, auf die der Inhalt verweist
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
