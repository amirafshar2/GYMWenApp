using System.Reflection;
using GymPlatform.Business.Common;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace GymPlatform.Business.Pdf;

public sealed record ContractPdfModel(
    string BrandName, string Title, int Version, string SignerName, string SignerPhone, DateTime SignedAtUtc,
    string? Ip, IReadOnlyList<string> Clauses, IReadOnlyList<string> HealthQuestions, IReadOnlyList<bool> HealthAnswers,
    string? HealthNotes, string ContentHash);

public sealed record InvoicePdfModel(
    string BrandName, string InvoiceNumber, DateTime PaidAtUtc, string BuyerName, string BuyerPhone,
    string PackageName, string BranchName, string Section, DateTime? StartsAtUtc, DateTime? EndsAtUtc,
    long BaseAmountToman, long CampaignDiscountToman, long CodeDiscountToman, string? DiscountCode, long AmountToman,
    long TrackingNumber, string? TransactionCode,
    string Title = "Rechnung Mitgliedschaft", IReadOnlyList<InvoiceLine>? Lines = null, long ShippingToman = 0, string? DeliveryText = null);

/// <summary>Eine Artikelzeile in der Shop-/Bistro-Rechnung</summary>
public sealed record InvoiceLine(string Name, int Quantity, long UnitToman);

public interface IPdfService
{
    byte[] Contract(ContractPdfModel m);
    byte[] Invoice(InvoicePdfModel m);
}

/// <summary>PDF mit QuestPDF (Community-Lizenz) und der Schrift Vazirmatn.</summary>
public sealed class PdfService : IPdfService
{
    private const string Font = "Vazirmatn FD";
    private static readonly string Ink = "#2C2C2C", Muted = "#6B6B6B", Line = "#E5E5E5", Red = "#0B5FB0";
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

    private static string Fa(long cents) => PersianText.Euro(cents);

