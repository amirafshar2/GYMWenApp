namespace GymPlatform.Business.Services.Site;

/// <summary>
/// همهٔ چیزهایی که مالک سایت از پنل عوض می‌کند. مقدارهای پیش‌فرض متن‌های عمومی و بی‌نام‌اند
/// (هیچ نام تجاری در کد نیست)؛ نام، لوگو و تماس در نصب خام خالی‌اند و دستیار راه‌اندازی آن‌ها را می‌پرسد.
/// در متن‌ها {name} و {city} و {branches} و {phone} موقع نمایش با مقدار واقعی جایگزین می‌شوند.
/// </summary>
public sealed class SiteConfig
{
    public BrandSettings Brand { get; set; } = new();
    public ContactSettings Contact { get; set; } = new();
    public ThemeSettings Theme { get; set; } = new();
    public HomeSettings Home { get; set; } = new();
    public LegalSettings Legal { get; set; } = new();
    public ModuleSettings Modules { get; set; } = new();
    public SetupSettings Setup { get; set; } = new();
}

public sealed class BrandSettings
{
    /// <summary>نام کامل، مثل «باشگاه‌های ورزشی …»</summary>
    public string Name { get; set; } = "";
    /// <summary>نام کوتاه کنار لوگو، مثل «…»</summary>
    public string ShortName { get; set; } = "";
    /// <summary>نام لاتین؛ کلمهٔ اولش متن بزرگ پشت هیرو است</summary>
    public string LatinName { get; set; } = "";
    /// <summary>شعار هیرو؛ با «؛» دو تکه می‌شود و تکهٔ دوم رنگی است</summary>
    public string Slogan { get; set; } = "ورزش کن؛ از همین امروز";
    public string NearSlogan { get; set; } = "هرکجا هستی، یک سالن نزدیکته";
    public string WhySlogan { get; set; } = "چرا ما؟";
    public string City { get; set; } = "";
    public string Description { get; set; } = "عضویت آنلاین، سالن‌های آقایان و بانوان، مربیان حرفه‌ای و فروشگاه ورزشی.";
    public string? LogoUrl { get; set; }
    public string? LogoFullUrl { get; set; }
}

public sealed class ContactSettings
{
    public string Phone { get; set; } = "";
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Instagram { get; set; }
    public string? Telegram { get; set; }
    public string? WhatsApp { get; set; }
    public string? ResponseTime { get; set; } = "معمولاً همان روز";
    public string? EnamadId { get; set; }
    public string? EnamadCode { get; set; }
}

public sealed class ThemeSettings
{
    /// <summary>رنگ اصلی (دکمه‌ها و تأکید)؛ رنگ hover و روشن خودکار ساخته می‌شود</summary>
    public string Primary { get; set; } = "#0B5FB0";
    /// <summary>رنگ دکمهٔ «شروع کن» و نشانه‌های زرد</summary>
    public string Accent { get; set; } = "#FFB400";
    /// <summary>رنگ فوتر و بخش‌های تیره</summary>
    public string Dark { get; set; } = "#181818";
}

public sealed class SectionToggle
{
    public string Key { get; set; } = "";
    public bool Enabled { get; set; } = true;
}

public sealed class CardItem
{
    public string Title { get; set; } = "";
    public string? Text { get; set; }
    public string? ImageUrl { get; set; }
    public string? Icon { get; set; }
    public string? Href { get; set; }
}

public sealed class HomeSettings
{
    /// <summary>ترتیب و روشن/خاموش بخش‌های صفحهٔ اصلی (هیرو همیشه اول است)</summary>
    public List<SectionToggle> Sections { get; set; } = SiteDefaults.Sections();

