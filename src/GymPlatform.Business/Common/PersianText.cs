using System.Text;

namespace GymPlatform.Business.Common;

public static class PersianText
{
    /// <summary>ارقام فارسی و عربی را به لاتین تبدیل می‌کند و فاصله/خط تیره را حذف می‌کند.</summary>
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

    /// <summary>شمارهٔ موبایل ایران را به قالب 09xxxxxxxxx تبدیل می‌کند (پشتیبانی از +98 و 0098).</summary>
    public static string NormalizeMobile(string? input)
    {
        var s = NormalizeDigits(input);
        if (s.StartsWith("+98")) s = "0" + s[3..];
        else if (s.StartsWith("0098")) s = "0" + s[4..];
        else if (s.StartsWith("98") && s.Length == 12) s = "0" + s[2..];
        else if (s.StartsWith('9') && s.Length == 10) s = "0" + s;
        return s;
    }

    /// <summary>متن کاربر را مرتب می‌کند: ی/ک عربی → فارسی، حذف کاراکترهای کنترلی.</summary>
    public static string? CleanText(string? input)
    {
        if (input is null) return null;
        var s = new string(input.Where(c => !char.IsControl(c) || c == '\n').ToArray())
            .Replace('ي', 'ی').Replace('ك', 'ک').Trim();
        return s.Length == 0 ? null : s;
    }

    public static string ToLatinDigits(string? input) => NormalizeDigits(input);

    public static bool IsValidMobile(string normalized) =>
        normalized.Length == 11 && normalized.StartsWith("09") && normalized.All(char.IsAsciiDigit);

    /// <summary>ارقام لاتین را فارسی می‌کند (برای پیام‌های کاربر).</summary>
    public static string FaDigits(string input) =>
        new(input.Select(c => c is >= '0' and <= '9' ? (char)('۰' + (c - '0')) : c).ToArray());
}
