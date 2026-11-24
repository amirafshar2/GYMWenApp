using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.Business.Services;
using GymPlatform.Business.Validation;
using GymPlatform.DataAccess;
using GymPlatform.DataAccess.Repositories;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Tests;

public class PersianTextTests
{
    [Theory]
    [InlineData("01512 3456789", "015123456789")]
    [InlineData("+49 1512 3456789", "015123456789")]
    [InlineData("004915123456789", "015123456789")]
    [InlineData("15123456789", "015123456789")]
    [InlineData("0151-234 5678", "01512345678")]
    public void NormalizeMobile_handles_common_formats(string input, string expected) =>
        Assert.Equal(expected, PersianText.NormalizeMobile(input));

    [Fact]
    public void CleanText_converts_arabic_letters() =>
        Assert.Equal("علی کریمی", PersianText.CleanText(" علي كريمي "));
}

public class PricingTests
{
    private readonly PricingService _p = new();

    [Fact]
    public void ApplyDiscount_rounds_down_to_thousand() =>
        Assert.Equal(191_200, _p.ApplyDiscount(239_000, 20));

    [Theory]
    [InlineData(-1)]
    [InlineData(91)]
    public void ApplyDiscount_rejects_invalid_percent(int percent) =>
        Assert.Throws<ArgumentOutOfRangeException>(() => _p.ApplyDiscount(10_000, percent));

    [Fact]
    public void BestCampaign_picks_highest_running_eligible()
    {
        var now = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
        var campaigns = new[]
        {
            new Campaign { Title = "a", DiscountPercent = 10, StartsAtUtc = now.AddDays(-1), EndsAtUtc = now.AddDays(1) },
            new Campaign { Title = "b", DiscountPercent = 30, StartsAtUtc = now.AddDays(-1), EndsAtUtc = now.AddDays(1), EligiblePackageSlugs = ["yearly"] },
            new Campaign { Title = "expired", DiscountPercent = 50, StartsAtUtc = now.AddDays(-9), EndsAtUtc = now.AddDays(-1) },
        };
        Assert.Equal("b", _p.BestCampaignFor("yearly", campaigns, now)!.Title);
        Assert.Equal("a", _p.BestCampaignFor("quarter", campaigns, now)!.Title);
    }
}

public class ConsultationValidatorTests
{
    private readonly CreateConsultationValidator _v = new();

    [Fact]
    public void Valid_request_passes() =>
        Assert.True(_v.Validate(new CreateConsultationRequest("Julia Fischer", "0171 2345678", "Abnehmen", null, null)).IsValid);

    [Theory]
    [InlineData("<script>", "01712345678")]
    [InlineData("Marie", "07111234567")]
    [InlineData("", "01712345678")]
    public void Invalid_request_fails(string name, string mobile) =>
        Assert.False(_v.Validate(new CreateConsultationRequest(name, mobile, null, null, null)).IsValid);

    [Fact]
    public void Unknown_goal_fails() =>
        Assert.False(_v.Validate(new CreateConsultationRequest("Julia Fischer", "01712345678", "DROP TABLE", null, null)).IsValid);
}

public sealed class FixedClock(DateTime now) : IClock { public DateTime UtcNow => now; }

public sealed class ServiceTests : IDisposable
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly GymDbContext _db;
    private readonly DateTime _now = new(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);

    public ServiceTests()
    {
        _conn.Open();
        _db = new GymDbContext(new DbContextOptionsBuilder<GymDbContext>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();
        _db.Branches.AddRange(
            new Branch { Slug = "a", Name = "A", District = "x", Address = "x", Sections = GenderSection.Both },
            new Branch { Slug = "m", Name = "M", District = "x", Address = "x", Sections = GenderSection.Men },
            new Branch { Slug = "w", Name = "W", District = "x", Address = "x", Sections = GenderSection.Women });
        _db.Packages.Add(new MembershipPackage { Slug = "yearly", Name = "Y", DurationMonths = 12, PriceToman = 240_000 });
        _db.Campaigns.Add(new Campaign { Title = "c", DiscountPercent = 25, StartsAtUtc = _now.AddDays(-1), EndsAtUtc = _now.AddDays(3) });
        _db.SaveChanges();
    }

    private CatalogService Catalog() => new(
        new Repository<Branch>(_db), new Repository<MembershipPackage>(_db), new Repository<Coach>(_db),
        new Repository<Campaign>(_db), new Repository<FaqItem>(_db), new PricingService(),
        new GymPlatform.Business.Services.Site.SiteService(_db, new GymPlatform.Business.Services.Site.SiteConfigCache(), new FixedClock(_now)), new FixedClock(_now));

    [Fact]
    public async Task Women_filter_includes_mixed_branches()
    {
        var list = await Catalog().GetBranchesAsync(GenderSection.Women, default);
        Assert.Equal(["a", "w"], list.Select(b => b.Slug).ToArray());
    }

    [Fact]
    public async Task Packages_include_campaign_discount()
    {
        var p = Assert.Single(await Catalog().GetPackagesAsync(default));
        Assert.Equal(180_000, p.DiscountedPriceToman);
        Assert.Equal(15_000, p.MonthlyEquivalentToman);
    }

    [Fact]
    public async Task Consultation_is_saved_once_per_mobile_window()
    {
        var svc = new ConsultationService(new Repository<ConsultationRequest>(_db), new Repository<Branch>(_db),
            new CreateConsultationValidator(), new FixedClock(_now));
        var req = new CreateConsultationRequest("Sarah Becker", "+49 171 2345678", null, "Hallo", null);

        var first = await svc.CreateAsync(req, default);
        var second = await svc.CreateAsync(req, default);

        Assert.True(first.Succeeded && second.Succeeded);
        Assert.Equal(1, await _db.ConsultationRequests.CountAsync());
        Assert.Equal("01712345678", (await _db.ConsultationRequests.SingleAsync()).Mobile);
    }

    [Fact]
    public async Task Consultation_rejects_unknown_branch()
    {
        var svc = new ConsultationService(new Repository<ConsultationRequest>(_db), new Repository<Branch>(_db),
            new CreateConsultationValidator(), new FixedClock(_now));
        var r = await svc.CreateAsync(new CreateConsultationRequest("Sarah Becker", "01712345678", null, null, 999), default);
        Assert.False(r.Succeeded);
        Assert.Contains("BranchId", r.Errors.Keys);
    }

    public void Dispose() { _db.Dispose(); _conn.Dispose(); }
}
