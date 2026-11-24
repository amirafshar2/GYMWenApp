using GymPlatform.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace GymPlatform.Domain.Entities;

/// <summary>Systembenutzer (ASP.NET Core Identity). Der Benutzername ist die normalisierte Handynummer.</summary>
public class AppUser : IdentityUser<int>
{
    public string? FullName { get; set; }
    public Gender? Gender { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAtUtc { get; set; }
    /// <summary>Für die Geburtstags-SMS (optional; das Mitglied trägt es selbst ein)</summary>
    public DateOnly? BirthDate { get; set; }
    /// <summary>Ausdrückliche Einwilligung in Werbe-SMS (Aktionen). Standard aus.</summary>
    public bool MarketingSmsOptIn { get; set; }

    public ICollection<Membership> Memberships { get; set; } = [];
}

public class AppRole : IdentityRole<int>
{
    public AppRole() { }
    public AppRole(string name) : base(name) { }
}

/// <summary>Rollennamen (die Panels aus Phase 4 nutzen diese).</summary>
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
