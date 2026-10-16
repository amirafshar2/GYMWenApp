using System.Security.Cryptography;
using System.Text;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.Business.Pdf;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Business.Services.Members;

public interface IContractService
{
    Task<ContractDto?> GetActiveAsync(CancellationToken ct);
    Task<Result<OtpSentDto>> SendSignCodeAsync(int userId, RequestContext rc, CancellationToken ct);
    Task<Result<SignedContractDto>> SignAsync(int userId, SignContractRequest request, RequestContext rc, CancellationToken ct);
    Task<(byte[] Pdf, string FileName)?> GetPdfAsync(int userId, int signedContractId, CancellationToken ct);
    Task<(byte[] Pdf, string FileName)?> GetInvoicePdfAsync(int userId, int paymentId, CancellationToken ct);
}

/// <summary>
/// قرارداد نسخه‌دار: عضو متن و فرم سلامت را می‌خواند، تیک می‌زند و با کد پیامکی (هدف SignContract) تأیید می‌کند.
/// زمان، IP، User-Agent، نسخه و هش متن امضاشده ثبت و PDF بیرون از wwwroot ذخیره می‌شود.
/// </summary>
public sealed class ContractService(
    GymDbContext db, IOtpService otp, IPdfService pdf, IPrivateFileStore files, IClock clock) : IContractService
{
    private const string Brand = "مجموعه باشگاه‌های خشایار";

    public async Task<ContractDto?> GetActiveAsync(CancellationToken ct) =>
        await db.ContractTemplates.AsNoTracking().Where(t => t.IsActive).OrderByDescending(t => t.Version)
            .Select(t => new ContractDto(t.Id, t.Version, t.Title, t.Clauses, t.HealthQuestions))
            .FirstOrDefaultAsync(ct);

    public async Task<Result<OtpSentDto>> SendSignCodeAsync(int userId, RequestContext rc, CancellationToken ct)
    {
        var phone = await db.Users.Where(u => u.Id == userId).Select(u => u.PhoneNumber).FirstOrDefaultAsync(ct);
        if (phone is null) return Result<OtpSentDto>.Fail("user", "کاربر پیدا نشد.", ErrorType.Unauthorized);
        return await otp.SendAsync(phone, OtpPurpose.SignContract, rc, ct);
    }

    public async Task<Result<SignedContractDto>> SignAsync(int userId, SignContractRequest r, RequestContext rc, CancellationToken ct)
    {
        var template = await db.ContractTemplates.AsNoTracking().Where(t => t.IsActive).OrderByDescending(t => t.Version).FirstOrDefaultAsync(ct);
        if (template is null) return Result<SignedContractDto>.Fail("contract", "قرارداد فعالی وجود ندارد.", ErrorType.NotFound);

        var errors = new Dictionary<string, string[]>();
        var name = PersianText.CleanText(r.FullName);
        if (r.Version != template.Version) errors["version"] = ["نسخهٔ قرارداد تغییر کرده است؛ صفحه را دوباره بارگذاری کنید."];
        if (!r.Accepted) errors["accepted"] = ["برای ادامه باید متن قرارداد را بپذیرید."];
        if (name is null || name.Length is < 3 or > 100) errors["fullName"] = ["نام و نام خانوادگی را کامل بنویسید."];
        if (r.HealthAnswers is null || r.HealthAnswers.Count != template.HealthQuestions.Count) errors["healthAnswers"] = ["به همهٔ پرسش‌های فرم سلامت پاسخ دهید."];
        var notes = PersianText.CleanText(r.HealthNotes);
        if (notes?.Length > 1000) errors["healthNotes"] = ["توضیح حداکثر ۱۰۰۰ حرف است."];
        if (errors.Count > 0) return Result<SignedContractDto>.Fail(errors);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user?.PhoneNumber is null) return Result<SignedContractDto>.Fail("user", "کاربر پیدا نشد.", ErrorType.Unauthorized);

        var verified = await otp.VerifyAsync(user.PhoneNumber, OtpPurpose.SignContract, r.Code, ct);
        if (!verified.Succeeded) return Result<SignedContractDto>.Fail(verified.Errors.ToDictionary(), verified.ErrorType);

        var now = clock.UtcNow;
        var hash = ContentHash(template, name!, user.PhoneNumber, r.HealthAnswers!, notes, now);
        var signed = new SignedContract
        {
            UserId = userId, TemplateId = template.Id, Version = template.Version, SignerName = name!, SignerPhone = user.PhoneNumber,
            SignedAtUtc = now, IpAddress = rc.Ip, UserAgent = rc.UserAgent?.Length > 300 ? rc.UserAgent[..300] : rc.UserAgent,
            HealthAnswers = r.HealthAnswers!.ToList(), HealthNotes = notes, ContentHash = hash, CreatedAtUtc = now
        };
        if (string.IsNullOrWhiteSpace(user.FullName)) user.FullName = name;
        db.SignedContracts.Add(signed);
        await db.SaveChangesAsync(ct);

        var bytes = pdf.Contract(new ContractPdfModel(Brand, template.Title, template.Version, name!, user.PhoneNumber, now, rc.Ip,
            template.Clauses, template.HealthQuestions, signed.HealthAnswers, notes, hash));
        signed.PdfPath = await files.SaveAsync("contracts", $"contract-{signed.Id}-v{template.Version}.pdf", bytes, ct);
        db.AuditLogs.Add(new AuditLog { Action = "contract.signed", EntityType = "SignedContract", EntityId = signed.Id.ToString(), UserId = userId, Ip = rc.Ip, Data = $"version={template.Version};hash={hash}" });
        await db.SaveChangesAsync(ct);

        return Result<SignedContractDto>.Ok(new SignedContractDto(signed.Id, signed.Version, now, hash, signed.HealthAnswers.Any(a => a)));
    }

    public async Task<(byte[] Pdf, string FileName)?> GetPdfAsync(int userId, int id, CancellationToken ct)
    {
        var s = await db.SignedContracts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (s?.PdfPath is null) return null;
        var bytes = await files.ReadAsync(s.PdfPath, ct);
        return bytes is null ? null : (bytes, $"khashayar-contract-v{s.Version}.pdf");
    }

    public async Task<(byte[] Pdf, string FileName)?> GetInvoicePdfAsync(int userId, int paymentId, CancellationToken ct)
    {
        var p = await db.Payments.AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Membership).ThenInclude(m => m!.Package)
            .Include(x => x.Membership).ThenInclude(m => m!.Branch)
            .Include(x => x.ShopOrder).ThenInclude(o => o!.Items)
            .Include(x => x.ShopOrder).ThenInclude(o => o!.Branch)
            .Include(x => x.CanteenOrder).ThenInclude(o => o!.Items)
            .Include(x => x.CanteenOrder).ThenInclude(o => o!.Branch)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == paymentId && x.UserId == userId && x.Status == PaymentStatus.Succeeded, ct);
        if (p?.User is null) return null;
        var model = BuildInvoice(p);
        if (model is null) return null;
        return (pdf.Invoice(model), $"khashayar-invoice-{p.InvoiceNumber}.pdf");
    }

    private static InvoicePdfModel? BuildInvoice(Payment p)
    {
        var no = p.InvoiceNumber ?? p.Id.ToString();
        var at = p.PaidAtUtc ?? p.CreatedAtUtc;
        var name = p.User!.FullName ?? "";
        var phone = p.User.PhoneNumber ?? "";
        switch (p.Purpose)
        {
            case PaymentPurpose.Membership when p.Membership is { } m:
                return new InvoicePdfModel(Brand, no, at, name, phone, m.Package!.Name, m.Branch!.Name,
                    m.Section == GenderSection.Women ? "women" : "men", m.StartsAtUtc, m.EndsAtUtc,
                    p.BaseAmountToman, p.CampaignDiscountToman, p.CodeDiscountToman, p.DiscountCode, p.AmountToman, p.TrackingNumber, p.TransactionCode);
            case PaymentPurpose.ShopOrder when p.ShopOrder is { } o:
                return new InvoicePdfModel(Brand, no, at, name, phone, o.Number ?? "", o.Branch?.Name ?? "", "shop", null, null,
                    o.SubtotalToman, 0, o.DiscountToman, o.DiscountCode, p.AmountToman, p.TrackingNumber, p.TransactionCode,
                    $"فاکتور فروشگاه — سفارش {PersianText.FaDigits(o.Number ?? "")}",
                    o.Items.Select(i => new InvoiceLine(i.VariantLabel is null ? i.ProductName : $"{i.ProductName} ({i.VariantLabel})", i.Quantity, i.UnitPriceToman)).ToList(),
                    o.ShippingToman, o.Fulfillment == Fulfillment.Pickup ? $"تحویل حضوری — {o.Branch?.Name}" : "ارسال به نشانی");
            case PaymentPurpose.CanteenOrder when p.CanteenOrder is { } c:
                return new InvoicePdfModel(Brand, no, at, name, phone, "", c.Branch?.Name ?? "", "canteen", null, null,
                    c.TotalToman, 0, 0, null, p.AmountToman, p.TrackingNumber, p.TransactionCode,
                    $"رسید بوفه — {c.Branch?.Name}", c.Items.Select(i => new InvoiceLine(i.Name, i.Quantity, i.UnitPriceToman)).ToList());
            case PaymentPurpose.WalletTopUp:
                return new InvoicePdfModel(Brand, no, at, name, phone, "شارژ کیف پول", "", "wallet", null, null,
                    p.AmountToman, 0, 0, null, p.AmountToman, p.TrackingNumber, p.TransactionCode, "رسید شارژ کیف پول");
            default:
                return null;
        }
    }

    private static string ContentHash(ContractTemplate t, string name, string phone, IReadOnlyList<bool> answers, string? notes, DateTime at)
    {
        var sb = new StringBuilder();
        sb.Append(t.Version).Append('\n').Append(t.Title).Append('\n');
        foreach (var c in t.Clauses) sb.Append(c).Append('\n');
        for (var i = 0; i < t.HealthQuestions.Count; i++) sb.Append(t.HealthQuestions[i]).Append('=').Append(answers[i] ? "1" : "0").Append('\n');
        sb.Append(notes).Append('\n').Append(name).Append('|').Append(phone).Append('|').Append(at.ToString("O"));
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sb.ToString())));
    }
}
