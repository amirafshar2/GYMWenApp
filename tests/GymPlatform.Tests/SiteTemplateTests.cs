using System.IO.Compression;
using System.Net;
using System.Text.Json;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GymPlatform.Tests;

/// <summary>قالب: تنظیمات سایت از پنل، نصب خام با دستیار راه‌اندازی، و بستهٔ محتوا برای نصب تازه.</summary>
public sealed class SiteTemplateTests
{
    private static async Task<Browser> SuperAsync(GymApiFactory f, string? phone = null)
    {
        var b = new Browser(f);
        phone = await b.LoginAsync(phone);
        using var scope = f.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var u = await users.Users.FirstAsync(x => x.PhoneNumber == phone);
        if (!await users.IsInRoleAsync(u, Roles.SuperAdmin)) await users.AddToRoleAsync(u, Roles.SuperAdmin);
        return b;
    }

    [Fact]
    public async Task Demo_install_has_fictional_brand_and_owner_edits_show_on_public_site()
    {
        using var f = new GymApiFactory();
        var anon = new Browser(f);
        var site = await anon.JsonAsync<JsonElement>(await anon.SendAsync(HttpMethod.Get, "/api/v1/site"));
        Assert.Equal("Demo", site.GetProperty("mode").GetString());
        Assert.True(site.GetProperty("published").GetBoolean());
        Assert.Equal("آهن‌کوه", site.GetProperty("brand").GetProperty("shortName").GetString());

        var admin = await SuperAsync(f);
        var cfg = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Get, "/api/v1/panel/admin/site"));
        var edited = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(cfg.GetRawText())!;
        var body = new Dictionary<string, object?>(edited.ToDictionary(k => k.Key, k => (object?)k.Value))
        {
            ["brand"] = new { name = "باشگاه‌های نمونه", shortName = "نمونه", latinName = "NAMOONEH GYM", city = "کرج", logoUrl = "/brand/demo-logo.svg" },
            ["theme"] = new { primary = "#aa2233", accent = "#FFB400", dark = "#111111" },
            ["contact"] = new { phone = "۰۲۶ ۱۲۳۴ ۵۶۷۸", instagram = "https://instagram.com/namooneh" },
        };
        var saved = await admin.SendAsync(HttpMethod.Put, "/api/v1/panel/admin/site", body);
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        var after = await anon.JsonAsync<JsonElement>(await anon.SendAsync(HttpMethod.Get, "/api/v1/site"));
        Assert.Equal("نمونه", after.GetProperty("brand").GetProperty("shortName").GetString());
        Assert.Equal("#AA2233", after.GetProperty("theme").GetProperty("primary").GetString());
        Assert.Equal("02612345678", after.GetProperty("contact").GetProperty("phone").GetString());
        // ترتیب بخش‌ها همیشه کامل است حتی اگر فرم چیزی نفرستد
        Assert.Equal(12, after.GetProperty("home").GetProperty("sections").GetArrayLength());
    }

    [Fact]
    public async Task Site_settings_reject_bad_colors_foreign_images_and_links()
    {
        using var f = new GymApiFactory();
        var admin = await SuperAsync(f);
        var res = await admin.SendAsync(HttpMethod.Put, "/api/v1/panel/admin/site", new
        {
            brand = new { name = "x", shortName = "x", logoUrl = "https://evil.example/logo.png" },
            theme = new { primary = "red", accent = "#FFB400", dark = "#111111" },
            contact = new { phone = "", instagram = "https://evil.example/me" },
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var text = await res.Content.ReadAsStringAsync();
        Assert.Contains("theme.primary", text);
        Assert.Contains("brand.logoUrl", text);
        Assert.Contains("contact.instagram", text);

        // کارمند غیر مدیر کل دسترسی ندارد
        var member = new Browser(f);
        await member.LoginAsync();
        Assert.Equal(HttpStatusCode.Forbidden, (await member.SendAsync(HttpMethod.Get, "/api/v1/panel/admin/site")).StatusCode);
    }

    [Fact]
    public async Task Blank_install_starts_empty_and_guide_blocks_publish_until_basics_are_done()
    {
        const string owner = "09127770001";
        using var f = new GymApiFactory { Extra = [("Setup:Mode", "Blank"), ("Setup:OwnerPhone", owner)] };
        var anon = new Browser(f);
        var site = await anon.JsonAsync<JsonElement>(await anon.SendAsync(HttpMethod.Get, "/api/v1/site"));
        Assert.Equal("Blank", site.GetProperty("mode").GetString());
        Assert.False(site.GetProperty("published").GetBoolean());
        Assert.Equal(0, site.GetProperty("branches").GetInt32());
        Assert.Equal("", site.GetProperty("brand").GetProperty("name").GetString());
        Assert.Equal(0, (await anon.JsonAsync<JsonElement>(await anon.SendAsync(HttpMethod.Get, "/api/v1/packages"))).GetArrayLength());

        // مالک بدون هیچ کار دستی مدیر کل است
        var b = new Browser(f);
        await b.LoginAsync(owner);
        var setup = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/panel/admin/setup"));
        Assert.Equal(0, setup.GetProperty("doneCount").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, (await b.SendAsync(HttpMethod.Put, "/api/v1/panel/admin/setup", new { publish = true })).StatusCode);

        // مرحله به مرحله
        var cfg = await b.JsonAsync<JsonElement>(await b.SendAsync(HttpMethod.Get, "/api/v1/panel/admin/site"));
        var dict = JsonSerializer.Deserialize<Dictionary<string, object?>>(cfg.GetRawText())!;
        dict["brand"] = new { name = "باشگاه تست", shortName = "تست", city = "قزوین", logoUrl = "/brand/demo-logo.svg" };
        dict["contact"] = new { phone = "09127770001" };
        Assert.Equal(HttpStatusCode.OK, (await b.SendAsync(HttpMethod.Put, "/api/v1/panel/admin/site", dict)).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await b.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/branches", new
        {
            name = "شعبهٔ مرکزی", district = "مرکز شهر", address = "خیابان اصلی، پلاک ۱", phone = "02833334444", latitude = 36.27, longitude = 50.0,
            section = "both", menHours = "۶ تا ۱۴", womenHours = "۱۴ تا ۲۲", disciplines = new[] { "بدنسازی", "یوگا" },
        })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await b.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/packages", new
        {
            name = "یک‌ماهه", tagline = (string?)null, category = "Gym", durationMonths = 1, sessions = (int?)null, priceToman = 2_000_000, features = new[] { "ورود نامحدود" }, isActive = true, isFeatured = false,
        })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await b.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/contracts", new
        {
            title = "قرارداد عضویت", clauses = new[] { "عضو مقررات سالن را رعایت می‌کند." }, healthQuestions = new[] { "بیماری قلبی دارید؟" },
        })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await b.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/coaches", new
        {
            fullName = "مربی تست", specialty = "بدنسازی", bio = (string?)null, yearsOfExperience = 3, section = "men",
            branchSlug = (await anon.JsonAsync<JsonElement>(await anon.SendAsync(HttpMethod.Get, "/api/v1/branches")))[0].GetProperty("slug").GetString(),
            photoUrl = (string?)null, achievements = Array.Empty<string>(), isActive = true, linkedPhone = (string?)null,
        })).StatusCode);

        var publish = await b.SendAsync(HttpMethod.Put, "/api/v1/panel/admin/setup", new { publish = true });
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);
        var done = await b.JsonAsync<JsonElement>(publish);
        Assert.True(done.GetProperty("published").GetBoolean());
        var live = await anon.JsonAsync<JsonElement>(await anon.SendAsync(HttpMethod.Get, "/api/v1/site?fresh=1"));
        Assert.True(live.GetProperty("published").GetBoolean());
        Assert.Equal("تست", live.GetProperty("brand").GetProperty("shortName").GetString());
        Assert.Equal(1, live.GetProperty("branches").GetInt32());
    }

    [Fact]
    public async Task Content_package_exports_without_members_and_installs_a_twin_site()
    {
        var zipPath = Path.Combine(Path.GetTempPath(), $"kg-content-{Guid.NewGuid():N}.zip");
        int branches, packages;
        using (var src = new GymApiFactory())
        {
            var admin = await SuperAsync(src);
            var res = await admin.SendAsync(HttpMethod.Get, "/api/v1/panel/admin/content/export");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal("application/zip", res.Content.Headers.ContentType?.MediaType);
            await File.WriteAllBytesAsync(zipPath, await res.Content.ReadAsByteArrayAsync());
            using var scope = src.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
            branches = await db.Branches.CountAsync(x => x.IsActive);
            packages = await db.Packages.CountAsync(x => x.IsActive);
        }
        using (var zip = ZipFile.OpenRead(zipPath))
        {
            var names = zip.Entries.Select(e => e.FullName).ToList();
            Assert.Contains("site.json", names);
            Assert.Contains("branches.json", names);
            Assert.Contains("products.json", names);
            var all = string.Join("\n", zip.Entries.Where(e => e.FullName.EndsWith(".json")).Select(e => new StreamReader(e.Open()).ReadToEnd()));
            Assert.DoesNotContain("phoneNumber", all, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("0939100", all); // اعضای نمایشی
        }

        try
        {
            using var twin = new GymApiFactory { Extra = [("Setup:Mode", "Content"), ("Setup:ContentFile", zipPath)] };
            var anon = new Browser(twin);
            var site = await anon.JsonAsync<JsonElement>(await anon.SendAsync(HttpMethod.Get, "/api/v1/site"));
            Assert.Equal("Content", site.GetProperty("mode").GetString());
            Assert.Equal("آهن‌کوه", site.GetProperty("brand").GetProperty("shortName").GetString());
            Assert.Equal(branches, site.GetProperty("branches").GetInt32());
            Assert.Equal(packages, (await anon.JsonAsync<JsonElement>(await anon.SendAsync(HttpMethod.Get, "/api/v1/packages"))).GetArrayLength());
            using var scope = twin.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GymDbContext>();
            Assert.False(await db.Memberships.AnyAsync());
            Assert.False(await db.DiscountCodes.AnyAsync()); // کد تخفیف نمایشی منتقل نمی‌شود
        }
        finally { File.Delete(zipPath); }
    }
}
