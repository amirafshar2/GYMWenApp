using KhashayarGym.Business.Services;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace KhashayarGym.Tests;

/// <summary>آمادگی برای حجم بالای داده: فهرست‌های بزرگ در کوئری و پاک‌سازی داده‌های موقت.</summary>
public class ScaleTests(GymApiFactory factory) : IClassFixture<GymApiFactory>
{
    [Fact]
    public async Task Large_id_lists_are_sent_as_one_json_parameter_not_thousands()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
        var ids = Enumerable.Range(1, 5000).ToList(); // SQL Server بیش از ۲۱۰۰ پارامتر نمی‌پذیرد

        var sql = db.Users.Where(u => ids.Contains(u.Id)).ToQueryString();
        var count = await db.Users.CountAsync(u => ids.Contains(u.Id));

        Assert.Contains("json_each", sql);
        Assert.DoesNotContain("@ids2", sql);
        Assert.True(count >= 0);
    }

    [Fact]
    public async Task Maintenance_removes_only_old_temporary_rows()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
        var now = DateTime.UtcNow;
        var user = new AppUser { UserName = "09359990001", PhoneNumber = "09359990001" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        db.OtpCodes.AddRange(
            new OtpCode { PhoneNumber = "09359990001", Purpose = OtpPurpose.Login, CodeHash = "old", ExpiresAtUtc = now.AddDays(-5), CreatedAtUtc = now.AddDays(-5) },
            new OtpCode { PhoneNumber = "09359990001", Purpose = OtpPurpose.Login, CodeHash = "new", ExpiresAtUtc = now.AddMinutes(2), CreatedAtUtc = now });
        db.RefreshTokens.AddRange(
            new RefreshToken { UserId = user.Id, TokenHash = "expired-" + Guid.NewGuid(), ExpiresAtUtc = now.AddDays(-3) },
            new RefreshToken { UserId = user.Id, TokenHash = "valid-" + Guid.NewGuid(), ExpiresAtUtc = now.AddDays(20), RevokedAtUtc = now.AddDays(-2) });
        db.IntegrationEvents.AddRange(
            new IntegrationEvent { Type = "t", Payload = "{}", ProcessedAtUtc = now.AddDays(-40) },
            new IntegrationEvent { Type = "t", Payload = "{}", ProcessedAtUtc = null, CreatedAtUtc = now.AddDays(-40) });
        await db.SaveChangesAsync();

        var r = await scope.ServiceProvider.GetRequiredService<IMaintenanceService>().CleanupAsync(CancellationToken.None);

        Assert.True(r.OtpCodes >= 1 && r.RefreshTokens >= 1 && r.IntegrationEvents >= 1);
        Assert.True(await db.OtpCodes.AnyAsync(o => o.CodeHash == "new"));
        Assert.False(await db.OtpCodes.AnyAsync(o => o.CodeHash == "old"));
        // توکن باطل‌شده‌ای که هنوز منقضی نشده می‌ماند تا استفادهٔ دوباره‌اش تشخیص داده شود
        Assert.True(await db.RefreshTokens.AnyAsync(t => t.TokenHash.StartsWith("valid-") && t.UserId == user.Id));
        Assert.True(await db.IntegrationEvents.AnyAsync(e => e.ProcessedAtUtc == null)); // ارسال‌نشده هرگز پاک نمی‌شود
    }
}
