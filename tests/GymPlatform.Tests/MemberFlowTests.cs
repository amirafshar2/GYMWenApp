using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace GymPlatform.Tests;

/// <summary>سرور آزمایشی با Sqlite موقت، محیط Testing و کد OTP در پاسخ.</summary>
public sealed class GymApiFactory : WebApplicationFactory<Program>
{
    public const string DeviceKey = "test-gate-key-0000000000000001";
    private readonly string _db = Path.Combine(Path.GetTempPath(), $"kg-test-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_db}");
        builder.UseSetting("Otp:ExposeCodeInResponse", "true");
        builder.UseSetting("Sms:Provider", "Log");
        builder.UseSetting("Payment:UseVirtualGateway", "true");
        builder.UseSetting("RateLimiting:PermitMultiplier", "100");
        builder.UseSetting("Access:DemoDeviceKey", DeviceKey);
        builder.UseSetting("Integrations:DispatcherEnabled", "false");
        builder.UseSetting("Storage:PrivateRoot", Path.Combine(Path.GetTempPath(), $"kg-test-files-{Guid.NewGuid():N}"));
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        try { File.Delete(_db); } catch (IOException) { }
    }
}

/// <summary>کلاینت شبیه مرورگر: کوکی‌ها دستی نگه داشته می‌شوند تا بشود توکن قدیمی را عمداً دوباره فرستاد.</summary>
public sealed class Browser
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _http;
    public Dictionary<string, string> Cookies { get; } = new();
    public string? Csrf { get; private set; }
    public string? AccessToken { get; set; }

    public Browser(GymApiFactory f) =>
        _http = f.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false, HandleCookies = false,
        });

    public async Task<HttpResponseMessage> SendAsync(HttpMethod m, string url, object? body = null, HttpContent? content = null)
    {
        var req = new HttpRequestMessage(m, url) { Content = content ?? (body is null ? null : JsonContent.Create(body)) };
        req.Headers.Add("X-KG-Client", "web");
        req.Headers.Add("Origin", "https://localhost");
        if (Csrf is not null) req.Headers.Add("X-XSRF-TOKEN", Csrf);
        if (AccessToken is not null) req.Headers.Authorization = new("Bearer", AccessToken);
        if (Cookies.Count > 0) req.Headers.Add("Cookie", string.Join("; ", Cookies.Select(c => $"{c.Key}={c.Value}")));
        var res = await _http.SendAsync(req);
        if (res.Headers.TryGetValues("Set-Cookie", out var set))
            foreach (var c in set)
            {
                var kv = c.Split(';')[0].Split('=', 2);
                if (kv[1].Length == 0 || c.Contains("expires=Thu, 01 Jan 1970", StringComparison.OrdinalIgnoreCase)) Cookies.Remove(kv[0]);
                else Cookies[kv[0]] = kv[1];
            }
        return res;
    }

    public async Task<T> JsonAsync<T>(HttpResponseMessage res) => (await res.Content.ReadFromJsonAsync<T>(Json))!;

    public async Task InitAsync()
    {
        var res = await SendAsync(HttpMethod.Get, "/api/v1/security/csrf");
        Csrf = (await JsonAsync<JsonElement>(res)).GetProperty("token").GetString();
    }

    /// <summary>ورود کامل با OTP؛ شمارهٔ موبایل یکتا برمی‌گرداند.</summary>
    public async Task<string> LoginAsync(string? phone = null)
    {
        phone ??= "0912" + Random.Shared.Next(1_000_000, 9_999_999);
        await InitAsync();
        var otp = await JsonAsync<JsonElement>(await SendAsync(HttpMethod.Post, "/api/v1/auth/otp", new { phoneNumber = phone }));
        var code = otp.GetProperty("demoCode").GetString();
        var res = await SendAsync(HttpMethod.Post, "/api/v1/auth/verify", new { phoneNumber = phone, code });
        res.EnsureSuccessStatusCode();
        AccessToken = (await JsonAsync<JsonElement>(res)).GetProperty("accessToken").GetString();
        return phone;
    }

    public string? RefreshCookie => Cookies.FirstOrDefault(c => c.Key.EndsWith("kg-rt")).Value;
}

