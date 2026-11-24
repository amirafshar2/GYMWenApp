namespace GymPlatform.Business.Common;

/// <summary>Datum für PDF und Nachrichten (deutsches Format, Berliner Zeit). Der Klassenname stammt aus der ursprünglichen Version.</summary>
public static class Jalali
{
    private static readonly TimeZoneInfo Berlin = FindBerlin();

    private static TimeZoneInfo FindBerlin()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Europe/Berlin"); }
        catch { try { return TimeZoneInfo.FindSystemTimeZoneById("W. Europe Standard Time"); } catch { return TimeZoneInfo.Utc; } }
    }

    /// <summary>Beginn desselben Tages (Mitternacht Berlin) in UTC</summary>
    public static DateTime TehranDayStartUtc(DateTime utc) =>
        TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(ToTehran(utc).Date, DateTimeKind.Unspecified), Berlin);

    /// <summary>UTC → Berliner Ortszeit (Name aus der ursprünglichen Version)</summary>
    public static DateTime ToTehran(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Berlin);

    public static string Date(DateTime utc) => ToTehran(utc).ToString("dd.MM.yyyy");

    public static string DateTimeText(DateTime utc) => Date(utc) + ", " + ToTehran(utc).ToString("HH:mm") + " Uhr";

    public static int Year(DateTime utc) => ToTehran(utc).Year;
}
