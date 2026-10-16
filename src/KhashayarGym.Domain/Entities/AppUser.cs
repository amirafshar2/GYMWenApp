using KhashayarGym.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace KhashayarGym.Domain.Entities;

/// <summary>کاربر سیستم (ASP.NET Core Identity). نام کاربری همان شمارهٔ موبایل نرمال‌شده است.</summary>
public class AppUser : IdentityUser<int>
{
    public string? FullName { get; set; }
    public Gender? Gender { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAtUtc { get; set; }
    /// <summary>برای پیامک تبریک تولد (اختیاری؛ خود عضو وارد می‌کند)</summary>
    public DateOnly? BirthDate { get; set; }
    /// <summary>رضایت صریح برای پیامک تبلیغاتی (جشنواره). پیش‌فرض خاموش.</summary>
    public bool MarketingSmsOptIn { get; set; }

    public ICollection<Membership> Memberships { get; set; } = [];
}

public class AppRole : IdentityRole<int>
{
    public AppRole() { }
    public AppRole(string name) : base(name) { }
}

/// <summary>نام نقش‌ها (فاز ۴ پنل‌ها از این‌ها استفاده می‌کنند).</summary>
public static class Roles
{
    public const string SuperAdmin = nameof(SuperAdmin);
    public const string BranchManager = nameof(BranchManager);
    public const string Reception = nameof(Reception);
    public const string Coach = nameof(Coach);
    public const string CanteenStaff = nameof(CanteenStaff);
    public const string ShopStaff = nameof(ShopStaff);
    public const string Member = nameof(Member);

    public static readonly string[] All = [SuperAdmin, BranchManager, Reception, Coach, CanteenStaff, ShopStaff, Member];
}
