using System.Globalization;
using ClosedXML.Excel;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;

namespace GymPlatform.Business.Services.Panel;

public interface IReportService
{
    Task<Result<(byte[] Content, string FileName)>> DashboardExcelAsync(StaffScope scope, string? branchSlug, int days, CancellationToken ct);
}

/// <summary>خروجی اکسل راست‌به‌چپ از همان اعداد داشبورد (یک منبع حقیقت). مبالغ عدد واقعی‌اند تا در اکسل جمع زده شوند.</summary>
public sealed class ReportService(IDashboardService dashboard, IClock clock) : IReportService
{
    private static readonly PersianCalendar Pc = new();
    private const string Money = "#,##0";

    private static string J(DateOnly d) { var t = d.ToDateTime(TimeOnly.MinValue); return $"{Pc.GetYear(t):0000}/{Pc.GetMonth(t):00}/{Pc.GetDayOfMonth(t):00}"; }
    private static string J(DateTime utc) { var t = Jalali.ToTehran(utc); return $"{Pc.GetYear(t):0000}/{Pc.GetMonth(t):00}/{Pc.GetDayOfMonth(t):00}"; }

    public async Task<Result<(byte[] Content, string FileName)>> DashboardExcelAsync(StaffScope scope, string? branchSlug, int days, CancellationToken ct)
    {
        var r = await dashboard.GetAsync(scope, branchSlug, days, ct);
        if (!r.Succeeded) return Result<(byte[], string)>.Fail(new Dictionary<string, string[]>(r.Errors), r.ErrorType);
        var d = r.Value!;
        using var wb = new XLWorkbook();
        wb.RightToLeft = true;

        // ---- خلاصه
        var s = Sheet(wb, "خلاصه");
        s.Cell(1, 1).Value = "گزارش باشگاه خشایار"; s.Cell(1, 1).Style.Font.SetBold().Font.SetFontSize(16);
        s.Cell(2, 1).Value = $"بازه: {d.Days} روز تا {J(clock.UtcNow)}" + (d.Branch is null ? " — همهٔ شعبه‌های در دسترس" : "");
        var rows = new (string, object)[]
        {
            ("درآمد کل بازه (تومان)", d.Period.Total), ("عضویت", d.Period.Membership), ("فروشگاه", d.Period.Shop), ("بوفه", d.Period.Canteen),
            ("درآمد بازهٔ قبل (تومان)", d.PreviousPeriod.Total), ("اعضای فعال", d.ActiveMembers), ("عضو جدید در بازه", d.NewMembers),
            ("نرخ تمدید ۹۰ روز اخیر (٪)", d.RenewalRate), ("ورود امروز", d.CheckInsToday),
        };
        for (var i = 0; i < rows.Length; i++)
        {
            s.Cell(4 + i, 1).Value = rows[i].Item1;
            s.Cell(4 + i, 2).Value = XLCellValue.FromObject(rows[i].Item2);
            s.Cell(4 + i, 2).Style.NumberFormat.Format = rows[i].Item2 is double ? "0.0" : Money;
        }
        s.Range(4, 1, 3 + rows.Length, 1).Style.Font.SetBold();
        s.Columns().AdjustToContents();

        // ---- روزانه
        var dl = Sheet(wb, "روزانه");
        Header(dl, "تاریخ", "عضویت", "فروشگاه", "بوفه", "جمع");
        var row = 2;
        foreach (var x in d.Daily)
        {
            dl.Cell(row, 1).Value = J(x.Date); dl.Cell(row, 2).Value = x.Membership; dl.Cell(row, 3).Value = x.Shop; dl.Cell(row, 4).Value = x.Canteen;
            dl.Cell(row, 5).FormulaA1 = $"SUM(B{row}:D{row})"; row++;
        }
        dl.Cell(row, 1).Value = "جمع";
        for (var c = 2; c <= 5; c++) dl.Cell(row, c).FormulaA1 = $"SUM({(char)('A' + c - 1)}2:{(char)('A' + c - 1)}{row - 1})";
        dl.Row(row).Style.Font.SetBold();
        dl.Range(2, 2, row, 5).Style.NumberFormat.Format = Money;
        Finish(dl, row);

        // ---- شعبه‌ها
        var br = Sheet(wb, "شعبه‌ها");
        Header(br, "شعبه", "درآمد کل", "عضویت", "فروشگاه", "بوفه", "اعضای فعال", "ورود در بازه", "عضو جدید");
        row = 2;
        foreach (var b in d.Branches)
        {
            br.Cell(row, 1).Value = b.Name; br.Cell(row, 2).Value = b.Revenue.Total; br.Cell(row, 3).Value = b.Revenue.Membership;
            br.Cell(row, 4).Value = b.Revenue.Shop; br.Cell(row, 5).Value = b.Revenue.Canteen; br.Cell(row, 6).Value = b.ActiveMembers;
            br.Cell(row, 7).Value = b.CheckIns; br.Cell(row, 8).Value = b.NewMembers; row++;
        }
        br.Range(2, 2, Math.Max(2, row - 1), 8).Style.NumberFormat.Format = Money;
        Finish(br, row - 1);

        // ---- در آستانهٔ پایان
        var ex = Sheet(wb, "پایان عضویت");
        Header(ex, "نام", "موبایل", "شعبه", "پکیج", "تاریخ پایان", "روز مانده");
        row = 2;
        foreach (var m in d.Expiring)
        {
            ex.Cell(row, 1).Value = m.FullName ?? "—"; ex.Cell(row, 2).Value = m.Phone; ex.Cell(row, 2).Style.NumberFormat.Format = "@";
            ex.Cell(row, 3).Value = m.BranchName; ex.Cell(row, 4).Value = m.PackageName; ex.Cell(row, 5).Value = J(m.EndsAtUtc); ex.Cell(row, 6).Value = m.DaysLeft; row++;
        }
        Finish(ex, row - 1);

        // ---- جشنواره‌ها
        var cp = Sheet(wb, "جشنواره‌ها");
        Header(cp, "عنوان", "شروع", "پایان", "ثبت‌نام", "درآمد", "تخفیف داده‌شده", "وضعیت");
        row = 2;
        foreach (var c in d.Campaigns)
        {
            cp.Cell(row, 1).Value = c.Title; cp.Cell(row, 2).Value = J(c.StartsAtUtc); cp.Cell(row, 3).Value = J(c.EndsAtUtc);
            cp.Cell(row, 4).Value = c.Registrations; cp.Cell(row, 5).Value = c.RevenueToman; cp.Cell(row, 6).Value = c.DiscountGivenToman;
            cp.Cell(row, 7).Value = c.IsRunning ? "در حال اجرا" : "تمام‌شده/آینده"; row++;
        }
        cp.Range(2, 5, Math.Max(2, row - 1), 6).Style.NumberFormat.Format = Money;
        Finish(cp, row - 1);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        var t = Jalali.ToTehran(clock.UtcNow);
        var name = $"khashayar-report-{Pc.GetYear(t):0000}-{Pc.GetMonth(t):00}-{Pc.GetDayOfMonth(t):00}{(d.Branch is null ? "" : "-" + d.Branch)}.xlsx";
        return Result<(byte[], string)>.Ok((ms.ToArray(), name));
    }

    private static IXLWorksheet Sheet(XLWorkbook wb, string name)
    {
        var s = wb.Worksheets.Add(name);
        s.RightToLeft = true;
        s.Style.Font.FontName = "Tahoma";
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
