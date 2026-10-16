using KhashayarGym.Business.Dtos;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using KhashayarGym.Business.Common;

namespace KhashayarGym.Business.Services.Members;

public interface IMemberService
{
    Task<ProfileDto?> GetProfileAsync(int userId, CancellationToken ct);
    Task<MembershipDto?> GetActiveMembershipAsync(int userId, CancellationToken ct);
}

public sealed class MemberService(GymDbContext db, UserManager<AppUser> users, IClock clock) : IMemberService
{
    public async Task<ProfileDto?> GetProfileAsync(int userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null) return null;
        var now = clock.UtcNow;

        var memberships = await db.Memberships.AsNoTracking()
            .Where(m => m.UserId == userId && m.Status != MembershipStatus.PendingPayment && m.Status != MembershipStatus.Cancelled)
            .Include(m => m.Branch).Include(m => m.Package)
            .OrderByDescending(m => m.StartsAtUtc)
            .AsSplitQuery()
            .ToListAsync(ct);

        var payments = await db.Payments.AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAtUtc)
            .Take(50)
            .Select(p => new PaymentRowDto(p.Id, p.Status.ToString().ToLower(), p.AmountToman, p.Membership!.Package!.Name, p.InvoiceNumber, p.CreatedAtUtc, p.PaidAtUtc))
            .ToListAsync(ct);

        var contracts = await db.SignedContracts.AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.SignedAtUtc)
            .Select(c => new SignedContractRowDto(c.Id, c.Version, c.Template!.Title, c.SignedAtUtc))
            .ToListAsync(ct);

        var activeVersion = await db.ContractTemplates.Where(t => t.IsActive).Select(t => (int?)t.Version).MaxAsync(ct);
        var dtos = memberships.Select(m => ToDto(m, now)).ToList();
        var active = dtos.Where(d => d.IsActive).OrderBy(d => d.EndsAtUtc).FirstOrDefault();

        return new ProfileDto(AuthService.ToDto(user, await users.GetRolesAsync(user)), active, dtos, payments, contracts,
            activeVersion is null || contracts.Any(c => c.Version == activeVersion));
    }

    public async Task<MembershipDto?> GetActiveMembershipAsync(int userId, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var m = await db.Memberships.AsNoTracking().Include(x => x.Branch).Include(x => x.Package)
            .Where(x => x.UserId == userId && x.Status == MembershipStatus.Active && x.StartsAtUtc <= now && x.EndsAtUtc > now)
            .OrderBy(x => x.EndsAtUtc).FirstOrDefaultAsync(ct);
        return m is null ? null : ToDto(m, now);
    }

    internal static MembershipDto ToDto(Membership m, DateTime now)
    {
        var expired = m.Status == MembershipStatus.Active && m.EndsAtUtc <= now;
        var status = expired ? "expired" : m.Status.ToString().ToLowerInvariant();
        int? daysLeft = m.EndsAtUtc is { } end && end > now ? (int)Math.Ceiling((end - now).TotalDays) : (m.EndsAtUtc is null ? null : 0);
        var total = m.StartsAtUtc is { } s && m.EndsAtUtc is { } e ? (int)Math.Round((e - s).TotalDays) : 0;
        return new MembershipDto(
            m.Id, status, m.Branch?.Name ?? "", m.Branch?.Slug ?? "", m.Package?.Name ?? "", m.Package?.Slug ?? "",
            m.Section == GenderSection.Women ? "women" : "men", m.StartsAtUtc, m.EndsAtUtc, daysLeft, total,
            m.SessionsTotal, m.SessionsUsed, m.IsActiveAt(now), m.CardToken);
    }
}
