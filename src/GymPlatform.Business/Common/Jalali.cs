using System.Globalization;

namespace GymPlatform.Business.Common;

/// <summary>تاریخ شمسی برای PDF و پیام‌ها (به وقت تهران).</summary>
public static class Jalali
{
    private static readonly PersianCalendar Pc = new();
    private static readonly TimeZoneInfo Tehran = FindTehran();

    private static TimeZoneInfo FindTehran()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Tehran"); }
        catch { try { return TimeZoneInfo.FindSystemTimeZoneById("Iran Standard Time"); } catch { return TimeZoneInfo.Utc; } }
    }

    /// <summary>شروع همان روز (نیمه‌شب تهران) به UTC</summary>
    public static DateTime TehranDayStartUtc(DateTime utc) =>
        TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(ToTehran(utc).Date, DateTimeKind.Unspecified), Tehran);

    public static DateTime ToTehran(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Tehran);

    public static string Date(DateTime utc)
    {
        var t = ToTehran(utc);
        return PersianText.FaDigits($"{Pc.GetYear(t):0000}/{Pc.GetMonth(t):00}/{Pc.GetDayOfMonth(t):00}");
    }

    public static string DateTimeText(DateTime utc)
    {
        var t = ToTehran(utc);
        return Date(utc) + " ساعت " + PersianText.FaDigits(t.ToString("HH:mm"));
    }

    public static int Year(DateTime utc) => Pc.GetYear(ToTehran(utc));
}
