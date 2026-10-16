using System.Text.Json;
using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.Business.Services.Members;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.Business.Services.Panel;

public interface ICoachService
{
    Task<IReadOnlyList<TraineeRowDto>> TraineesAsync(int coachUserId, CancellationToken ct);
    Task<Result<TraineeRowDto>> AddTraineeAsync(int coachUserId, string phone, CancellationToken ct);
    Task<Result<TraineeDetailDto>> DetailAsync(int coachUserId, int memberId, CancellationToken ct);
    Task<Result<TrainingPlanDto>> SavePlanAsync(int coachUserId, int memberId, SavePlanRequest request, CancellationToken ct);
    Task<Result<BodyMetricDto>> AddMetricAsync(int? coachUserId, int memberId, AddMetricRequest request, CancellationToken ct);
    // سمت عضو
    Task<TrainingPlanDto?> MyPlanAsync(int userId, CancellationToken ct);
    Task<IReadOnlyList<BodyMetricDto>> MetricsAsync(int userId, CancellationToken ct);
    Task<bool> DeleteMetricAsync(int userId, int metricId, CancellationToken ct);
    Task<PreferencesDto> PreferencesAsync(int userId, CancellationToken ct);
    Task<Result<PreferencesDto>> SavePreferencesAsync(int userId, PreferencesRequest r, CancellationToken ct);
}

