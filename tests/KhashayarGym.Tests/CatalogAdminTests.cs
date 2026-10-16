using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace KhashayarGym.Tests;

/// <summary>ساخت و ویرایش منو، کالا و پکیج: فقط مدیر کل؛ آپلود فقط عکس واقعی.</summary>
public class CatalogAdminTests(GymApiFactory factory) : IClassFixture<GymApiFactory>
{
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
        return b;
    }

    private static MultipartFormDataContent File(byte[] bytes, string name, string type)
    {
        var c = new ByteArrayContent(bytes);
        c.Headers.ContentType = new MediaTypeHeaderValue(type);
        return new MultipartFormDataContent { { c, "file", name } };
    }

    private static readonly byte[] Png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    [Fact]
    public async Task Super_admin_adds_menu_item_with_uploaded_photo_and_it_appears_on_branch_menus()
    {
        var admin = await StaffAsync(Roles.SuperAdmin);
        var up = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/images", content: File(Png, "shake.png", "image/png"));
        var path = (await admin.JsonAsync<JsonElement>(up)).GetProperty("path").GetString()!;
        var image = await admin.SendAsync(HttpMethod.Get, path);

        var created = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/canteen-items", new
        {
            name = "شیک خرما و بادام", description = "با شیر کم‌چرب", category = "shake", priceToman = 210_000, kcal = 380, proteinG = 22, imagePath = path, isAvailable = true,
        });
        var item = await admin.JsonAsync<JsonElement>(created);
        var menu = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Get, "/api/v1/canteen/maaliabad/menu"));
        var removed = await admin.SendAsync(HttpMethod.Delete, $"/api/v1/panel/admin/canteen-items/{item.GetProperty("id").GetInt32()}");

        Assert.Equal(HttpStatusCode.Created, up.StatusCode);
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.StartsWith("/media/uploads/", path);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Contains(menu.GetProperty("items").EnumerateArray(), i => i.GetProperty("name").GetString() == "شیک خرما و بادام" && i.GetProperty("priceToman").GetInt64() == 210_000);
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
    }

    [Fact]
    public async Task Upload_rejects_svg_and_fake_images()
    {
        var admin = await StaffAsync(Roles.SuperAdmin);
        var svg = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/images",
            content: File("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"u8.ToArray(), "x.svg", "image/svg+xml"));
        var fake = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/images", content: File("not really a png"u8.ToArray(), "x.png", "image/png"));
        var badPath = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/canteen-items", new
        {
            name = "آیتم", description = (string?)null, category = "snack", priceToman = 50_000, kcal = (int?)null, proteinG = (int?)null, imagePath = "https://evil.example/x.png", isAvailable = true,
        });

        Assert.Equal(HttpStatusCode.BadRequest, svg.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, fake.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badPath.StatusCode);
    }

    [Fact]
    public async Task Branch_manager_can_toggle_availability_but_cannot_add_edit_or_price_menu_items()
    {
        var mgr = await StaffAsync(Roles.BranchManager, "ghoddousi-gharbi");
        var items = await mgr.JsonAsync<JsonElement>(await mgr.SendAsync(HttpMethod.Get, "/api/v1/panel/admin/canteen-items"));
        var first = items[0];
        var id = first.GetProperty("id").GetInt32();
        var price = first.GetProperty("priceToman").GetInt64();

        var toggle = await mgr.SendAsync(HttpMethod.Put, $"/api/v1/panel/admin/canteen-items/{id}", new { priceToman = price, isAvailable = false });
        var reprice = await mgr.SendAsync(HttpMethod.Put, $"/api/v1/panel/admin/canteen-items/{id}", new { priceToman = price + 10_000, isAvailable = false });
        var add = await mgr.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/canteen-items", new { name = "x", category = "snack", priceToman = 50_000, imagePath = "/media/canteen/water.svg", isAvailable = true });
        var upload = await mgr.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/images", content: File(Png, "a.png", "image/png"));
        await mgr.SendAsync(HttpMethod.Put, $"/api/v1/panel/admin/canteen-items/{id}", new { priceToman = price, isAvailable = true });

        Assert.Equal(HttpStatusCode.OK, toggle.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, reprice.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, add.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, upload.StatusCode);
    }

    [Fact]
    public async Task Super_admin_creates_product_with_variants_and_new_package_but_purchased_package_cannot_be_deleted()
    {
        var admin = await StaffAsync(Roles.SuperAdmin);
        var created = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/products", new
        {
            name = "هودی زمستانی تست", brandName = "خشایار", kind = "apparel", category = "هودی", description = (string?)null, priceToman = 1_450_000,
            imagePath = "/media/shop/bottle-1l.svg", isActive = true, highlights = new[] { "پنبهٔ ضخیم" },
            variants = new[]
            {
                new { id = (int?)null, size = "M", color = "مشکی", colorHex = "#111111", flavor = (string?)null, priceToman = (long?)null },
                new { id = (int?)null, size = "L", color = "مشکی", colorHex = "#111111", flavor = (string?)null, priceToman = (long?)1_550_000 },
            },
        });
        var p = await admin.JsonAsync<JsonElement>(created);
        var detail = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Get, $"/api/v1/shop/products/{p.GetProperty("slug").GetString()}"));

        var pkg = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/packages", new
        {
            name = "دوماهه — ۲۴ جلسه", tagline = (string?)null, category = "Gym", durationMonths = 2, sessions = 24, priceToman = 3_400_000,
            features = new[] { "دسترسی به همهٔ دستگاه‌ها" }, isActive = true, isFeatured = false,
        });
        var packages = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Get, "/api/v1/packages"));
        int boughtId;
        using (var s = factory.Services.CreateScope())
            boughtId = await s.ServiceProvider.GetRequiredService<GymDbContext>().Packages.Where(x => x.Slug == "quarter").Select(x => x.Id).FirstAsync();
        using (var s = factory.Services.CreateScope())
        {
            var db = s.ServiceProvider.GetRequiredService<GymDbContext>();
            if (!await db.Memberships.AnyAsync(m => m.PackageId == boughtId))
            {
                var u = await db.Users.FirstAsync();
                db.Memberships.Add(new Membership { UserId = u.Id, BranchId = await db.Branches.Select(b => b.Id).FirstAsync(), PackageId = boughtId, CardToken = Guid.NewGuid().ToString("N") });
                await db.SaveChangesAsync();
            }
        }
        var delBought = await admin.SendAsync(HttpMethod.Delete, $"/api/v1/panel/admin/packages/{boughtId}");

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(2, detail.GetProperty("variants").GetArrayLength());
        Assert.Contains(detail.GetProperty("variants").EnumerateArray(), v => v.GetProperty("priceToman").GetInt64() == 1_550_000);
        Assert.Equal(HttpStatusCode.Created, pkg.StatusCode);
        Assert.Contains(packages.EnumerateArray(), x => x.GetProperty("name").GetString() == "دوماهه — ۲۴ جلسه");
        Assert.Equal(HttpStatusCode.Conflict, delBought.StatusCode);
    }

    [Fact]
    public async Task Super_admin_adds_coach_with_login_phone_who_then_gets_coach_panel_and_hiding_removes_from_site()
    {
        var admin = await StaffAsync(Roles.SuperAdmin);
        var coachPhone = "0913" + Random.Shared.Next(1_000_000, 9_999_999);
        var created = await admin.SendAsync(HttpMethod.Post, "/api/v1/panel/admin/coaches", new
        {
            fullName = "نسترن کامیاب", specialty = "پیلاتس و فانکشنال", bio = (string?)null, yearsOfExperience = 6, section = "women", branchSlug = "farhangshahr-women",
            photoUrl = (string?)null, achievements = new[] { "مربی درجهٔ ۲ فدراسیون" }, isActive = true, linkedPhone = coachPhone,
        });
        var coach = await admin.JsonAsync<JsonElement>(created);
        Assert.True(created.StatusCode == HttpStatusCode.Created, coach.ToString());
        var onSite = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Get, "/api/v1/coaches"));

        var c = new Browser(factory);
        await c.LoginAsync(coachPhone);
        var me = await c.JsonAsync<JsonElement>(await c.SendAsync(HttpMethod.Get, "/api/v1/panel/me"));
        var trainees = await c.SendAsync(HttpMethod.Get, "/api/v1/panel/coach/trainees");

        var hide = await admin.SendAsync(HttpMethod.Put, $"/api/v1/panel/admin/coaches/{coach.GetProperty("id").GetInt32()}", new
        {
            fullName = "نسترن کامیاب", specialty = "پیلاتس و فانکشنال", bio = (string?)null, yearsOfExperience = 6, section = "women", branchSlug = "farhangshahr-women",
            photoUrl = (string?)null, achievements = Array.Empty<string>(), isActive = false, linkedPhone = (string?)null,
        });
        var afterHide = await admin.JsonAsync<JsonElement>(await admin.SendAsync(HttpMethod.Get, "/api/v1/coaches"));
        var lostPanel = await c.SendAsync(HttpMethod.Get, "/api/v1/panel/coach/trainees");

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(coachPhone, coach.GetProperty("linkedPhone").GetString());
        Assert.Contains(onSite.EnumerateArray(), x => x.GetProperty("fullName").GetString() == "نسترن کامیاب");
        Assert.Equal(coach.GetProperty("id").GetInt32(), me.GetProperty("coachId").GetInt32());
        Assert.Equal(HttpStatusCode.OK, trainees.StatusCode);
        Assert.Equal(HttpStatusCode.OK, hide.StatusCode);
        Assert.DoesNotContain(afterHide.EnumerateArray(), x => x.GetProperty("fullName").GetString() == "نسترن کامیاب");
        Assert.Equal(HttpStatusCode.Forbidden, lostPanel.StatusCode); // شماره برداشته شد ← نقش مربی همان لحظه گرفته شد
    }
}
