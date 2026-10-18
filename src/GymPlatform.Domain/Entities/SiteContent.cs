namespace GymPlatform.Domain.Entities;

/// <summary>
/// تنظیمات و محتوای قابل‌ویرایش سایت (هویت، رنگ، متن و عکس صفحه‌ها، ماژول‌ها، وضعیت راه‌اندازی).
/// فقط یک ردیف دارد؛ محتوا به‌صورت JSON نگه داشته می‌شود تا افزودن یک متن تازه مایگریشن نخواهد.
/// </summary>
public class SiteContent
{
    public int Id { get; set; }
    public string Json { get; set; } = "{}";
    public DateTime UpdatedAtUtc { get; set; }
    public int? UpdatedByUserId { get; set; }
}
