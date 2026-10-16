using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.Business.Services.Commerce;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.Business.Services.Panel;

public interface IAdminService
{
    Task<IReadOnlyList<AdminPackageDto>> PackagesAsync(CancellationToken ct);
    Task<Result<AdminPackageDto>> UpdatePackageAsync(int id, UpdatePackageRequest r, int staffId, CancellationToken ct);
    Task<IReadOnlyList<AdminCampaignDto>> CampaignsAsync(CancellationToken ct);
    Task<Result<AdminCampaignDto>> SaveCampaignAsync(int? id, SaveCampaignRequest r, int staffId, CancellationToken ct);
    Task<IReadOnlyList<AdminDiscountCodeDto>> CodesAsync(CancellationToken ct);
    Task<Result<AdminDiscountCodeDto>> SaveCodeAsync(int? id, SaveDiscountCodeRequest r, int staffId, CancellationToken ct);
    Task<IReadOnlyList<AdminContractDto>> ContractsAsync(CancellationToken ct);
    Task<Result<AdminContractDto>> PublishContractAsync(PublishContractRequest r, int staffId, CancellationToken ct);
    Task<IReadOnlyList<AdminProductDto>> ProductsAsync(StaffScope scope, CancellationToken ct);
    Task<Result<AdminProductDto>> UpdateProductAsync(int id, UpdateProductRequest r, int staffId, CancellationToken ct);
    Task<Result<int>> SetStockAsync(StaffScope scope, int variantId, SetStockRequest r, CancellationToken ct);
    Task<IReadOnlyList<AdminShopOrderDto>> ShopOrdersAsync(StaffScope scope, string? status, CancellationToken ct);
    Task<Result<AdminShopOrderDto>> SetShopOrderStatusAsync(StaffScope scope, int id, string status, CancellationToken ct);
    Task<IReadOnlyList<AdminCanteenItemDto>> CanteenItemsAsync(CancellationToken ct);
    Task<Result<AdminCanteenItemDto>> UpdateCanteenItemAsync(int id, UpdateCanteenItemRequest r, StaffScope scope, CancellationToken ct);
    Task<IReadOnlyList<StaffRowDto>> StaffAsync(CancellationToken ct);
    Task<Result<StaffRowDto>> SaveStaffAsync(SaveStaffRequest r, int byUserId, CancellationToken ct);
}

/// <summary>مدیریت محتوا و کارکنان. هر تغییر قیمت/نقش در لاگ ممیزی ثبت می‌شود.</summary>
public sealed class AdminService(GymDbContext db, UserManager<AppUser> users, IClock clock) : IAdminService
{
    private void Audit(string action, string entity, object id, int by, string? data = null) =>
        db.AuditLogs.Add(new AuditLog { Action = action, EntityType = entity, EntityId = id.ToString(), UserId = by, Data = data });

    // ---------------- پکیج‌ها
    public async Task<IReadOnlyList<AdminPackageDto>> PackagesAsync(CancellationToken ct) =>
        (await db.Packages.AsNoTracking().OrderBy(p => p.SortOrder).ToListAsync(ct)).Select(ToDto).ToList();

    private static AdminPackageDto ToDto(MembershipPackage p) => new(p.Id, p.Slug, p.Name, p.Tagline, p.Category.ToString(), p.DurationMonths, p.Sessions, p.PriceToman, p.IsActive, p.IsFeatured, p.SortOrder);

    public async Task<Result<AdminPackageDto>> UpdatePackageAsync(int id, UpdatePackageRequest r, int staffId, CancellationToken ct)
    {
        var p = await db.Packages.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return Result<AdminPackageDto>.Fail("id", "پکیج پیدا نشد.", ErrorType.NotFound);
        if (r.PriceToman is < 10_000 or > 2_000_000_000 || r.PriceToman % 1000 != 0) return Result<AdminPackageDto>.Fail("priceToman", "قیمت باید مضرب هزار تومان و معقول باشد.");
        Audit("package.updated", "Package", p.Id, staffId, $"price {p.PriceToman}->{r.PriceToman};active={r.IsActive}");
        p.PriceToman = r.PriceToman; p.IsActive = r.IsActive; p.IsFeatured = r.IsFeatured;
        var tagline = PersianText.CleanText(r.Tagline);
        if (tagline is not null) p.Tagline = tagline.Length > 120 ? tagline[..120] : tagline;
        await db.SaveChangesAsync(ct);
        return Result<AdminPackageDto>.Ok(ToDto(p));
    }

