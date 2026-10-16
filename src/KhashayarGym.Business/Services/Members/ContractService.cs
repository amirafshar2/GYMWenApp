using System.Security.Cryptography;
using System.Text;
using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.Business.Pdf;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using KhashayarGym.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.Business.Services.Members;

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
            .FirstOrDefaultAsync(x => x.Id == paymentId && x.UserId == userId && x.Status == PaymentStatus.Succeeded, ct);
        if (p?.Membership is null || p.User is null) return null;
        var m = p.Membership;
        var bytes = pdf.Invoice(new InvoicePdfModel(Brand, p.InvoiceNumber ?? p.Id.ToString(), p.PaidAtUtc ?? p.CreatedAtUtc,
            p.User.FullName ?? "", p.User.PhoneNumber ?? "", m.Package!.Name, m.Branch!.Name,
            m.Section == GenderSection.Women ? "women" : "men", m.StartsAtUtc, m.EndsAtUtc,
            p.BaseAmountToman, p.CampaignDiscountToman, p.CodeDiscountToman, p.DiscountCode, p.AmountToman, p.TrackingNumber, p.TransactionCode));
        return (bytes, $"khashayar-invoice-{p.InvoiceNumber}.pdf");
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
