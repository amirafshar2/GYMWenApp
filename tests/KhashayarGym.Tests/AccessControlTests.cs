using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace KhashayarGym.Tests;

/// <summary>API گیت/دستبند: تصمیم ورود، دستبند، فهرست سفید، رویدادهای تکراری و صف خروجی.</summary>
public class AccessControlTests(GymApiFactory factory) : IClassFixture<GymApiFactory>
{
    private HttpClient Gate(string? key = GymApiFactory.DeviceKey)
    {
        var c = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        if (key is not null) c.DefaultRequestHeaders.Add("X-Device-Key", key);
        return c;
    }

    private static async Task<JsonElement> Check(HttpClient gate, string credential, string? eventId = null)
    {
        var res = await gate.PostAsJsonAsync("/api/v1/access/check", new { credential, eventId });
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>عضو با عضویت فعال در شعبهٔ اول (همان شعبهٔ گیت نمایشی)</summary>
    private async Task<(Browser b, int userId, string qr)> PaidMemberAsync(string package = "quarter")
    {
        var b = new Browser(factory);
        await b.LoginAsync();
        await CheckoutFlowTests.SignContractAsync(b, "کاوه رستمی", "male");
        var order = new { branchSlug = "ghoddousi-gharbi", packageSlug = package, section = "men", discountCode = (string?)null, idempotencyKey = Guid.NewGuid().ToString("N") };
        var g = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/checkout", order));
        await CheckoutFlowTests.PayInSandboxAsync(b, g, pay: true);
        var me = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/me/profile"));
        var token = me.GetProperty("active").GetProperty("cardToken").GetString();
        return (b, me.GetProperty("user").GetProperty("id").GetInt32(), $"KG1:{token}");
    }

    private async Task<Browser> ReceptionistAsync()
    {
        var b = new Browser(factory);
        var phone = await b.LoginAsync();
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var u = await users.Users.FirstAsync(x => x.PhoneNumber == phone);
            await users.AddToRoleAsync(u, Roles.Reception);
            // پذیرش فقط اعضای شعبهٔ خودش را می‌بیند
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
            db.StaffBranches.Add(new StaffBranch { UserId = u.Id, BranchId = await db.Branches.Where(x => x.Slug == "ghoddousi-gharbi").Select(x => x.Id).FirstAsync() });
            await db.SaveChangesAsync();
        }
        // توکن تازه با نقش جدید (refresh نقش‌ها را دوباره می‌خواند)
        b.AccessToken = null;
        var r = await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh");
        b.AccessToken = (await b.JsonAsync<JsonElement>(r)).GetProperty("accessToken").GetString();
        return b;
    }

