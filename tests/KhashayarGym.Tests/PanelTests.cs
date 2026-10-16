using System.Net;
using System.Text.Json;
using KhashayarGym.Business.Services.Panel;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace KhashayarGym.Tests;

/// <summary>فاز ۴: پنل مدیر، پذیرش، مربی، مدیریت محتوا و پیامک خودکار — به‌ویژه محدودیت شعبه.</summary>
public class PanelTests(GymApiFactory factory) : IClassFixture<GymApiFactory>
{
    private const string Home = "ghoddousi-gharbi", Other = "maaliabad";

    /// <summary>کارمند با نقش‌ها و شعبه‌های داده‌شده (نقش‌های پنل هر بار از دیتابیس خوانده می‌شوند؛ توکن تازه لازم نیست)</summary>
    private async Task<(Browser b, int userId)> StaffAsync(string[] roles, params string[] branches)
    {
        var b = new Browser(factory);
        var phone = await b.LoginAsync();
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
        var u = await users.Users.FirstAsync(x => x.PhoneNumber == phone);
        await users.AddToRolesAsync(u, roles);
        foreach (var slug in branches)
            db.StaffBranches.Add(new StaffBranch { UserId = u.Id, BranchId = await db.Branches.Where(x => x.Slug == slug).Select(x => x.Id).FirstAsync() });
        await db.SaveChangesAsync();
        return (b, u.Id);
    }

    private async Task<(Browser b, int userId, string qr, string phone)> PaidMemberAsync(string branch = Home)
    {
        var b = new Browser(factory);
        var phone = await b.LoginAsync();
        await CheckoutFlowTests.SignContractAsync(b, "سارا کریمی", "male");
        var order = new { branchSlug = branch, packageSlug = "quarter", section = "men", discountCode = (string?)null, idempotencyKey = Guid.NewGuid().ToString("N") };
        var g = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/checkout", order));
        await CheckoutFlowTests.PayInSandboxAsync(b, g, pay: true);
        var me = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/me/profile"));
        return (b, me.GetProperty("user").GetProperty("id").GetInt32(), "KG1:" + me.GetProperty("active").GetProperty("cardToken").GetString(), phone);
    }

