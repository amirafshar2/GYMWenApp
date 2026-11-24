using System.Security.Cryptography;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Business.Services.Members;

public interface ICheckoutService
{
    Task<Result<QuoteDto>> QuoteAsync(QuoteRequest request, CancellationToken ct);
    Task<Result<CheckoutStartedDto>> StartAsync(int userId, StartCheckoutRequest request, RequestContext rc, CancellationToken ct);
}

/// <summary>
/// Preisberechnung (Aktionsrabatt → Rabattcode) und Anlage einer offenen Zahlung.
/// Der Preis wird immer serverseitig berechnet; ein vom Client gesendeter Betrag wird nicht akzeptiert.
/// </summary>
public sealed class CheckoutService(GymDbContext db, IPricingService pricing, IClock clock) : ICheckoutService
{
    public async Task<Result<QuoteDto>> QuoteAsync(QuoteRequest request, CancellationToken ct)
    {
        var r = await PriceAsync(request.BranchSlug, request.PackageSlug, request.Section, request.DiscountCode, ct);
        return r.Succeeded ? Result<QuoteDto>.Ok(r.Value!.Quote) : Result<QuoteDto>.Fail(r.Errors.ToDictionary(), r.ErrorType);
    }

    public async Task<Result<CheckoutStartedDto>> StartAsync(int userId, StartCheckoutRequest request, RequestContext rc, CancellationToken ct)
    {
        var key = (request.IdempotencyKey ?? "").Trim();
        if (key.Length is < 8 or > 64)
            return Result<CheckoutStartedDto>.Fail("idempotencyKey", "Ungültige Anfrage-ID.");

        // Dieselbe Anfrage kam erneut (Doppelklick, Neuladen): dieselbe Zahlung wird zurückgegeben
        var existing = await db.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId && p.IdempotencyKey == key, ct);
        if (existing is not null)
            return Result<CheckoutStartedDto>.Ok(new CheckoutStartedDto(existing.Id, existing.TrackingNumber, existing.AmountToman, existing.Status == PaymentStatus.Succeeded));

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Result<CheckoutStartedDto>.Fail("user", "Benutzer nicht gefunden.", ErrorType.Unauthorized);
        if (string.IsNullOrWhiteSpace(user.FullName))
            return Result<CheckoutStartedDto>.Fail("fullName", "Bitte vor der Zahlung Vor- und Nachnamen eingeben.");

        var activeVersion = await db.ContractTemplates.Where(t => t.IsActive).Select(t => (int?)t.Version).MaxAsync(ct);
        if (activeVersion is not null &&
            !await db.SignedContracts.AnyAsync(s => s.UserId == userId && s.Version == activeVersion, ct))
            return Result<CheckoutStartedDto>.Fail("contract", "Bitte vor der Zahlung den Vertrag lesen und unterschreiben.", ErrorType.Forbidden);

        var priced = await PriceAsync(request.BranchSlug, request.PackageSlug, request.Section, request.DiscountCode, ct);
        if (!priced.Succeeded) return Result<CheckoutStartedDto>.Fail(priced.Errors.ToDictionary(), priced.ErrorType);
        var p = priced.Value!;
        // Getrennte Bereiche: das erfasste Geschlecht muss zum gewählten Bereich passen
        if (user.Gender == Gender.Female && p.Section != GenderSection.Women)
            return Result<CheckoutStartedDto>.Fail("section", "Für Frauen ist nur der Damenbereich wählbar.");
        if (user.Gender == Gender.Male && p.Section != GenderSection.Men)
            return Result<CheckoutStartedDto>.Fail("section", "Für Männer ist nur der Herrenbereich wählbar.");
        if (p.Quote.DiscountCodeError is not null)
            return Result<CheckoutStartedDto>.Fail("discountCode", p.Quote.DiscountCodeError);