    [Fact]
    public async Task Gate_without_valid_key_is_rejected()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Gate(null).GetAsync("/api/v1/access/ping")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Gate("wrong-key-wrong-key-wrong").GetAsync("/api/v1/access/ping")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Gate().GetAsync("/api/v1/access/ping")).StatusCode);
    }

    [Fact]
    public async Task Member_qr_opens_gate_and_unknown_credential_does_not()
    {
        var (_, _, qr) = await PaidMemberAsync();
        var gate = Gate();

        var ok = await Check(gate, qr);
        var unknown = await Check(gate, "DEADBEEF99");

        Assert.True(ok.GetProperty("allowed").GetBoolean());
        Assert.Contains("کاوه", ok.GetProperty("message").GetString());
        Assert.False(unknown.GetProperty("allowed").GetBoolean());
        Assert.Equal("unknown_credential", unknown.GetProperty("reason").GetString());
    }

    [Fact]
    public async Task Reception_assigns_wristband_which_opens_gate_until_revoked()
    {
        var (_, userId, _) = await PaidMemberAsync();
        var staff = await ReceptionistAsync();
        var uid = "04:A1:B2:" + Random.Shared.Next(0x100000, 0xFFFFFF).ToString("X6");

        var assigned = await staff.SendAsync(HttpMethod.Post, $"/api/v1/staff/members/{userId}/credentials", new { type = "wristband", value = uid, label = "دستبند آبی" });
        var cred = await staff.JsonAsync<JsonElement>(assigned);
        var gate = Gate();
        var open = await Check(gate, uid.Replace(":", "").ToLowerInvariant()); // فرمت متفاوت خواننده‌ها
        var dup = await staff.SendAsync(HttpMethod.Post, $"/api/v1/staff/members/{userId}/credentials", new { type = "wristband", value = uid });
        await staff.SendAsync(HttpMethod.Delete, $"/api/v1/staff/members/{userId}/credentials/{cred.GetProperty("id").GetInt32()}");
        var afterRevoke = await Check(gate, uid);

        Assert.Equal(HttpStatusCode.Created, assigned.StatusCode);
        Assert.True(open.GetProperty("allowed").GetBoolean());
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);
        Assert.Equal("credential_revoked", afterRevoke.GetProperty("reason").GetString());
    }

    [Fact]
    public async Task Member_cannot_assign_credentials()
    {
        var (b, userId, _) = await PaidMemberAsync();
        var res = await b.SendAsync(HttpMethod.Post, $"/api/v1/staff/members/{userId}/credentials", new { type = "wristband", value = "AABBCCDD" });
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Wristband_of_member_without_membership_is_denied()
    {
        var member = new Browser(factory);
        await member.LoginAsync();
        var userId = (await member.JsonAsync<JsonElement>(await member.SendAsync(HttpMethod.Get, "/api/v1/me"))).GetProperty("id").GetInt32();
        using (var scope = factory.Services.CreateScope())
        {
            // عضو قبلی همین شعبه که عضویتش تمام شده (پذیرش فقط اعضای شعبهٔ خودش را می‌بیند)
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
            db.Memberships.Add(new Membership
            {
                UserId = userId, BranchId = await db.Branches.Where(b => b.Slug == "ghoddousi-gharbi").Select(b => b.Id).FirstAsync(),
                PackageId = await db.Packages.Select(p => p.Id).FirstAsync(), Section = KhashayarGym.Domain.Enums.GenderSection.Men,
                Status = KhashayarGym.Domain.Enums.MembershipStatus.Expired, StartsAtUtc = DateTime.UtcNow.AddDays(-60), EndsAtUtc = DateTime.UtcNow.AddDays(-30),
                CardToken = Guid.NewGuid().ToString("N"),
            });
            await db.SaveChangesAsync();
        }
        var staff = await ReceptionistAsync();
        var uid = "CAFE" + Random.Shared.Next(100000, 999999);
        (await staff.SendAsync(HttpMethod.Post, $"/api/v1/staff/members/{userId}/credentials", new { type = "card", value = uid })).EnsureSuccessStatusCode();

        var r = await Check(Gate(), uid);
        Assert.Equal("no_active_membership", r.GetProperty("reason").GetString());
    }

    [Fact]
    public async Task Session_package_counts_one_session_per_day_and_replayed_event_is_not_counted_twice()
    {
        var (_, _, qr) = await PaidMemberAsync("climbing-8");
        var gate = Gate();

        var first = await Check(gate, qr, "evt-" + Guid.NewGuid());
        var replayId = "evt-" + Guid.NewGuid();
        var second = await Check(gate, qr, replayId);
        var replay = await Check(gate, qr, replayId);

        Assert.True(first.GetProperty("sessionCounted").GetBoolean());
        Assert.Equal(7, first.GetProperty("sessionsLeft").GetInt32());
        Assert.False(second.GetProperty("sessionCounted").GetBoolean()); // همان روز
        Assert.Equal(7, replay.GetProperty("sessionsLeft").GetInt32());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
        Assert.Equal(1, await db.CheckIns.CountAsync(c => c.ExternalEventId == replayId));
    }

    [Fact]
    public async Task Whitelist_contains_active_member_and_activation_is_queued_for_external_systems()
    {
        var (_, userId, qr) = await PaidMemberAsync();
        var list = await Gate().GetFromJsonAsync<JsonElement>("/api/v1/access/whitelist");

        Assert.Contains(list.GetProperty("entries").EnumerateArray(), e => e.GetProperty("credential").GetString() == qr);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
        Assert.True(await db.IntegrationEvents.AnyAsync(e => e.Type == "membership.activated" && e.Payload.Contains($"\"memberId\":{userId},")));
    }
}