    // ---------------- جشنواره
    public async Task<IReadOnlyList<AdminCampaignDto>> CampaignsAsync(CancellationToken ct) =>
        (await db.Campaigns.AsNoTracking().OrderByDescending(c => c.StartsAtUtc).ToListAsync(ct)).Select(ToDto).ToList();

    private AdminCampaignDto ToDto(Campaign c) => new(c.Id, c.Title, c.Description, c.StartsAtUtc, c.EndsAtUtc, c.DiscountPercent, c.DiscountAmountToman,
        c.EligiblePackageSlugs, c.EligibleBranchSlugs, c.MaxRedemptions, c.RedemptionCount, c.IsActive, c.IsRunningAt(clock.UtcNow));

    public async Task<Result<AdminCampaignDto>> SaveCampaignAsync(int? id, SaveCampaignRequest r, int staffId, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var title = PersianText.CleanText(r.Title);
        if (title is null || title.Length > 150) errors["title"] = ["عنوان جشنواره را بنویسید."];
        if (r.EndsAtUtc <= r.StartsAtUtc) errors["endsAtUtc"] = ["تاریخ پایان باید بعد از شروع باشد."];
        if (r.DiscountAmountToman is null && r.DiscountPercent is < 1 or > 90) errors["discountPercent"] = ["درصد تخفیف بین ۱ تا ۹۰."];
        if (r.DiscountAmountToman is < 1000) errors["discountAmountToman"] = ["مبلغ تخفیف نامعتبر است."];
        if (r.MaxRedemptions is < 1) errors["maxRedemptions"] = ["سقف باید حداقل ۱ باشد."];
        var pkgs = (r.EligiblePackageSlugs ?? []).Distinct().ToList();
        var brs = (r.EligibleBranchSlugs ?? []).Distinct().ToList();
        if (pkgs.Count > 0 && await db.Packages.CountAsync(p => pkgs.Contains(p.Slug), ct) != pkgs.Count) errors["eligiblePackageSlugs"] = ["پکیج نامعتبر."];
        if (brs.Count > 0 && await db.Branches.CountAsync(b => brs.Contains(b.Slug), ct) != brs.Count) errors["eligibleBranchSlugs"] = ["شعبهٔ نامعتبر."];
        if (errors.Count > 0) return Result<AdminCampaignDto>.Fail(errors);

        Campaign? c;
        if (id is { } cid)
        {
            c = await db.Campaigns.FirstOrDefaultAsync(x => x.Id == cid, ct);
            if (c is null) return Result<AdminCampaignDto>.Fail("id", "جشنواره پیدا نشد.", ErrorType.NotFound);
        }
        else { c = new Campaign { Title = title! }; db.Campaigns.Add(c); }
        c.Title = title!; c.Description = PersianText.CleanText(r.Description);
        c.StartsAtUtc = DateTime.SpecifyKind(r.StartsAtUtc, DateTimeKind.Utc); c.EndsAtUtc = DateTime.SpecifyKind(r.EndsAtUtc, DateTimeKind.Utc);
        c.DiscountPercent = r.DiscountAmountToman is null ? r.DiscountPercent : 0; c.DiscountAmountToman = r.DiscountAmountToman;
        c.EligiblePackageSlugs = pkgs; c.EligibleBranchSlugs = brs; c.MaxRedemptions = r.MaxRedemptions; c.IsActive = r.IsActive;
        await db.SaveChangesAsync(ct);
        Audit(id is null ? "campaign.created" : "campaign.updated", "Campaign", c.Id, staffId);
        await db.SaveChangesAsync(ct);
        return Result<AdminCampaignDto>.Ok(ToDto(c));
    }

    // ---------------- کد تخفیف
    private static AdminDiscountCodeDto ToDto(DiscountCode d) => new(d.Id, d.Code, d.Percent, d.MaxUses, d.UsedCount, d.ExpiresAtUtc, d.IsActive, d.Scope.ToString().ToLowerInvariant(), d.MembersOnly);