    public HeroSettings Hero { get; set; } = new();
    public IntroSettings Intro { get; set; } = new();
    public WhySettings Why { get; set; } = new();
    public VideoSettings Video { get; set; } = new();
    public OfferSettings Offer { get; set; } = new();
    public SimpleSection Branches { get; set; } = new() { Eyebrow = "{branches} شعبه در {city}", Title = "", Text = "موقعیتت را بده تا نزدیک‌ترین سالن را نشانت بدهیم." };
    public SimpleSection Pricing { get; set; } = new() { Eyebrow = "پکیج‌ها", Title = "عضویتی که با؛ برنامه‌ات جور است", Text = "قیمت‌ها به تومان است و تخفیف جشنوارهٔ فعال خودکار روی پکیج‌های مشمول اعمال شده." };
    public SimpleSection Shop { get; set; } = new() { Eyebrow = "فروشگاه {short}", Title = "لباس، شیکر و مکمل؛ تحویل همان روز در شعبه", Text = "پوشاک و لوازم با برند خودمان و مکمل‌های اصل. آنلاین سفارش بده، در باشگاه تحویل بگیر یا بفرست خانه." };
    public EventsSettings Events { get; set; } = new();
    public GallerySettings Gallery { get; set; } = new();
    public SimpleSection Coaches { get; set; } = new() { Eyebrow = "مربیان", Title = "کسانی که؛ کنارت تمرین می‌کنند", Text = "مربی آقایان برای سالن آقایان، مربی بانوان برای سالن بانوان؛ همه با مدرک فدراسیون." };
    public SimpleSection Faq { get; set; } = new() { Eyebrow = "سؤالات پرتکرار", Title = "سؤال‌های رایج", Text = "جواب سؤالت را این‌جا پیدا نکردی؟ تماس بگیر:" };
    public SimpleSection Contact { get; set; } = new() { Eyebrow = "مشاورهٔ رایگان", Title = "قبل از ثبت‌نام؛ با ما مشورت کن", Text = "بگو هدفت چیست و کدام محله‌ای؛ همکاران ما تماس می‌گیرند و پکیج و شعبهٔ مناسب را پیشنهاد می‌دهند. مشاوره رایگان است و تعهدی ندارد." };
    public string FooterNote { get; set; } = "سالن‌های جدای آقایان و بانوان";
}

public sealed class SimpleSection
{
    public string Eyebrow { get; set; } = "";
    public string Title { get; set; } = "";
    public string Text { get; set; } = "";
}

public sealed class HeroSettings
{
    public string Eyebrow { get; set; } = "{branches} شعبه در {city}";
    public string Body { get; set; } = "سالن‌های جدای آقایان و بانوان، از بدنسازی تا صخره‌نوردی. نزدیک‌ترین شعبه را پیدا کن و همین امروز شروع کن.";
    public string PrimaryCta { get; set; } = "نزدیک‌ترین شعبه به من";
    public string SecondaryCta { get; set; } = "دیدن پکیج‌ها";
    /// <summary>تصویر هیرو؛ با جلوهٔ ذرات نمایش داده می‌شود (بهتر است سوژه روی زمینهٔ روشن ساده باشد)</summary>
    public string ImageUrl { get; set; } = "/media/hero/dumbbell.webp";
    public string MobileImageUrl { get; set; } = "/media/hero/dumbbell-mobile.webp";
}

public sealed class IntroSettings
{
    public string Eyebrow { get; set; } = "چه می‌کنیم";
    public string Title { get; set; } = "هر رشته‌ای که انتخاب کنی، مربی، سالن و برنامه‌اش آماده است";
    public List<CardItem> Cards { get; set; } =
    [
        new() { Title = "بدنسازی", ImageUrl = "/media/gym/dumbbells-tall.webp" },
        new() { Title = "پاورلیفتینگ", ImageUrl = "/media/gym/lift-tall.webp" },
        new() { Title = "کراس‌فیت", ImageUrl = "/media/gym/rack-tall.webp" },
        new() { Title = "تمرین قدرتی", ImageUrl = "/media/gym/grip-tall.webp" },
    ];
}

public sealed class WhySettings
{
    public string Title { get; set; } = "مربی‌های کاربلد، سالن نزدیک خانه";
    public string Text { get; set; } = "با یک عضویت، سالن هم‌جنس در هر محلهٔ {city} در دسترس است؛ مربی، برنامهٔ تغذیه و فروشگاه هم زیر یک سقف.";
    public string ImageUrl { get; set; } = "/media/gym/lift-tall.webp";
    public string ImageCta { get; set; } = "پکیج و مربی‌ات را انتخاب کن";
    public List<CardItem> Points { get; set; } =
    [
        new() { Title = "تمرین شخصی", Text = "برنامهٔ اختصاصی با مربی، متناسب با هدف و بدن تو" },
        new() { Title = "تمرین گروهی", Text = "کلاس‌های کراس‌فیت، TRX، ایروبیک و پیلاتس" },
    ];
    /// <summary>سال تأسیس برای عدد «سال سابقه» (خالی = نمایش داده نشود)</summary>
    public int? FoundedYear { get; set; }
    /// <summary>عدد «شاگرد فعال» (خالی = نمایش داده نشود)</summary>
    public int? Members { get; set; }
}