    private static async Task<JsonElement> Get(Browser b, string url) => await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, url));

    [Fact]
    public async Task Member_without_staff_role_gets_403_on_every_panel_area()
    {
        var b = new Browser(factory);
        await b.LoginAsync();
        foreach (var url in new[] { "/api/v1/panel/me", "/api/v1/panel/dashboard", "/api/v1/panel/reception/members?q=0912", "/api/v1/panel/coach/trainees", "/api/v1/panel/admin/packages", "/api/v1/panel/admin/sms" })
            Assert.Equal(HttpStatusCode.Forbidden, (await b.SendAsync(HttpMethod.Get, url)).StatusCode);
        b.AccessToken = null;
        Assert.Equal(HttpStatusCode.Unauthorized, (await b.SendAsync(HttpMethod.Get, "/api/v1/panel/dashboard")).StatusCode);
    }

    [Fact]
    public async Task Branch_manager_sees_only_own_branch_everywhere()
    {
        var (mgr, _) = await StaffAsync([Roles.BranchManager], Home);

        var dash = await Get(mgr, "/api/v1/panel/dashboard");
        var otherDash = await mgr.SendAsync(HttpMethod.Get, $"/api/v1/panel/dashboard?branch={Other}");
        var export = await mgr.SendAsync(HttpMethod.Get, $"/api/v1/panel/dashboard/export?branch={Other}");
        var products = await Get(mgr, "/api/v1/panel/admin/products");
        var variant = products[0].GetProperty("variants")[0].GetProperty("id").GetInt32();
        var stockOther = await mgr.SendAsync(HttpMethod.Put, $"/api/v1/panel/admin/variants/{variant}/stock", new { branchSlug = Other, quantity = 5 });
        var stockHome = await mgr.SendAsync(HttpMethod.Put, $"/api/v1/panel/admin/variants/{variant}/stock", new { branchSlug = Home, quantity = 7 });
        var boardOther = await mgr.SendAsync(HttpMethod.Get, $"/api/v1/canteen/staff/{Other}/orders");
        var boardHome = await mgr.SendAsync(HttpMethod.Get, $"/api/v1/canteen/staff/{Home}/orders");
        var packages = await mgr.SendAsync(HttpMethod.Get, "/api/v1/panel/admin/packages");

        Assert.Equal([Home], dash.GetProperty("branches").EnumerateArray().Select(x => x.GetProperty("slug").GetString()));
        Assert.Equal(HttpStatusCode.Forbidden, otherDash.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, export.StatusCode);
        Assert.All(products.EnumerateArray().SelectMany(p => p.GetProperty("variants").EnumerateArray()).SelectMany(v => v.GetProperty("stock").EnumerateArray()),
            s => Assert.Equal(Home, s.GetProperty("branchSlug").GetString()));
        Assert.Equal(HttpStatusCode.Forbidden, stockOther.StatusCode);
        Assert.Equal(HttpStatusCode.OK, stockHome.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, boardOther.StatusCode);
        Assert.Equal(HttpStatusCode.OK, boardHome.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, packages.StatusCode); // قیمت پکیج فقط با مدیر کل
    }

    [Fact]
    public async Task Canteen_staff_cannot_watch_other_branch_live_board()
    {
        var (staff, _) = await StaffAsync([Roles.CanteenStaff], Home);
        var hub = new HubConnectionBuilder()
            .WithUrl(new Uri(factory.Server.BaseAddress, "/hubs/canteen"), o =>
            {
                o.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                o.Transports = HttpTransportType.LongPolling;
                o.AccessTokenProvider = () => Task.FromResult(staff.AccessToken);
            }).Build();
        await hub.StartAsync();
        await using var _ = hub;

        await hub.InvokeAsync("WatchBranch", Home);
        await Assert.ThrowsAsync<HubException>(() => hub.InvokeAsync("WatchBranch", Other));
    }

    [Fact]
    public async Task Removing_staff_role_takes_effect_immediately_with_same_token()
    {
        var (admin, _) = await StaffAsync([Roles.SuperAdmin]);
        var (rec, recId) = await StaffAsync([Roles.Reception], Home);
        Assert.Equal(HttpStatusCode.OK, (await rec.SendAsync(HttpMethod.Get, "/api/v1/panel/me")).StatusCode);
        string phone;
        using (var scope = factory.Services.CreateScope())
            phone = (await scope.ServiceProvider.GetRequiredService<GymDbContext>().Users.FirstAsync(u => u.Id == recId)).PhoneNumber!;

        var save = await admin.SendAsync(HttpMethod.Put, "/api/v1/panel/admin/staff", new { phone, roles = Array.Empty<string>(), branchSlugs = Array.Empty<string>() });

        Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await rec.SendAsync(HttpMethod.Get, "/api/v1/panel/me")).StatusCode);
    }

    [Fact]
    public async Task Dashboard_counts_todays_membership_payment_and_welcome_sms_is_queued()
    {
        var (admin, _) = await StaffAsync([Roles.SuperAdmin]);
        var before = (await Get(admin, $"/api/v1/panel/dashboard?branch={Home}")).GetProperty("today").GetProperty("membership").GetInt64();

        var (_, userId, _, phone) = await PaidMemberAsync();
        var after = await Get(admin, $"/api/v1/panel/dashboard?branch={Home}");
        var export = await admin.SendAsync(HttpMethod.Get, $"/api/v1/panel/dashboard/export?branch={Home}");
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
        var paid = await db.Payments.Where(p => p.UserId == userId && p.Status == PaymentStatus.Succeeded).SumAsync(p => p.AmountToman);
        var welcome = await db.SmsMessages.SingleAsync(s => s.UserId == userId);

        Assert.Equal(before + paid, after.GetProperty("today").GetProperty("membership").GetInt64());
        Assert.True(after.GetProperty("activeMembers").GetInt32() >= 1);
        Assert.Equal(HttpStatusCode.OK, export.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", export.Content.Headers.ContentType?.MediaType);
        Assert.Equal(SmsKind.Welcome, welcome.Kind);
        Assert.Equal(phone, welcome.Phone);
        Assert.Contains("خوش آمدی", welcome.Preview);
    }

    [Fact]
    public async Task Reception_checks_member_in_and_cannot_use_other_branch()
    {
        var (_, userId, qr, phone) = await PaidMemberAsync();
        var (rec, _) = await StaffAsync([Roles.Reception], Home);

        var found = await Get(rec, $"/api/v1/panel/reception/members?q={phone[^7..]}");
        var summary = await Get(rec, $"/api/v1/panel/reception/members/{userId}");
        var ok = await rec.JsonAsync<JsonElement>(await rec.SendAsync(HttpMethod.Post, "/api/v1/panel/reception/checkins", new { branchSlug = Home, credential = qr }));
        var other = await rec.SendAsync(HttpMethod.Post, "/api/v1/panel/reception/checkins", new { branchSlug = Other, credential = qr });
        var today = await Get(rec, $"/api/v1/panel/reception/checkins?branch={Home}");

        Assert.Contains(found.EnumerateArray(), r => r.GetProperty("userId").GetInt32() == userId);
        Assert.True(summary.GetProperty("hasSignedContract").GetBoolean());
        Assert.True(ok.GetProperty("allowed").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, other.StatusCode);
        Assert.Contains(today.EnumerateArray(), r => r.GetProperty("userId").GetInt32() == userId && r.GetProperty("allowed").GetBoolean());
    }

    [Fact]
    public async Task Coach_plan_and_weight_show_up_for_the_member_only_for_own_trainees()
    {
        var (member, memberId, _, phone) = await PaidMemberAsync();
        var (coach, coachUserId) = await StaffAsync([Roles.Coach]);
        var (otherCoach, otherCoachUserId) = await StaffAsync([Roles.Coach]);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
            var free = await db.Coaches.Where(c => c.UserId == null).OrderBy(c => c.Id).Take(2).ToListAsync();
            free[0].UserId = coachUserId; free[1].UserId = otherCoachUserId;
            await db.SaveChangesAsync();
        }

        var add = await coach.SendAsync(HttpMethod.Post, "/api/v1/panel/coach/trainees", new { phone });
        var plan = await coach.SendAsync(HttpMethod.Put, $"/api/v1/panel/coach/trainees/{memberId}/plan", new
        {
            title = "برنامهٔ حجم",
            days = new[] { new { day = "شنبه", focus = "سینه", items = new[] { "پرس سینه ۴×۸" } } },
            nutrition = "پروتئین ۱٫۸ گرم به ازای هر کیلو",
        });
        var metric = await coach.SendAsync(HttpMethod.Post, $"/api/v1/panel/coach/trainees/{memberId}/metrics", new { weightKg = 81.4m });
        var stranger = await otherCoach.SendAsync(HttpMethod.Get, $"/api/v1/panel/coach/trainees/{memberId}");
        var strangerPlan = await otherCoach.SendAsync(HttpMethod.Put, $"/api/v1/panel/coach/trainees/{memberId}/plan", new { title = "x", days = Array.Empty<object>(), nutrition = (string?)null });
        var myPlan = await Get(member, "/api/v1/me/plan");
        var myMetrics = await Get(member, "/api/v1/me/metrics");

        Assert.Equal(HttpStatusCode.Created, add.StatusCode);
        Assert.Equal(HttpStatusCode.OK, plan.StatusCode);
        Assert.Equal(HttpStatusCode.Created, metric.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, stranger.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, strangerPlan.StatusCode);
        Assert.Equal("برنامهٔ حجم", myPlan.GetProperty("title").GetString());
        Assert.Equal("پرس سینه ۴×۸", myPlan.GetProperty("days")[0].GetProperty("items")[0].GetString());
        Assert.Equal(81.4m, myMetrics[0].GetProperty("weightKg").GetDecimal());
    }

    [Fact]
    public async Task Campaign_sms_goes_only_to_opted_in_expired_members_once_and_reminders_are_not_duplicated()
    {
        var (admin, _) = await StaffAsync([Roles.SuperAdmin]);
        int optIn, optOut, active, campaignId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
            var branch = await db.Branches.FirstAsync(b => b.Slug == Home);
            var pkg = await db.Packages.FirstAsync(p => p.Slug == "quarter");
            AppUser U(string phone, bool opt) => new() { UserName = phone, PhoneNumber = phone, FullName = "عضو قدیمی", MarketingSmsOptIn = opt };
            var users = new[] { U("09350000001", true), U("09350000002", false), U("09350000003", true) };
            db.Users.AddRange(users);
            await db.SaveChangesAsync();
            Membership M(AppUser u, int startDaysAgo, int endDaysAgo) => new()
            {
                UserId = u.Id, BranchId = branch.Id, PackageId = pkg.Id, Section = GenderSection.Men, CardToken = Guid.NewGuid().ToString("N"),
                StartsAtUtc = DateTime.UtcNow.AddDays(-startDaysAgo), EndsAtUtc = DateTime.UtcNow.AddDays(-endDaysAgo),
                Status = endDaysAgo > 0 ? MembershipStatus.Expired : MembershipStatus.Active,
            };
            db.Memberships.AddRange(M(users[0], 120, 30), M(users[1], 120, 30), M(users[2], 60, -7)); // سومی هنوز فعال است (۷ روز مانده)
            var c = new Campaign { Title = "بازگشت به خشایار", StartsAtUtc = DateTime.UtcNow.AddDays(-1), EndsAtUtc = DateTime.UtcNow.AddDays(10), DiscountPercent = 25, IsActive = true };
            db.Campaigns.Add(c);
            await db.SaveChangesAsync();
            (optIn, optOut, active, campaignId) = (users[0].Id, users[1].Id, users[2].Id, c.Id);
        }

        var first = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Post, $"/api/v1/panel/admin/campaigns/{campaignId}/sms"));
        var again = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Post, $"/api/v1/panel/admin/campaigns/{campaignId}/sms"));
        using var s2 = factory.Services.CreateScope();
        var sms = s2.ServiceProvider.GetRequiredService<ISmsService>();
        await sms.ScheduleDueAsync(CancellationToken.None);
        await sms.ScheduleDueAsync(CancellationToken.None);
        var db2 = s2.ServiceProvider.GetRequiredService<GymDbContext>();
        var campaignTo = await db2.SmsMessages.Where(s => s.CampaignId == campaignId).Select(s => s.UserId).ToListAsync();
        var reminders = await db2.SmsMessages.CountAsync(s => s.UserId == active && s.Kind == SmsKind.Reminder7);

        Assert.Contains(optIn, campaignTo);
        Assert.DoesNotContain(optOut, campaignTo);
        Assert.DoesNotContain(active, campaignTo);
        Assert.Equal(campaignTo.Count, campaignTo.Distinct().Count());
        Assert.Equal(0, again.GetProperty("recipients").GetInt32());
        Assert.True(first.GetProperty("recipients").GetInt32() >= 1);
        Assert.Equal(1, reminders);
    }
}