    public async Task<IReadOnlyList<AdminDiscountCodeDto>> CodesAsync(CancellationToken ct) =>
        (await db.DiscountCodes.AsNoTracking().OrderByDescending(d => d.Id).ToListAsync(ct)).Select(ToDto).ToList();

    public async Task<Result<AdminDiscountCodeDto>> SaveCodeAsync(int? id, SaveDiscountCodeRequest r, int staffId, CancellationToken ct)
    {
        var code = (r.Code ?? "").Trim().ToUpperInvariant();
        if (code.Length is < 3 or > 30 || !code.All(char.IsAsciiLetterOrDigit)) return Result<AdminDiscountCodeDto>.Fail("code", "کد ۳ تا ۳۰ حرف/رقم لاتین.");
        if (r.Percent is < 1 or > 90) return Result<AdminDiscountCodeDto>.Fail("percent", "درصد بین ۱ تا ۹۰.");
        DiscountScope? scope = r.Scope?.ToLowerInvariant() switch { "membership" => DiscountScope.Membership, "shop" => DiscountScope.Shop, "any" => DiscountScope.Any, _ => null };
        if (scope is null) return Result<AdminDiscountCodeDto>.Fail("scope", "محدوده: membership، shop یا any.");
        if (await db.DiscountCodes.AnyAsync(d => d.Code == code && d.Id != (id ?? 0), ct)) return Result<AdminDiscountCodeDto>.Fail("code", "این کد قبلاً ساخته شده.", ErrorType.Conflict);
        DiscountCode? d;
        if (id is { } did) { d = await db.DiscountCodes.FirstOrDefaultAsync(x => x.Id == did, ct); if (d is null) return Result<AdminDiscountCodeDto>.Fail("id", "کد پیدا نشد.", ErrorType.NotFound); }
        else { d = new DiscountCode { Code = code }; db.DiscountCodes.Add(d); }
        d.Code = code; d.Percent = r.Percent; d.MaxUses = r.MaxUses; d.ExpiresAtUtc = r.ExpiresAtUtc is { } e ? DateTime.SpecifyKind(e, DateTimeKind.Utc) : null;
        d.IsActive = r.IsActive; d.Scope = scope.Value; d.MembersOnly = r.MembersOnly;
        await db.SaveChangesAsync(ct);
        Audit("discount.saved", "DiscountCode", d.Id, staffId, code);
        await db.SaveChangesAsync(ct);
        return Result<AdminDiscountCodeDto>.Ok(ToDto(d));
    }