public sealed class VideoSettings
{
    public string Title { get; set; } = "هر روز، یک تکرار بیشتر.";
    /// <summary>ویدیوی اسکرولی (فقط دسکتاپ سریع)؛ خالی = فقط عکس</summary>
    public string? VideoUrl { get; set; } = "/media/video/gym.mp4";
    public string PosterUrl { get; set; } = "/media/video/gym-poster.webp";
    public string? MobilePosterUrl { get; set; } = "/media/video/gym-poster-mobile.webp";
}

public sealed class OfferSettings
{
    public string Eyebrow { get; set; } = "آنچه ارائه می‌دهیم";
    public string Title { get; set; } = "مهم‌ترین چیز برای ما، نتیجهٔ توست!";
    public List<CardItem> Items { get; set; } =
    [
        new() { Icon = "dumbbell", Title = "تجهیزات مدرن", Text = "دستگاه‌های به‌روز و وزنهٔ آزاد کافی در همهٔ شعبه‌ها.", Href = "#branches" },
        new() { Icon = "scale", Title = "کنترل وزن", Text = "اندازه‌گیری دوره‌ای و برنامه برای کاهش یا افزایش وزن.", Href = "#packages" },
        new() { Icon = "salad", Title = "برنامهٔ تغذیه", Text = "رژیم متناسب با هدف تمرینی، کنار پکیج‌های ویژه.", Href = "#packages" },
        new() { Icon = "calendar", Title = "تمرین هر روز", Text = "ساعت‌های جدای آقایان و بانوان، صبح تا شب در هر شعبه.", Href = "#branches" },
        new() { Icon = "user", Title = "مربی خصوصی", Text = "جلسه‌های یک‌به‌یک با مربی مدرک‌دار فدراسیون.", Href = "#coaches" },
        new() { Icon = "users", Title = "کلاس‌های گروهی", Text = "کراس‌فیت، TRX، ایروبیک، پیلاتس و یوگا.", Href = "#packages" },
        new() { Icon = "mountain", Title = "صخره‌نوردی", Text = "دیوار سالنی و بولدرینگ در شعبه‌های منتخب.", Href = "#branches" },
        new() { Icon = "bag", Title = "فروشگاه و کافه", Text = "مکمل، لوازم ورزشی و نوشیدنی بعد از تمرین.", Href = "#consult" },
    ];
}

public sealed class EventsSettings
{
    public string Eyebrow { get; set; } = "فراتر از تمرین";
    public string Title { get; set; } = "در جشنواره‌های ما شرکت کن";
    public string Text { get; set; } = "چند بار در سال جشنوارهٔ تخفیف برگزار می‌کنیم؛ زمان باقی‌مانده را بالای صفحه می‌بینی.";
    public string ImageUrl { get; set; } = "/media/gym/grip-tall.webp";
    public string SecondImageUrl { get; set; } = "/media/gym/empty-tall.webp";
}

public sealed class GallerySettings
{
    public string Title { get; set; } = "داخل سالن‌های {short}";
    public List<CardItem> Images { get; set; } =
    [
        new() { Title = "سالن تجهیزات با نور سقفی", ImageUrl = "/media/gallery/hall-light.webp" },
        new() { Title = "ددلیفت در سالن آزاد", ImageUrl = "/media/gym/lift-tall.webp" },
        new() { Title = "گرفتن هالتر با دست گچ‌خورده", ImageUrl = "/media/gym/grip.webp" },
        new() { Title = "ورزشکار زیر نور سالن", ImageUrl = "/media/gallery/athlete-back.webp" },
        new() { Title = "ردیف دمبل‌ها", ImageUrl = "/media/gym/dumbbells-tall.webp" },
        new() { Title = "سالن بدنسازی با نورپردازی", ImageUrl = "/media/gallery/athlete-wide.webp" },
        new() { Title = "تمرین کنار رک دمبل", ImageUrl = "/media/gym/rack-tall.webp" },
        new() { Title = "نمای سالن و رک‌ها", ImageUrl = "/media/gym/rack.webp" },
        new() { Title = "تمرکز قبل از تمرین", ImageUrl = "/media/gallery/athlete-close.webp" },
        new() { Title = "آماده برای تکرار بعدی", ImageUrl = "/media/gym/grip-tall.webp" },
        new() { Title = "تمرین قدرتی در سالن", ImageUrl = "/media/gym/lift.webp" },
        new() { Title = "دستگاه‌های سالن", ImageUrl = "/media/gym/empty-tall.webp" },
    ];
}

