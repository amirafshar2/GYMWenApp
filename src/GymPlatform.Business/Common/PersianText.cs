using System.Text;

namespace GymPlatform.Business.Common;

public static class PersianText
{
    /// <summary>Wandelt persische und arabische Ziffern in lateinische um und entfernt Leerzeichen/Bindestriche.</summary>
    public static string NormalizeDigits(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var sb = new StringBuilder(input.Length);
        foreach (var ch in input.Trim())
        {
            if (ch is >= '۰' and <= '۹') sb.Append((char)('0' + (ch - '۰')));
            else if (ch is >= '٠' and <= '٩') sb.Append((char)('0' + (ch - '٠')));
            else if (ch is ' ' or '-' or '‌') continue;
            else sb.Append(ch);
        }
        return sb.ToString();
    }

    /// <summary>Wandelt eine deutsche Handynummer ins Format 01xxxxxxxxx um (unterstützt +49, 0049 und 49).</summary>
    public static string NormalizeMobile(string? input)
    {
        var s = NormalizeDigits(input).Replace("/", "").Replace("(", "").Replace(")", "");
        if (s.StartsWith("+49")) s = "0" + s[3..];
        else if (s.StartsWith("0049")) s = "0" + s[4..];
        else if (s.StartsWith("49") && s.Length >= 12) s = "0" + s[2..];
        else if (s.StartsWith('1') && s.Length is 10 or 11) s = "0" + s;
        return s;
    }

    /// <summary>Bereinigt Benutzertext: arabisches Ya/Kaf → persisch, entfernt Steuerzeichen.</summary>
    public static string? CleanText(string? input)
    {
        if (input is null) return null;
        var s = new string(input.Where(c => !char.IsControl(c) || c == '\n').ToArray())
            .Replace('ي', 'ی').Replace('ك', 'ک').Trim();
        return s.Length == 0 ? null : s;
    }

    public static string ToLatinDigits(string? input) => NormalizeDigits(input);

    /// <summary>Deutsche Handynummer: 015x/016x/017x, insgesamt 11 oder 12 Ziffern.</summary>
    public static bool IsValidMobile(string normalized) =>
        normalized.Length is 11 or 12 && normalized.StartsWith("01") && normalized[2] is >= '5' and <= '7' && normalized.All(char.IsAsciiDigit);

    /// <summary>Lateinische Ziffern bleiben unverändert (früher: Umwandlung in persische Ziffern).</summary>
    public static string FaDigits(string input) => input;

    private static readonly System.Globalization.CultureInfo De = System.Globalization.CultureInfo.GetCultureInfo("de-DE");

    /// <summary>Betrag in Cent → „1.234,50 €“.</summary>
    public static string Euro(long cents) => (cents / 100m).ToString("N2", De) + " €";

    /// <summary>Ganze Zahl mit deutschem Tausendertrennzeichen.</summary>
    public static string Num(long n) => n.ToString("N0", De);
}