/// <summary>پنل مربی: شاگردها، روند وزن و برنامهٔ تمرینی/غذایی که در پروفایل شاگرد دیده می‌شود.</summary>
public sealed class CoachService(GymDbContext db, IClock clock) : ICoachService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private async Task<Coach?> CoachOf(int userId, CancellationToken ct) =>
        await db.Coaches.AsNoTracking().FirstOrDefaultAsync(c => c.UserId == userId, ct);

    private async Task<bool> IsTrainee(int coachId, int memberId, CancellationToken ct) =>
        await db.CoachAssignments.AnyAsync(a => a.CoachId == coachId && a.MemberUserId == memberId && a.IsActive, ct);

    private async Task<List<TraineeRowDto>> RowsAsync(IReadOnlyList<int> ids, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var users = await db.Users.AsNoTracking().Where(u => ids.Contains(u.Id)).Select(u => new { u.Id, u.FullName, u.PhoneNumber, u.Gender }).ToListAsync(ct);
        var active = await db.Memberships.AsNoTracking().Where(m => ids.Contains(m.UserId) && m.Status == MembershipStatus.Active && m.StartsAtUtc <= now && m.EndsAtUtc > now)
            .Select(m => new { m.UserId, Package = m.Package!.Name, m.EndsAtUtc }).ToListAsync(ct);
        var metrics = await db.BodyMetrics.AsNoTracking().Where(b => ids.Contains(b.UserId)).OrderBy(b => b.MeasuredOn)
            .Select(b => new { b.UserId, b.WeightKg }).ToListAsync(ct);
        var plans = await db.TrainingPlans.AsNoTracking().Where(p => ids.Contains(p.MemberUserId) && p.IsActive)
            .Select(p => new { p.MemberUserId, p.UpdatedAtUtc }).ToListAsync(ct);
        var last = await db.CheckIns.AsNoTracking().Where(c => c.UserId != null && ids.Contains(c.UserId.Value) && c.Decision == AccessDecision.Allowed)
            .GroupBy(c => c.UserId).Select(g => new { g.Key, Last = g.Max(c => c.OccurredAtUtc) }).ToListAsync(ct);
        return users.Select(u =>
        {
            var a = active.Where(x => x.UserId == u.Id).OrderByDescending(x => x.EndsAtUtc).FirstOrDefault();
            var w = metrics.Where(x => x.UserId == u.Id).Select(x => x.WeightKg).ToList();
            return new TraineeRowDto(u.Id, u.FullName, u.PhoneNumber ?? "", u.Gender?.ToString().ToLowerInvariant(), a?.Package,
                a is null ? null : (int)Math.Ceiling((a.EndsAtUtc!.Value - now).TotalDays),
                w.Count > 0 ? w[^1] : null, w.Count > 1 ? w[^1] - w[0] : null,
                plans.Where(p => p.MemberUserId == u.Id).Select(p => (DateTime?)p.UpdatedAtUtc).Max(), last.FirstOrDefault(l => l.Key == u.Id)?.Last);
        }).OrderBy(r => r.FullName).ToList();
    }

    public async Task<IReadOnlyList<TraineeRowDto>> TraineesAsync(int coachUserId, CancellationToken ct)
    {
        var coach = await CoachOf(coachUserId, ct);
        if (coach is null) return [];
        var ids = await db.CoachAssignments.Where(a => a.CoachId == coach.Id && a.IsActive).Select(a => a.MemberUserId).ToListAsync(ct);
        return await RowsAsync(ids, ct);
    }

    public async Task<Result<TraineeRowDto>> AddTraineeAsync(int coachUserId, string phone, CancellationToken ct)
    {
        var coach = await CoachOf(coachUserId, ct);
        if (coach is null) return Result<TraineeRowDto>.Fail("coach", "حساب شما به پروفایل مربی وصل نیست.", ErrorType.Forbidden);
        var p = PersianText.NormalizeMobile(phone);
        var user = await db.Users.FirstOrDefaultAsync(u => u.PhoneNumber == p, ct);
        if (user is null) return Result<TraineeRowDto>.Fail("phone", "عضوی با این شماره پیدا نشد. اول باید در سایت یا پذیرش ثبت‌نام کند.", ErrorType.NotFound);
        var a = await db.CoachAssignments.FirstOrDefaultAsync(x => x.CoachId == coach.Id && x.MemberUserId == user.Id, ct);
        if (a is null) db.CoachAssignments.Add(new CoachAssignment { CoachId = coach.Id, MemberUserId = user.Id, CreatedAtUtc = clock.UtcNow });
        else a.IsActive = true;
        await db.SaveChangesAsync(ct);
        return Result<TraineeRowDto>.Ok((await RowsAsync([user.Id], ct))[0]);
    }

    public async Task<Result<TraineeDetailDto>> DetailAsync(int coachUserId, int memberId, CancellationToken ct)
    {
        var coach = await CoachOf(coachUserId, ct);
        if (coach is null || !await IsTrainee(coach.Id, memberId, ct)) return Result<TraineeDetailDto>.Fail("member", "این عضو شاگرد شما نیست.", ErrorType.NotFound);
        var row = (await RowsAsync([memberId], ct))[0];
        var now = clock.UtcNow;
        var m = await db.Memberships.AsNoTracking().Include(x => x.Branch).Include(x => x.Package)
            .Where(x => x.UserId == memberId && x.Status == MembershipStatus.Active && x.StartsAtUtc <= now && x.EndsAtUtc > now)
            .OrderBy(x => x.EndsAtUtc).FirstOrDefaultAsync(ct);
        var checks = await db.CheckIns.CountAsync(c => c.UserId == memberId && c.Decision == AccessDecision.Allowed && c.OccurredAtUtc > now.AddDays(-30), ct);
        return Result<TraineeDetailDto>.Ok(new TraineeDetailDto(row, m is null ? null : MemberService.ToDto(m, now), await MetricsAsync(memberId, ct), await MyPlanAsync(memberId, ct), checks));
    }

    public async Task<Result<TrainingPlanDto>> SavePlanAsync(int coachUserId, int memberId, SavePlanRequest r, CancellationToken ct)
    {
        var coach = await CoachOf(coachUserId, ct);
        if (coach is null || !await IsTrainee(coach.Id, memberId, ct)) return Result<TrainingPlanDto>.Fail("member", "این عضو شاگرد شما نیست.", ErrorType.NotFound);
        var title = PersianText.CleanText(r.Title);
        if (title is null || title.Length > 100) return Result<TrainingPlanDto>.Fail("title", "عنوان برنامه را بنویسید (حداکثر ۱۰۰ حرف).");
        var days = (r.Days ?? []).Select(d => new PlanDayDto(Clip(d.Day, 20), Clip(d.Focus, 60),
            (d.Items ?? []).Select(i => Clip(i, 120)).Where(i => i.Length > 0).Take(15).ToList())).Where(d => d.Day.Length > 0).Take(7).ToList();
        if (days.Count == 0) return Result<TrainingPlanDto>.Fail("days", "حداقل یک روز تمرین اضافه کنید.");
        var nutrition = PersianText.CleanText(r.Nutrition);
        if (nutrition?.Length > 3000) nutrition = nutrition[..3000];

        await db.TrainingPlans.Where(p => p.MemberUserId == memberId && p.IsActive).ExecuteUpdateAsync(s => s.SetProperty(p => p.IsActive, false), ct);
        var plan = new TrainingPlan { MemberUserId = memberId, CoachId = coach.Id, Title = title, DaysJson = JsonSerializer.Serialize(days, Json), Nutrition = nutrition, UpdatedAtUtc = clock.UtcNow, CreatedAtUtc = clock.UtcNow };
        db.TrainingPlans.Add(plan);
        await db.SaveChangesAsync(ct);
        return Result<TrainingPlanDto>.Ok(new TrainingPlanDto(plan.Id, plan.Title, days, plan.Nutrition, coach.FullName, plan.UpdatedAtUtc));
    }

    private static string Clip(string? s, int max) { var c = PersianText.CleanText(s) ?? ""; return c.Length > max ? c[..max] : c; }

    public async Task<Result<BodyMetricDto>> AddMetricAsync(int? coachUserId, int memberId, AddMetricRequest r, CancellationToken ct)
    {
        if (coachUserId is { } cu)
        {
            var coach = await CoachOf(cu, ct);
            if (coach is null || !await IsTrainee(coach.Id, memberId, ct)) return Result<BodyMetricDto>.Fail("member", "این عضو شاگرد شما نیست.", ErrorType.NotFound);
        }
        if (r.WeightKg is < 30 or > 250) return Result<BodyMetricDto>.Fail("weightKg", "وزن را بین ۳۰ تا ۲۵۰ کیلوگرم وارد کنید.");
        if (r.BodyFatPercent is < 3 or > 60) return Result<BodyMetricDto>.Fail("bodyFatPercent", "درصد چربی معتبر نیست.");
        if (r.WaistCm is < 40 or > 200) return Result<BodyMetricDto>.Fail("waistCm", "دور کمر معتبر نیست.");
        var today = DateOnly.FromDateTime(Jalali.ToTehran(clock.UtcNow));
        var on = r.MeasuredOn is { } d && d <= today && d > today.AddYears(-2) ? d : today;
        var m = new BodyMetric { UserId = memberId, MeasuredOn = on, WeightKg = Math.Round(r.WeightKg, 1), BodyFatPercent = r.BodyFatPercent, WaistCm = r.WaistCm, RecordedByUserId = coachUserId ?? memberId, CreatedAtUtc = clock.UtcNow };
        db.BodyMetrics.Add(m);
        await db.SaveChangesAsync(ct);
        return Result<BodyMetricDto>.Ok(new BodyMetricDto(m.Id, m.MeasuredOn, m.WeightKg, m.BodyFatPercent, m.WaistCm));
    }

    public async Task<TrainingPlanDto?> MyPlanAsync(int userId, CancellationToken ct)
    {
        var p = await db.TrainingPlans.AsNoTracking().Include(x => x.Coach).Where(x => x.MemberUserId == userId && x.IsActive)
            .OrderByDescending(x => x.UpdatedAtUtc).FirstOrDefaultAsync(ct);
        return p is null ? null : new TrainingPlanDto(p.Id, p.Title, JsonSerializer.Deserialize<List<PlanDayDto>>(p.DaysJson, Json) ?? [], p.Nutrition, p.Coach?.FullName ?? "", p.UpdatedAtUtc);
    }

    public async Task<IReadOnlyList<BodyMetricDto>> MetricsAsync(int userId, CancellationToken ct) =>
        await db.BodyMetrics.AsNoTracking().Where(b => b.UserId == userId).OrderBy(b => b.MeasuredOn).ThenBy(b => b.Id).Take(200)
            .Select(b => new BodyMetricDto(b.Id, b.MeasuredOn, b.WeightKg, b.BodyFatPercent, b.WaistCm)).ToListAsync(ct);

    public async Task<bool> DeleteMetricAsync(int userId, int metricId, CancellationToken ct) =>
        await db.BodyMetrics.Where(b => b.Id == metricId && b.UserId == userId).ExecuteDeleteAsync(ct) > 0;

    public async Task<PreferencesDto> PreferencesAsync(int userId, CancellationToken ct) =>
        await db.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => new PreferencesDto(u.BirthDate, u.MarketingSmsOptIn)).FirstAsync(ct);

    public async Task<Result<PreferencesDto>> SavePreferencesAsync(int userId, PreferencesRequest r, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(clock.UtcNow);
        if (r.BirthDate is { } b && (b > today.AddYears(-10) || b < today.AddYears(-100)))
            return Result<PreferencesDto>.Fail("birthDate", "تاریخ تولد معتبر نیست.");
        var u = await db.Users.FirstAsync(x => x.Id == userId, ct);
        u.BirthDate = r.BirthDate; u.MarketingSmsOptIn = r.MarketingSmsOptIn;
        db.AuditLogs.Add(new AuditLog { Action = "member.preferences", EntityType = "User", EntityId = userId.ToString(), UserId = userId, Data = $"optIn={r.MarketingSmsOptIn}" });
        await db.SaveChangesAsync(ct);
        return Result<PreferencesDto>.Ok(new PreferencesDto(u.BirthDate, u.MarketingSmsOptIn));
    }
}
