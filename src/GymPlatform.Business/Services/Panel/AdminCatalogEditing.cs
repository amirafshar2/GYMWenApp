using System.Security.Cryptography;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.Business.Services.Commerce;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Business.Services.Panel;

/// <summary>
/// ساخت، ویرایش و حذف پکیج، کالای شاپ و آیتم منوی بوفه (فقط مدیر کل؛ این‌ها برای همهٔ شعبه‌ها یکی‌اند).
/// چیزی که سابقهٔ خرید دارد حذف نمی‌شود تا فاکتورها و گزارش‌ها خراب نشوند؛ به‌جایش غیرفعال می‌شود.
/// </summary>
public sealed partial class AdminService
{
    private static readonly string[] ImageFolders = ["/media/canteen/", "/media/shop/", "/media/coaches/", "/media/uploads/"];

    /// <summary>عکس فقط از کتابخانهٔ خود سایت یا آپلودهای بررسی‌شده (نه آدرس دلخواه)</summary>
    private static bool ValidImage(string? path) =>
        path is { Length: > 10 and < 200 } && ImageFolders.Any(f => path.StartsWith(f, StringComparison.Ordinal)) && !path.Contains("..") &&
        System.Text.RegularExpressions.Regex.IsMatch(path, @"^/media/[a-z]+/[A-Za-z0-9._-]+$");

    private static string NewSlug(string prefix) => prefix + "-" + RandomNumberGenerator.GetString("abcdefghijkmnpqrstuvwxyz23456789", 6);

    private static bool ValidPrice(long p, long max) => p >= 1000 && p <= max && p % 1000 == 0;

