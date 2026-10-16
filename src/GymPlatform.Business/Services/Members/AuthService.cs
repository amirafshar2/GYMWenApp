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
    /// <summary>فقط نسخهٔ نمایشی: ورود بدون کد به یک حساب موجود (کنترلر شرط دمو و فهرست شماره‌ها را بررسی می‌کند).</summary>
    Task<Result<AuthSession>> LoginDemoAsync(string phoneNumber, RequestContext rc, CancellationToken ct);
    Task LogoutAsync(string? refreshToken, CancellationToken ct);
    Task<UserDto?> GetUserAsync(int userId, CancellationToken ct);
    Task<Result<UserDto>> UpdateProfileAsync(int userId, UpdateProfileRequest request, CancellationToken ct);
}

/// <summary>
/// ورود با موبایل + کد پیامکی. اولین ورود حساب می‌سازد (نقش Member).
/// توکن دسترسی کوتاه‌عمر (JWT) + توکن تازه‌سازی چرخشی که فقط هش آن ذخیره می‌شود؛
/// استفادهٔ دوباره از توکن باطل‌شده همهٔ نشست‌های کاربر را باطل می‌کند (تشخیص سرقت توکن).
/// </summary>
public sealed class AuthService(
    GymDbContext db, IOtpService otp, UserManager<AppUser> users, IAccessTokenFactory tokens,
    IClock clock, IOptions<AuthOptions> options) : IAuthService
{
    public async Task<Result<AuthSession>> LoginWithOtpAsync(VerifyOtpRequest request, RequestContext rc, CancellationToken ct)
    {
        var phone = PersianText.NormalizeMobile(request.PhoneNumber);
        if (!PersianText.IsValidMobile(phone))
            return Result<AuthSession>.Fail("phoneNumber", "شمارهٔ موبایل معتبر نیست.");

        var verified = await otp.VerifyAsync(phone, OtpPurpose.Login, request.Code, ct);
        if (!verified.Succeeded) return Result<AuthSession>.Fail(verified.Errors.ToDictionary(), verified.ErrorType);

        var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone, ct);
        if (user is null)
        {
            user = new AppUser { UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true, CreatedAtUtc = clock.UtcNow };
            var created = await users.CreateAsync(user);
            if (!created.Succeeded) return Result<AuthSession>.Fail("phoneNumber", "ساخت حساب ممکن نشد. دوباره امتحان کنید.");
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
        if (user is null) return Result<AuthSession>.Fail("phoneNumber", "این حساب نمایشی وجود ندارد.", ErrorType.NotFound);
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
            return Result<AuthSession>.Fail("session", "نشست منقضی شده است. دوباره وارد شوید.", ErrorType.Unauthorized);

        if (!stored.IsActive(now))
        {
            if (stored.RevokedAtUtc is not null && stored.ReplacedByHash is not null)
            {
                // پاسخ قبلی گم شده؟ جانشین را باطل و زنجیره را از همان‌جا ادامه بده
                var successor = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == stored.ReplacedByHash, ct);
                if (successor is not null && successor.IsActive(now) && successor.CreatedIp == rc.Ip &&
                    now - stored.RevokedAtUtc.Value <= TimeSpan.FromSeconds(options.Value.ReuseGraceSeconds))
                {
                    // جانشینِ گم‌شده بدون «جایگزین» باطل می‌شود تا استفادهٔ بعدی از آن فقط ۴۰۱ بگیرد؛ زمان چرخش اصلی حفظ می‌شود
                    var rotatedAt = stored.RevokedAtUtc;
                    successor.RevokedAtUtc = now;
                    var resumed = await IssueAsync(stored.User, rc, ct, rotateFrom: stored);
                    stored.RevokedAtUtc = rotatedAt;
                    await db.SaveChangesAsync(ct);
                    return Result<AuthSession>.Ok(resumed);
                }

                // توکن قبلاً چرخانده شده و دوباره استفاده شده → احتمال سرقت؛ همهٔ نشست‌های کاربر باطل می‌شوند
                await db.RefreshTokens.Where(t => t.UserId == stored.UserId && t.RevokedAtUtc == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, now), ct);
                db.AuditLogs.Add(new AuditLog { Action = "auth.refresh_reuse", EntityType = "User", EntityId = stored.UserId.ToString(), UserId = stored.UserId, Ip = rc.Ip });
                await db.SaveChangesAsync(ct);
            }
            return Result<AuthSession>.Fail("session", "نشست منقضی شده است. دوباره وارد شوید.", ErrorType.Unauthorized);
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
            return Result<UserDto>.Fail("fullName", "نام و نام خانوادگی باید بین ۳ تا ۱۰۰ حرف باشد.");
        Gender? g = request.Gender?.ToLowerInvariant() switch { "male" => Gender.Male, "female" => Gender.Female, _ => null };

        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null) return Result<UserDto>.Fail("user", "کاربر پیدا نشد.", ErrorType.NotFound);
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