/// <summary>
/// صفحه‌های قانونی با یک قالب ساده: خطی که با «## » شروع شود تیتر است، با «- » بند فهرست،
/// و [[…]] جایی است که مالک باید تکمیل کند (زرد نشان داده می‌شود).
/// </summary>
public sealed class LegalSettings
{
    public string About { get; set; } = SiteDefaults.About;
    public string Terms { get; set; } = SiteDefaults.Terms;
    public string Privacy { get; set; } = SiteDefaults.Privacy;
    public string Refund { get; set; } = SiteDefaults.Refund;
}

public sealed class ModuleSettings
{
    public bool Shop { get; set; } = true;
    public bool Canteen { get; set; } = true;
    public bool Wallet { get; set; } = true;
    public bool Festival { get; set; } = true;
    public bool Coaches { get; set; } = true;
    public bool Consultation { get; set; } = true;
    /// <summary>نقشهٔ شماتیک شهر در بخش شعبه‌ها (از روی موقعیت شعبه‌ها، با سه شعبه یا بیشتر)؛ خاموش = فهرست ساده</summary>
    public bool CityMap { get; set; } = true;
}

public sealed class SetupSettings
{
    /// <summary>Blank | Demo | Content — نحوهٔ نصب اولیه</summary>
    public string Mode { get; set; } = "Blank";
    /// <summary>تا وقتی مالک «انتشار» نزده، صفحهٔ عمومی «در حال راه‌اندازی» است (فقط در نصب خام)</summary>
    public bool Published { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    /// <summary>مرحله‌هایی از دستیار که مالک دستی «انجام شد» زده (برای مرحله‌هایی که از داده معلوم نمی‌شوند)</summary>
    public List<string> DoneSteps { get; set; } = [];
    public bool GuideHidden { get; set; }
}

public static class SiteDefaults
{
    public static readonly string[] SectionKeys = ["intro", "why", "video", "offer", "branches", "pricing", "shop", "events", "gallery", "coaches", "faq", "contact"];
    public static List<SectionToggle> Sections() => SectionKeys.Select(k => new SectionToggle { Key = k, Enabled = true }).ToList();

    public const string About = """
{name} با {branches} شعبه در {city}، سالن‌های جدای آقایان و بانوان و رشته‌های بدنسازی، کراس‌فیت، فانکشنال، TRX، ایروبیک، پیلاتس و یوگا را زیر نظر مربیان دارای مدرک فدراسیون ارائه می‌دهد.
## اطلاعات کسب‌وکار
- نام صاحب امتیاز / شرکت: [[نام کامل یا نام شرکت]]
- شمارهٔ مجوز فعالیت: [[شمارهٔ پروانه / مجوز اداره ورزش و جوانان]]
- نشانی دفتر مرکزی: [[نشانی کامل + کد پستی]]
- موبایل پشتیبانی: {phone}
- ساعات پاسخگویی: [[شنبه تا پنجشنبه ۹ تا ۲۱]]
نشانی و ساعت کاری همهٔ شعبه‌ها در صفحهٔ شعبه‌ها آمده است.
""";

    public const string Terms = """
استفاده از این سایت و خرید عضویت به معنی پذیرش این قوانین است. متن کامل تعهدات طرفین در «قرارداد عضویت» است که پیش از پرداخت خوانده و با کد پیامکی امضا می‌شود؛ نسخهٔ PDF آن در پروفایل هر عضو می‌ماند.
## حساب کاربری
- ورود فقط با شمارهٔ موبایل خود شخص و کد پیامکی انجام می‌شود. کد را در اختیار کسی نگذارید.
- نام ثبت‌شده باید مطابق کارت ملی باشد؛ عضویت شخصی و غیرقابل انتقال است.
## عضویت و قیمت‌ها
- همهٔ قیمت‌ها به تومان و [[شامل / بدون]] مالیات بر ارزش افزوده است.
- اعتبار عضویت از لحظهٔ پرداخت موفق شروع می‌شود؛ در تمدید، از پایان عضویت فعلی ادامه پیدا می‌کند.
- عضویت فقط در شعبه و سالن انتخاب‌شده معتبر است، مگر خلاف آن اعلام شود.
- در پکیج‌های جلسه‌ای، اولین ورود هر روز یک جلسه محسوب می‌شود.
## رفتار در باشگاه
- رعایت مقررات سالن، پوشش مناسب، نوبت دستگاه‌ها و بهداشت فردی الزامی است.
- باشگاه مسئول وسایل شخصی خارج از کمدهای قفل‌دار نیست.
- پاسخ‌های فرم سلامت مسئولیت عضو است؛ در صورت بیماری، تمرین پس از مشورت با پزشک انجام شود.
## رسیدگی به شکایات
شکایت‌ها از طریق تلفن {phone} یا فرم تماس ثبت و حداکثر ظرف [[۴۸ ساعت کاری]] پاسخ داده می‌شود.
""";

