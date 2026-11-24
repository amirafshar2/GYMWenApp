using System.Globalization;
using ClosedXML.Excel;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;

namespace GymPlatform.Business.Services.Panel;

public interface IReportService
{
    Task<Result<(byte[] Content, string FileName)>> DashboardExcelAsync(StaffScope scope, string? branchSlug, int days, CancellationToken ct);
}

/// <summary>Excel-Export mit denselben Zahlen wie das Dashboard (eine Datenquelle). Beträge sind echte Zahlen, damit Excel sie summieren kann.</summary>
public sealed class ReportService(IDashboardService dashboard, IClock clock) : IReportService
{
    private static readonly GregorianCalendar Pc = new();
    private const string Money = "#,##0.00 €";
    private static decimal E(long cents) => cents / 100m;

    private static string J(DateOnly d) { var t = d.ToDateTime(TimeOnly.MinValue); return t.ToString("dd.MM.yyyy"); }
    private static string J(DateTime utc) { var t = Jalali.ToTehran(utc); return t.ToString("dd.MM.yyyy"); }

    public async Task<Result<(byte[] Content, string FileName)>> DashboardExcelAsync(StaffScope scope, string? branchSlug, int days, CancellationToken ct)
    {
        var r = await dashboard.GetAsync(scope, branchSlug, days, ct);
        if (!r.Succeeded) return Result<(byte[], string)>.Fail(new Dictionary<string, string[]>(r.Errors), r.ErrorType);
        var d = r.Value!;
        using var wb = new XLWorkbook();
        wb.RightToLeft = false;

        // ---- Übersicht
        var s = Sheet(wb, "Übersicht");
        s.Cell(1, 1).Value = $"Bericht {SmsTexts.Brand}"; s.Cell(1, 1).Style.Font.SetBold().Font.SetFontSize(16);
        s.Cell(2, 1).Value = $"Zeitraum: {d.Days} Tage bis {J(clock.UtcNow)}" + (d.Branch is null ? " — alle zugänglichen Filialen" : "");
        var rows = new (string, object)[]
        {
            ("Gesamtumsatz im Zeitraum (EUR)", E(d.Period.Total)), ("Mitgliedschaft", E(d.Period.Membership)), ("Shop", E(d.Period.Shop)), ("Bistro", E(d.Period.Canteen)),
            ("Umsatz im Vorzeitraum (EUR)", E(d.PreviousPeriod.Total)), ("Aktive Mitglieder", d.ActiveMembers), ("Neue Mitglieder im Zeitraum", d.NewMembers),
            ("Verlängerungsquote letzte 90 Tage (%)", d.RenewalRate), ("Check-ins heute", d.CheckInsToday),
        };
        for (var i = 0; i < rows.Length; i++)
        {
            s.Cell(4 + i, 1).Value = rows[i].Item1;
            s.Cell(4 + i, 2).Value = XLCellValue.FromObject(rows[i].Item2);
            s.Cell(4 + i, 2).Style.NumberFormat.Format = rows[i].Item2 is double ? "0.0" : rows[i].Item2 is decimal ? Money : "#,##0";
        }
        s.Range(4, 1, 3 + rows.Length, 1).Style.Font.SetBold();
        s.Columns().AdjustToContents();

        // ---- Täglich
        var dl = Sheet(wb, "Täglich");
        Header(dl, "Datum", "Mitgliedschaft", "Shop", "Bistro", "Summe");
        var row = 2;
        foreach (var x in d.Daily)
        {
            dl.Cell(row, 1).Value = J(x.Date); dl.Cell(row, 2).Value = E(x.Membership); dl.Cell(row, 3).Value = E(x.Shop); dl.Cell(row, 4).Value = E(x.Canteen);
            dl.Cell(row, 5).FormulaA1 = $"SUM(B{row}:D{row})"; row++;
        }
        dl.Cell(row, 1).Value = "Summe";
        for (var c = 2; c <= 5; c++) dl.Cell(row, c).FormulaA1 = $"SUM({(char)('A' + c - 1)}2:{(char)('A' + c - 1)}{row - 1})";
        dl.Row(row).Style.Font.SetBold();
        dl.Range(2, 2, row, 5).Style.NumberFormat.Format = Money;
        Finish(dl, row);

        // ---- Filialen
        var br = Sheet(wb, "Filialen");
        Header(br, "Filiale", "Gesamtumsatz", "Mitgliedschaft", "Shop", "Bistro", "Aktive Mitglieder", "Check-ins im Zeitraum", "Neue Mitglieder");
        row = 2;
        foreach (var b in d.Branches)
        {
            br.Cell(row, 1).Value = b.Name; br.Cell(row, 2).Value = E(b.Revenue.Total); br.Cell(row, 3).Value = E(b.Revenue.Membership);
            br.Cell(row, 4).Value = E(b.Revenue.Shop); br.Cell(row, 5).Value = E(b.Revenue.Canteen); br.Cell(row, 6).Value = b.ActiveMembers;
            br.Cell(row, 7).Value = b.CheckIns; br.Cell(row, 8).Value = b.NewMembers; row++;
        }
        br.Range(2, 2, Math.Max(2, row - 1), 5).Style.NumberFormat.Format = Money;
        Finish(br, row - 1);

        // ---- Kurz vor Ablauf
        var ex = Sheet(wb, "Ablaufende Mitgliedschaften");
        Header(ex, "Name", "Handy", "Filiale", "Paket", "Enddatum", "Resttage");
        row = 2;
        foreach (var m in d.Expiring)
        {
            ex.Cell(row, 1).Value = m.FullName ?? "—"; ex.Cell(row, 2).Value = m.Phone; ex.Cell(row, 2).Style.NumberFormat.Format = "@";
            ex.Cell(row, 3).Value = m.BranchName; ex.Cell(row, 4).Value = m.PackageName; ex.Cell(row, 5).Value = J(m.EndsAtUtc); ex.Cell(row, 6).Value = m.DaysLeft; row++;
        }
        Finish(ex, row - 1);

        // ---- Aktionen
        var cp = Sheet(wb, "Aktionen");
        Header(cp, "Titel", "Start", "Ende", "Anmeldungen", "Umsatz", "Gewährter Rabatt", "Status");
        row = 2;
        foreach (var c in d.Campaigns)
        {
            cp.Cell(row, 1).Value = c.Title; cp.Cell(row, 2).Value = J(c.StartsAtUtc); cp.Cell(row, 3).Value = J(c.EndsAtUtc);
            cp.Cell(row, 4).Value = c.Registrations; cp.Cell(row, 5).Value = E(c.RevenueToman); cp.Cell(row, 6).Value = E(c.DiscountGivenToman);
            cp.Cell(row, 7).Value = c.IsRunning ? "Läuft" : "Beendet/geplant"; row++;
        }
        cp.Range(2, 5, Math.Max(2, row - 1), 6).Style.NumberFormat.Format = Money;
        Finish(cp, row - 1);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        var t = Jalali.ToTehran(clock.UtcNow);
        var name = $"report-{Pc.GetYear(t):0000}-{Pc.GetMonth(t):00}-{Pc.GetDayOfMonth(t):00}{(d.Branch is null ? "" : "-" + d.Branch)}.xlsx";
        return Result<(byte[], string)>.Ok((ms.ToArray(), name));
    }

    private static IXLWorksheet Sheet(XLWorkbook wb, string name)
    {
        var s = wb.Worksheets.Add(name);
        s.RightToLeft = false;
        s.Style.Font.FontName = "Calibri";
        s.Style.Font.FontSize = 11;
        return s;
    }

    private static void Header(IXLWorksheet s, params string[] titles)
    {
        for (var i = 0; i < titles.Length; i++) s.Cell(1, i + 1).Value = titles[i];
        var h = s.Range(1, 1, 1, titles.Length);
        h.Style.Font.SetBold().Font.SetFontColor(XLColor.White).Fill.SetBackgroundColor(XLColor.FromHtml("#0B5FB0"));
        s.SheetView.FreezeRows(1);
    }

    private static void Finish(IXLWorksheet s, int lastRow)
    {
        var lastCol = s.LastColumnUsed()?.ColumnNumber() ?? 1;
        if (lastRow >= 2) s.Range(1, 1, lastRow, lastCol).SetAutoFilter();
        s.Columns().AdjustToContents(1, Math.Max(1, lastRow), 10, 40);
    }
}
