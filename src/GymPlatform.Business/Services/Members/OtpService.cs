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
    /// <summary>Prüft den Code und verbraucht ihn, wenn er stimmt (jeder Code nur einmal).</summary>
    Task<Result<bool>> VerifyAsync(string phoneNumber, OtpPurpose purpose, string code, CancellationToken ct);
}

/// <summary>
/// Einmalcode: kryptografisch zufällig, nur HMAC gespeichert, 2 Minuten gültig, höchstens 5 Versuche,
/// 60 Sekunden Abstand zwischen Sendungen und höchstens 5 Sendungen pro Stunde und Nummer.
/// </summary>
public sealed class OtpService(
    GymDbContext db, ISmsSender sms, IClock clock, IOptions<OtpOptions> options, ILogger<OtpService> logger) : IOtpService
{
    private readonly OtpOptions _o = options.Value;

    public async Task<Result<OtpSentDto>> SendAsync(string phoneNumber, OtpPurpose purpose, RequestContext rc, CancellationToken ct)
    {
        var phone = PersianText.NormalizeMobile(phoneNumber);
        if (!PersianText.IsValidMobile(phone))
            return Result<OtpSentDto>.Fail("phoneNumber", "Bitte die Handynummer im Format 01512 3456789 eingeben.");

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
                return Result<OtpSentDto>.Fail("phoneNumber", $"Zum erneuten Senden des Codes {PersianText.FaDigits(wait.ToString())} Sekunden warten.", ErrorType.TooManyRequests);
        }
        if (recent.Count >= _o.MaxPerHour)
            return Result<OtpSentDto>.Fail("phoneNumber", "Zu viele Code-Anfragen für diese Nummer. Bitte in einer Stunde erneut versuchen.", ErrorType.TooManyRequests);

        // Frühere Codes für denselben Zweck werden widerrufen, damit nur der letzte gilt
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

        await sms.SendOtpAsync(phone, code, purpose == OtpPurpose.Login ? "Anmeldung" : "Vertragsunterschrift", ct);
        logger.LogInformation("OTP issued for {Phone} ({Purpose})", Mask(phone), purpose);

        return Result<OtpSentDto>.Ok(new OtpSentDto(_o.LifetimeSeconds, _o.ResendCooldownSeconds, _o.ExposeCodeInResponse ? code : null));
    }

    public async Task<Result<bool>> VerifyAsync(string phoneNumber, OtpPurpose purpose, string code, CancellationToken ct)
    {
        var phone = PersianText.NormalizeMobile(phoneNumber);
        var digits = PersianText.ToLatinDigits(code ?? "").Trim();
        var now = clock.UtcNow;
        const string invalid = "Der eingegebene Code ist falsch oder abgelaufen.";

        var otp = await db.OtpCodes
            .Where(o => o.PhoneNumber == phone && o.Purpose == purpose && o.ConsumedAtUtc == null)
            .OrderByDescending(o => o.CreatedAtUtc)
            .FirstOrDefaultAsync(ct);

        if (otp is null || otp.ExpiresAtUtc <= now)
            return Result<bool>.Fail("code", invalid);
        if (otp.Attempts >= _o.MaxAttempts)
            return Result<bool>.Fail("code", "Keine Versuche mehr. Bitte einen neuen Code anfordern.", ErrorType.TooManyRequests);

        // Versuche per bedingtem, atomarem Update zählen: gleichzeitige Anfragen können nicht öfter als MaxAttempts raten
        var id = otp.Id;
        var claimed = await db.OtpCodes.Where(o => o.Id == id && o.Attempts < _o.MaxAttempts && o.ConsumedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Attempts, o => o.Attempts + 1), ct);
        if (claimed == 0)
            return Result<bool>.Fail("code", "Keine Versuche mehr. Bitte einen neuen Code anfordern.", ErrorType.TooManyRequests);

        var ok = digits.Length == _o.CodeLength &&
                 CryptographicOperations.FixedTimeEquals(
                     Encoding.ASCII.GetBytes(otp.CodeHash), Encoding.ASCII.GetBytes(Hash(phone, purpose, digits)));
        // Jeder Code wird nur einmal verbraucht (auch wenn zwei gleichzeitige Anfragen den richtigen Code senden)
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
