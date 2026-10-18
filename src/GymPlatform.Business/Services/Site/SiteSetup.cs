using GymPlatform.Business.Common;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Business.Services.Site;

/// <summary>دستیار راه‌اندازی: هر مرحله تا جای ممکن از خود داده تشخیص داده می‌شود</summary>
public sealed partial class SiteService
{
    public static readonly string[] StepKeys = ["brand", "theme", "contact", "branches", "packages", "coaches", "home", "contract", "legal", "staff", "publish"];

    public async Task<SetupStatusDto> GetSetupStatusAsync(CancellationToken ct)
    {
        var c = await GetAsync(ct);
        var manual = c.Setup.DoneSteps.ToHashSet();
        var branches = await db.Branches.CountAsync(b => b.IsActive, ct);
        var packages = await db.Packages.CountAsync(p => p.IsActive, ct);
        var coaches = await db.Coaches.CountAsync(x => x.IsActive, ct);
        var contract = await db.ContractTemplates.AnyAsync(x => x.IsActive && x.Clauses.Count > 0, ct);
        var staff = await db.StaffBranches.AnyAsync(ct);
        var legalTodo = new[] { c.Legal.About, c.Legal.Terms, c.Legal.Privacy, c.Legal.Refund }.Any(t => t.Contains("[["));

        SetupStepDto S(string key, string title, string hint, string link, bool auto, bool optional = false) =>
            new(key, title, hint, link, auto || manual.Contains(key), optional);

        var steps = new List<SetupStepDto>
        {
            S("brand", "نام و لوگو", "نام باشگاه، نام کوتاه کنار لوگو، شهر و فایل لوگو.", "/panel/site?tab=brand",
                c.Brand.Name.Length > 0 && c.Brand.ShortName.Length > 0 && c.Brand.LogoUrl is not null),
            S("theme", "رنگ‌ها", "رنگ اصلی و رنگ تأکید را با رنگ لوگو هماهنگ کنید.", "/panel/site?tab=theme", false, optional: true),
            S("contact", "اطلاعات تماس", "تلفن پشتیبانی، اینستاگرام و آدرس دفتر.", "/panel/site?tab=contact", c.Contact.Phone.Length > 0),
            S("branches", "شعبه‌ها", "دست‌کم یک شعبه با آدرس، ساعت سانس و سالن آقایان/بانوان.", "/panel/branches", branches > 0),
            S("packages", "پکیج‌های عضویت", "قیمت و مدت پکیج‌ها؛ هر پکیج به یک یا همهٔ شعبه‌ها.", "/panel/packages", packages > 0),
            S("coaches", "مربیان", "عکس، رشته و شعبهٔ هر مربی.", "/panel/coaches", coaches > 0, optional: !c.Modules.Coaches),
            S("home", "متن و عکس صفحهٔ اصلی", "تیترها، عکس‌ها و بخش‌هایی که نمایش داده می‌شوند.", "/panel/site?tab=home", false, optional: true),
            S("contract", "قرارداد عضویت", "بندهای قرارداد و پرسش‌های فرم سلامت.", "/panel/contract", contract),
            S("legal", "صفحه‌های قانونی", "جاهای خالیِ زرد در «درباره ما»، «قوانین» و «بازگشت وجه» را پر کنید.", "/panel/site?tab=legal", !legalTodo),
            S("staff", "کارکنان", "پذیرش، مدیر شعبه و مربی‌ها را با شمارهٔ موبایل اضافه کنید.", "/panel/staff", staff, optional: true),
            new("publish", "انتشار سایت", "وقتی همه‌چیز آماده شد، سایت را برای همه باز کنید.", "/panel/setup", c.Setup.Published, false),
        };
        return new SetupStatusDto(c.Setup.Mode, c.Setup.Published, c.Setup.GuideHidden, steps,
            steps.Count(s => s.Done && !s.Optional), steps.Count(s => !s.Optional));
    }

    public async Task<Result<SetupStatusDto>> UpdateSetupAsync(SetupUpdateRequest r, int staffId, CancellationToken ct)
    {
        var c = Clone(await GetAsync(ct));
        var s = c.Setup;
        if (r.Step is { } step)
        {
            if (!StepKeys.Contains(step) || step == "publish") return Result<SetupStatusDto>.Fail("step", "مرحله نامعتبر است.");
            s.DoneSteps = (r.StepDone == false ? s.DoneSteps.Where(x => x != step) : s.DoneSteps.Append(step)).Distinct().ToList();
        }
        if (r.GuideHidden is { } gh) s.GuideHidden = gh;
        if (r.Publish is { } pub)
        {
            if (pub)
            {
                var st = await GetSetupStatusAsync(ct);
                var missing = st.Steps.Where(x => !x.Optional && !x.Done && x.Key is not ("publish" or "legal")).Select(x => x.Title).ToList();
                if (missing.Count > 0) return Result<SetupStatusDto>.Fail("publish", "پیش از انتشار این‌ها را کامل کنید: " + string.Join("، ", missing));
                s.PublishedAtUtc ??= clock.UtcNow;
            }
            s.Published = pub;
        }
        await SaveRawAsync(c, staffId, ct);
        if (r.Publish is not null)
        {
            db.AuditLogs.Add(new Domain.Entities.AuditLog { Action = r.Publish == true ? "site.published" : "site.unpublished", EntityType = "Site", EntityId = "1", UserId = staffId });
            await db.SaveChangesAsync(ct);
        }
        return Result<SetupStatusDto>.Ok(await GetSetupStatusAsync(ct));
    }
}