    private static void Frame(IDocumentContainer doc, string brand, string heading, Action<ColumnDescriptor> body) =>
        doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
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
                t.Span("Seite ");
                t.CurrentPageNumber();
                t.Span(" von ");
                t.TotalPages();
            });
        });

    public byte[] Contract(ContractPdfModel m) => Document.Create(doc => Frame(doc, m.BrandName, $"{m.Title} — Version {PersianText.FaDigits(m.Version.ToString())}", col =>
    {
        col.Spacing(10);
        col.Item().Background("#F7F7F7").Padding(10).Table(t =>
        {
            t.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(); });
            void Cell(string k, string v) => t.Cell().Padding(3).Text(x => { x.Span(k + ": ").FontColor(Muted); x.Span(v).Bold(); });
            Cell("Name des Mitglieds", m.SignerName);
            Cell("Handy", PersianText.FaDigits(m.SignerPhone));
            Cell("Datum und Uhrzeit der Unterschrift", Jalali.DateTimeText(m.SignedAtUtc));
            Cell("Vertragsversion", PersianText.FaDigits(m.Version.ToString()));
        });

        col.Item().Text("Vertragsklauseln").FontSize(12).Bold();
        for (var i = 0; i < m.Clauses.Count; i++)
        {
            var n = PersianText.FaDigits((i + 1).ToString());
            col.Item().Row(r =>
            {
                r.ConstantItem(22).Text(n + ".").Bold().FontColor(Red);
                r.RelativeItem().Text(m.Clauses[i]).Justify();
            });
        }

        col.Item().PaddingTop(8).Text("Gesundheitsfragebogen vor dem Training").FontSize(12).Bold();
        col.Item().Table(t =>
        {
            t.ColumnsDefinition(c => { c.ConstantColumn(24); c.RelativeColumn(); c.ConstantColumn(44); });
            for (var i = 0; i < m.HealthQuestions.Count; i++)
            {
                var yes = i < m.HealthAnswers.Count && m.HealthAnswers[i];
                t.Cell().BorderBottom(1).BorderColor(Line).Padding(4).Text(PersianText.FaDigits((i + 1).ToString()));
                t.Cell().BorderBottom(1).BorderColor(Line).Padding(4).Text(m.HealthQuestions[i]);
                t.Cell().BorderBottom(1).BorderColor(Line).Padding(4).AlignCenter().Text(yes ? "Ja" : "Nein").Bold().FontColor(yes ? Red : Ink);
            }
        });
        if (!string.IsNullOrWhiteSpace(m.HealthNotes))
            col.Item().Text(t => { t.Span("Anmerkung des Mitglieds: ").FontColor(Muted); t.Span(m.HealthNotes); });
        if (m.HealthAnswers.Any(a => a))
            col.Item().Background("#E7F0FA").Padding(8).Text("Mindestens eine Frage wurde mit „Ja“ beantwortet; vor Trainingsbeginn wird eine ärztliche Rücksprache empfohlen.").FontColor(Red);

        col.Item().PaddingTop(10).Border(1).BorderColor(Line).Padding(10).Column(s =>
        {
            s.Item().Text("Elektronische Unterschrift").Bold();
            s.Item().Text($"Dieser Vertrag wurde mit dem Einmalcode an {PersianText.FaDigits(m.SignerPhone)} bestätigt.");
            s.Item().Text(t => { t.Span("IP-Adresse: ").FontColor(Muted); t.Span(m.Ip ?? "—").FontFamily(Font); });
            s.Item().Text(t => { t.Span("Fingerabdruck des Textes (SHA-256): ").FontColor(Muted); t.Span(m.ContentHash).FontSize(7.5f); });
        });
    })).GeneratePdf();

    public byte[] Invoice(InvoicePdfModel m) => Document.Create(doc => Frame(doc, m.BrandName, m.Title, col =>
    {
        col.Spacing(12);
        col.Item().Row(r =>
        {
            r.RelativeItem().Text(t => { t.Span("Rechnungsnummer: ").FontColor(Muted); t.Span(PersianText.FaDigits(m.InvoiceNumber)).Bold(); });
            r.RelativeItem().AlignRight().Text(t => { t.Span("Datum: ").FontColor(Muted); t.Span(Jalali.DateTimeText(m.PaidAtUtc)).Bold(); });
        });
        col.Item().Background("#F7F7F7").Padding(10).Text(t =>
        {
            t.Span("Käufer: ").FontColor(Muted); t.Span(m.BuyerName).Bold();
            t.Span("   |   Handy: ").FontColor(Muted); t.Span(PersianText.FaDigits(m.BuyerPhone)).Bold();
        });

        col.Item().Table(t =>
        {
            t.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(2); });
            void Row(string k, string v, bool strong = false, string? color = null)
            {
                t.Cell().BorderBottom(1).BorderColor(Line).PaddingVertical(6).Text(k).FontColor(Muted);
                var cell = t.Cell().BorderBottom(1).BorderColor(Line).PaddingVertical(6).AlignRight().Text(v);
                if (strong) cell.Bold();
                if (color is not null) cell.FontColor(color);
            }
            if (m.Lines is { Count: > 0 } lines)
            {
                foreach (var l in lines) Row($"{l.Name} × {PersianText.FaDigits(l.Quantity.ToString())}", Fa(l.UnitToman * l.Quantity));
                if (m.DeliveryText is not null) Row("Lieferung", m.DeliveryText);
                Row("Summe Artikel", Fa(m.BaseAmountToman));
                if (m.ShippingToman > 0) Row("Versandkosten", Fa(m.ShippingToman));
            }
            else if (m.Section == "wallet")
            {
                Row("Beschreibung", m.PackageName, true);
            }
            else
            {
                Row("Paket", m.PackageName, true);
                Row("Filiale", $"{m.BranchName} — {(m.Section == "women" ? "Damenbereich" : "Herrenbereich")}");
                if (m.StartsAtUtc is { } s && m.EndsAtUtc is { } e) Row("Laufzeit", $"{Jalali.Date(s)} bis {Jalali.Date(e)}");
                Row("Paketpreis", Fa(m.BaseAmountToman));
            }
            if (m.CampaignDiscountToman > 0) Row("Aktionsrabatt", "− " + Fa(m.CampaignDiscountToman), color: Red);
            if (m.CodeDiscountToman > 0) Row($"Rabattcode {m.DiscountCode}", "− " + Fa(m.CodeDiscountToman), color: Red);
            Row("Bezahlter Betrag", Fa(m.AmountToman), true);
        });

        col.Item().Text(t =>
        {
            t.Span("Referenznummer: ").FontColor(Muted); t.Span(PersianText.FaDigits(m.TrackingNumber.ToString())).Bold();
            if (m.TransactionCode is not null) { t.Span("   |   Transaktions-ID: ").FontColor(Muted); t.Span(PersianText.FaDigits(m.TransactionCode)).Bold(); }
        });
        col.Item().PaddingTop(6).Text("Diese Rechnung wurde elektronisch erstellt und ist ohne Unterschrift gültig.").FontSize(9).FontColor(Muted);
    })).GeneratePdf();
}
