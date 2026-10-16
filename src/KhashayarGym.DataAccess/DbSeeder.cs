using System.Text.Json;
using System.Text.Json.Serialization;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace KhashayarGym.DataAccess;

/// <summary>
/// دادهٔ نمونهٔ دمو را از فایل‌های JSON پوشهٔ Seed می‌خواند.
/// برای اصلاح شعبه‌ها فقط Seed/branches.json را ویرایش کنید.
/// </summary>
public class DbSeeder(GymDbContext db, ILogger<DbSeeder> logger)
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public async Task SeedAsync(string seedDir, CancellationToken ct = default)
    {
        if (!await db.Branches.AnyAsync(ct))
        {
            var branches = Read<List<BranchSeed>>(seedDir, "branches.json");
            var order = 0;
            foreach (var s in branches)
            {
                db.Branches.Add(new Branch
                {
                    Slug = s.Slug, Name = s.Name, District = s.District, Address = s.Address,
                    Phone = s.Phone, Latitude = s.Latitude, Longitude = s.Longitude,
                    Sections = s.Sections, AddressConfirmed = s.AddressConfirmed,
                    MenHours = s.MenHours, WomenHours = s.WomenHours,
                    Disciplines = s.Disciplines ?? [], SortOrder = order++
                });
            }
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded {Count} branches", branches.Count);
        }

        if (!await db.Packages.AnyAsync(ct))
        {
            var packages = Read<List<MembershipPackage>>(seedDir, "packages.json");
            for (var i = 0; i < packages.Count; i++) packages[i].SortOrder = i;
            db.Packages.AddRange(packages);
            await db.SaveChangesAsync(ct);
        }

        if (!await db.Coaches.AnyAsync(ct))
        {
            var branchIds = await db.Branches.ToDictionaryAsync(b => b.Slug, b => b.Id, ct);
            var coaches = Read<List<CoachSeed>>(seedDir, "coaches.json");
            var order = 0;
            foreach (var c in coaches)
            {
                db.Coaches.Add(new Coach
                {
                    Slug = c.Slug, FullName = c.FullName, Specialty = c.Specialty, Bio = c.Bio,
                    YearsOfExperience = c.YearsOfExperience, Section = c.Section,
                    Achievements = c.Achievements ?? [], BranchId = branchIds[c.BranchSlug],
                    SortOrder = order++
                });
            }
            await db.SaveChangesAsync(ct);
        }

        if (!await db.FaqItems.AnyAsync(ct))
        {
            var faq = Read<List<FaqItem>>(seedDir, "faq.json");
            for (var i = 0; i < faq.Count; i++) faq[i].SortOrder = i;
            db.FaqItems.AddRange(faq);
            await db.SaveChangesAsync(ct);
        }

        if (!await db.ContractTemplates.AnyAsync(ct))
        {
            var c = Read<ContractSeed>(seedDir, "contract.json");
            db.ContractTemplates.Add(new ContractTemplate
            {
                Version = 1, Title = c.Title, Clauses = c.Clauses, HealthQuestions = c.HealthQuestions,
                IsActive = true, PublishedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync(ct);
        }

        if (!await db.DiscountCodes.AnyAsync(ct))
        {
            // کدهای تخفیف دمو (روی قیمت پس از جشنواره اعمال می‌شوند)
            db.DiscountCodes.AddRange(
                new DiscountCode { Code = "KHASHAYAR10", Percent = 10, MaxUses = 500 },
                new DiscountCode { Code = "WELCOME5", Percent = 5 },
                // فروشگاه: فقط برای اعضای دارای عضویت فعال
                new DiscountCode { Code = "MEMBER15", Percent = 15, Scope = DiscountScope.Shop, MembersOnly = true });
            await db.SaveChangesAsync(ct);
        }

        if (!await db.Products.AnyAsync(ct) && File.Exists(Path.Combine(seedDir, "products.json")))
        {
            var products = Read<List<ProductSeed>>(seedDir, "products.json");
            var branchIds = await db.Branches.OrderBy(b => b.Id).Select(b => b.Id).ToListAsync(ct);
            var n = 0;
            foreach (var s in products)
            {
                var product = new Product
                {
                    Slug = s.Slug, Name = s.Name, BrandName = s.BrandName, Kind = s.Kind, Category = s.Category, Description = s.Description,
                    ImagePath = s.ImagePath, PriceToman = s.PriceToman, IsKhashayarBrand = s.IsKhashayarBrand, SortOrder = s.SortOrder,
                    Highlights = s.Highlights ?? [],
                };
                var vi = 0;
                foreach (var v in s.Variants)
                {
                    var variant = new ProductVariant
                    {
                        Sku = $"{s.Slug}-{++vi}".ToUpperInvariant(), Size = v.Size, Color = v.Color, ColorHex = v.ColorHex, Flavor = v.Flavor,
                    };
                    // موجودی نمونه و قابل‌تکرار: بیشتر شعبه‌ها چند عدد، بعضی صفر (برای نمایش «ناموجود در این شعبه»)
                    foreach (var b in branchIds)
                    {
                        var q = (n * 7 + b * 5 + vi * 3) % 13;
                        variant.Stocks.Add(new BranchStock { BranchId = b, Quantity = q < 3 ? 0 : q });
                    }
                    product.Variants.Add(variant);
                    n++;
                }
                db.Products.Add(product);
            }
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded {Count} products", products.Count);
        }

        if (!await db.CanteenItems.AnyAsync(ct) && File.Exists(Path.Combine(seedDir, "canteen.json")))
        {
            foreach (var c in Read<List<CanteenSeed>>(seedDir, "canteen.json"))
                db.CanteenItems.Add(new CanteenItem
                {
                    Slug = c.Slug, Name = c.Name, Description = string.IsNullOrEmpty(c.Description) ? null : c.Description, Category = c.Category,
                    PriceToman = c.PriceToman, Kcal = c.Kcal, ProteinG = c.ProteinG, ImagePath = c.ImagePath, SortOrder = c.SortOrder,
                });
            await db.SaveChangesAsync(ct);
        }

        if (!await db.Roles.AnyAsync(ct))
        {
            foreach (var r in Roles.All)
                db.Roles.Add(new AppRole(r) { NormalizedName = r.ToUpperInvariant(), ConcurrencyStamp = Guid.NewGuid().ToString() });
            await db.SaveChangesAsync(ct);
        }

        if (!await db.Campaigns.AnyAsync(ct))
        {
            // جشنوارهٔ فعال دمو: از امروز تا ۲۱ روز بعد، تا شمارش معکوس همیشه زنده باشد.
            var now = DateTime.UtcNow;
            db.Campaigns.Add(new Campaign
            {
                Title = "جشنوارهٔ پاییزی خشایار",
                Description = "۲۰٪ تخفیف پکیج‌های سه، شش و دوازده‌ماهه — فقط تا پایان جشنواره",
                StartsAtUtc = now.Date,
                EndsAtUtc = now.Date.AddDays(21),
                DiscountPercent = 20,
                EligiblePackageSlugs = ["quarter", "half-year", "yearly"]
            });
            await db.SaveChangesAsync(ct);
        }
    }

    private static T Read<T>(string dir, string file) =>
        JsonSerializer.Deserialize<T>(File.ReadAllText(Path.Combine(dir, file)), Json)
        ?? throw new InvalidOperationException($"Seed file {file} is empty.");

    private sealed record BranchSeed(
        string Slug, string Name, string District, string Address, string? Phone,
        double Latitude, double Longitude, GenderSection Sections, bool AddressConfirmed,
        string? MenHours, string? WomenHours, List<string>? Disciplines);

    private sealed record CoachSeed(
        string Slug, string FullName, string Specialty, string? Bio, int YearsOfExperience,
        GenderSection Section, string BranchSlug, List<string>? Achievements);
}

internal sealed record ProductSeed(
    string Slug, string Name, string BrandName, ProductKind Kind, string Category, long PriceToman, string? Description,
    List<string>? Highlights, string ImagePath, bool IsKhashayarBrand, int SortOrder, List<VariantSeed> Variants);
internal sealed record VariantSeed(string? Size, string? Color, string? ColorHex, string? Flavor);
internal sealed record CanteenSeed(
    string Slug, string Name, CanteenCategory Category, long PriceToman, string? Description, int? Kcal, int? ProteinG, string ImagePath, int SortOrder);

internal sealed record ContractSeed(string Title, List<string> Clauses, List<string> HealthQuestions);
