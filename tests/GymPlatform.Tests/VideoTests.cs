using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using GymPlatform.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GymPlatform.Tests;

/// <summary>آپلود ویدیو: ذخیرهٔ مستقیم روی دیسک، بهینه‌سازی پس‌زمینه با ffmpeg، وضعیت و سرو با Range.</summary>
public sealed class VideoTests
{
    private static bool HasFfmpeg => GymPlatform.Api.Video.VideoOptimizer.Which("ffmpeg") is not null;

    private static string MakeClip(string args)
    {
        var path = Path.Combine(Path.GetTempPath(), $"kg-clip-{Guid.NewGuid():N}.mp4");
        var psi = new ProcessStartInfo("ffmpeg") { RedirectStandardError = true };
        foreach (var a in $"-v error -y -f lavfi -i {args} -pix_fmt yuv420p".Split(' ')) psi.ArgumentList.Add(a);
        psi.ArgumentList.Add(path);
        using var p = Process.Start(psi)!;
        p.WaitForExit();
        Assert.Equal(0, p.ExitCode);
        return path;
    }

    private static async Task<Browser> AdminAsync(GymApiFactory f)
    {
        var b = new Browser(f);
        var phone = await b.LoginAsync();
        using var scope = f.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        await users.AddToRoleAsync(await users.Users.FirstAsync(x => x.PhoneNumber == phone), Roles.SuperAdmin);
        return b;
    }

    private static MultipartFormDataContent File(byte[] bytes, string name, string type)
    {
        var c = new ByteArrayContent(bytes);
        c.Headers.ContentType = new MediaTypeHeaderValue(type);
        return new MultipartFormDataContent { { c, "file", name } };
    }

    private static async Task<JsonElement> UploadAndWaitAsync(Browser admin, string clip)
    {
        var up = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/videos", content: File(await System.IO.File.ReadAllBytesAsync(clip), "clip.mp4", "video/mp4"));
        Assert.Equal(HttpStatusCode.Created, up.StatusCode);
        var body = await admin.JsonAsync<JsonElement>(up);
        Assert.True(body.GetProperty("optimizing").GetBoolean());
        var id = body.GetProperty("video").GetString()!;
        Assert.Matches("^[a-f0-9]{32}$", id);
        Assert.Equal($"/media/videos/{id}.mp4", body.GetProperty("url").GetString());
        for (var i = 0; i < 240; i++)
        {
            var st = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Get, $"/api/v1/panel/admin/uploads/{id}/status"));
            if (st.GetProperty("ready").GetBoolean() || st.GetProperty("failed").ValueKind == JsonValueKind.String) return st;
            await Task.Delay(500);
        }
        throw new TimeoutException("video not processed");
    }

    [Fact]
    public async Task Uploaded_clip_is_optimized_into_six_files_served_with_range()
    {
        if (!HasFfmpeg) return;
        using var f = new GymApiFactory();
        var admin = await AdminAsync(f);
        var clip = MakeClip("testsrc=size=640x360:rate=24:duration=1");
        try
        {
            var st = await UploadAndWaitAsync(admin, clip);
            Assert.True(st.GetProperty("ready").GetBoolean(), st.ToString());
            var poster = st.GetProperty("poster").GetString()!;
            var id = poster[(poster.LastIndexOf('/') + 1)..^4];
            foreach (var suffix in new[] { "-scrub.mp4", "-scrub-720.mp4", "-scrub-540.mp4", ".mp4", ".jpg", "-960.jpg" })
            {
                var res = await admin.SendAsync(HttpMethod.Get, $"/media/videos/{id}{suffix}");
                Assert.True(res.StatusCode == HttpStatusCode.OK, suffix);
                Assert.Equal("public, max-age=3600", res.Headers.CacheControl?.ToString());
            }
            var range = new HttpRequestMessage(HttpMethod.Get, $"/media/videos/{id}-scrub.mp4");
            range.Headers.Range = new RangeHeaderValue(0, 99);
            var part = await f.CreateClient(new() { BaseAddress = new Uri("https://localhost") }).SendAsync(range);
            Assert.Equal(HttpStatusCode.PartialContent, part.StatusCode);
            // نام‌های غیرمجاز سرو نمی‌شوند (نسخهٔ اصلی و فایل وضعیت)
            Assert.Equal(HttpStatusCode.NotFound, (await admin.SendAsync(HttpMethod.Get, $"/media/videos/{id}.orig.mp4")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await admin.SendAsync(HttpMethod.Get, $"/media/videos/{id}.ready")).StatusCode);

            // ذخیره در تنظیمات: سرور خودش «بهینه‌شده» را تعیین می‌کند
            var cfg = await admin.JsonAsync<Dictionary<string, JsonElement>>(await admin.SendAsync(HttpMethod.Get, "/api/v1/panel/admin/site"));
            var home = JsonSerializer.Deserialize<Dictionary<string, object?>>(cfg["home"].GetRawText())!;
            home["video"] = new { title = "تست", videoUrl = $"/media/videos/{id}.mp4", posterUrl = poster, mode = "scrub", optimized = false };
            var body = cfg.ToDictionary(k => k.Key, k => (object?)k.Value);
            body["home"] = home;
            var saved = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Put, "/api/v1/panel/admin/site", body));
            Assert.True(saved.GetProperty("home").GetProperty("video").GetProperty("optimized").GetBoolean());
        }
        finally { System.IO.File.Delete(clip); }
    }

    [Theory]
    [InlineData("testsrc=size=64x36:rate=1:duration=61", "۶۰ ثانیه")]
    [InlineData("testsrc=size=4000x2250:rate=1:duration=1", "4K")]
    public async Task Too_long_or_above_4k_fails_with_reason(string source, string reason)
    {
        if (!HasFfmpeg) return;
        using var f = new GymApiFactory();
        var admin = await AdminAsync(f);
        var clip = MakeClip(source);
        try
        {
            var st = await UploadAndWaitAsync(admin, clip);
            Assert.False(st.GetProperty("ready").GetBoolean());
            Assert.Contains(reason, st.GetProperty("failed").GetString());
        }
        finally { System.IO.File.Delete(clip); }
    }

    [Fact]
    public async Task Non_mp4_upload_is_rejected()
    {
        using var f = new GymApiFactory();
        var admin = await AdminAsync(f);
        var res = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/videos", content: File("not a video at all"u8.ToArray(), "x.mp4", "video/mp4"));
        Assert.True(res.StatusCode == HttpStatusCode.BadRequest, await res.Content.ReadAsStringAsync());
        var member = new Browser(f);
        await member.LoginAsync();
        Assert.Equal(HttpStatusCode.Forbidden, (await member.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/videos", content: File([0, 0, 0, 0, (byte)'f', (byte)'t', (byte)'y', (byte)'p'], "x.mp4", "video/mp4"))).StatusCode);
    }
}
