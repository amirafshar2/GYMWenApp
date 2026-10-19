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
    /// <summary>فقط برای نصب اولیه و ورود بستهٔ محتوا (بدون اعتبارسنجی فرم پنل)</summary>
    Task SaveRawAsync(SiteConfig config, int? staffId, CancellationToken ct);
    Task<SetupStatusDto> GetSetupStatusAsync(CancellationToken ct);
    Task<Result<SetupStatusDto>> UpdateSetupAsync(SetupUpdateRequest r, int staffId, CancellationToken ct);
}

/// <summary>نسخهٔ خوانده‌شده در حافظه نگه داشته می‌شود؛ هر ذخیره آن را عوض می‌کند (یک نصب = یک سرور)</summary>
public sealed class SiteConfigCache
{
    private SiteConfig? _value;
    public SiteConfig? Value { get => Volatile.Read(ref _value); set => Volatile.Write(ref _value, value); }
}

public sealed record SetupStepDto(string Key, string Title, string Hint, string Link, bool Done, bool Optional);
public sealed record SetupStatusDto(string Mode, bool Published, bool GuideHidden, IReadOnlyList<SetupStepDto> Steps, int DoneCount, int RequiredCount);
/// <param name="Step">مرحله‌ای که دستی «انجام شد» یا «برگرداندن» می‌شود</param>
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

    /// <summary>نسخهٔ کش مشترک است؛ هر تغییر روی یک کپی انجام می‌شود</summary>
    public static SiteConfig Clone(SiteConfig c) => Parse(JsonSerializer.Serialize(c, Json));

    /// <summary>نام نمایشی در PDF، گزارش و پیامک (نصب خامِ بی‌نام: «باشگاه»)</summary>
    public static string DisplayName(SiteConfig c) => c.Brand.Name is { Length: > 0 } n ? n : c.Brand.ShortName is { Length: > 0 } s ? s : "باشگاه";
    public static string ShortDisplayName(SiteConfig c) => c.Brand.ShortName is { Length: > 0 } s ? s : DisplayName(c);

    public static SiteConfig Parse(string json)
    {
        try { return Normalize(JsonSerializer.Deserialize<SiteConfig>(json, Json) ?? new SiteConfig()); }
        catch (JsonException) { return new SiteConfig(); }
    }

    /// <summary>بخش‌های تازه‌ای که در نسخه‌های بعدی قالب اضافه می‌شوند به فهرست ذخیره‌شده اضافه می‌شوند</summary>
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

    // ================================================================ ذخیره از پنل
    public async Task<Result<SiteConfig>> SaveAsync(SiteConfig r, int staffId, CancellationToken ct)
    {
        var current = await GetAsync(ct);
        var e = new Dictionary<string, string[]>();
        var c = new SiteConfig { Setup = current.Setup };

        string T(string? v, int max, string key, string label, bool required = false)
        {
            var s = PersianText.CleanText(v) ?? "";
            if (required && s.Length == 0) e[key] = [$"{label} را بنویسید."];
            else if (s.Length > max) e[key] = [$"{label} حداکثر {max} حرف."];
            return s.Length > max ? s[..max] : s;
        }
        string? O(string? v, int max, string key, string label) { var s = T(v, max, key, label); return s.Length == 0 ? null : s; }
        string? Img(string? v, string key, bool required = false)
        {
            var s = v?.Trim();
            if (string.IsNullOrEmpty(s)) { if (required) e[key] = ["یک عکس انتخاب کنید."]; return null; }
            if (!ValidImagePath(s)) { e[key] = ["عکس فقط از کتابخانهٔ سایت یا آپلود."]; return null; }
            return s;
        }
        string Color(string? v, string key, string fallback)
        {
            var s = v?.Trim() ?? "";
            if (!HexColor().IsMatch(s)) { e[key] = ["رنگ را به شکل ‎#0B5FB0 وارد کنید."]; return fallback; }
            return s.ToUpperInvariant();
        }
        string? Link(string? v, string key, params string[] hosts)
        {
            var s = v?.Trim();
            if (string.IsNullOrEmpty(s)) return null;
            if (!Uri.TryCreate(s, UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps || s.Length > 200 ||
                !hosts.Any(h => u.Host.Equals(h, StringComparison.OrdinalIgnoreCase) || u.Host.EndsWith("." + h, StringComparison.OrdinalIgnoreCase)))
            { e[key] = [$"آدرس باید با https://{hosts[0]} شروع شود."]; return null; }
            return s;
        }
        List<CardItem> Cards(List<CardItem>? list, string key, int max, bool image, bool text)
        {
            var o = new List<CardItem>();
            foreach (var (it, i) in (list ?? []).Take(max).Select((x, i) => (x, i)))
            {
                var title = T(it.Title, 60, $"{key}[{i}].title", "عنوان");
                if (title.Length == 0) continue;
                o.Add(new CardItem
                {
                    Title = title,
                    Text = text ? O(it.Text, 200, $"{key}[{i}].text", "توضیح") : null,
                    ImageUrl = image ? Img(it.ImageUrl, $"{key}[{i}].imageUrl") : null,
                    Icon = it.Icon is { } ic && Icons.Contains(ic) ? ic : null,
                    Href = it.Href is { } h && AllowedHref().IsMatch(h) ? h : null,
                });
            }
            return o;
        }
        SimpleSection S(SimpleSection? s, string key) => new()
        {
            Eyebrow = T(s?.Eyebrow, 60, $"{key}.eyebrow", "برچسب"),
            Title = T(s?.Title, 120, $"{key}.title", "تیتر"),
            Text = T(s?.Text, 400, $"{key}.text", "متن"),
        };

        // ---- هویت
        var b = r.Brand ?? new();
        c.Brand = new BrandSettings
        {
            Name = T(b.Name, 80, "brand.name", "نام کامل", required: true),
            ShortName = T(b.ShortName, 24, "brand.shortName", "نام کوتاه", required: true),
            LatinName = T(b.LatinName, 40, "brand.latinName", "نام لاتین"),
            Slogan = T(b.Slogan, 80, "brand.slogan", "شعار"),
            NearSlogan = T(b.NearSlogan, 80, "brand.nearSlogan", "شعار شعبه‌ها"),
            WhySlogan = T(b.WhySlogan, 40, "brand.whySlogan", "تیتر «چرا ما»"),
            City = T(b.City, 40, "brand.city", "شهر"),
            Description = T(b.Description, 200, "brand.description", "توضیح کوتاه"),
            LogoUrl = Img(b.LogoUrl, "brand.logoUrl"),
            LogoFullUrl = Img(b.LogoFullUrl, "brand.logoFullUrl"),
        };
        if (c.Brand.LatinName.Length > 0 && !LatinName().IsMatch(c.Brand.LatinName)) e["brand.latinName"] = ["فقط حروف انگلیسی، عدد و فاصله."];

        // ---- تماس
        var ct2 = r.Contact ?? new();
        var phone = PersianText.ToLatinDigits(ct2.Phone).Replace(" ", "").Replace("-", "");
        if (phone.Length > 0 && !PhoneRx().IsMatch(phone)) e["contact.phone"] = ["شمارهٔ تلفن را فقط با رقم بنویسید، مثل ۰۹۱۲۱۲۳۴۵۶۷ یا ۰۲۱۱۲۳۴۵۶۷۸."];
        var email = ct2.Email?.Trim();
        if (!string.IsNullOrEmpty(email) && (!EmailRx().IsMatch(email) || email.Length > 120)) e["contact.email"] = ["ایمیل معتبر نیست."];
        c.Contact = new ContactSettings
        {
            Phone = phone,
            Email = string.IsNullOrEmpty(email) ? null : email,
            Address = O(ct2.Address, 300, "contact.address", "آدرس"),
            Instagram = Link(ct2.Instagram, "contact.instagram", "instagram.com"),
            Telegram = Link(ct2.Telegram, "contact.telegram", "t.me", "telegram.me"),
            WhatsApp = Link(ct2.WhatsApp, "contact.whatsApp", "wa.me", "whatsapp.com"),
            ResponseTime = O(ct2.ResponseTime, 40, "contact.responseTime", "زمان پاسخ"),
            EnamadId = ct2.EnamadId is { Length: > 0 } eid && Digits().IsMatch(eid) && eid.Length <= 12 ? eid : null,
            EnamadCode = ct2.EnamadCode is { Length: > 0 } ec && AlphaNum().IsMatch(ec) && ec.Length <= 40 ? ec : null,
        };

        // ---- رنگ
        var th = r.Theme ?? new();
        c.Theme = new ThemeSettings
        {
            Primary = Color(th.Primary, "theme.primary", "#0B5FB0"),
            Accent = Color(th.Accent, "theme.accent", "#FFB400"),
            Dark = Color(th.Dark, "theme.dark", "#181818"),
        };

        // ---- صفحهٔ اصلی
        var h = r.Home ?? new();
        c.Home = new HomeSettings
        {
            Sections = (h.Sections ?? []).Where(s => SiteDefaults.SectionKeys.Contains(s.Key)).DistinctBy(s => s.Key)
                .Select(s => new SectionToggle { Key = s.Key, Enabled = s.Enabled }).ToList(),
            Hero = new HeroSettings
            {
                Eyebrow = T(h.Hero?.Eyebrow, 60, "home.hero.eyebrow", "برچسب هیرو"),
                Body = T(h.Hero?.Body, 300, "home.hero.body", "متن هیرو"),
                PrimaryCta = T(h.Hero?.PrimaryCta, 30, "home.hero.primaryCta", "دکمهٔ اول", required: true),
                SecondaryCta = T(h.Hero?.SecondaryCta, 30, "home.hero.secondaryCta", "دکمهٔ دوم", required: true),
                ImageUrl = Img(h.Hero?.ImageUrl, "home.hero.imageUrl", required: true) ?? new HeroSettings().ImageUrl,
                MobileImageUrl = Img(h.Hero?.MobileImageUrl, "home.hero.mobileImageUrl") ?? Img(h.Hero?.ImageUrl, "home.hero.imageUrl") ?? new HeroSettings().MobileImageUrl,
            },
            Intro = new IntroSettings
            {
                Eyebrow = T(h.Intro?.Eyebrow, 60, "home.intro.eyebrow", "برچسب"),
                Title = T(h.Intro?.Title, 160, "home.intro.title", "تیتر"),
                Cards = Cards(h.Intro?.Cards, "home.intro.cards", 8, image: true, text: false),
            },
            Why = new WhySettings
            {
                Title = T(h.Why?.Title, 120, "home.why.title", "تیتر"),
                Text = T(h.Why?.Text, 400, "home.why.text", "متن"),
                ImageUrl = Img(h.Why?.ImageUrl, "home.why.imageUrl") ?? "",
                ImageCta = T(h.Why?.ImageCta, 60, "home.why.imageCta", "متن روی عکس"),
                Points = Cards(h.Why?.Points, "home.why.points", 6, image: false, text: true),
                FoundedYear = h.Why?.FoundedYear is >= 1300 and <= 1500 ? h.Why.FoundedYear : null,
                Members = h.Why?.Members is > 0 and < 10_000_000 ? h.Why.Members : null,
            },
            Video = new VideoSettings
            {
                Title = T(h.Video?.Title, 80, "home.video.title", "شعار ویدیو"),
                VideoUrl = h.Video?.VideoUrl is { Length: > 0 } v ? (ValidVideo(v) ? v : Err(e, "home.video.videoUrl", "ویدیو فقط از پوشهٔ ویدیوی سایت یا آپلود.")) : null,
                PosterUrl = Img(h.Video?.PosterUrl, "home.video.posterUrl") ?? "",
                MobilePosterUrl = Img(h.Video?.MobilePosterUrl, "home.video.mobilePosterUrl"),
                Mode = h.Video?.Mode == "loop" ? "loop" : "scrub",
            },
            Offer = new OfferSettings
            {
                Eyebrow = T(h.Offer?.Eyebrow, 60, "home.offer.eyebrow", "برچسب"),
                Title = T(h.Offer?.Title, 120, "home.offer.title", "تیتر"),
                Items = Cards(h.Offer?.Items, "home.offer.items", 12, image: false, text: true),
            },
            Branches = S(h.Branches, "home.branches"),
            Pricing = S(h.Pricing, "home.pricing"),
            Shop = S(h.Shop, "home.shop"),
            Events = new EventsSettings
            {
                Eyebrow = T(h.Events?.Eyebrow, 60, "home.events.eyebrow", "برچسب"),
                Title = T(h.Events?.Title, 120, "home.events.title", "تیتر"),
                Text = T(h.Events?.Text, 400, "home.events.text", "متن"),
                ImageUrl = Img(h.Events?.ImageUrl, "home.events.imageUrl") ?? "",
                SecondImageUrl = Img(h.Events?.SecondImageUrl, "home.events.secondImageUrl") ?? "",
            },
            Gallery = new GallerySettings
            {
                Title = T(h.Gallery?.Title, 120, "home.gallery.title", "تیتر"),
                Images = Cards(h.Gallery?.Images, "home.gallery.images", 24, image: true, text: false).Where(x => x.ImageUrl is not null).ToList(),
            },
            Coaches = S(h.Coaches, "home.coaches"),
            Faq = S(h.Faq, "home.faq"),
            Contact = S(h.Contact, "home.contact"),
            FooterNote = T(h.FooterNote, 120, "home.footerNote", "متن فوتر"),
        };

        // ---- صفحه‌های قانونی
        var l = r.Legal ?? new();
        c.Legal = new LegalSettings
        {
            About = T(l.About, 6000, "legal.about", "درباره ما"),
            Terms = T(l.Terms, 12000, "legal.terms", "قوانین"),
            Privacy = T(l.Privacy, 12000, "legal.privacy", "حریم خصوصی"),
            Refund = T(l.Refund, 6000, "legal.refund", "بازگشت وجه"),
        };

        // ---- ماژول‌ها
        c.Modules = r.Modules ?? new();

        if (e.Count > 0) return Result<SiteConfig>.Fail(e);
        // بهینه بودن ویدیو را سرور از روی فایل {id}.ready تعیین می‌کند، نه فرم
        c.Home.Video.Optimized = c.Home.Video.VideoUrl is { } vu && (videos?.IsOptimized(vu) ?? VideoPath().IsMatch(vu));
        await SaveRawAsync(c, staffId, ct);
        db.AuditLogs.Add(new AuditLog { Action = "site.updated", EntityType = "Site", EntityId = "1", UserId = staffId });
        await db.SaveChangesAsync(ct);
        return Result<SiteConfig>.Ok(await GetAsync(ct));
    }

    private bool ValidVideo(string v) => videos?.IsValidUrl(v) ?? VideoPath().IsMatch(v);

    private static string? Err(Dictionary<string, string[]> e, string key, string msg) { e[key] = [msg]; return null; }

    public static readonly string[] Icons = ["dumbbell", "scale", "salad", "calendar", "user", "users", "mountain", "bag", "heart", "trophy", "clock", "shield", "flame", "bike", "waves"];

    /// <summary>عکس فقط از پوشه‌های خود سایت یا آپلودهای بررسی‌شده</summary>
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
