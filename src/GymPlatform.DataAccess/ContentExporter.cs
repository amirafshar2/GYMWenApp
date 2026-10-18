using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.DataAccess;

/// <summary>
/// «بستهٔ محتوا»: همان فایل‌های پوشهٔ Seed، ساخته‌شده از دادهٔ فعلی دیتابیس.
/// با این بسته یک نصب تازه با همین شعبه‌ها، پکیج‌ها، مربیان، محصولات و متن‌ها بالا می‌آید
/// (بدون عضو، پرداخت یا اطلاعات شخصی).
/// </summary>
public static class ContentExporter
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static async Task<Dictionary<string, string>> ExportAsync(GymDbContext db, CancellationToken ct)
    {
        var files = new Dictionary<string, string>();
        void Put(string name, object v) => files[name] = JsonSerializer.Serialize(v, Json);

        var branches = await db.Branches.AsNoTracking().Where(b => b.IsActive).OrderBy(b => b.SortOrder).ToListAsync(ct);
        Put("branches.json", branches.Select(b => new
        {
            b.Slug, b.Name, b.District, b.Address, b.Phone, b.Latitude, b.Longitude, b.Sections, b.AddressConfirmed,
            b.MenHours, b.WomenHours, b.Disciplines,
        }));

        Put("packages.json", (await db.Packages.AsNoTracking().Where(p => p.IsActive).OrderBy(p => p.SortOrder).ToListAsync(ct)).Select(p => new
        {
            p.Slug, p.Name, p.Tagline, p.Category, p.DurationMonths, p.Sessions, p.PriceToman,
            p.IncludesPersonalCoach, p.IncludesNutritionPlan, p.IsFeatured, p.Features,
        }));

        var slugOf = branches.ToDictionary(b => b.Id, b => b.Slug);
        Put("coaches.json", (await db.Coaches.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.SortOrder).ToListAsync(ct))
            .Where(c => slugOf.ContainsKey(c.BranchId)).Select(c => new
            {
                c.Slug, c.FullName, c.Specialty, c.Bio, c.YearsOfExperience, c.Section, BranchSlug = slugOf[c.BranchId], c.Achievements, c.PhotoUrl,
            }));

        Put("faq.json", (await db.FaqItems.AsNoTracking().OrderBy(f => f.SortOrder).ToListAsync(ct)).Select(f => new { f.Question, f.Answer }));

        if (await db.ContractTemplates.AsNoTracking().Where(c => c.IsActive).OrderByDescending(c => c.Version).FirstOrDefaultAsync(ct) is { } k)
            Put("contract.json", new { k.Title, k.Clauses, k.HealthQuestions });

        Put("products.json", (await db.Products.AsNoTracking().Include(p => p.Variants).Where(p => p.IsActive).OrderBy(p => p.SortOrder).ToListAsync(ct)).Select(p => new
        {
            p.Slug, p.Name, p.BrandName, p.Kind, p.Category, p.PriceToman, p.Description, p.Highlights, p.ImagePath, p.IsHouseBrand, p.SortOrder,
            Variants = p.Variants.OrderBy(v => v.Id).Select(v => new { v.Size, v.Color, v.ColorHex, v.Flavor, v.PriceToman }),
        }));

        Put("canteen.json", (await db.CanteenItems.AsNoTracking().Where(c => c.IsAvailable).OrderBy(c => c.SortOrder).ToListAsync(ct)).Select(c => new
        {
            c.Slug, c.Name, c.Category, c.PriceToman, c.Description, c.Kcal, c.ProteinG, c.ImagePath, c.SortOrder,
        }));
        return files;
    }
}
