using GymPlatform.Business.Common;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Business.Services.Site;

/// <summary>Einrichtungsassistent: jeder Schritt wird möglichst aus den Daten selbst erkannt</summary>
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
            S("brand", "Name und Logo", "Name des Studios, Kurzname neben dem Logo, Stadt und Logodatei.", "/panel/site?tab=brand",
                c.Brand.Name.Length > 0 && c.Brand.ShortName.Length > 0 && c.Brand.LogoUrl is not null),
            S("theme", "Farben", "Haupt- und Akzentfarbe passend zum Logo wählen.", "/panel/site?tab=theme", false, optional: true),
            S("contact", "Kontaktdaten", "Service-Telefon, Instagram und Büroadresse.", "/panel/site?tab=contact", c.Contact.Phone.Length > 0),
            S("branches", "Filialen", "Mindestens eine Filiale mit Adresse, Öffnungszeiten und Herren-/Damenbereich.", "/panel/branches", branches > 0),
            S("packages", "Mitgliedschaftspakete", "Preis und Laufzeit der Pakete; jedes Paket für eine oder alle Filialen.", "/panel/packages", packages > 0),
            S("coaches", "Trainer", "Foto, Fachgebiet und Filiale jedes Trainers.", "/panel/coaches", coaches > 0, optional: !c.Modules.Coaches),
            S("home", "Texte und Bilder der Startseite", "Überschriften, Bilder und sichtbare Bereiche.", "/panel/site?tab=home", false, optional: true),
            S("contract", "Mitgliedsvertrag", "Vertragsklauseln und Fragen des Gesundheitsfragebogens.", "/panel/contract", contract),
            S("legal", "Rechtsseiten", "Die gelben Lücken in „Über uns“, „AGB“ und „Erstattung“ ausfüllen.", "/panel/site?tab=legal", !legalTodo),
            S("staff", "Mitarbeiter", "Empfang, Filialleitung und Trainer mit Handynummer hinzufügen.", "/panel/staff", staff, optional: true),
            new("publish", "Seite veröffentlichen", "Wenn alles bereit ist, die Seite für alle öffnen.", "/panel/setup", c.Setup.Published, false),
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
            if (!StepKeys.Contains(step) || step == "publish") return Result<SetupStatusDto>.Fail("step", "Ungültiger Schritt.");
            s.DoneSteps = (r.StepDone == false ? s.DoneSteps.Where(x => x != step) : s.DoneSteps.Append(step)).Distinct().ToList();
        }
        if (r.GuideHidden is { } gh) s.GuideHidden = gh;
        if (r.Publish is { } pub)
        {
            if (pub)
            {
                var st = await GetSetupStatusAsync(ct);
                var missing = st.Steps.Where(x => !x.Optional && !x.Done && x.Key is not ("publish" or "legal")).Select(x => x.Title).ToList();
                if (missing.Count > 0) return Result<SetupStatusDto>.Fail("publish", "Vor der Veröffentlichung bitte vervollständigen: " + string.Join(", ", missing));
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
