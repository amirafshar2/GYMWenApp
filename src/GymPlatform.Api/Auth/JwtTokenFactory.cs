using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GymPlatform.Business.Common;
using GymPlatform.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace GymPlatform.Api.Auth;

public sealed class JwtOptions
{
    public const string Section = "Jwt";
    public string Issuer { get; set; } = "khashayar-gym";
    public string Audience { get; set; } = "khashayar-gym-web";
    /// <summary>حداقل ۳۲ بایت؛ فقط از User Secrets / متغیر محیطی Jwt__SigningKey.</summary>
    public string SigningKey { get; set; } = "";
    /// <summary>عمر کوتاه توکن دسترسی.</summary>
    public int AccessTokenMinutes { get; set; } = 15;

    public SymmetricSecurityKey Key() => new(Encoding.UTF8.GetBytes(SigningKey));
}

public sealed class JwtTokenFactory(IOptions<JwtOptions> options, IClock clock) : IAccessTokenFactory
{
    public (string Token, DateTime ExpiresAtUtc) Create(AppUser user, IEnumerable<string> roles)
    {
        var o = options.Value;
        var exp = clock.UtcNow.AddMinutes(o.AccessTokenMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new("phone", user.PhoneNumber ?? ""),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        var token = new JwtSecurityToken(o.Issuer, o.Audience, claims, clock.UtcNow, exp,
            new SigningCredentials(o.Key(), SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(token), exp);
    }
}

public static class ClaimsExtensions
{
    public static int UserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
}