    public const string Privacy = """
## چه اطلاعاتی نگه می‌داریم
- شمارهٔ موبایل، نام و جنسیت (برای حساب، فاکتور و تخصیص سالن).
- پاسخ‌های فرم سلامت و متن قرارداد امضاشده همراه با زمان، IP و مرورگر امضا.
- سوابق پرداخت (مبلغ، شمارهٔ پیگیری و کد تراکنش). اطلاعات کارت بانکی هرگز به سایت نمی‌رسد.
- زمان ورود به باشگاه (برای حضور و غیاب و شمارش جلسات).
## موقعیت مکانی
دکمهٔ «نزدیک‌ترین شعبه» موقعیت شما را فقط در مرورگر خودتان استفاده می‌کند و به سرور ارسال یا ذخیره نمی‌شود.
## استفاده و نگهداری
- اطلاعات فقط برای ارائهٔ خدمات باشگاه، پیامک‌های عضویت و الزامات قانونی استفاده می‌شود و به هیچ شخص ثالثی فروخته نمی‌شود.
- دسترسی کارکنان به اطلاعات بر اساس نقش محدود است.
- پیامک تبلیغاتی فقط با رضایت شما ارسال می‌شود و با [[ارسال «لغو» / عدد ۱۱]] قطع می‌شود.
- برای حذف حساب یا اصلاح اطلاعات با پشتیبانی تماس بگیرید.
""";

    public const string Refund = """
- تا [[۷۲ ساعت]] پس از پرداخت و پیش از اولین ورود به باشگاه: بازگشت کامل مبلغ [[با کسر … درصد]].
- پس از اولین ورود: [[مبلغ قابل بازگشت نیست / به نسبت روزهای باقی‌مانده برمی‌گردد]].
- تعلیق (فریز) عضویت: حداکثر [[… روز]] در طول دورهٔ عضویت، با درخواست به پذیرش.
- بازگشت وجه حداکثر ظرف [[۷ روز کاری]] به همان کارتی که پرداخت با آن انجام شده واریز می‌شود.
- اگر پرداخت ناموفق بود ولی مبلغ از حساب کم شد، بانک طبق قوانین شاپرک حداکثر تا ۷۲ ساعت آن را برمی‌گرداند.
- محصولات فروشگاه: [[تا … روز در صورت باز نشدن بسته‌بندی قابل مرجوع است]]. مکمل‌های باز شده مرجوع نمی‌شوند.
برای درخواست لغو با {phone} تماس بگیرید یا به پذیرش شعبه مراجعه کنید.
""";

    /// <summary>برند ساختگی نسخهٔ نمایشی</summary>
    public static SiteConfig Demo()
    {
        var c = new SiteConfig();
        c.Brand = new BrandSettings
        {
            Name = "باشگاه‌های آهن‌کوه", ShortName = "آهن‌کوه", LatinName = "AHANKOOH ATHLETIC",
            Slogan = "تمرین کن؛ هر روز یک وزنه سنگین‌تر", NearSlogan = "هرجای شهر باشی، یک سالن نزدیکته", WhySlogan = "چرا آهن‌کوه؟",
            City = "شهر شما", LogoUrl = "/brand/demo-logo.svg", LogoFullUrl = "/brand/demo-logo.svg",
        };
        c.Contact = new ContactSettings { Phone = "09000000000", Instagram = null };
        c.Home.Why.FoundedYear = 1395;
        c.Home.Why.Members = 8500;
        c.Setup = new SetupSettings { Mode = "Demo", Published = true };
        return c;
    }
}
