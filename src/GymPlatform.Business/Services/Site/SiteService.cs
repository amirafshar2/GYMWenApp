using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using GymPlatform.Business.Common;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Business.Services.Site;

public interface ISiteService
{
    Task<SiteConfig> GetAsync(CancellationToken ct);
    Task<Result<SiteConfig>> SaveAsync(SiteConfig input, int staffId, CancellationToken ct);
    /// <summary>Nur für Erstinstallation und Import eines Inhaltspakets (ohne Formularvalidierung des Panels)</summary>
    Task SaveRawAsync(SiteConfig config, int? staffId, CancellationToken ct);
    Task<SetupStatusDto> GetSetupStatusAsync(CancellationToken ct);
    Task<Result<SetupStatusDto>> UpdateSetupAsync(SetupUpdateRequest r, int staffId, CancellationToken ct);
}

/// <summary>Die gelesene Version bleibt im Speicher; jedes Speichern ersetzt sie (eine Installation = ein Server)</summary>
public sealed class SiteConfigCache
{
    private SiteConfig? _value;
    public SiteConfig? Value { get => Volatile.Read(ref _value); set => Volatile.Write(ref _value, value); }
}

public sealed record SetupStepDto(string Key, string Title, string Hint, string Link, bool Done, bool Optional);
public sealed record SetupStatusDto(string Mode, bool Published, bool GuideHidden, IReadOnlyList<SetupStepDto> Steps, int DoneCount, int RequiredCount);
/// <param name="Step">Schritt, der manuell „erledigt“ oder „zurückgesetzt“ wird</param>
public sealed record SetupUpdateRequest(string? Step, bool? StepDone, bool? Publish, bool? GuideHidden);

