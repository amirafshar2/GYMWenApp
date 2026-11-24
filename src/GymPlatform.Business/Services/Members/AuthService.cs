using System.Security.Cryptography;
using System.Text;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GymPlatform.Business.Services.Members;

public interface IAuthService
{
    Task<Result<AuthSession>> LoginWithOtpAsync(VerifyOtpRequest request, RequestContext rc, CancellationToken ct);
    Task<Result<AuthSession>> RefreshAsync(string refreshToken, RequestContext rc, CancellationToken ct);
    /// <summary>Nur Demo-Version: Login ohne Code in ein bestehendes Konto (der Controller prüft Demo-Bedingung und Nummernliste).</summary>
    Task<Result<AuthSession>> LoginDemoAsync(string phoneNumber, RequestContext rc, CancellationToken ct);
    Task LogoutAsync(string? refreshToken, CancellationToken ct);
    Task<UserDto?> GetUserAsync(int userId, CancellationToken ct);
    Task<Result<UserDto>> UpdateProfileAsync(int userId, UpdateProfileRequest request, CancellationToken ct);
}

/// <summary>
/// Login mit Handynummer + SMS-Code. Der erste Login legt ein Konto an (Rolle Member).
/// Kurzlebiges Zugriffstoken (JWT) + rotierendes Refresh-Token, von dem nur der Hash gespeichert wird;
/// die Wiederverwendung eines widerrufenen Tokens beendet alle Sitzungen des Benutzers (Erkennung von Token-Diebstahl).
/// </summary>
public sealed class AuthService(
    GymDbContext db, IOtpService otp, UserManager<AppUser> users, IAccessTokenFactory tokens,
    IClock clock, IOptions<AuthOptions> options) : IAuthService
{
    public async Task<Result<AuthSession>> LoginWithOtpAsync(VerifyOtpRequest request, RequestContext rc, CancellationToken ct)
    {
        var phone = PersianText.NormalizeMobile(request.PhoneNumber);
        if (!PersianText.IsValidMobile(phone))
            return Result<AuthSession>.Fail("phoneNumber", "Ungültige Handynummer.");

        var verified = await otp.VerifyAsync(phone, OtpPurpose.Login, request.Code, ct);
        if (!verified.Succeeded) return Result<AuthSession>.Fail(verified.Errors.ToDictionary(), verified.ErrorType);

        var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone, ct);
        if (user is null)
        {
            user = new AppUser { UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true, CreatedAtUtc = clock.UtcNow };
            var created = await users.CreateAsync(user);
            if (!created.Succeeded) return Result<AuthSession>.Fail("phoneNumber", "Konto konnte nicht angelegt werden. Bitte erneut versuchen.");
            await users.AddToRoleAsync(user, Roles.Member);
            db.AuditLogs.Add(new AuditLog { Action = "user.created", EntityType = "User", EntityId = user.Id.ToString(), UserId = user.Id, Ip = rc.Ip });
        }
        user.LastLoginAtUtc = clock.UtcNow;
        await users.UpdateAsync(user);

        return Result<AuthSession>.Ok(await IssueAsync(user, rc, ct));
    }

    public async Task<Result<AuthSession>> LoginDemoAsync(string phoneNumber, RequestContext rc, CancellationToken ct)
    {
        var phone = PersianText.NormalizeMobile(phoneNumber);
        var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone, ct);
        if (user is null) return Result<AuthSession>.Fail("phoneNumber", "Dieses Demo-Konto existiert nicht.", ErrorType.NotFound);
        user.LastLoginAtUtc = clock.UtcNow;
        await users.UpdateAsync(user);
        db.AuditLogs.Add(new AuditLog { Action = "auth.demo_login", EntityType = "User", EntityId = user.Id.ToString(), UserId = user.Id, Ip = rc.Ip });
        return Result<AuthSession>.Ok(await IssueAsync(user, rc, ct));
    }

    public async Task<Result<AuthSession>> RefreshAsync(string refreshToken, RequestContext rc, CancellationToken ct)
    {
        var hash = HashToken(refreshToken);
        var now = clock.UtcNow;
        var stored = await db.RefreshTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored?.User is null)
            return Result<AuthSession>.Fail("session", "Sitzung abgelaufen. Bitte erneut anmelden.", ErrorType.Unauthorized);

        if (!stored.IsActive(now))
        {
            if (stored.RevokedAtUtc is not null && stored.ReplacedByHash is not null)
            {
                // Vorherige Antwort verloren? Nachfolger widerrufen und die Kette von dort fortsetzen
                var successor = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == stored.ReplacedByHash, ct);
                if (successor is not null && successor.IsActive(now) && successor.CreatedIp == rc.Ip &&
                    now - stored.RevokedAtUtc.Value <= TimeSpan.FromSeconds(options.Value.ReuseGraceSeconds))
                {
                    // Der verlorene Nachfolger wird ohne „Ersatz“ widerrufen, damit die nächste Nutzung nur 401 bekommt; die ursprüngliche Rotationszeit bleibt
                    var rotatedAt = stored.RevokedAtUtc;
                    successor.RevokedAtUtc = now;
                    var resumed = await IssueAsync(stored.User, rc, ct, rotateFrom: stored);
                    stored.RevokedAtUtc = rotatedAt;
                    await db.SaveChangesAsync(ct);
                    return Result<AuthSession>.Ok(resumed);
                }

                // Token wurde bereits rotiert und erneut genutzt → möglicher Diebstahl; alle Sitzungen des Benutzers werden beendet
                await db.RefreshTokens.Where(t => t.UserId == stored.UserId && t.RevokedAtUtc == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, now), ct);
                db.AuditLogs.Add(new AuditLog { Action = "auth.refresh_reuse", EntityType = "User", EntityId = stored.UserId.ToString(), UserId = stored.UserId, Ip = rc.Ip });
                await db.SaveChangesAsync(ct);
            }
            return Result<AuthSession>.Fail("session", "Sitzung abgelaufen. Bitte erneut anmelden.", ErrorType.Unauthorized);
        }

        var session = await IssueAsync(stored.User, rc, ct, rotateFrom: stored);
        return Result<AuthSession>.Ok(session);
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(refreshToken)) return;
        var hash = HashToken(refreshToken);
        await db.RefreshTokens.Where(t => t.TokenHash == hash && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, clock.UtcNow), ct);
    }

    public async Task<UserDto?> GetUserAsync(int userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        return user is null ? null : ToDto(user, await users.GetRolesAsync(user));
    }

    public async Task<Result<UserDto>> UpdateProfileAsync(int userId, UpdateProfileRequest request, CancellationToken ct)
    {
        var name = PersianText.CleanText(request.FullName);
        if (name is null || name.Length is < 3 or > 100)
            return Result<UserDto>.Fail("fullName", "Vor- und Nachname müssen zwischen 3 und 100 Zeichen lang sein.");
        Gender? g = request.Gender?.ToLowerInvariant() switch { "male" => Gender.Male, "female" => Gender.Female, _ => null };

        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null) return Result<UserDto>.Fail("user", "Benutzer nicht gefunden.", ErrorType.NotFound);
        user.FullName = name;
        if (g is not null) user.Gender = g;
        await users.UpdateAsync(user);
        return Result<UserDto>.Ok(ToDto(user, await users.GetRolesAsync(user)));
    }

    private async Task<AuthSession> IssueAsync(AppUser user, RequestContext rc, CancellationToken ct, RefreshToken? rotateFrom = null)
    {
        var roles = await users.GetRolesAsync(user);
        var (access, accessExp) = tokens.Create(user, roles);

        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        var hash = HashToken(raw);
        var refreshExp = clock.UtcNow.AddDays(options.Value.RefreshTokenDays);
        db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = hash, ExpiresAtUtc = refreshExp, CreatedIp = rc.Ip, CreatedAtUtc = clock.UtcNow });
        if (rotateFrom is not null)
        {
            rotateFrom.RevokedAtUtc = clock.UtcNow;
            rotateFrom.ReplacedByHash = hash;
        }
        await db.SaveChangesAsync(ct);

        return new AuthSession(new AuthResultDto(access, accessExp, ToDto(user, roles)), raw, refreshExp);
    }

    internal static UserDto ToDto(AppUser u, IEnumerable<string> roles) =>
        new(u.Id, u.PhoneNumber ?? "", u.FullName, u.Gender?.ToString().ToLowerInvariant(), roles.ToList());

    private static string HashToken(string raw) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}
