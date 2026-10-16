using System.Reflection;
using KhashayarGym.Business.Common;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace KhashayarGym.Business.Pdf;

public sealed record ContractPdfModel(
    string BrandName, string Title, int Version, string SignerName, string SignerPhone, DateTime SignedAtUtc,
    string? Ip, IReadOnlyList<string> Clauses, IReadOnlyList<string> HealthQuestions, IReadOnlyList<bool> HealthAnswers,
    string? HealthNotes, string ContentHash);

public sealed record InvoicePdfModel(
    string BrandName, string InvoiceNumber, DateTime PaidAtUtc, string BuyerName, string BuyerPhone,
    string PackageName, string BranchName, string Section, DateTime? StartsAtUtc, DateTime? EndsAtUtc,
    long BaseAmountToman, long CampaignDiscountToman, long CodeDiscountToman, string? DiscountCode, long AmountToman,
    long TrackingNumber, string? TransactionCode);

public interface IPdfService
{
    byte[] Contract(ContractPdfModel m);
    byte[] Invoice(InvoicePdfModel m);
}

/// <summary>PDF راست‌به‌چپ فارسی با QuestPDF (لایسنس Community) و فونت Vazirmatn با ارقام فارسی.</summary>
public sealed class PdfService : IPdfService
{
    private const string Font = "Vazirmatn FD";
    private static readonly string Ink = "#2C2C2C", Muted = "#6B6B6B", Line = "#E5E5E5", Red = "#E8283C";
    private static bool _init;
    private static readonly object Gate = new();

    public PdfService() => EnsureInit();

    private static void EnsureInit()
    {
        lock (Gate)
        {
            if (_init) return;
            QuestPDF.Settings.License = LicenseType.Community;
            var asm = Assembly.GetExecutingAssembly();
            foreach (var name in asm.GetManifestResourceNames().Where(n => n.EndsWith(".ttf")))
            {
                using var s = asm.GetManifestResourceStream(name)!;
                QuestPDF.Drawing.FontManager.RegisterFont(s);
            }
            _init = true;
        }
    }

    private static string Fa(long n) => PersianText.FaDigits(n.ToString("N0").Replace(",", "٬"));