    // ================================================================ پکیج
    public async Task<Result<AdminPackageDto>> SavePackageAsync(int? id, SavePackageRequest r, int staffId, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var name = PersianText.CleanText(r.Name);
        if (name is null || name.Length > 80) errors["name"] = ["نام پکیج را بنویسید (حداکثر ۸۰ حرف)."];
        if (!Enum.TryParse<PackageCategory>(r.Category, true, out var cat)) errors["category"] = ["دسته‌بندی نامعتبر است."];
        if (r.DurationMonths is < 1 or > 24) errors["durationMonths"] = ["مدت بین ۱ تا ۲۴ ماه."];
        if (r.Sessions is < 1 or > 365) errors["sessions"] = ["تعداد جلسه بین ۱ تا ۳۶۵ (یا خالی برای نامحدود)."];
        if (!ValidPrice(r.PriceToman, 2_000_000_000)) errors["priceToman"] = ["قیمت باید مضرب هزار تومان باشد."];
        var features = (r.Features ?? []).Select(PersianText.CleanText).Where(f => f is not null).Cast<string>().Take(12).ToList();
        if (features.Any(f => f.Length > 120)) errors["features"] = ["هر ویژگی حداکثر ۱۲۰ حرف."];
        if (errors.Count > 0) return Result<AdminPackageDto>.Fail(errors);

        MembershipPackage? p;
        if (id is { } pid)
        {
            p = await db.Packages.FirstOrDefaultAsync(x => x.Id == pid, ct);
            if (p is null) return Result<AdminPackageDto>.Fail("id", "پکیج پیدا نشد.", ErrorType.NotFound);
            Audit("package.updated", "Package", p.Id, staffId, $"price {p.PriceToman}->{r.PriceToman};active={r.IsActive}");
        }
        else
        {
            p = new MembershipPackage { Slug = NewSlug("pkg"), Name = name!, SortOrder = (await db.Packages.MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 1 };
            db.Packages.Add(p);
        }
        p.Name = name!; p.Tagline = PersianText.CleanText(r.Tagline); p.Category = cat; p.DurationMonths = r.DurationMonths; p.Sessions = r.Sessions;
        p.PriceToman = r.PriceToman; p.Features = features; p.IsActive = r.IsActive; p.IsFeatured = r.IsFeatured;
        p.IncludesPersonalCoach = cat == PackageCategory.PersonalTraining; p.IncludesNutritionPlan = cat == PackageCategory.Nutrition;
        await db.SaveChangesAsync(ct);
        if (id is null) { Audit("package.created", "Package", p.Id, staffId, $"{p.Name};price={p.PriceToman}"); await db.SaveChangesAsync(ct); }
        return Result<AdminPackageDto>.Ok(ToDto(p));
    }

    public async Task<Result<bool>> DeletePackageAsync(int id, int staffId, CancellationToken ct)
    {
        var p = await db.Packages.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return Result<bool>.Fail("id", "پکیج پیدا نشد.", ErrorType.NotFound);
        if (await db.Memberships.AnyAsync(m => m.PackageId == id, ct))
            return Result<bool>.Fail("id", "این پکیج خریدار دارد و حذف نمی‌شود؛ به‌جایش «فروش فعال» را خاموش کنید.", ErrorType.Conflict);
        db.Packages.Remove(p);
        Audit("package.deleted", "Package", id, staffId, p.Name);
        await db.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }

    // ================================================================ کالای شاپ
    private static AdminProductDto ToDto(Product p, StaffScope scope) => new(p.Id, p.Slug, p.Name, ShopService.KindName(p.Kind), p.Category, p.ImagePath, p.PriceToman, p.IsActive,
        p.Variants.OrderBy(v => v.Id).Select(v => new AdminVariantDto(v.Id, v.Sku, v.Label, v.PriceToman,
            v.Stocks.Where(s => scope.Can(s.BranchId)).OrderBy(s => s.Branch!.SortOrder).Select(s => new AdminStockDto(s.Branch!.Slug, s.Branch.Name, s.Quantity)).ToList())).ToList(),
        p.BrandName, p.Description, p.Highlights,
        p.Variants.OrderBy(v => v.Id).Select(v => new SaveVariantDto(v.Id, v.Size, v.Color, v.ColorHex, v.Flavor, v.PriceToman)).ToList());

    public async Task<Result<AdminProductDto>> SaveProductAsync(int? id, SaveProductRequest r, StaffScope scope, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var name = PersianText.CleanText(r.Name);
        var brandName = PersianText.CleanText(r.BrandName);
        var category = PersianText.CleanText(r.Category);
        if (name is null || name.Length > 120) errors["name"] = ["نام کالا را بنویسید (حداکثر ۱۲۰ حرف)."];
        if (brandName is null || brandName.Length > 60) errors["brandName"] = ["برند را بنویسید."];
        if (category is null || category.Length > 40) errors["category"] = ["زیرگروه را بنویسید (مثل پروتئین، تیشرت)."];
        ProductKind? kind = r.Kind?.ToLowerInvariant() switch { "supplement" => ProductKind.Supplement, "apparel" => ProductKind.Apparel, "gear" => ProductKind.Gear, _ => null };
        if (kind is null) errors["kind"] = ["نوع کالا: مکمل، پوشاک یا لوازم."];
        if (!ValidPrice(r.PriceToman, 1_000_000_000)) errors["priceToman"] = ["قیمت باید مضرب هزار تومان باشد."];
        if (!ValidImage(r.ImagePath)) errors["imagePath"] = ["یک عکس انتخاب یا آپلود کنید."];
        var variants = (r.Variants ?? []).Take(60).Select(v => v with
        {
            Size = Clip(v.Size, 20), Color = Clip(v.Color, 30), Flavor = Clip(v.Flavor, 40),
            ColorHex = v.ColorHex is { } h && System.Text.RegularExpressions.Regex.IsMatch(h, "^#[0-9A-Fa-f]{6}$") ? h : null,
        }).ToList();
        if (variants.Any(v => v.PriceToman is { } vp && !ValidPrice(vp, 1_000_000_000))) errors["variants"] = ["قیمت هر مدل باید مضرب هزار تومان باشد."];
        if (variants.GroupBy(v => (v.Size, v.Color, v.Flavor)).Any(g => g.Count() > 1)) errors["variants"] = ["دو مدل با سایز/رنگ/طعم یکسان تعریف شده است."];
        if (errors.Count > 0) return Result<AdminProductDto>.Fail(errors);
        if (variants.Count == 0) variants.Add(new SaveVariantDto(null, null, null, null, null, null)); // کالای تک‌مدلی

        Product? p;
        if (id is { } pid)
        {
            p = await db.Products.Include(x => x.Variants).FirstOrDefaultAsync(x => x.Id == pid, ct);
            if (p is null) return Result<AdminProductDto>.Fail("id", "کالا پیدا نشد.", ErrorType.NotFound);
            Audit("product.updated", "Product", p.Id, scope.UserId, $"price {p.PriceToman}->{r.PriceToman};active={r.IsActive}");
        }
        else
        {
            p = new Product { Slug = NewSlug("p"), Name = name!, BrandName = brandName!, Category = category!, ImagePath = r.ImagePath,
                SortOrder = (await db.Products.MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 1 };
            db.Products.Add(p);
        }
        p.Name = name!; p.BrandName = brandName!; p.Kind = kind!.Value; p.Category = category!; p.Description = PersianText.CleanText(r.Description);
        p.PriceToman = r.PriceToman; p.ImagePath = r.ImagePath; p.IsActive = r.IsActive;
        p.Highlights = (r.Highlights ?? []).Select(PersianText.CleanText).Where(x => x is not null).Cast<string>().Select(x => x.Length > 80 ? x[..80] : x).Take(8).ToList();

        // مدل‌ها: ویرایش موجودها، افزودن تازه‌ها (حذف نمی‌شوند)
        foreach (var v in variants)
        {
            var existing = v.Id is { } vid ? p.Variants.FirstOrDefault(x => x.Id == vid) : null;
            if (v.Id is not null && existing is null) return Result<AdminProductDto>.Fail("variants", "مدل نامعتبر است.");
            existing ??= AddVariant(p);
            existing.Size = v.Size; existing.Color = v.Color; existing.ColorHex = v.ColorHex; existing.Flavor = v.Flavor; existing.PriceToman = v.PriceToman;
        }
        await db.SaveChangesAsync(ct);
        // SKU با شناسهٔ واقعی؛ برای مدل‌های تازه موجودی صفر در همهٔ شعبه‌ها
        var branchIds = await db.Branches.Select(b => b.Id).ToListAsync(ct);
        foreach (var v in p.Variants.Where(v => v.Sku.StartsWith("new-")))
        {
            v.Sku = $"KG-{p.Id}-{v.Id}";
            foreach (var b in branchIds) db.BranchStocks.Add(new BranchStock { VariantId = v.Id, BranchId = b, Quantity = 0 });
        }
        if (id is null) Audit("product.created", "Product", p.Id, scope.UserId, p.Name);
        await db.SaveChangesAsync(ct);

        var fresh = await db.Products.AsNoTracking().Include(x => x.Variants).ThenInclude(v => v.Stocks).ThenInclude(s => s.Branch).AsSplitQuery().FirstAsync(x => x.Id == p.Id, ct);
        return Result<AdminProductDto>.Ok(ToDto(fresh, scope));

        static ProductVariant AddVariant(Product p)
        {
            var nv = new ProductVariant { Sku = "new-" + Guid.NewGuid().ToString("N")[..12] };
            p.Variants.Add(nv);
            return nv;
        }
    }

    private static string? Clip(string? s, int max) { var c = PersianText.CleanText(s); return c is null ? null : c.Length > max ? c[..max] : c; }

    // ================================================================ منوی بوفه
    private static AdminCanteenItemDto ToDto(CanteenItem i) =>
        new(i.Id, i.Name, CanteenService.CategoryName(i.Category), i.PriceToman, i.IsAvailable, i.ImagePath, i.Description, i.Kcal, i.ProteinG);

    public async Task<Result<AdminCanteenItemDto>> SaveCanteenItemAsync(int? id, SaveCanteenItemRequest r, int staffId, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var name = PersianText.CleanText(r.Name);
        if (name is null || name.Length > 60) errors["name"] = ["نام آیتم را بنویسید (حداکثر ۶۰ حرف)."];
        CanteenCategory? cat = r.Category?.ToLowerInvariant() switch
        {
            "coffee" => CanteenCategory.Coffee, "shake" => CanteenCategory.Shake, "drink" => CanteenCategory.Drink, "snack" => CanteenCategory.Snack, "meal" => CanteenCategory.Meal, _ => null,
        };
        if (cat is null) errors["category"] = ["دسته را انتخاب کنید."];
        if (!ValidPrice(r.PriceToman, 50_000_000)) errors["priceToman"] = ["قیمت باید مضرب هزار تومان باشد."];
        if (r.Kcal is < 0 or > 3000) errors["kcal"] = ["کالری بین ۰ تا ۳۰۰۰."];
        if (r.ProteinG is < 0 or > 300) errors["proteinG"] = ["پروتئین بین ۰ تا ۳۰۰ گرم."];
        if (!ValidImage(r.ImagePath)) errors["imagePath"] = ["یک عکس انتخاب یا آپلود کنید."];
        var desc = Clip(r.Description, 200);
        if (errors.Count > 0) return Result<AdminCanteenItemDto>.Fail(errors);

        CanteenItem? i;
        if (id is { } iid)
        {
            i = await db.CanteenItems.FirstOrDefaultAsync(x => x.Id == iid, ct);
            if (i is null) return Result<AdminCanteenItemDto>.Fail("id", "آیتم پیدا نشد.", ErrorType.NotFound);
        }
        else
        {
            i = new CanteenItem { Slug = NewSlug("menu"), Name = name!, ImagePath = r.ImagePath, SortOrder = (await db.CanteenItems.MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 1 };
            db.CanteenItems.Add(i);
        }
        i.Name = name!; i.Description = desc; i.Category = cat!.Value; i.PriceToman = r.PriceToman; i.Kcal = r.Kcal; i.ProteinG = r.ProteinG;
        i.ImagePath = r.ImagePath; i.IsAvailable = r.IsAvailable;
        await db.SaveChangesAsync(ct);
        Audit(id is null ? "canteen.item_created" : "canteen.item_edited", "CanteenItem", i.Id, staffId, $"{i.Name};price={i.PriceToman}");
        await db.SaveChangesAsync(ct);
        return Result<AdminCanteenItemDto>.Ok(ToDto(i));
    }

    public async Task<Result<bool>> DeleteCanteenItemAsync(int id, int staffId, CancellationToken ct)
    {
        var i = await db.CanteenItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (i is null) return Result<bool>.Fail("id", "آیتم پیدا نشد.", ErrorType.NotFound);
        // سفارش‌های قبلی نام و قیمت را جدا نگه داشته‌اند، پس حذف آیتم فاکتورها را خراب نمی‌کند
        db.CanteenItems.Remove(i);
        Audit("canteen.item_deleted", "CanteenItem", id, staffId, i.Name);
        await db.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }
}
