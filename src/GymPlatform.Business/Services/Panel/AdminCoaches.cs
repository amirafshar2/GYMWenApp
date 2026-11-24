using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Business.Services.Panel;

/// <summary>
/// Trainer (nur Gesamtadmin): Profil auf der Website + Login-Konto für das Trainerpanel.
/// Eine mit dem Trainer verknüpfte Handynummer erhält die Rolle „Trainer“; beim Entfernen wird sie wieder entzogen.
/// Ein Trainer mit Schülern oder Plänen wird nicht gelöscht (Historie bleibt); stattdessen deaktiviert.
/// </summary>
public sealed partial class AdminService
{
    private static string SectionName(GenderSection s) => s switch { GenderSection.Men => "men", GenderSection.Women => "women", _ => "both" };

    public async Task<IReadOnlyList<AdminCoachDto>> CoachesAsync(CancellationToken ct)
    {
        var trainees = await db.CoachAssignments.Where(a => a.IsActive).GroupBy(a => a.CoachId).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N, ct);
        var list = await db.Coaches.AsNoTracking().Include(c => c.Branch).Include(c => c.User).OrderBy(c => c.SortOrder).ToListAsync(ct);
        return list.Select(c => ToDto(c, trainees.GetValueOrDefault(c.Id))).ToList();
    }

    private static AdminCoachDto ToDto(Coach c, int trainees) => new(c.Id, c.Slug, c.FullName, c.Specialty, c.Bio, c.YearsOfExperience, SectionName(c.Section),
        c.Branch?.Slug ?? "", c.Branch?.Name ?? "", c.PhotoUrl, c.Achievements, c.IsActive, c.User?.PhoneNumber, c.User?.FullName, trainees);

    public async Task<Result<AdminCoachDto>> SaveCoachAsync(int? id, SaveCoachRequest r, int staffId, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var name = PersianText.CleanText(r.FullName);
        var specialty = PersianText.CleanText(r.Specialty);
        if (name is null || name.Length > 80) errors["fullName"] = ["Bitte den Namen des Trainers angeben."];
        if (specialty is null || specialty.Length > 80) errors["specialty"] = ["Bitte das Fachgebiet angeben (z. B. Muskelaufbau)."];
        if (r.YearsOfExperience is < 0 or > 60) errors["yearsOfExperience"] = ["Erfahrung zwischen 0 und 60 Jahren."];
        GenderSection? section = r.Section?.ToLowerInvariant() switch { "men" => GenderSection.Men, "women" => GenderSection.Women, "both" => GenderSection.Both, _ => null };
        if (section is null) errors["section"] = ["Bereich: Herren, Damen oder beide."];
        var branch = await db.Branches.FirstOrDefaultAsync(b => b.Slug == r.BranchSlug, ct);
        if (branch is null) errors["branchSlug"] = ["Bitte eine Filiale wählen."];
        if (r.PhotoUrl is { Length: > 0 } photo && !ValidImage(photo)) errors["photoUrl"] = ["Bitte ein Foto hochladen oder aus den Bildern der Seite wählen."];
        string? phone = null;
        if (!string.IsNullOrWhiteSpace(r.LinkedPhone))
        {
            phone = PersianText.NormalizeMobile(r.LinkedPhone);
            if (!PersianText.IsValidMobile(phone)) errors["linkedPhone"] = ["Ungültige Handynummer."];
        }
        if (errors.Count > 0) return Result<AdminCoachDto>.Fail(errors);

        // Login-Konto für das Trainerpanel (vor dem Hinzufügen zum Context; UserManager speichert denselben Context)
        int? userId = null;
        if (phone is not null)
        {
            var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone, ct);
            if (user is null)
            {
                user = new AppUser { UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true, FullName = name, CreatedAtUtc = clock.UtcNow };
                await users.CreateAsync(user);
                await users.AddToRoleAsync(user, Roles.Member);
            }
            if (await db.Coaches.AnyAsync(x => x.UserId == user.Id && x.Id != (id ?? 0), ct))
                return Result<AdminCoachDto>.Fail("linkedPhone", "Diese Nummer ist bereits mit einem anderen Trainer verknüpft.", ErrorType.Conflict);
            if (!await users.IsInRoleAsync(user, Roles.Coach)) await users.AddToRoleAsync(user, Roles.Coach);
            userId = user.Id;
        }

        Coach? c;
        if (id is { } cid)
        {
            c = await db.Coaches.FirstOrDefaultAsync(x => x.Id == cid, ct);
            if (c is null) return Result<AdminCoachDto>.Fail("id", "Trainer nicht gefunden.", ErrorType.NotFound);
        }
        else
        {
            c = new Coach { Slug = NewSlug("coach"), FullName = name!, Specialty = specialty!, SortOrder = (await db.Coaches.MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 1 };
            db.Coaches.Add(c);
        }

        var previousUserId = c.UserId;
        c.FullName = name!; c.Specialty = specialty!; c.Bio = Clip(r.Bio, 500); c.YearsOfExperience = r.YearsOfExperience; c.Section = section!.Value;
        c.BranchId = branch!.Id; c.PhotoUrl = string.IsNullOrWhiteSpace(r.PhotoUrl) ? null : r.PhotoUrl; c.IsActive = r.IsActive; c.UserId = userId;
        c.Achievements = (r.Achievements ?? []).Select(PersianText.CleanText).Where(x => x is not null).Cast<string>().Select(x => x.Length > 120 ? x[..120] : x).Take(8).ToList();
        await db.SaveChangesAsync(ct);

        // Ein früheres Konto ohne verknüpften Trainer verliert die Trainerrolle
        if (previousUserId is { } prev && prev != userId && !await db.Coaches.AnyAsync(x => x.UserId == prev, ct)
            && await users.FindByIdAsync(prev.ToString()) is { } old && await users.IsInRoleAsync(old, Roles.Coach))
            await users.RemoveFromRoleAsync(old, Roles.Coach);

        Audit(id is null ? "coach.created" : "coach.updated", "Coach", c.Id, staffId, $"{c.FullName};user={userId}");
        await db.SaveChangesAsync(ct);
        var fresh = await db.Coaches.AsNoTracking().Include(x => x.Branch).Include(x => x.User).FirstAsync(x => x.Id == c.Id, ct);
        return Result<AdminCoachDto>.Ok(ToDto(fresh, await db.CoachAssignments.CountAsync(a => a.CoachId == c.Id && a.IsActive, ct)));
    }

    public async Task<Result<bool>> DeleteCoachAsync(int id, int staffId, CancellationToken ct)
    {
        var c = await db.Coaches.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return Result<bool>.Fail("id", "Trainer nicht gefunden.", ErrorType.NotFound);
        if (await db.CoachAssignments.AnyAsync(a => a.CoachId == id, ct) || await db.TrainingPlans.AnyAsync(p => p.CoachId == id, ct))
            return Result<bool>.Fail("id", "Dieser Trainer hat Schüler oder Pläne und kann nicht gelöscht werden; stattdessen „Auf der Seite zeigen“ ausschalten.", ErrorType.Conflict);
        var userId = c.UserId;
        db.Coaches.Remove(c);
        Audit("coach.deleted", "Coach", id, staffId, c.FullName);
        await db.SaveChangesAsync(ct);
        if (userId is { } u && await users.FindByIdAsync(u.ToString()) is { } user && await users.IsInRoleAsync(user, Roles.Coach))
            await users.RemoveFromRoleAsync(user, Roles.Coach);
        return Result<bool>.Ok(true);
    }
}
