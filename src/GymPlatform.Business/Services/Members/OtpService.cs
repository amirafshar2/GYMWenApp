using System.Security.Cryptography;
using System.Text;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymPlatform.Business.Services.Members;

public interface IOtpService
{
    Task<Result<OtpSentDto>> SendAsync(string phoneNumber, OtpPurpose purpose, RequestContext rc, CancellationToken ct);
    /// <summary>کد را بررسی و در صورت درستی مصرف می‌کند (هر کد فقط یک بار).</summary>
    Task<Result<bool>> VerifyAsync(string phoneNumber, OtpPurpose purpose, string code, CancellationToken ct);
}

/// <summary>
/// کد یکبارمصرف: تصادفی رمزنگاری‌امن، ذخیرهٔ فقط HMAC، انقضای ۲ دقیقه، حداکثر ۵ تلاش،
/// فاصلهٔ ۶۰ ثانیه بین ارسال‌ها و سقف ۵ ارسال در ساعت برای هر شماره.
/// </summary>
public sealed class OtpService(
    GymDbContext db, ISmsSender sms, IClock clock, IOptions<OtpOptions> options, ILogger<OtpService> logger) : IOtpService
{
    private readonly OtpOptions _o = options.Value;

    public async Task<Result<OtpSentDto>> SendAsync(string phoneNumber, OtpPurpose purpose, RequestContext rc, CancellationToken ct)
    {
        var phone = PersianText.NormalizeMobile(phoneNumber);
        if (!PersianText.IsValidMobile(phone))
            return Result<OtpSentDto>.Fail("phoneNumber", "شمارهٔ موبایل را مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.");

        var now = clock.UtcNow;
        var recent = await db.OtpCodes.AsNoTracking()
            .Where(o => o.PhoneNumber == phone && o.Purpose == purpose && o.CreatedAtUtc > now.AddHours(-1))
            .OrderByDescending(o => o.CreatedAtUtc)
            .Select(o => o.CreatedAtUtc)
            .ToListAsync(ct);

        if (recent.Count > 0)
        {
            var wait = _o.ResendCooldownSeconds - (int)(now - recent[0]).TotalSeconds;
            if (wait > 0)
                return Result<OtpSentDto>.Fail("phoneNumber", $"برای ارسال دوبارهٔ کد {PersianText.FaDigits(wait.ToString())} ثانیه صبر کنید.", ErrorType.TooManyRequests);
        }
        if (recent.Count >= _o.MaxPerHour)
            return Result<OtpSentDto>.Fail("phoneNumber", "تعداد درخواست کد برای این شماره زیاد است. یک ساعت دیگر امتحان کنید.", ErrorType.TooManyRequests);

        // کدهای قبلی همین هدف باطل می‌شوند تا فقط آخرین کد معتبر باشد
        await db.OtpCodes
            .Where(o => o.PhoneNumber == phone && o.Purpose == purpose && o.ConsumedAtUtc == null && o.ExpiresAtUtc > now)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.ConsumedAtUtc, now), ct);

        var code = GenerateCode(_o.CodeLength);
        db.OtpCodes.Add(new OtpCode
        {
            PhoneNumber = phone, Purpose = purpose, CodeHash = Hash(phone, purpose, code),
            ExpiresAtUtc = now.AddSeconds(_o.LifetimeSeconds), RequestIp = rc.Ip, CreatedAtUtc = now
        });
        await db.SaveChangesAsync(ct);

        await sms.SendOtpAsync(phone, code, purpose == OtpPurpose.Login ? "ورود" : "امضای قرارداد", ct);
        logger.LogInformation("OTP issued for {Phone} ({Purpose})", Mask(phone), purpose);

        return Result<OtpSentDto>.Ok(new OtpSentDto(_o.LifetimeSeconds, _o.ResendCooldownSeconds, _o.ExposeCodeInResponse ? code : null));
    }

    public async Task<Result<bool>> VerifyAsync(string phoneNumber, OtpPurpose purpose, string code, CancellationToken ct)
    {
        var phone = PersianText.NormalizeMobile(phoneNumber);
        var digits = PersianText.ToLatinDigits(code ?? "").Trim();
        var now = clock.UtcNow;
        const string invalid = "کد واردشده درست نیست یا منقضی شده است.";

        var otp = await db.OtpCodes
            .Where(o => o.PhoneNumber == phone && o.Purpose == purpose && o.ConsumedAtUtc == null)
            .OrderByDescending(o => o.CreatedAtUtc)
            .FirstOrDefaultAsync(ct);

        if (otp is null || otp.ExpiresAtUtc <= now)
            return Result<bool>.Fail("code", invalid);
        if (otp.Attempts >= _o.MaxAttempts)
            return Result<bool>.Fail("code", "تعداد تلاش‌ها تمام شد. کد تازه بگیرید.", ErrorType.TooManyRequests);

        // شمارش تلاش با به‌روزرسانی شرطی و اتمی: درخواست‌های هم‌زمان نمی‌توانند بیش از MaxAttempts بار حدس بزنند
        var id = otp.Id;
        var claimed = await db.OtpCodes.Where(o => o.Id == id && o.Attempts < _o.MaxAttempts && o.ConsumedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Attempts, o => o.Attempts + 1), ct);
        if (claimed == 0)
            return Result<bool>.Fail("code", "تعداد تلاش‌ها تمام شد. کد تازه بگیرید.", ErrorType.TooManyRequests);

        var ok = digits.Length == _o.CodeLength &&
                 CryptographicOperations.FixedTimeEquals(
                     Encoding.ASCII.GetBytes(otp.CodeHash), Encoding.ASCII.GetBytes(Hash(phone, purpose, digits)));
        // هر کد فقط یک بار مصرف می‌شود (حتی اگر دو درخواست هم‌زمان کد درست را بفرستند)
        if (ok && await db.OtpCodes.Where(o => o.Id == id && o.ConsumedAtUtc == null)
                .ExecuteUpdateAsync(s => s.SetProperty(o => o.ConsumedAtUtc, now), ct) == 0)
            ok = false;

        return ok ? Result<bool>.Ok(true) : Result<bool>.Fail("code", invalid);
    }

    private string Hash(string phone, OtpPurpose purpose, string code)
    {
        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(_o.Pepper));
        return Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes($"{phone}|{(int)purpose}|{code}")));
    }

    private static string GenerateCode(int length)
    {
        var max = (int)Math.Pow(10, length);
        return RandomNumberGenerator.GetInt32(max / 10, max).ToString();
    }

    internal static string Mask(string phone) => phone.Length == 11 ? $"{phone[..4]}***{phone[^4..]}" : "***";
}