        var now = clock.UtcNow;
        // Code-Limit (inkl. offener Zahlungen), einmal pro Person, „nur Mitglieder“ und Kapazität der Aktion
        if (p.Quote.DiscountCode is { } usedCode && await db.DiscountCodes.AsNoTracking().FirstOrDefaultAsync(d => d.Code == usedCode, ct) is { } dc)
        {
            if (dc.MembersOnly && !await DiscountGuard.IsActiveMemberAsync(db, userId, now, ct))
                return Result<CheckoutStartedDto>.Fail("discountCode", "Dieser Code gilt nur für Mitglieder mit aktiver Mitgliedschaft.");
            if (await DiscountGuard.CodeErrorAsync(db, dc, userId, now, ct) is { } codeLimit)
                return Result<CheckoutStartedDto>.Fail("discountCode", codeLimit, ErrorType.Conflict);
        }
        if (p.CampaignId is { } cid && await DiscountGuard.CampaignErrorAsync(db, cid, now, ct) is { } campaignFull)
            return Result<CheckoutStartedDto>.Fail("campaign", campaignFull, ErrorType.Conflict);
        var membership = new Membership
        {
            UserId = userId, BranchId = p.Branch.Id, PackageId = p.Package.Id, Section = p.Section,
            Status = MembershipStatus.PendingPayment, SessionsTotal = p.Package.Sessions,
            CardToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)), CreatedAtUtc = now
        };
        var payment = new Payment
        {
            UserId = userId, Membership = membership, IdempotencyKey = key, Purpose = PaymentPurpose.Membership,
            Description = $"{p.Package.Name} — {p.Branch.Name}",
            BaseAmountToman = p.Quote.BaseAmountToman, CampaignDiscountToman = p.Quote.CampaignDiscountToman,
            CodeDiscountToman = p.Quote.CodeDiscountToman, AmountToman = p.Quote.TotalToman,
            CampaignId = p.CampaignId, DiscountCode = p.Quote.DiscountCode,
            TrackingNumber = await NewTrackingNumberAsync(ct), CreatedAtUtc = now
        };
        db.Payments.Add(payment);
        db.AuditLogs.Add(new AuditLog { Action = "payment.created", EntityType = "Payment", UserId = userId, Ip = rc.Ip,
            Data = $"package={p.Package.Slug};branch={p.Branch.Slug};amount={payment.AmountToman}" });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            // Zwei gleichzeitige Anfragen mit demselben Schlüssel: eine ist gespeichert; diese zurückgeben
            db.ChangeTracker.Clear();
            var again = await db.Payments.AsNoTracking().FirstAsync(x => x.UserId == userId && x.IdempotencyKey == key, ct);
            return Result<CheckoutStartedDto>.Ok(new CheckoutStartedDto(again.Id, again.TrackingNumber, again.AmountToman, again.Status == PaymentStatus.Succeeded));
        }
        return Result<CheckoutStartedDto>.Ok(new CheckoutStartedDto(payment.Id, payment.TrackingNumber, payment.AmountToman, false));
    }

    private sealed record Priced(QuoteDto Quote, Branch Branch, MembershipPackage Package, GenderSection Section, int? CampaignId);

    private async Task<Result<Priced>> PriceAsync(string branchSlug, string packageSlug, string section, string? discountCode, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Slug == branchSlug && b.IsActive, ct);
        var package = await db.Packages.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == packageSlug && x.IsActive, ct);
        GenderSection? sec = section?.ToLowerInvariant() switch { "men" => GenderSection.Men, "women" => GenderSection.Women, _ => null };
        if (branch is null) errors["branchSlug"] = ["Bitte eine Filiale wählen."];
        if (package is null) errors["packageSlug"] = ["Bitte ein Paket wählen."];
        if (sec is null) errors["section"] = ["Bitte Herren- oder Damenbereich wählen."];
        else if (branch is not null && !branch.Sections.HasFlag(sec.Value))
            errors["section"] = [sec == GenderSection.Women ? "Diese Filiale hat keinen Damenbereich." : "Diese Filiale hat keinen Herrenbereich."];
        if (errors.Count > 0) return Result<Priced>.Fail(errors);

        var now = clock.UtcNow;
        var campaigns = await db.Campaigns.AsNoTracking().Where(c => c.IsActive && c.StartsAtUtc <= now && c.EndsAtUtc > now).ToListAsync(ct);
        var campaign = pricing.BestCampaignFor(package!.Slug, package.PriceToman, campaigns, now, branch!.Slug);
        var afterCampaign = package.PriceToman - (campaign?.DiscountFor(package.PriceToman) ?? 0);

        string? code = string.IsNullOrWhiteSpace(discountCode) ? null : discountCode.Trim().ToUpperInvariant();
        int? codePercent = null; string? codeError = null; var total = afterCampaign;
        if (code is not null)
        {
            var dc = await db.DiscountCodes.AsNoTracking().FirstOrDefaultAsync(d => d.Code == code, ct);
            if (dc is null || !dc.IsUsableAt(now) || !dc.AppliesTo(DiscountScope.Membership)) codeError = "Rabattcode ungültig oder abgelaufen.";
            else { codePercent = dc.Percent; total = pricing.ApplyDiscount(afterCampaign, dc.Percent); }
        }

        var quote = new QuoteDto(
            branch!.Name, package.Name, sec == GenderSection.Women ? "women" : "men", package.DurationMonths, package.Sessions,
            package.PriceToman, campaign is null ? null : campaign.DiscountAmountToman is null ? campaign.DiscountPercent : null, campaign?.Title, package.PriceToman - afterCampaign,
            codeError is null ? code : null, codePercent, afterCampaign - total, total, codeError);
        return Result<Priced>.Ok(new Priced(quote, branch, package, sec!.Value, campaign?.Id));
    }

    private async Task<long> NewTrackingNumberAsync(CancellationToken ct)
    {
        for (var i = 0; i < 5; i++)
        {
            var n = RandomNumberGenerator.GetInt32(100_000_000, int.MaxValue) + 10_000_000_000L;
            if (!await db.Payments.AnyAsync(p => p.TrackingNumber == n, ct)) return n;
        }
        throw new InvalidOperationException("Could not allocate tracking number.");
    }
}
