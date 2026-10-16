using System.Net;
using System.Text.Json;
using KhashayarGym.Business.Dtos;
using KhashayarGym.Business.Services.Commerce;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace KhashayarGym.Tests;

/// <summary>فاز ۳: کیف پول، شاپ (موجودی شعبه‌ای) و بوفهٔ لحظه‌ای</summary>
public class CommerceTests(GymApiFactory factory) : IClassFixture<GymApiFactory>
{
    private static string Key() => Guid.NewGuid().ToString("N");

    private async Task<Browser> MemberAsync()
    {
        var b = new Browser(factory);
        await b.LoginAsync();
        return b;
    }

    private async Task<long> BalanceAsync(Browser b) =>
        (await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/me/wallet"))).GetProperty("balanceToman").GetInt64();

    private async Task TopUpAsync(Browser b, long amount, bool pay = true)
    {
        var res = await b.SendAsync(HttpMethod.Post, "/api/v1/me/wallet/topups", new { amountToman = amount, idempotencyKey = Key() });
        var r = await b.JsonAsync<JsonElement>(res);
        var back = await CheckoutFlowTests.PayInSandboxAsync(b, r.GetProperty("gateway"), pay);
        Assert.StartsWith("/wallet", back.Headers.Location!.OriginalString);
    }

    private async Task<(int VariantId, string Branch, int Stock)> InStockVariantAsync(string slug = "shaker-700")
    {
        var b = new Browser(factory);
        var p = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, $"/api/v1/shop/products/{slug}"));
        foreach (var v in p.GetProperty("variants").EnumerateArray())
            foreach (var s in v.GetProperty("stock").EnumerateArray())
                if (s.GetProperty("quantity").GetInt32() >= 3)
                    return (v.GetProperty("id").GetInt32(), s.GetProperty("branchSlug").GetString()!, s.GetProperty("quantity").GetInt32());
        throw new InvalidOperationException("no stock");
    }

    private async Task<int> StockAsync(int variantId, string branchSlug)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
        return await db.BranchStocks.Where(s => s.VariantId == variantId && s.Branch!.Slug == branchSlug).Select(s => s.Quantity).FirstAsync();
    }

    private static object Order(int variantId, string branch, string payMethod, string key, int qty = 1, string? code = null) =>
        new { items = new[] { new { variantId, quantity = qty } }, branchSlug = branch, fulfillment = "pickup", discountCode = code, payMethod, idempotencyKey = key };

    [Fact]
    public async Task Wallet_topup_credits_once_and_cancel_does_not_credit()
    {
        var b = await MemberAsync();
        await TopUpAsync(b, 500_000);
        await TopUpAsync(b, 300_000, pay: false);
        var w = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/me/wallet"));

        Assert.Equal(500_000, w.GetProperty("balanceToman").GetInt64());
        Assert.Single(w.GetProperty("transactions").EnumerateArray());
        // زمان‌ها با Z (UTC) می‌روند تا مرورگر به وقت تهران تبدیل کند
        Assert.EndsWith("Z", w.GetProperty("transactions")[0].GetProperty("createdAtUtc").GetString());
    }

    [Fact]
    public async Task Topup_amount_outside_limits_is_rejected()
    {
        var b = await MemberAsync();
        var res = await b.SendAsync(HttpMethod.Post, "/api/v1/me/wallet/topups", new { amountToman = 50_000_000, idempotencyKey = Key() });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Catalog_has_supplements_and_khashayar_merch()
    {
        var b = new Browser(factory);
        var sup = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/shop/products?kind=supplement"));
        var merch = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/shop/products?kind=merch"));
        Assert.Equal(25, sup.GetProperty("products").GetArrayLength());
        Assert.Equal(12, merch.GetProperty("products").GetArrayLength());
        Assert.All(merch.GetProperty("products").EnumerateArray(), p => Assert.True(p.GetProperty("isKhashayarBrand").GetBoolean()));
    }

    [Fact]
    public async Task Wallet_purchase_reserves_stock_debits_once_and_rejects_when_insufficient()
    {
        var (variant, branch, before) = await InStockVariantAsync();
        var b = await MemberAsync();

        var poor = await b.SendAsync(HttpMethod.Post, "/api/v1/shop/orders", Order(variant, branch, "wallet", Key()));
        var afterPoor = await StockAsync(variant, branch);
        await TopUpAsync(b, 1_000_000);
        var key = Key();
        var ok = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/shop/orders", Order(variant, branch, "wallet", key, qty: 2)));
        var again = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/shop/orders", Order(variant, branch, "wallet", key, qty: 2)));
        var order = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, $"/api/v1/me/shop-orders/{ok.GetProperty("orderId").GetInt32()}"));

        Assert.Equal(HttpStatusCode.BadRequest, poor.StatusCode);
        Assert.Equal(before, afterPoor); // برداشت ناموفق موجودی را برگرداند
        Assert.True(ok.GetProperty("completed").GetBoolean());
        Assert.Equal(ok.GetProperty("orderId").GetInt32(), again.GetProperty("orderId").GetInt32());
        Assert.Equal(before - 2, await StockAsync(variant, branch));
        Assert.Equal(1_000_000 - 2 * 380_000, await BalanceAsync(b));
        Assert.Equal("ready", order.GetProperty("status").GetString()); // تحویل حضوری
    }

    [Fact]
    public async Task Cannot_buy_more_than_branch_stock()
    {
        var (variant, branch, stock) = await InStockVariantAsync("hoodie");
        var b = await MemberAsync();
        var q = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/shop/quote",
            new { items = new[] { new { variantId = variant, quantity = stock + 1 } }, branchSlug = branch, fulfillment = "pickup" }));
        Assert.False(q.GetProperty("canCheckout").GetBoolean());
        Assert.NotNull(q.GetProperty("lines")[0].GetProperty("problem").GetString());
    }

    [Fact]
    public async Task Member_only_code_requires_active_membership_and_delivery_adds_shipping()
    {
        var (variant, branch, _) = await InStockVariantAsync();
        var b = await MemberAsync();
        var q = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/shop/quote",
            new { items = new[] { new { variantId = variant, quantity = 1 } }, branchSlug = branch, fulfillment = "delivery", discountCode = "MEMBER15" }));
        Assert.Equal(JsonValueKind.String, q.GetProperty("discountCodeError").ValueKind);
        Assert.Equal(150_000, q.GetProperty("shippingToman").GetInt64());
    }

    [Fact]
    public async Task Cancelled_gateway_payment_releases_reserved_stock()
    {
        var (variant, branch, before) = await InStockVariantAsync("towel");
        var b = await MemberAsync();
        var r = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/shop/orders", Order(variant, branch, "gateway", Key())));
        var reserved = await StockAsync(variant, branch);
        var back = await CheckoutFlowTests.PayInSandboxAsync(b, r.GetProperty("gateway"), pay: false);
        var order = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, $"/api/v1/me/shop-orders/{r.GetProperty("orderId").GetInt32()}"));

        Assert.Equal(before - 1, reserved);
        Assert.Equal($"/shop/orders/{r.GetProperty("orderId").GetInt32()}", back.Headers.Location!.OriginalString);
        Assert.Equal("cancelled", order.GetProperty("status").GetString());
        Assert.Equal(before, await StockAsync(variant, branch));
    }

    [Fact]
    public async Task Stale_unpaid_order_is_released_and_late_payment_is_refunded_to_wallet()
    {
        var (variant, branch, before) = await InStockVariantAsync("gloves");
        var b = await MemberAsync();
        var r = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/shop/orders", Order(variant, branch, "gateway", Key())));
        var orderId = r.GetProperty("orderId").GetInt32();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
            await db.ShopOrders.Where(o => o.Id == orderId).ExecuteUpdateAsync(s => s.SetProperty(o => o.CreatedAtUtc, DateTime.UtcNow.AddHours(-2)));
            await scope.ServiceProvider.GetRequiredService<IShopService>().ReleaseStaleAsync(CancellationToken.None);
        }
        var released = await StockAsync(variant, branch);
        await CheckoutFlowTests.PayInSandboxAsync(b, r.GetProperty("gateway"), pay: true); // کاربر دیر پرداخت کرد

        Assert.Equal(before, released);
        Assert.Equal(690_000, await BalanceAsync(b));
    }

    private async Task<Browser> CanteenStaffAsync()
    {
        var b = new Browser(factory);
        var phone = await b.LoginAsync();
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var u = await users.Users.FirstAsync(x => x.PhoneNumber == phone);
            await users.AddToRoleAsync(u, Roles.CanteenStaff);
            // کارمند بوفه فقط تابلوی شعبهٔ خودش را می‌بیند
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
            db.StaffBranches.Add(new StaffBranch { UserId = u.Id, BranchId = await db.Branches.Where(x => x.Slug == "ghoddousi-gharbi").Select(x => x.Id).FirstAsync() });
            await db.SaveChangesAsync();
        }
        b.AccessToken = null;
        b.AccessToken = (await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh"))).GetProperty("accessToken").GetString();
        return b;
    }

    private async Task<HubConnection> HubAsync(Browser b)
    {
        var token = b.AccessToken;
        var hub = new HubConnectionBuilder()
            .WithUrl(new Uri(factory.Server.BaseAddress, "/hubs/canteen"), o =>
            {
                o.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                o.Transports = HttpTransportType.LongPolling;
                o.AccessTokenProvider = () => Task.FromResult(token);
            }).Build();
        await hub.StartAsync();
        return hub;
    }

    [Fact]
    public async Task Canteen_order_flows_live_from_member_to_staff_board_and_back()
    {
        var member = await MemberAsync();
        await TopUpAsync(member, 1_000_000);
        var staff = await CanteenStaffAsync();
        var menu = await member.JsonAsync<JsonElement>(await member.SendAsync(HttpMethod.Get, "/api/v1/canteen/ghoddousi-gharbi/menu?table=میز ۴"));
        var shake = menu.GetProperty("items").EnumerateArray().First(i => i.GetProperty("slug").GetString() == "shake-chocolate").GetProperty("id").GetInt32();

        await using var staffHub = await HubAsync(staff);
        var staffSaw = new TaskCompletionSource<CanteenOrderDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        staffHub.On<CanteenOrderDto>("OrderChanged", o => staffSaw.TrySetResult(o));
        await staffHub.InvokeAsync("WatchBranch", "ghoddousi-gharbi");

        var placed = await member.JsonAsync<JsonElement>(await member.SendAsync(HttpMethod.Post, "/api/v1/canteen/orders",
            new { branchSlug = "ghoddousi-gharbi", tableCode = "میز ۴", items = new[] { new { itemId = shake, quantity = 2 } }, note = "بدون شکر", payMethod = "wallet", idempotencyKey = Key() }));
        var orderId = placed.GetProperty("orderId").GetInt32();
        var live = await staffSaw.Task.WaitAsync(TimeSpan.FromSeconds(10));

        await using var memberHub = await HubAsync(member);
        var memberSaw = new TaskCompletionSource<CanteenOrderDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        memberHub.On<CanteenOrderDto>("OrderChanged", o => { if (o.Status == "ready") memberSaw.TrySetResult(o); });
        await memberHub.InvokeAsync("WatchOrder", orderId);

        var badJump = await staff.SendAsync(HttpMethod.Post, $"/api/v1/canteen/staff/orders/{orderId}/status", new { status = "collected" });
        await staff.SendAsync(HttpMethod.Post, $"/api/v1/canteen/staff/orders/{orderId}/status", new { status = "preparing" });
        await staff.SendAsync(HttpMethod.Post, $"/api/v1/canteen/staff/orders/{orderId}/status", new { status = "ready" });
        var ready = await memberSaw.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var memberCannotManage = await member.SendAsync(HttpMethod.Get, "/api/v1/canteen/staff/ghoddousi-gharbi/orders");

        Assert.True(placed.GetProperty("completed").GetBoolean());
        Assert.Equal(orderId, live.Id);
        Assert.Equal("queued", live.Status);
        Assert.Equal("میز ۴", live.TableCode);
        Assert.Equal(HttpStatusCode.Conflict, badJump.StatusCode);
        Assert.Equal("ready", ready.Status);
        Assert.Null(ready.CustomerName);
        Assert.Equal(HttpStatusCode.Forbidden, memberCannotManage.StatusCode);
        Assert.Equal(1_000_000 - 2 * 285_000, await BalanceAsync(member));
    }

    [Fact]
    public async Task Staff_cancel_refunds_to_wallet_and_member_cannot_watch_others_orders()
    {
        var member = await MemberAsync();
        await TopUpAsync(member, 300_000);
        var placed = await member.JsonAsync<JsonElement>(await member.SendAsync(HttpMethod.Post, "/api/v1/canteen/orders",
            new { branchSlug = "ghoddousi-gharbi", items = new[] { new { itemId = 1, quantity = 1 } }, payMethod = "wallet", idempotencyKey = Key() }));
        var orderId = placed.GetProperty("orderId").GetInt32();
        var staff = await CanteenStaffAsync();
        await staff.SendAsync(HttpMethod.Post, $"/api/v1/canteen/staff/orders/{orderId}/status", new { status = "cancelled" });

        var other = await MemberAsync();
        await using var otherHub = await HubAsync(other);
        await Assert.ThrowsAsync<HubException>(() => otherHub.InvokeAsync("WatchOrder", orderId));
        Assert.Equal(300_000, await BalanceAsync(member));
    }
}