public class AuthFlowTests(GymApiFactory factory) : IClassFixture<GymApiFactory>
{
    [Fact]
    public async Task Verify_with_wrong_code_returns_400_and_locks_after_max_attempts()
    {
        // Arrange
        var b = new Browser(factory);
        await b.InitAsync();
        const string phone = "09120000001";
        var otp = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/auth/otp", new { phoneNumber = phone }));
        var right = otp.GetProperty("demoCode").GetString()!;
        var wrong = right == "11111" ? "22222" : "11111";

        // Act
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.BadRequest, (await b.SendAsync(HttpMethod.Post, "/api/v1/auth/verify", new { phoneNumber = phone, code = wrong })).StatusCode);
        var afterLock = await b.SendAsync(HttpMethod.Post, "/api/v1/auth/verify", new { phoneNumber = phone, code = right });

        // Assert: بعد از ۵ تلاش اشتباه، حتی کد درست هم پذیرفته نمی‌شود (۴۲۹: کد تازه بگیرید)
        Assert.Equal(HttpStatusCode.TooManyRequests, afterLock.StatusCode);
    }

    [Fact]
    public async Task Otp_rejects_invalid_mobile()
    {
        var b = new Browser(factory);
        await b.InitAsync();
        var res = await b.SendAsync(HttpMethod.Post, "/api/v1/auth/otp", new { phoneNumber = "12345" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    private static void UseRefresh(Browser b, string token) => b.Cookies[b.Cookies.Keys.FirstOrDefault(k => k.EndsWith("kg-rt")) ?? "kg-rt"] = token;

    [Fact]
    public async Task Refresh_rotates_token_and_reuse_of_old_chain_revokes_all_sessions()
    {
        // Arrange: کاربر واقعی دو بار تازه‌سازی کرده است (first → second → third)
        var b = new Browser(factory);
        await b.LoginAsync();
        b.AccessToken = null;
        var first = b.RefreshCookie!;
        Assert.Equal(HttpStatusCode.OK, (await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh")).StatusCode);
        var second = b.RefreshCookie!;
        Assert.Equal(HttpStatusCode.OK, (await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh")).StatusCode);
        var third = b.RefreshCookie!;

        // Act: مهاجم توکن قدیمی را می‌فرستد
        UseRefresh(b, first);
        var reuse = await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh");
        UseRefresh(b, third);
        var victim = await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh");

        // Assert: همهٔ نشست‌ها باطل شده‌اند، حتی توکن فعلی کاربر واقعی
        Assert.NotEqual(first, second);
        Assert.NotEqual(second, third);
        Assert.Equal(HttpStatusCode.Unauthorized, reuse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, victim.StatusCode);
    }

    [Fact]
    public async Task Refresh_whose_response_was_lost_is_accepted_once_and_keeps_single_chain()
    {
        // Arrange: پاسخ تازه‌سازی به مرورگر نرسید (رفرش صفحه وسط درخواست)
        var b = new Browser(factory);
        await b.LoginAsync();
        b.AccessToken = null;
        var first = b.RefreshCookie!;
        await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh");
        var lost = b.RefreshCookie!;

        // Act: مرورگر دوباره با توکن قبلی می‌آید
        UseRefresh(b, first);
        var retry = await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh");
        UseRefresh(b, lost);
        var lostUse = await b.SendAsync(HttpMethod.Post, "/api/v1/auth/refresh");

        // Assert: نشست ادامه دارد و توکنِ گم‌شده دیگر کار نمی‌کند
        Assert.Equal(HttpStatusCode.OK, retry.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, lostUse.StatusCode);
    }

    [Fact]
    public async Task Refresh_without_client_header_is_rejected()
    {
        var b = new Browser(factory);
        await b.LoginAsync();
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        req.Headers.Add("Cookie", string.Join("; ", b.Cookies.Select(c => $"{c.Key}={c.Value}")));
        var res = await factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false }).SendAsync(req);
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Theory]
    [InlineData("/api/v1/me")]
    [InlineData("/api/v1/me/profile")]
    [InlineData("/api/v1/me/card.svg")]
    public async Task Member_endpoints_require_login(string url)
    {
        var b = new Browser(factory);
        Assert.Equal(HttpStatusCode.Unauthorized, (await b.SendAsync(HttpMethod.Get, url)).StatusCode);
    }

    [Fact]
    public async Task Problem_details_include_trace_id()
    {
        var b = new Browser(factory);
        await b.InitAsync();
        var res = await b.SendAsync(HttpMethod.Post, "/api/v1/auth/otp", new { phoneNumber = "x" });
        var body = await b.JsonAsync<JsonElement>(res);
        Assert.True(body.TryGetProperty("traceId", out _));
    }
}

public class CheckoutFlowTests(GymApiFactory factory) : IClassFixture<GymApiFactory>
{
    internal static object Order(string key, string section = "men") => new
    {
        branchSlug = "ghoddousi-gharbi", packageSlug = "yearly", section, discountCode = "KHASHAYAR10", idempotencyKey = key,
    };

    internal static async Task SignContractAsync(Browser b, string name, string gender)
    {
        (await b.SendAsync(HttpMethod.Put, "/api/v1/me", new { fullName = name, gender })).EnsureSuccessStatusCode();
        var c = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/contracts/active"));
        var otp = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/contracts/sign/otp"));
        var res = await b.SendAsync(HttpMethod.Post, "/api/v1/contracts/sign", new
        {
            version = c.GetProperty("version").GetInt32(), fullName = name, accepted = true,
            healthAnswers = Enumerable.Repeat(false, c.GetProperty("healthQuestions").GetArrayLength()).ToArray(),
            healthNotes = (string?)null, code = otp.GetProperty("demoCode").GetString(),
        });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
    }

    internal static Dictionary<string, string> Inputs(string html) =>
        Regex.Matches(html, "<input[^>]*>").Select(m => m.Value)
            .Select(t => (n: Regex.Match(t, "name=\"([^\"]+)\""), v: Regex.Match(t, "value=\"([^\"]*)\"")))
            .Where(x => x.n.Success).ToDictionary(x => x.n.Groups[1].Value, x => x.v.Success ? x.v.Groups[1].Value : "");

    /// <summary>کاربر در درگاه آزمایشی «پرداخت» یا «انصراف» را می‌زند و به callback برمی‌گردد.</summary>
    internal static async Task<HttpResponseMessage> PayInSandboxAsync(Browser b, JsonElement g, bool pay)
    {
        var url = new Uri(g.GetProperty("url").GetString()!).PathAndQuery;
        var form = g.GetProperty("form").EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString()!);
        var page = await (await b.SendAsync(HttpMethod.Post, url, content: new FormUrlEncodedContent(form))).Content.ReadAsStringAsync();
        var fields = Inputs(page);
        fields["CommandType"] = "Pay"; fields["IsPaid"] = pay ? "true" : "false";
        var done = await (await b.SendAsync(HttpMethod.Post, url, content: new FormUrlEncodedContent(fields))).Content.ReadAsStringAsync();
        var action = WebUtility.HtmlDecode(Regex.Match(done, "id=\"paymentForm\" action=\"([^\"]+)\"").Groups[1].Value);
        var back = Inputs(done);
        return await b.SendAsync(HttpMethod.Post, new Uri(action).PathAndQuery, content: new FormUrlEncodedContent(back));
    }

    [Fact]
    public async Task Quote_applies_festival_then_code_and_rounds_to_thousand()
    {
        var b = new Browser(factory);
        await b.InitAsync();
        var q = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/checkout/quote",
            new { branchSlug = "ghoddousi-gharbi", packageSlug = "yearly", section = "men", discountCode = "KHASHAYAR10" }));
        var total = q.GetProperty("totalToman").GetInt64();
        Assert.Equal(0, total % 1000);
        Assert.True(total < q.GetProperty("baseAmountToman").GetInt64());
        Assert.True(q.GetProperty("codeDiscountToman").GetInt64() > 0);
    }

    [Fact]
    public async Task Quote_reports_invalid_discount_code_without_failing()
    {
        var b = new Browser(factory);
        await b.InitAsync();
        var res = await b.SendAsync(HttpMethod.Post, "/api/v1/checkout/quote",
            new { branchSlug = "ghoddousi-gharbi", packageSlug = "yearly", section = "men", discountCode = "NOPE" });
        var q = await b.JsonAsync<JsonElement>(res);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(JsonValueKind.String, q.GetProperty("discountCodeError").ValueKind);
    }

    [Fact]
    public async Task Checkout_requires_name_and_signed_contract()
    {
        var b = new Browser(factory);
        await b.LoginAsync();
        var noName = await b.SendAsync(HttpMethod.Post, "/api/v1/checkout", Order(Guid.NewGuid().ToString("N")));
        (await b.SendAsync(HttpMethod.Put, "/api/v1/me", new { fullName = "علی کریمی", gender = "male" })).EnsureSuccessStatusCode();
        var noContract = await b.SendAsync(HttpMethod.Post, "/api/v1/checkout", Order(Guid.NewGuid().ToString("N")));
        Assert.Equal(HttpStatusCode.BadRequest, noName.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, noContract.StatusCode);
    }

    [Fact]
    public async Task Checkout_rejects_section_not_matching_gender()
    {
        var b = new Browser(factory);
        await b.LoginAsync();
        await SignContractAsync(b, "سارا رضایی", "female");
        var res = await b.SendAsync(HttpMethod.Post, "/api/v1/checkout", Order(Guid.NewGuid().ToString("N"), "men"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Paid_checkout_activates_membership_once_and_is_idempotent()
    {
        // Arrange
        var b = new Browser(factory);
        await b.LoginAsync();
        await SignContractAsync(b, "علی کریمی", "male");
        var key = Guid.NewGuid().ToString("N");
        var g = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/checkout", Order(key)));
        var id = g.GetProperty("paymentId").GetInt32();

        // Act
        var callback = await PayInSandboxAsync(b, g, pay: true);
        var again = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/checkout", Order(key)));
        var payment = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, $"/api/v1/me/payments/{id}"));
        var profile = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/me/profile"));
        var pdf = await b.SendAsync(HttpMethod.Get, $"/api/v1/me/payments/{id}/invoice.pdf");
        var card = await b.SendAsync(HttpMethod.Get, "/api/v1/me/card.svg");

        // Assert
        Assert.Equal(HttpStatusCode.Redirect, callback.StatusCode);
        Assert.Equal($"/join/result?id={id}", callback.Headers.Location!.OriginalString);
        Assert.True(again.GetProperty("alreadyPaid").GetBoolean());
        Assert.Equal("succeeded", payment.GetProperty("status").GetString());
        Assert.StartsWith("KG-", payment.GetProperty("invoiceNumber").GetString());
        Assert.Single(profile.GetProperty("memberships").EnumerateArray());
        Assert.True(profile.GetProperty("active").GetProperty("isActive").GetBoolean());
        Assert.Equal("application/pdf", pdf.Content.Headers.ContentType!.MediaType);
        Assert.StartsWith("%PDF", await pdf.Content.ReadAsStringAsync());
        Assert.Equal("image/svg+xml", card.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Cancelled_payment_does_not_activate_membership()
    {
        var b = new Browser(factory);
        await b.LoginAsync();
        await SignContractAsync(b, "رضا محمدی", "male");
        var g = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Post, "/api/v1/checkout", Order(Guid.NewGuid().ToString("N"))));
        var id = g.GetProperty("paymentId").GetInt32();

        await PayInSandboxAsync(b, g, pay: false);
        var payment = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, $"/api/v1/me/payments/{id}"));
        var invoice = await b.SendAsync(HttpMethod.Get, $"/api/v1/me/payments/{id}/invoice.pdf");

        Assert.Equal("failed", payment.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, payment.GetProperty("membership").ValueKind);
        Assert.Equal(HttpStatusCode.NotFound, invoice.StatusCode);
    }

    [Fact]
    public async Task User_cannot_read_another_users_payment()
    {
        var owner = new Browser(factory);
        await owner.LoginAsync();
        await SignContractAsync(owner, "مریم احمدی", "female");
        var g = await owner.JsonAsync<JsonElement>(await owner.SendAsync(HttpMethod.Post, "/api/v1/checkout",
            Order(Guid.NewGuid().ToString("N"), "women")));
        var id = g.GetProperty("paymentId").GetInt32();

        var other = new Browser(factory);
        await other.LoginAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await other.SendAsync(HttpMethod.Get, $"/api/v1/me/payments/{id}")).StatusCode);
    }
}