    // ---------------- قرارداد (نسخه‌دار؛ ویرایش = نسخهٔ جدید، امضاهای قبلی دست‌نخورده می‌مانند)
    public async Task<IReadOnlyList<AdminContractDto>> ContractsAsync(CancellationToken ct)
    {
        var counts = await db.SignedContracts.GroupBy(s => s.Version).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N, ct);
        return (await db.ContractTemplates.AsNoTracking().OrderByDescending(t => t.Version).ToListAsync(ct))
            .Select(t => new AdminContractDto(t.Id, t.Version, t.Title, t.Clauses, t.HealthQuestions, t.IsActive, t.PublishedAtUtc, counts.GetValueOrDefault(t.Version))).ToList();
    }

    public async Task<Result<AdminContractDto>> PublishContractAsync(PublishContractRequest r, int staffId, CancellationToken ct)
    {
        var title = PersianText.CleanText(r.Title);
        var clauses = (r.Clauses ?? []).Select(PersianText.CleanText).Where(x => x is not null).Cast<string>().ToList();
        var questions = (r.HealthQuestions ?? []).Select(PersianText.CleanText).Where(x => x is not null).Cast<string>().ToList();
        if (title is null) return Result<AdminContractDto>.Fail("title", "عنوان قرارداد را بنویسید.");
        if (clauses.Count is < 1 or > 40 || clauses.Any(c => c.Length > 2000)) return Result<AdminContractDto>.Fail("clauses", "۱ تا ۴۰ بند، هر بند حداکثر ۲۰۰۰ حرف.");
        if (questions.Count > 20 || questions.Any(q => q.Length > 300)) return Result<AdminContractDto>.Fail("healthQuestions", "حداکثر ۲۰ پرسش.");
        var version = (await db.ContractTemplates.MaxAsync(t => (int?)t.Version, ct) ?? 0) + 1;
        await db.ContractTemplates.Where(t => t.IsActive).ExecuteUpdateAsync(s => s.SetProperty(t => t.IsActive, false), ct);
        var t = new ContractTemplate { Version = version, Title = title, Clauses = clauses, HealthQuestions = questions, IsActive = true, PublishedAtUtc = clock.UtcNow };
        db.ContractTemplates.Add(t);
        Audit("contract.published", "ContractTemplate", version, staffId);
        await db.SaveChangesAsync(ct);
        return Result<AdminContractDto>.Ok(new AdminContractDto(t.Id, t.Version, t.Title, t.Clauses, t.HealthQuestions, true, t.PublishedAtUtc, 0));
    }

    // ---------------- فروشگاه
    public async Task<IReadOnlyList<AdminProductDto>> ProductsAsync(StaffScope scope, CancellationToken ct)
    {
        var list = await db.Products.AsNoTracking().Include(p => p.Variants).ThenInclude(v => v.Stocks).ThenInclude(s => s.Branch)
            .OrderBy(p => p.SortOrder).AsSplitQuery().ToListAsync(ct);
        return list.Select(p => new AdminProductDto(p.Id, p.Slug, p.Name, ShopService.KindName(p.Kind), p.Category, p.ImagePath, p.PriceToman, p.IsActive,
            p.Variants.OrderBy(v => v.Id).Select(v => new AdminVariantDto(v.Id, v.Sku, v.Label, v.PriceToman,
                v.Stocks.Where(s => scope.Can(s.BranchId)).OrderBy(s => s.Branch!.SortOrder).Select(s => new AdminStockDto(s.Branch!.Slug, s.Branch.Name, s.Quantity)).ToList())).ToList())).ToList();
    }

    public async Task<Result<AdminProductDto>> UpdateProductAsync(int id, UpdateProductRequest r, int staffId, CancellationToken ct)
    {
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return Result<AdminProductDto>.Fail("id", "کالا پیدا نشد.", ErrorType.NotFound);
        if (r.PriceToman is < 1000 or > 1_000_000_000 || r.PriceToman % 1000 != 0) return Result<AdminProductDto>.Fail("priceToman", "قیمت باید مضرب هزار تومان باشد.");
        Audit("product.updated", "Product", p.Id, staffId, $"price {p.PriceToman}->{r.PriceToman};active={r.IsActive}");
        p.PriceToman = r.PriceToman; p.IsActive = r.IsActive;
        await db.SaveChangesAsync(ct);
        return Result<AdminProductDto>.Ok(new AdminProductDto(p.Id, p.Slug, p.Name, ShopService.KindName(p.Kind), p.Category, p.ImagePath, p.PriceToman, p.IsActive, []));
    }

    public async Task<Result<int>> SetStockAsync(StaffScope scope, int variantId, SetStockRequest r, CancellationToken ct)
    {
        if (r.Quantity is < 0 or > 100_000) return Result<int>.Fail("quantity", "موجودی بین ۰ تا ۱۰۰٬۰۰۰.");
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Slug == r.BranchSlug, ct);
        if (branch is null) return Result<int>.Fail("branchSlug", "شعبه پیدا نشد.", ErrorType.NotFound);
        if (!scope.Can(branch.Id)) return Result<int>.Fail("branchSlug", "به انبار این شعبه دسترسی ندارید.", ErrorType.Forbidden);
        if (!await db.ProductVariants.AnyAsync(v => v.Id == variantId, ct)) return Result<int>.Fail("variant", "مدل کالا پیدا نشد.", ErrorType.NotFound);
        var s = await db.BranchStocks.FirstOrDefaultAsync(x => x.VariantId == variantId && x.BranchId == branch.Id, ct);
        var before = s?.Quantity ?? 0;
        if (s is null) db.BranchStocks.Add(new BranchStock { VariantId = variantId, BranchId = branch.Id, Quantity = r.Quantity });
        else s.Quantity = r.Quantity;
        Audit("stock.set", "ProductVariant", variantId, scope.UserId, $"branch={branch.Slug};{before}->{r.Quantity}");
        await db.SaveChangesAsync(ct);
        return Result<int>.Ok(r.Quantity);
    }

    public async Task<IReadOnlyList<AdminShopOrderDto>> ShopOrdersAsync(StaffScope scope, string? status, CancellationToken ct)
    {
        var q = db.ShopOrders.AsNoTracking().Include(o => o.Items).Include(o => o.Branch).Include(o => o.User)
            .Where(o => scope.BranchIds.Contains(o.BranchId) && o.Status != OrderStatus.PendingPayment);
        q = status switch
        {
            "open" => q.Where(o => o.Status == OrderStatus.Paid || o.Status == OrderStatus.ReadyForPickup || o.Status == OrderStatus.Shipped),
            "done" => q.Where(o => o.Status == OrderStatus.Completed || o.Status == OrderStatus.Cancelled),
            _ => q,
        };
        return (await q.OrderByDescending(o => o.Id).Take(100).AsSplitQuery().ToListAsync(ct)).Select(ToDto).ToList();
    }

    private static AdminShopOrderDto ToDto(ShopOrder o) => new(o.Id, o.Number, ShopService.StatusName(o.Status), o.Fulfillment == Fulfillment.Pickup ? "pickup" : "delivery",
        o.Branch?.Name ?? "", o.User?.FullName, o.User?.PhoneNumber ?? "", o.Address, o.TotalToman, o.CreatedAtUtc,
        o.Items.Select(i => new ShopOrderItemDto(i.ProductName, i.VariantLabel, i.ImagePath, i.UnitPriceToman, i.Quantity)).ToList());

    public async Task<Result<AdminShopOrderDto>> SetShopOrderStatusAsync(StaffScope scope, int id, string status, CancellationToken ct)
    {
        var o = await db.ShopOrders.Include(x => x.Items).Include(x => x.Branch).Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (o is null || !scope.Can(o.BranchId)) return Result<AdminShopOrderDto>.Fail("id", "سفارش پیدا نشد.", ErrorType.NotFound);
        OrderStatus? target = status switch { "shipped" => OrderStatus.Shipped, "completed" => OrderStatus.Completed, "ready" => OrderStatus.ReadyForPickup, _ => null };
        var ok = (o.Status, target) switch
        {
            (OrderStatus.Paid, OrderStatus.Shipped) => true,
            (OrderStatus.Paid, OrderStatus.ReadyForPickup) => true,
            (OrderStatus.ReadyForPickup or OrderStatus.Shipped, OrderStatus.Completed) => true,
            _ => false,
        };
        if (!ok) return Result<AdminShopOrderDto>.Fail("status", "این تغییر وضعیت ممکن نیست.", ErrorType.Conflict);
        o.Status = target!.Value;
        Audit($"shop.{status}", "ShopOrder", o.Id, scope.UserId);
        await db.SaveChangesAsync(ct);
        return Result<AdminShopOrderDto>.Ok(ToDto(o));
    }

    // ---------------- بوفه
    public async Task<IReadOnlyList<AdminCanteenItemDto>> CanteenItemsAsync(CancellationToken ct) =>
        (await db.CanteenItems.AsNoTracking().OrderBy(i => i.SortOrder).ToListAsync(ct))
            .Select(i => new AdminCanteenItemDto(i.Id, i.Name, CanteenService.CategoryName(i.Category), i.PriceToman, i.IsAvailable, i.ImagePath)).ToList();

    public async Task<Result<AdminCanteenItemDto>> UpdateCanteenItemAsync(int id, UpdateCanteenItemRequest r, StaffScope scope, CancellationToken ct)
    {
        var i = await db.CanteenItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (i is null) return Result<AdminCanteenItemDto>.Fail("id", "آیتم پیدا نشد.", ErrorType.NotFound);
        // منو برای همهٔ شعبه‌ها یکی است: قیمت را فقط مدیر کل عوض می‌کند؛ بقیه فقط «تمام شد / موجود شد»
        if (!scope.IsSuperAdmin && r.PriceToman != i.PriceToman) return Result<AdminCanteenItemDto>.Fail("priceToman", "تغییر قیمت منو فقط با مدیر کل است.", ErrorType.Forbidden);
        var staffId = scope.UserId;
        if (r.PriceToman is < 1000 or > 50_000_000 || r.PriceToman % 1000 != 0) return Result<AdminCanteenItemDto>.Fail("priceToman", "قیمت باید مضرب هزار تومان باشد.");
        i.PriceToman = r.PriceToman; i.IsAvailable = r.IsAvailable;
        Audit("canteen.item_updated", "CanteenItem", i.Id, staffId);
        await db.SaveChangesAsync(ct);
        return Result<AdminCanteenItemDto>.Ok(new AdminCanteenItemDto(i.Id, i.Name, CanteenService.CategoryName(i.Category), i.PriceToman, i.IsAvailable, i.ImagePath));
    }

    // ---------------- کارکنان
    private static readonly string[] StaffRoles = [Roles.SuperAdmin, Roles.BranchManager, Roles.Reception, Roles.Coach, Roles.CanteenStaff, Roles.ShopStaff];

    public async Task<IReadOnlyList<StaffRowDto>> StaffAsync(CancellationToken ct)
    {
        var rows = await (from ur in db.UserRoles join r in db.Roles on ur.RoleId equals r.Id where r.Name != Roles.Member select new { ur.UserId, r.Name }).ToListAsync(ct);
        var ids = rows.Select(r => r.UserId).Distinct().ToList();
        var us = await db.Users.AsNoTracking().Where(u => ids.Contains(u.Id)).ToListAsync(ct);
        var br = await db.StaffBranches.AsNoTracking().Where(s => ids.Contains(s.UserId)).Select(s => new { s.UserId, s.Branch!.Id, s.Branch.Slug, s.Branch.Name }).ToListAsync(ct);
        return us.Select(u => new StaffRowDto(u.Id, u.FullName, u.PhoneNumber ?? "", rows.Where(r => r.UserId == u.Id).Select(r => r.Name!).ToList(),
            br.Where(b => b.UserId == u.Id).Select(b => new BranchRefDto(b.Id, b.Slug, b.Name)).ToList(), u.LastLoginAtUtc)).OrderBy(r => r.FullName).ToList();
    }

    public async Task<Result<StaffRowDto>> SaveStaffAsync(SaveStaffRequest r, int byUserId, CancellationToken ct)
    {
        var phone = PersianText.NormalizeMobile(r.Phone);
        if (!PersianText.IsValidMobile(phone)) return Result<StaffRowDto>.Fail("phone", "شمارهٔ موبایل معتبر نیست.");
        var roles = (r.Roles ?? []).Distinct().ToList();
        if (roles.Any(x => !StaffRoles.Contains(x))) return Result<StaffRowDto>.Fail("roles", "نقش نامعتبر.");
        var branchIds = await db.Branches.Where(b => (r.BranchSlugs ?? new List<string>()).Contains(b.Slug)).Select(b => b.Id).ToListAsync(ct);
        if (roles.Count > 0 && !roles.Contains(Roles.SuperAdmin) && branchIds.Count == 0) return Result<StaffRowDto>.Fail("branchSlugs", "حداقل یک شعبه انتخاب کنید.");

        var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone, ct);
        if (user is null)
        {
            user = new AppUser { UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true, FullName = PersianText.CleanText(r.FullName), CreatedAtUtc = clock.UtcNow };
            await users.CreateAsync(user);
            await users.AddToRoleAsync(user, Roles.Member);
        }
        else if (PersianText.CleanText(r.FullName) is { } n) { user.FullName = n; await users.UpdateAsync(user); }
        if (user.Id == byUserId && !roles.Contains(Roles.SuperAdmin)) return Result<StaffRowDto>.Fail("roles", "نمی‌توانید دسترسی مدیر کل خودتان را بردارید.");

        var current = (await users.GetRolesAsync(user)).Where(x => x != Roles.Member).ToList();
        await users.RemoveFromRolesAsync(user, current.Except(roles));
        await users.AddToRolesAsync(user, roles.Except(current));
        await db.StaffBranches.Where(s => s.UserId == user.Id).ExecuteDeleteAsync(ct);
        foreach (var b in branchIds) db.StaffBranches.Add(new StaffBranch { UserId = user.Id, BranchId = b });
        Audit("staff.saved", "User", user.Id, byUserId, $"roles={string.Join(',', roles)};branches={branchIds.Count}");
        await db.SaveChangesAsync(ct);
        // نقش تازه با توکن بعدی (حداکثر چند دقیقه) اعمال می‌شود
        return Result<StaffRowDto>.Ok((await StaffAsync(ct)).FirstOrDefault(x => x.UserId == user.Id)
            ?? new StaffRowDto(user.Id, user.FullName, phone, [], [], user.LastLoginAtUtc));
    }
}