    private static void Frame(IDocumentContainer doc, string brand, string heading, Action<ColumnDescriptor> body) =>
        doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.ContentFromRightToLeft();
            page.DefaultTextStyle(t => t.FontFamily(Font).FontSize(10.5f).FontColor(Ink).LineHeight(1.6f));
            page.Header().PaddingBottom(14).BorderBottom(2).BorderColor(Red).Row(r =>
            {
                r.RelativeItem().Column(c =>
                {
                    c.Item().Text(brand).FontSize(16).Black();
                    c.Item().Text(heading).FontSize(11).FontColor(Muted);
                });
            });
            page.Content().PaddingTop(16).Column(body);
            page.Footer().AlignCenter().Text(t =>
            {
                t.DefaultTextStyle(s => s.FontSize(8.5f).FontColor(Muted));
                t.Span("صفحهٔ ");
                t.CurrentPageNumber();
                t.Span(" از ");
                t.TotalPages();
            });
        });

    public byte[] Contract(ContractPdfModel m) => Document.Create(doc => Frame(doc, m.BrandName, $"{m.Title} — نسخهٔ {PersianText.FaDigits(m.Version.ToString())}", col =>
    {
        col.Spacing(10);
        col.Item().Background("#F7F7F7").Padding(10).Table(t =>
        {
            t.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(); });
            void Cell(string k, string v) => t.Cell().Padding(3).Text(x => { x.Span(k + ": ").FontColor(Muted); x.Span(v).Bold(); });
            Cell("نام عضو", m.SignerName);
            Cell("موبایل", PersianText.FaDigits(m.SignerPhone));
            Cell("تاریخ و ساعت امضا", Jalali.DateTimeText(m.SignedAtUtc));
            Cell("نسخهٔ قرارداد", PersianText.FaDigits(m.Version.ToString()));
        });

        col.Item().Text("بندهای قرارداد").FontSize(12).Bold();
        for (var i = 0; i < m.Clauses.Count; i++)
        {
            var n = PersianText.FaDigits((i + 1).ToString());
            col.Item().Row(r =>
            {
                r.ConstantItem(22).Text(n + ".").Bold().FontColor(Red);
                r.RelativeItem().Text(m.Clauses[i]).Justify();
            });
        }

        col.Item().PaddingTop(8).Text("فرم سلامت پیش از ورزش").FontSize(12).Bold();
        col.Item().Table(t =>
        {
            t.ColumnsDefinition(c => { c.ConstantColumn(24); c.RelativeColumn(); c.ConstantColumn(44); });
            for (var i = 0; i < m.HealthQuestions.Count; i++)
            {
                var yes = i < m.HealthAnswers.Count && m.HealthAnswers[i];
                t.Cell().BorderBottom(1).BorderColor(Line).Padding(4).Text(PersianText.FaDigits((i + 1).ToString()));
                t.Cell().BorderBottom(1).BorderColor(Line).Padding(4).Text(m.HealthQuestions[i]);
                t.Cell().BorderBottom(1).BorderColor(Line).Padding(4).AlignCenter().Text(yes ? "بله" : "خیر").Bold().FontColor(yes ? Red : Ink);
            }
        });
        if (!string.IsNullOrWhiteSpace(m.HealthNotes))
            col.Item().Text(t => { t.Span("توضیح عضو: ").FontColor(Muted); t.Span(m.HealthNotes); });
        if (m.HealthAnswers.Any(a => a))
            col.Item().Background("#FDE8EA").Padding(8).Text("به دست‌کم یکی از پرسش‌ها «بله» پاسخ داده شده؛ شروع تمرین پس از مشورت با پزشک توصیه می‌شود.").FontColor(Red);

        col.Item().PaddingTop(10).Border(1).BorderColor(Line).Padding(10).Column(s =>
        {
            s.Item().Text("امضای الکترونیکی").Bold();
            s.Item().Text($"این قرارداد با کد یکبارمصرف ارسال‌شده به {PersianText.FaDigits(m.SignerPhone)} تأیید شده است.");
            s.Item().Text(t => { t.Span("نشانی IP: ").FontColor(Muted); t.Span(m.Ip ?? "—").FontFamily(Font); });
            s.Item().Text(t => { t.Span("اثر انگشت متن (SHA-256): ").FontColor(Muted); t.Span(m.ContentHash).FontSize(7.5f); });
        });
    })).GeneratePdf();

    public byte[] Invoice(InvoicePdfModel m) => Document.Create(doc => Frame(doc, m.BrandName, "فاکتور فروش عضویت", col =>
    {
        col.Spacing(12);
        col.Item().Row(r =>
        {
            r.RelativeItem().Text(t => { t.Span("شمارهٔ فاکتور: ").FontColor(Muted); t.Span(PersianText.FaDigits(m.InvoiceNumber)).Bold(); });
            r.RelativeItem().AlignLeft().Text(t => { t.Span("تاریخ: ").FontColor(Muted); t.Span(Jalali.DateTimeText(m.PaidAtUtc)).Bold(); });
        });
        col.Item().Background("#F7F7F7").Padding(10).Text(t =>
        {
            t.Span("خریدار: ").FontColor(Muted); t.Span(m.BuyerName).Bold();
            t.Span("   ·   موبایل: ").FontColor(Muted); t.Span(PersianText.FaDigits(m.BuyerPhone)).Bold();
        });

        col.Item().Table(t =>
        {
            t.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(2); });
            void Row(string k, string v, bool strong = false, string? color = null)
            {
                t.Cell().BorderBottom(1).BorderColor(Line).PaddingVertical(6).Text(k).FontColor(Muted);
                var cell = t.Cell().BorderBottom(1).BorderColor(Line).PaddingVertical(6).AlignLeft().Text(v);
                if (strong) cell.Bold();
                if (color is not null) cell.FontColor(color);
            }
            Row("پکیج", m.PackageName, true);
            Row("شعبه", $"{m.BranchName} — {(m.Section == "women" ? "سالن بانوان" : "سالن آقایان")}");
            if (m.StartsAtUtc is { } s && m.EndsAtUtc is { } e) Row("مدت اعتبار", $"{Jalali.Date(s)} تا {Jalali.Date(e)}");
            Row("قیمت پکیج", Fa(m.BaseAmountToman) + " تومان");
            if (m.CampaignDiscountToman > 0) Row("تخفیف جشنواره", "− " + Fa(m.CampaignDiscountToman) + " تومان", color: Red);
            if (m.CodeDiscountToman > 0) Row($"کد تخفیف {m.DiscountCode}", "− " + Fa(m.CodeDiscountToman) + " تومان", color: Red);
            Row("مبلغ پرداخت‌شده", Fa(m.AmountToman) + " تومان", true);
        });

        col.Item().Text(t =>
        {
            t.Span("شمارهٔ پیگیری: ").FontColor(Muted); t.Span(PersianText.FaDigits(m.TrackingNumber.ToString())).Bold();
            if (m.TransactionCode is not null) { t.Span("   ·   کد تراکنش: ").FontColor(Muted); t.Span(PersianText.FaDigits(m.TransactionCode)).Bold(); }
        });
        col.Item().PaddingTop(6).Text("این فاکتور به‌صورت الکترونیکی صادر شده و بدون مهر معتبر است.").FontSize(9).FontColor(Muted);
    })).GeneratePdf();
}
