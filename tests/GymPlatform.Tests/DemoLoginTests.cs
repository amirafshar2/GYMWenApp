using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;

namespace GymPlatform.Tests;

/// <summary>ورود یک‌کلیکی نسخهٔ نمایشی: فقط حساب‌های دمو، و فقط وقتی کد ورود روی صفحه است.</summary>
public sealed class DemoLoginTests
{
    [Fact]
    public async Task Demo_login_works_only_for_demo_accounts()
    {
        using var f = new GymApiFactory();
        using var demo = f.WithWebHostBuilder(b => b.UseSetting("Demo:StaffPhone", "09100000000"));
        var http = demo.CreateClient(new() { BaseAddress = new Uri("https://localhost"), HandleCookies = false });

        var csrfRes = await Send(http, HttpMethod.Get, "/api/v1/security/csrf", null, null, null);
        var cookie = csrfRes.Headers.GetValues("Set-Cookie").First().Split(';')[0];
        var csrf = JsonDocument.Parse(await csrfRes.Content.ReadAsStringAsync()).RootElement.GetProperty("token").GetString();

        var ok = await Send(http, HttpMethod.Post, "/api/v1/auth/demo", new { phoneNumber = "09100000000" }, csrf, cookie);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        Assert.Contains("accessToken", await ok.Content.ReadAsStringAsync());

        var stranger = await Send(http, HttpMethod.Post, "/api/v1/auth/demo", new { phoneNumber = "09121234567" }, csrf, cookie);
        Assert.Equal(HttpStatusCode.NotFound, stranger.StatusCode);

        var site = await Send(http, HttpMethod.Get, "/api/v1/site", null, null, null);
        Assert.Contains("\"demo\":true", await site.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Demo_login_is_off_when_code_is_not_shown()
    {
        using var f = new GymApiFactory();
        using var real = f.WithWebHostBuilder(b => { b.UseSetting("Demo:StaffPhone", "09100000000"); b.UseSetting("Otp:ExposeCodeInResponse", "false"); });
        var http = real.CreateClient(new() { BaseAddress = new Uri("https://localhost"), HandleCookies = false });
        var csrfRes = await Send(http, HttpMethod.Get, "/api/v1/security/csrf", null, null, null);
        var cookie = csrfRes.Headers.GetValues("Set-Cookie").First().Split(';')[0];
        var csrf = JsonDocument.Parse(await csrfRes.Content.ReadAsStringAsync()).RootElement.GetProperty("token").GetString();

        var res = await Send(http, HttpMethod.Post, "/api/v1/auth/demo", new { phoneNumber = "09100000000" }, csrf, cookie);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    private static Task<HttpResponseMessage> Send(HttpClient http, HttpMethod m, string url, object? body, string? csrf, string? cookie)
    {
        var req = new HttpRequestMessage(m, url) { Content = body is null ? null : System.Net.Http.Json.JsonContent.Create(body) };
        req.Headers.Add("X-KG-Client", "web");
        req.Headers.Add("Origin", "https://localhost");
        if (csrf is not null) req.Headers.Add("X-XSRF-TOKEN", csrf);
        if (cookie is not null) req.Headers.Add("Cookie", cookie);
        return http.SendAsync(req);
    }
}
