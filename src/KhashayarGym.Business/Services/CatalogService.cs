using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.DataAccess.Repositories;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;

namespace KhashayarGym.Business.Services;

public interface ICatalogService
{
    Task<IReadOnlyList<BranchDto>> GetBranchesAsync(GenderSection? section, CancellationToken ct);
    Task<BranchDto?> GetBranchAsync(string slug, CancellationToken ct);
    Task<IReadOnlyList<PackageDto>> GetPackagesAsync(CancellationToken ct);
    Task<IReadOnlyList<CoachDto>> GetCoachesAsync(CancellationToken ct);
    Task<CampaignDto?> GetActiveCampaignAsync(CancellationToken ct);
    Task<IReadOnlyList<FaqDto>> GetFaqAsync(CancellationToken ct);
    Task<SiteStatsDto> GetStatsAsync(CancellationToken ct);
}

public sealed class CatalogService(
    IRepository<Branch> branches,
    IRepository<MembershipPackage> packages,
    IRepository<Coach> coaches,
    IRepository<Campaign> campaigns,
    IRepository<FaqItem> faq,
    IPricingService pricing,
    IClock clock) : ICatalogService
{
    public async Task<IReadOnlyList<BranchDto>> GetBranchesAsync(GenderSection? section, CancellationToken ct)
    {
        var list = await branches.ListAsync(b => b.IsActive, q => q.OrderBy(b => b.SortOrder), ct);
        if (section is GenderSection.Men or GenderSection.Women)
            list = list.Where(b => b.Sections.HasFlag(section.Value)).ToList();
        return list.Select(ToDto).ToList();
    }

    public async Task<BranchDto?> GetBranchAsync(string slug, CancellationToken ct)
    {
        var b = await branches.FirstOrDefaultAsync(x => x.Slug == slug && x.IsActive, ct);
        return b is null ? null : ToDto(b);
    }

    public async Task<IReadOnlyList<PackageDto>> GetPackagesAsync(CancellationToken ct)
    {
        var now = clock.UtcNow;
        var running = (await campaigns.ListAsync(c => c.IsActive, null, ct))
            .Where(c => c.IsRunningAt(now)).ToList();
        var list = await packages.ListAsync(p => p.IsActive, q => q.OrderBy(p => p.SortOrder), ct);

        return list.Select(p =>
        {
            var camp = pricing.BestCampaignFor(p.Slug, p.PriceToman, running, now, null);
            long? discounted = camp is null ? null : p.PriceToman - camp.DiscountFor(p.PriceToman);
            int? percent = camp is null ? null : camp.DiscountAmountToman is null ? camp.DiscountPercent : (int)(100 * (p.PriceToman - discounted!.Value) / Math.Max(1, p.PriceToman));
            return new PackageDto(
                p.Id, p.Slug, p.Name, p.Tagline, p.Category.ToString(), p.DurationMonths, p.Sessions,
                p.PriceToman, discounted, percent,
                pricing.MonthlyEquivalent(discounted ?? p.PriceToman, p.DurationMonths),
                p.IncludesPersonalCoach, p.IncludesNutritionPlan, p.IsFeatured, p.Features);
        }).ToList();
    }

    public async Task<IReadOnlyList<CoachDto>> GetCoachesAsync(CancellationToken ct)
    {
        var branchNames = (await branches.ListAsync(null, null, ct)).ToDictionary(b => b.Id, b => b.Name);
        var list = await coaches.ListAsync(c => c.IsActive, q => q.OrderBy(c => c.SortOrder), ct);
        return list.Select(c => new CoachDto(
            c.Id, c.Slug, c.FullName, c.Specialty, c.Bio, c.YearsOfExperience, c.Section.ToString(),
            branchNames.GetValueOrDefault(c.BranchId, ""), c.PhotoUrl, c.Achievements)).ToList();
    }

    public async Task<CampaignDto?> GetActiveCampaignAsync(CancellationToken ct)
    {
        var now = clock.UtcNow;
        var c = (await campaigns.ListAsync(x => x.IsActive, null, ct))
            .Where(x => x.IsRunningAt(now))
            .OrderBy(x => x.EndsAtUtc)
            .FirstOrDefault();
        return c is null ? null : new CampaignDto(
            c.Id, c.Title, c.Description,
            DateTime.SpecifyKind(c.StartsAtUtc, DateTimeKind.Utc), DateTime.SpecifyKind(c.EndsAtUtc, DateTimeKind.Utc), c.DiscountPercent, c.EligiblePackageSlugs,
            c.DiscountAmountToman, c.EligibleBranchSlugs, c.MaxRedemptions is { } max ? Math.Max(0, max - c.RedemptionCount) : null);
    }

    public async Task<IReadOnlyList<FaqDto>> GetFaqAsync(CancellationToken ct) =>
        (await faq.ListAsync(null, q => q.OrderBy(f => f.SortOrder), ct))
            .Select(f => new FaqDto(f.Question, f.Answer)).ToList();

    public async Task<SiteStatsDto> GetStatsAsync(CancellationToken ct)
    {
        var branchCount = (await branches.ListAsync(b => b.IsActive, null, ct)).Count;
        var coachCount = (await coaches.ListAsync(c => c.IsActive, null, ct)).Count;
        // اعداد اعضا و سابقه تا دریافت آمار واقعی از باشگاه، مقدار نمونه هستند.
        return new SiteStatsDto(branchCount, Members: 8500, YearsActive: 15, InstagramFollowers: 52000, Coaches: coachCount);
    }

    private static BranchDto ToDto(Branch b) => new(
        b.Id, b.Slug, b.Name, b.District, b.Address, b.Phone, b.Latitude, b.Longitude,
        b.Sections.HasFlag(GenderSection.Men), b.Sections.HasFlag(GenderSection.Women),
        b.AddressConfirmed, b.MenHours, b.WomenHours, b.Disciplines);
}