public sealed partial class SiteService(GymDbContext db, SiteConfigCache cache, IClock clock, IVideoLibrary? videos = null) : ISiteService
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public async Task<SiteConfig> GetAsync(CancellationToken ct)
    {
        if (cache.Value is { } c) return c;
        var row = await db.SiteContents.AsNoTracking().OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
        var cfg = row is null ? new SiteConfig() : Parse(row.Json);
        cache.Value = cfg;
        Panel.SmsTexts.Brand = ShortDisplayName(cfg);
        return cfg;
    }

    /// <summary>Die Cache-Version ist geteilt; jede Änderung erfolgt an einer Kopie</summary>
    public static SiteConfig Clone(SiteConfig c) => Parse(JsonSerializer.Serialize(c, Json));

    /// <summary>Anzeigename in PDF, Bericht und SMS (leere Installation ohne Namen: „Studio“)</summary>
    public static string DisplayName(SiteConfig c) => c.Brand.Name is { Length: > 0 } n ? n : c.Brand.ShortName is { Length: > 0 } s ? s : "Studio";
    public static string ShortDisplayName(SiteConfig c) => c.Brand.ShortName is { Length: > 0 } s ? s : DisplayName(c);

    public static SiteConfig Parse(string json)
    {
        try { return Normalize(JsonSerializer.Deserialize<SiteConfig>(json, Json) ?? new SiteConfig()); }
        catch (JsonException) { return new SiteConfig(); }
    }

    /// <summary>Neue Bereiche aus späteren Vorlagenversionen werden an die gespeicherte Liste angehängt</summary>
    private static SiteConfig Normalize(SiteConfig c)
    {
        c.Home.Sections = c.Home.Sections.Where(s => SiteDefaults.SectionKeys.Contains(s.Key)).DistinctBy(s => s.Key).ToList();
        foreach (var k in SiteDefaults.SectionKeys.Where(k => c.Home.Sections.All(s => s.Key != k)))
            c.Home.Sections.Add(new SectionToggle { Key = k, Enabled = true });
        return c;
    }

    public async Task SaveRawAsync(SiteConfig config, int? staffId, CancellationToken ct)
    {
        var row = await db.SiteContents.OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
        if (row is null) { row = new SiteContent(); db.SiteContents.Add(row); }
        row.Json = JsonSerializer.Serialize(Normalize(config), Json);
        row.UpdatedAtUtc = clock.UtcNow;
        row.UpdatedByUserId = staffId;
        await db.SaveChangesAsync(ct);
        cache.Value = Parse(row.Json);
        Panel.SmsTexts.Brand = ShortDisplayName(cache.Value);
    }

    // ================================================================ Speichern aus dem Panel
    public async Task<Result<SiteConfig>> SaveAsync(SiteConfig r, int staffId, CancellationToken ct)
    {
        var current = await GetAsync(ct);
        var e = new Dictionary<string, string[]>();
        var c = new SiteConfig { Setup = current.Setup };

        string T(string? v, int max, string key, string label, bool required = false)
        {
            var s = PersianText.CleanText(v) ?? "";
            if (required && s.Length == 0) e[key] = [$"{label} angeben."];
            else if (s.Length > max) e[key] = [$"{label} Höchstens {max} Zeichen."];
            return s.Length > max ? s[..max] : s;
        }
        string? O(string? v, int max, string key, string label) { var s = T(v, max, key, label); return s.Length == 0 ? null : s; }
        string? Img(string? v, string key, bool required = false)
        {
            var s = v?.Trim();
            if (string.IsNullOrEmpty(s)) { if (required) e[key] = ["Bitte ein Bild wählen."]; return null; }
            if (!ValidImagePath(s)) { e[key] = ["Bild nur aus der Mediathek der Seite oder per Upload."]; return null; }
            return s;
        }
        string Color(string? v, string key, string fallback)
        {
            var s = v?.Trim() ?? "";
            if (!HexColor().IsMatch(s)) { e[key] = ["Farbe im Format #0B5FB0 eingeben."]; return fallback; }
            return s.ToUpperInvariant();
        }
        string? Link(string? v, string key, params string[] hosts)
        {
            var s = v?.Trim();
            if (string.IsNullOrEmpty(s)) return null;
            if (!Uri.TryCreate(s, UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps || s.Length > 200 ||
                !hosts.Any(h => u.Host.Equals(h, StringComparison.OrdinalIgnoreCase) || u.Host.EndsWith("." + h, StringComparison.OrdinalIgnoreCase)))
            { e[key] = [$"Die Adresse muss mit https://{hosts[0]} beginnen."]; return null; }
            return s;
        }
        List<CardItem> Cards(List<CardItem>? list, string key, int max, bool image, bool text)
        {
            var o = new List<CardItem>();
            foreach (var (it, i) in (list ?? []).Take(max).Select((x, i) => (x, i)))
            {
                var title = T(it.Title, 60, $"{key}[{i}].title", "Titel");
                if (title.Length == 0) continue;
                o.Add(new CardItem
                {
                    Title = title,
                    Text = text ? O(it.Text, 200, $"{key}[{i}].text", "Beschreibung") : null,
                    ImageUrl = image ? Img(it.ImageUrl, $"{key}[{i}].imageUrl") : null,
                    Icon = it.Icon is { } ic && Icons.Contains(ic) ? ic : null,
                    Href = it.Href is { } h && AllowedHref().IsMatch(h) ? h : null,
                });
            }
            return o;
        }
        SimpleSection S(SimpleSection? s, string key) => new()
        {
            Eyebrow = T(s?.Eyebrow, 60, $"{key}.eyebrow", "Label"),
            Title = T(s?.Title, 120, $"{key}.title", "Überschrift"),
            Text = T(s?.Text, 400, $"{key}.text", "Text"),
        };

        // ---- Identität
        var b = r.Brand ?? new();
        c.Brand = new BrandSettings
        {
            Name = T(b.Name, 80, "brand.name", "Vollständiger Name", required: true),
            ShortName = T(b.ShortName, 24, "brand.shortName", "Kurzname", required: true),
            LatinName = T(b.LatinName, 40, "brand.latinName", "Lateinischer Name"),
            Slogan = T(b.Slogan, 80, "brand.slogan", "Slogan"),
            NearSlogan = T(b.NearSlogan, 80, "brand.nearSlogan", "Filial-Slogan"),
            WhySlogan = T(b.WhySlogan, 40, "brand.whySlogan", "Überschrift „Warum wir“"),
            City = T(b.City, 40, "brand.city", "Stadt"),
            Description = T(b.Description, 200, "brand.description", "Kurzbeschreibung"),
            LogoUrl = Img(b.LogoUrl, "brand.logoUrl"),
            LogoFullUrl = Img(b.LogoFullUrl, "brand.logoFullUrl"),
        };
        if (c.Brand.LatinName.Length > 0 && !LatinName().IsMatch(c.Brand.LatinName)) e["brand.latinName"] = ["Nur englische Buchstaben, Ziffern und Leerzeichen."];

        // ---- Kontakt
        var ct2 = r.Contact ?? new();
        var phone = PersianText.ToLatinDigits(ct2.Phone).Replace(" ", "").Replace("-", "");
        if (phone.Length > 0 && !PhoneRx().IsMatch(phone)) e["contact.phone"] = ["Telefonnummer bitte nur mit Ziffern, z. B. 015123456789 oder 07111234567."];
        var email = ct2.Email?.Trim();
        if (!string.IsNullOrEmpty(email) && (!EmailRx().IsMatch(email) || email.Length > 120)) e["contact.email"] = ["Ungültige E-Mail."];
        c.Contact = new ContactSettings
        {
            Phone = phone,
            Email = string.IsNullOrEmpty(email) ? null : email,
            Address = O(ct2.Address, 300, "contact.address", "Adresse"),
            Instagram = Link(ct2.Instagram, "contact.instagram", "instagram.com"),
            Telegram = Link(ct2.Telegram, "contact.telegram", "t.me", "telegram.me"),
            WhatsApp = Link(ct2.WhatsApp, "contact.whatsApp", "wa.me", "whatsapp.com"),
            ResponseTime = O(ct2.ResponseTime, 40, "contact.responseTime", "Antwortzeit"),
            EnamadId = ct2.EnamadId is { Length: > 0 } eid && Digits().IsMatch(eid) && eid.Length <= 12 ? eid : null,
            EnamadCode = ct2.EnamadCode is { Length: > 0 } ec && AlphaNum().IsMatch(ec) && ec.Length <= 40 ? ec : null,
        };

        // ---- Farbe
        var th = r.Theme ?? new();
        c.Theme = new ThemeSettings
        {
            Primary = Color(th.Primary, "theme.primary", "#0B5FB0"),
            Accent = Color(th.Accent, "theme.accent", "#FFB400"),
            Dark = Color(th.Dark, "theme.dark", "#181818"),
        };

        // ---- Startseite
        var h = r.Home ?? new();
        c.Home = new HomeSettings
        {
            Sections = (h.Sections ?? []).Where(s => SiteDefaults.SectionKeys.Contains(s.Key)).DistinctBy(s => s.Key)
                .Select(s => new SectionToggle { Key = s.Key, Enabled = s.Enabled }).ToList(),
            Hero = new HeroSettings
            {
                Eyebrow = T(h.Hero?.Eyebrow, 60, "home.hero.eyebrow", "Hero-Label"),
                Body = T(h.Hero?.Body, 300, "home.hero.body", "Hero-Text"),
                PrimaryCta = T(h.Hero?.PrimaryCta, 30, "home.hero.primaryCta", "Erster Button", required: true),
                SecondaryCta = T(h.Hero?.SecondaryCta, 30, "home.hero.secondaryCta", "Zweiter Button", required: true),
                ImageUrl = Img(h.Hero?.ImageUrl, "home.hero.imageUrl", required: true) ?? new HeroSettings().ImageUrl,
                MobileImageUrl = Img(h.Hero?.MobileImageUrl, "home.hero.mobileImageUrl") ?? Img(h.Hero?.ImageUrl, "home.hero.imageUrl") ?? new HeroSettings().MobileImageUrl,
            },
            Intro = new IntroSettings
            {
                Eyebrow = T(h.Intro?.Eyebrow, 60, "home.intro.eyebrow", "Label"),
                Title = T(h.Intro?.Title, 160, "home.intro.title", "Überschrift"),
                Cards = Cards(h.Intro?.Cards, "home.intro.cards", 8, image: true, text: false),
            },
            Why = new WhySettings
            {
                Title = T(h.Why?.Title, 120, "home.why.title", "Überschrift"),
                Text = T(h.Why?.Text, 400, "home.why.text", "Text"),
                ImageUrl = Img(h.Why?.ImageUrl, "home.why.imageUrl") ?? "",
                ImageCta = T(h.Why?.ImageCta, 60, "home.why.imageCta", "Text auf dem Bild"),
                Points = Cards(h.Why?.Points, "home.why.points", 6, image: false, text: true),
                FoundedYear = h.Why?.FoundedYear is >= 1300 and <= 1500 ? h.Why.FoundedYear : null,
                Members = h.Why?.Members is > 0 and < 10_000_000 ? h.Why.Members : null,
            },
            Video = new VideoSettings
            {
                Title = T(h.Video?.Title, 80, "home.video.title", "Video-Slogan"),
                VideoUrl = h.Video?.VideoUrl is { Length: > 0 } v ? (ValidVideo(v) ? v : Err(e, "home.video.videoUrl", "Video nur aus dem Videoordner der Seite oder per Upload.")) : null,
                PosterUrl = Img(h.Video?.PosterUrl, "home.video.posterUrl") ?? "",
                MobilePosterUrl = Img(h.Video?.MobilePosterUrl, "home.video.mobilePosterUrl"),
                Mode = h.Video?.Mode == "loop" ? "loop" : "scrub",
            },
            Offer = new OfferSettings
            {
                Eyebrow = T(h.Offer?.Eyebrow, 60, "home.offer.eyebrow", "Label"),
                Title = T(h.Offer?.Title, 120, "home.offer.title", "Überschrift"),
                Items = Cards(h.Offer?.Items, "home.offer.items", 12, image: false, text: true),
            },
            Branches = S(h.Branches, "home.branches"),
            Pricing = S(h.Pricing, "home.pricing"),
            Shop = S(h.Shop, "home.shop"),
            Events = new EventsSettings
            {
                Eyebrow = T(h.Events?.Eyebrow, 60, "home.events.eyebrow", "Label"),
                Title = T(h.Events?.Title, 120, "home.events.title", "Überschrift"),
                Text = T(h.Events?.Text, 400, "home.events.text", "Text"),
                ImageUrl = Img(h.Events?.ImageUrl, "home.events.imageUrl") ?? "",
                SecondImageUrl = Img(h.Events?.SecondImageUrl, "home.events.secondImageUrl") ?? "",
            },
            Gallery = new GallerySettings
            {
                Title = T(h.Gallery?.Title, 120, "home.gallery.title", "Überschrift"),
                Images = Cards(h.Gallery?.Images, "home.gallery.images", 24, image: true, text: false).Where(x => x.ImageUrl is not null).ToList(),
            },
            Coaches = S(h.Coaches, "home.coaches"),
            Faq = S(h.Faq, "home.faq"),
            Contact = S(h.Contact, "home.contact"),
            FooterNote = T(h.FooterNote, 120, "home.footerNote", "Footer-Text"),
        };

        // ---- Rechtsseiten
        var l = r.Legal ?? new();
        c.Legal = new LegalSettings
        {
            About = T(l.About, 6000, "legal.about", "Über uns"),
            Terms = T(l.Terms, 12000, "legal.terms", "AGB"),
            Privacy = T(l.Privacy, 12000, "legal.privacy", "Datenschutz"),
            Refund = T(l.Refund, 6000, "legal.refund", "Erstattung"),
        };

        // ---- Module
        c.Modules = r.Modules ?? new();

        if (e.Count > 0) return Result<SiteConfig>.Fail(e);
        // Ob ein Video optimiert ist, bestimmt der Server anhand der Datei {id}.ready, nicht das Formular
        c.Home.Video.Optimized = c.Home.Video.VideoUrl is { } vu && (videos?.IsOptimized(vu) ?? VideoPath().IsMatch(vu));
        await SaveRawAsync(c, staffId, ct);
        db.AuditLogs.Add(new AuditLog { Action = "site.updated", EntityType = "Site", EntityId = "1", UserId = staffId });
        await db.SaveChangesAsync(ct);
        return Result<SiteConfig>.Ok(await GetAsync(ct));
    }

    private bool ValidVideo(string v) => videos?.IsValidUrl(v) ?? VideoPath().IsMatch(v);

    private static string? Err(Dictionary<string, string[]> e, string key, string msg) { e[key] = [msg]; return null; }

    public static readonly string[] Icons = ["dumbbell", "scale", "salad", "calendar", "user", "users", "mountain", "bag", "heart", "trophy", "clock", "shield", "flame", "bike", "waves"];

    /// <summary>Bilder nur aus den Ordnern der Seite oder geprüften Uploads</summary>
    public static bool ValidImagePath(string s) => s.Length < 200 && !s.Contains("..") && ImagePath().IsMatch(s);

    [GeneratedRegex(@"^/(media/[a-z]+|brand)/[A-Za-z0-9._-]+\.(webp|png|jpe?g|svg)$")] private static partial Regex ImagePath();
    [GeneratedRegex(@"^/media/video/[A-Za-z0-9._-]+\.mp4$")] private static partial Regex VideoPath();
    [GeneratedRegex(@"^#[0-9A-Fa-f]{6}$")] private static partial Regex HexColor();
    [GeneratedRegex(@"^0\d{9,10}$")] private static partial Regex PhoneRx();
    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")] private static partial Regex EmailRx();
    [GeneratedRegex(@"^[A-Za-z0-9 .&'-]+$")] private static partial Regex LatinName();
    [GeneratedRegex(@"^\d+$")] private static partial Regex Digits();
    [GeneratedRegex(@"^[A-Za-z0-9]+$")] private static partial Regex AlphaNum();
    [GeneratedRegex(@"^(#[a-z-]{2,20}|/[a-z/-]{1,40})$")] private static partial Regex AllowedHref();
}
