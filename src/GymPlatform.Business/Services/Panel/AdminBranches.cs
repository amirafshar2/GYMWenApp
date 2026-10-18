using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Business.Services.Panel;

/// <summary>
/// شعبه‌ها و سؤالات پرتکرار (فقط مدیر کل). شعبه‌ای که عضو، مربی، سفارش یا ورود ثبت‌شده دارد حذف نمی‌شود؛
/// به‌جایش «نمایش در سایت» خاموش می‌شود تا سوابق سالم بماند.
/// </summary>
public sealed partial class AdminService
{
    public async Task<IReadOnlyList<AdminBranchDto>> BranchesAsync(CancellationToken ct)
    {
        var members = await db.Memberships.GroupBy(m => m.BranchId).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N, ct);
        return (await db.Branches.AsNoTracking().OrderBy(b => b.SortOrder).ToListAsync(ct)).Select(b => ToDto(b, members.GetValueOrDefault(b.Id))).ToList();
    }

    private static AdminBranchDto ToDto(Branch b, int memberships) => new(b.Id, b.Slug, b.Name, b.District, b.Address, b.Phone, b.Latitude, b.Longitude,
        SectionName(b.Sections), b.MenHours, b.WomenHours, b.Disciplines, b.IsActive, b.AddressConfirmed, b.SortOrder, memberships);

    public async Task<Result<AdminBranchDto>> SaveBranchAsync(int? id, SaveBranchRequest r, int staffId, CancellationToken ct)
    {
        var e = new Dictionary<string, string[]>();
        var name = PersianText.CleanText(r.Name);
        var district = PersianText.CleanText(r.District);
        var address = PersianText.CleanText(r.Address);
        if (name is null || name.Length > 80) e["name"] = ["نام شعبه را بنویسید (حداکثر ۸۰ حرف)."];
        if (district is null || district.Length > 60) e["district"] = ["محله یا منطقه را بنویسید."];
        if (address is null || address.Length > 300) e["address"] = ["آدرس را بنویسید."];
        GenderSection? section = r.Section?.ToLowerInvariant() switch { "men" => GenderSection.Men, "women" => GenderSection.Women, "both" => GenderSection.Both, _ => null };
        if (section is null) e["section"] = ["سالن: آقایان، بانوان یا هر دو."];
        if (r.Latitude is < 24 or > 40 || r.Longitude is < 44 or > 64) e["location"] = ["موقعیت روی نقشه را درست وارد کنید (مثل ۲۹٫۶۱، ۵۲٫۵۳)."];
        var phone = PersianText.ToLatinDigits(r.Phone).Replace(" ", "").Replace("-", "");
        if (phone.Length > 0 && !System.Text.RegularExpressions.Regex.IsMatch(phone, @"^0\d{9,10}$")) e["phone"] = ["تلفن را فقط با رقم بنویسید."];
        string? Hours(string? h, string key)
        {
            var s = PersianText.CleanText(h);
            if (s is { Length: > 120 }) { e[key] = ["ساعت سانس حداکثر ۱۲۰ حرف."]; return null; }
            return s;
        }
        var men = section is GenderSection.Men or GenderSection.Both ? Hours(r.MenHours, "menHours") : null;
        var women = section is GenderSection.Women or GenderSection.Both ? Hours(r.WomenHours, "womenHours") : null;
        var disciplines = (r.Disciplines ?? []).Select(PersianText.CleanText).Where(x => x is { Length: > 0 and <= 40 }).Cast<string>().Distinct().Take(16).ToList();
        if (e.Count > 0) return Result<AdminBranchDto>.Fail(e);

        Branch? b;
        if (id is { } bid)
        {
            b = await db.Branches.FirstOrDefaultAsync(x => x.Id == bid, ct);
            if (b is null) return Result<AdminBranchDto>.Fail("id", "شعبه پیدا نشد.", ErrorType.NotFound);
        }
        else
        {
            b = new Branch { Slug = NewSlug("branch"), Name = name!, District = district!, Address = address!, SortOrder = (await db.Branches.MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 1 };
            db.Branches.Add(b);
        }
        b.Name = name!; b.District = district!; b.Address = address!; b.Phone = phone.Length == 0 ? null : phone;
        b.Latitude = Math.Round(r.Latitude, 6); b.Longitude = Math.Round(r.Longitude, 6); b.Sections = section!.Value;
        b.MenHours = men; b.WomenHours = women; b.Disciplines = disciplines; b.IsActive = r.IsActive; b.AddressConfirmed = true;
        await db.SaveChangesAsync(ct);

        // شعبهٔ تازه: ردیف موجودی صفر برای همهٔ کالاها تا مدیر شعبه موجودی را وارد کند
        if (id is null)
        {
            foreach (var v in await db.ProductVariants.Select(v => v.Id).ToListAsync(ct))
                db.BranchStocks.Add(new BranchStock { BranchId = b.Id, VariantId = v, Quantity = 0 });
        }
        Audit(id is null ? "branch.created" : "branch.updated", "Branch", b.Id, staffId, $"{b.Name};active={b.IsActive}");
        await db.SaveChangesAsync(ct);
        return Result<AdminBranchDto>.Ok(ToDto(b, await db.Memberships.CountAsync(m => m.BranchId == b.Id, ct)));
    }

    public async Task<Result<bool>> DeleteBranchAsync(int id, int staffId, CancellationToken ct)
    {
        var b = await db.Branches.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (b is null) return Result<bool>.Fail("id", "شعبه پیدا نشد.", ErrorType.NotFound);
        if (await db.Memberships.AnyAsync(x => x.BranchId == id, ct) || await db.Coaches.AnyAsync(x => x.BranchId == id, ct)
            || await db.CheckIns.AnyAsync(x => x.BranchId == id, ct) || await db.ShopOrders.AnyAsync(x => x.BranchId == id, ct)
            || await db.CanteenOrders.AnyAsync(x => x.BranchId == id, ct) || await db.AccessDevices.AnyAsync(x => x.BranchId == id, ct))
            return Result<bool>.Fail("id", "این شعبه عضو، مربی، سفارش یا گیت ثبت‌شده دارد و حذف نمی‌شود؛ به‌جایش «نمایش در سایت» را خاموش کنید.", ErrorType.Conflict);
        db.BranchStocks.RemoveRange(db.BranchStocks.Where(s => s.BranchId == id));
        db.StaffBranches.RemoveRange(db.StaffBranches.Where(s => s.BranchId == id));
        await db.ConsultationRequests.Where(c => c.BranchId == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.BranchId, (int?)null), ct);
        db.Branches.Remove(b);
        Audit("branch.deleted", "Branch", id, staffId, b.Name);
        await db.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }

    public async Task<Result<bool>> ReorderBranchesAsync(IReadOnlyList<int> ids, int staffId, CancellationToken ct)
    {
        var list = await db.Branches.ToListAsync(ct);
        if (ids.Count != list.Count || ids.Distinct().Count() != ids.Count || list.Any(b => !ids.Contains(b.Id)))
            return Result<bool>.Fail("ids", "فهرست شعبه‌ها کامل نیست.");
        foreach (var b in list) b.SortOrder = ids.ToList().IndexOf(b.Id);
        Audit("branch.reordered", "Branch", 0, staffId, null);
        await db.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }

    // ================================================================ سؤالات پرتکرار
    public async Task<IReadOnlyList<AdminFaqDto>> FaqAsync(CancellationToken ct) =>
        await db.FaqItems.AsNoTracking().OrderBy(f => f.SortOrder).Select(f => new AdminFaqDto(f.Id, f.Question, f.Answer, f.SortOrder)).ToListAsync(ct);

    public async Task<Result<AdminFaqDto>> SaveFaqAsync(int? id, SaveFaqRequest r, int staffId, CancellationToken ct)
    {
        var q = PersianText.CleanText(r.Question);
        var a = PersianText.CleanText(r.Answer);
        var e = new Dictionary<string, string[]>();
        if (q is null || q.Length > 200) e["question"] = ["سؤال را بنویسید (حداکثر ۲۰۰ حرف)."];
        if (a is null || a.Length > 1500) e["answer"] = ["جواب را بنویسید (حداکثر ۱۵۰۰ حرف)."];
        if (e.Count > 0) return Result<AdminFaqDto>.Fail(e);
        FaqItem? f;
        if (id is { } fid)
        {
            f = await db.FaqItems.FirstOrDefaultAsync(x => x.Id == fid, ct);
            if (f is null) return Result<AdminFaqDto>.Fail("id", "سؤال پیدا نشد.", ErrorType.NotFound);
            f.Question = q!; f.Answer = a!;
        }
        else
        {
            f = new FaqItem { Question = q!, Answer = a!, SortOrder = (await db.FaqItems.MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 1 };
            db.FaqItems.Add(f);
        }
        if (r.SortOrder is { } so) f.SortOrder = so;
        await db.SaveChangesAsync(ct);
        Audit(id is null ? "faq.created" : "faq.updated", "Faq", f.Id, staffId, null);
        await db.SaveChangesAsync(ct);
        return Result<AdminFaqDto>.Ok(new AdminFaqDto(f.Id, f.Question, f.Answer, f.SortOrder));
    }

    public async Task<Result<bool>> DeleteFaqAsync(int id, int staffId, CancellationToken ct)
    {
        var f = await db.FaqItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (f is null) return Result<bool>.Fail("id", "سؤال پیدا نشد.", ErrorType.NotFound);
        db.FaqItems.Remove(f);
        Audit("faq.deleted", "Faq", id, staffId, null);
        await db.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }
}
