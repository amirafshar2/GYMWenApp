using System.Net;
using System.Text.Json;
using GymPlatform.Api.Infrastructure;
using GymPlatform.Business.Common;
using GymPlatform.Business.Services.Commerce;
using GymPlatform.Business.Services.Members;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GymPlatform.Tests;

/// <summary>فاز ۵: رگرسیون یافته‌های ممیزی امنیت (هم‌زمانی پرداخت، حدس کد، دسترسی شعبه، سقف کد تخفیف، تنظیمات production).</summary>
public class SecurityTests(GymApiFactory factory) : IClassFixture<GymApiFactory>
{
    private const string Home = "ghoddousi-gharbi", Other = "maaliabad";
    private static string Key() => Guid.NewGuid().ToString("N");

    private async Task<(Browser b, int userId, string phone)> PaidMemberAsync(string branch = Home)
    {
        var b = new Browser(factory);
        var phone = await b.LoginAsync();
        await CheckoutFlowTests.SignContractAsync(b, "رضا امینی", "male");
        var g = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/checkout",
            new { branchSlug = branch, packageSlug = "quarter", section = "men", discountCode = (string?)null, idempotencyKey = Key() }));
        await CheckoutFlowTests.PayInSandboxAsync(b, g, pay: true);
        var me = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/me/profile"));
        return (b, me.GetProperty("user").GetProperty("id").GetInt32(), phone);
    }

    private async Task<Browser> StaffAsync(string role, params string[] branches)
    {
        var b = new Browser(factory);
        var phone = await b.LoginAsync();
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
        var u = await users.Users.FirstAsync(x => x.PhoneNumber == phone);
        await users.AddToRoleAsync(u, role);
        foreach (var slug in branches)
            db.StaffBranches.Add(new StaffBranch { UserId = u.Id, BranchId = await db.Branches.Where(x => x.Slug == slug).Select(x => x.Id).FirstAsync() });
        await db.SaveChangesAsync();
        // نقش در توکن تازه هم باشد (برای endpointهای مبتنی بر توکن)
        b.AccessToken = null;
        b.AccessToken = (await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh"))).GetProperty("accessToken").GetString();
        return b;
    }

    [Fact]
    public async Task Simultaneous_gateway_callbacks_credit_the_wallet_only_once()
    {
        var b = new Browser(factory);
        await b.LoginAsync();
        (await b.SendAsync(HttpMethod.Post, "/api/v1/me/wallet/topups", new { amountToman = 400_000, idempotencyKey = Key() })).EnsureSuccessStatusCode();
        long tracking; int userId;
        using (var s = factory.Services.CreateScope())
        {
            var p = await s.ServiceProvider.GetRequiredService<GymDbContext>().Payments
                .Where(x => x.Purpose == PaymentPurpose.WalletTopUp && x.Status == PaymentStatus.Pending).OrderByDescending(x => x.Id).FirstAsync();
            (tracking, userId) = (p.TrackingNumber, p.UserId);
        }

        await Task.WhenAll(Enumerable.Range(0, 6).Select(async _ =>
        {
            using var s = factory.Services.CreateScope();
            await s.ServiceProvider.GetRequiredService<IPaymentService>().CompleteAsync(tracking, true, "TX", "ok", new RequestContext("1.2.3.4", null), CancellationToken.None);
        }));

        using var check = factory.Services.CreateScope();
        var db = check.ServiceProvider.GetRequiredService<GymDbContext>();
        Assert.Equal(400_000, await db.Wallets.Where(w => w.UserId == userId).Select(w => w.BalanceToman).FirstAsync());
        Assert.Equal(1, await db.WalletTransactions.CountAsync(t => t.UserId == userId));
    }

    [Fact]
    public async Task Parallel_otp_guesses_cannot_exceed_the_attempt_limit()
    {
        var b = new Browser(factory);
        await b.InitAsync();
        var phone = "0912" + Random.Shared.Next(1_000_000, 9_999_999);
        var otp = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/auth/otp", new { phoneNumber = phone }));
        var right = otp.GetProperty("demoCode").GetString()!;
        var wrong = right == "11111" ? "22222" : "11111";

        var results = await Task.WhenAll(Enumerable.Range(0, 20).Select(async _ =>
        {
            var c = new Browser(factory);
            await c.InitAsync();
            return (await c.SendAsync(HttpMethod.Post, "/api/v1/auth/verify", new { phoneNumber = phone, code = wrong })).StatusCode;
        }));
        var afterwards = await b.SendAsync(HttpMethod.Post, "/api/v1/auth/verify", new { phoneNumber = phone, code = right });

        Assert.True(results.Count(r => r == HttpStatusCode.BadRequest) <= 5); // فقط ۵ حدس واقعاً بررسی شد
        Assert.Equal(HttpStatusCode.TooManyRequests, afterwards.StatusCode);
    }

    [Fact]
    public async Task Receptionist_of_another_branch_cannot_see_or_change_a_member_and_qr_token_never_reaches_staff()
    {
        var (_, userId, phone) = await PaidMemberAsync(Home);
        var foreign = await StaffAsync(Roles.Reception, Other);
        var local = await StaffAsync(Roles.Reception, Home);

        var search = await foreign.JsonAsync<JsonElement>(await foreign.SendAsync(HttpMethod.Get, $"/api/v1/panel/reception/members?q={phone[^7..]}"));
        var summary = await foreign.SendAsync(HttpMethod.Get, $"/api/v1/panel/reception/members/{userId}");
        var assign = await foreign.SendAsync(HttpMethod.Post, $"/api/v1/staff/members/{userId}/credentials", new { type = "wristband", value = "AABBCCDD" + Random.Shared.Next(1000, 9999) });
        var manual = await foreign.SendAsync(HttpMethod.Post, "/api/v1/panel/reception/checkins", new { branchSlug = Other, userId });
        var own = await local.JsonAsync<JsonElement>(await local.SendAsync(HttpMethod.Get, $"/api/v1/panel/reception/members/{userId}"));
        var ownCheckIn = await local.JsonAsync<JsonElement>(await local.SendAsync(HttpMethod.Post, "/api/v1/panel/reception/checkins", new { branchSlug = Home, userId }));

        Assert.Empty(search.EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, summary.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, assign.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, manual.StatusCode);
        Assert.Equal("", own.GetProperty("active").GetProperty("cardToken").GetString());
        Assert.True(ownCheckIn.GetProperty("allowed").GetBoolean());
    }

    [Fact]
    public async Task Coach_can_only_add_active_members_of_own_branch_and_section()
    {
        var (_, _, otherBranchPhone) = await PaidMemberAsync(Other);
        var coach = await StaffAsync(Roles.Coach);
        var me = await coach.JsonAsync<JsonElement>(await coach.SendAsync(HttpMethod.Get, "/api/v1/me"));
        using (var s = factory.Services.CreateScope())
        {
            var db = s.ServiceProvider.GetRequiredService<GymDbContext>();
            var c = await db.Coaches.FirstAsync(x => x.Slug == "coach-3"); // شعبهٔ کسائی، آقایان
            c.UserId = me.GetProperty("id").GetInt32();
            await db.SaveChangesAsync();
        }

        var res = await coach.SendAsync(HttpMethod.Post, "/api/v1/panel/coach/trainees", new { phone = otherBranchPhone });

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Limited_discount_code_counts_pending_checkouts_and_is_once_per_person()
    {
        var code = "ONCE" + Random.Shared.Next(1000, 9999);
        using (var s = factory.Services.CreateScope())
        {
            var db = s.ServiceProvider.GetRequiredService<GymDbContext>();
            db.DiscountCodes.Add(new DiscountCode { Code = code, Percent = 10, MaxUses = 1, IsActive = true });
            await db.SaveChangesAsync();
        }
        async Task<Browser> Signed()
        {
            var b = new Browser(factory);
            await b.LoginAsync();
            await CheckoutFlowTests.SignContractAsync(b, "نیما صادقی", "male");
            return b;
        }
        object Order(string? dc) => new { branchSlug = Home, packageSlug = "quarter", section = "men", discountCode = dc, idempotencyKey = Key() };
        var a = await Signed();
        var b2 = await Signed();

        var first = await a.SendAsync(HttpMethod.Post, "/api/v1/checkout", Order(code));       // در انتظار پرداخت
        var sameUserAgain = await a.SendAsync(HttpMethod.Post, "/api/v1/checkout", Order(code));
        var otherUser = await b2.SendAsync(HttpMethod.Post, "/api/v1/checkout", Order(code));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, sameUserAgain.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, otherUser.StatusCode);
    }

    [Fact]
    public async Task Members_only_code_is_rejected_for_a_first_membership()
    {
        var b = new Browser(factory);
        await b.LoginAsync();
        await CheckoutFlowTests.SignContractAsync(b, "کاوه نیک", "male");
        var code = "MEMB" + Random.Shared.Next(1000, 9999);
        using (var s = factory.Services.CreateScope())
        {
            var db = s.ServiceProvider.GetRequiredService<GymDbContext>();
            db.DiscountCodes.Add(new DiscountCode { Code = code, Percent = 10, IsActive = true, Scope = DiscountScope.Any, MembersOnly = true });
            await db.SaveChangesAsync();
        }
        var res = await b.SendAsync(HttpMethod.Post, "/api/v1/checkout", new { branchSlug = Home, packageSlug = "quarter", section = "men", discountCode = code, idempotencyKey = Key() });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Double_cancel_of_a_canteen_order_refunds_once()
    {
        var member = new Browser(factory);
        await member.LoginAsync();
        var top = await member.JsonAsync<JsonElement>(await member.SendAsync(HttpMethod.Post, "/api/v1/me/wallet/topups", new { amountToman = 500_000, idempotencyKey = Key() }));
        await CheckoutFlowTests.PayInSandboxAsync(member, top.GetProperty("gateway"), pay: true);
        var placed = await member.JsonAsync<JsonElement>(await member.SendAsync(HttpMethod.Post, "/api/v1/canteen/orders",
            new { branchSlug = Home, items = new[] { new { itemId = 1, quantity = 1 } }, payMethod = "wallet", idempotencyKey = Key() }));
        var orderId = placed.GetProperty("orderId").GetInt32();

        await Task.WhenAll(Enumerable.Range(0, 4).Select(async _ =>
        {
            using var s = factory.Services.CreateScope();
            await s.ServiceProvider.GetRequiredService<ICanteenService>().UpdateStatusAsync(orderId, "cancelled", 1, CancellationToken.None);
        }));

        var w = await member.JsonAsync<JsonElement>(await member.SendAsync(HttpMethod.Get, "/api/v1/me/wallet"));
        Assert.Equal(500_000, w.GetProperty("balanceToman").GetInt64());
    }

    [Fact]
    public void Production_guard_lists_every_demo_or_unsafe_setting()
    {
        var bad = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Payment:UseVirtualGateway"] = "true", ["Otp:ExposeCodeInResponse"] = "true", ["Sms:Provider"] = "Log",
            ["Database:Provider"] = "Sqlite", ["AllowedHosts"] = "*", ["Access:DemoDeviceKey"] = "demo-gate-key-0001",
        }).Build();
        var good = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Payment:UseVirtualGateway"] = "false", ["Payment:ZarinPal:MerchantId"] = "xxxxxxxx-xxxx", ["Payment:CallbackBaseUrl"] = "https://example.ir",
            ["Otp:ExposeCodeInResponse"] = "false", ["Sms:Provider"] = "Kavenegar", ["Sms:Kavenegar:ApiKey"] = "k",
            ["Database:Provider"] = "SqlServer", ["AllowedHosts"] = "example.ir;www.example.ir",
        }).Build();

        var problems = ProductionGuard.Problems(bad);

        Assert.True(problems.Count >= 7);
        Assert.Contains(problems, p => p.Contains("UseVirtualGateway"));
        Assert.Contains(problems, p => p.Contains("ExposeCodeInResponse"));
        Assert.Empty(ProductionGuard.Problems(good));
    }
}
