namespace GymPlatform.Business.Services.Site;

/// <summary>ویدیوهای سایت (پیش‌فرض قالب یا آپلود مدیر): آیا نسخه‌های بهینهٔ اسکرول برایش ساخته شده است؟</summary>
public interface IVideoLibrary
{
    /// <summary>آدرس مجاز ویدیو (پوشهٔ ویدیوی قالب یا آپلود)</summary>
    bool IsValidUrl(string url);
    /// <summary>نسخه‌های ‎-scrub/-720/-540 و عکس‌ها کامل ساخته شده‌اند</summary>
    bool IsOptimized(string url);
}
