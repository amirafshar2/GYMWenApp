import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpLeft, CalendarClock, Download, Phone, Repeat, Users, DoorOpen, Wallet } from 'lucide-react'
import { downloadBlob } from '@/lib/api'
import { rebrand } from '@/lib/brand'
import { panelApi, type Dashboard } from '@/lib/panel'
import { faDigits, faNum, jalali, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, Notice, Panel, Spinner } from '@/member/ui'
import { BranchBars, DailyRevenueChart, HourBars, Legend, SERIES, short } from './charts'
import { BranchSelect, PanelTitle, usePanel } from './PanelLayout'

const RANGES = [7, 30, 90, 180]

export default function DashboardPage() {
  const me = usePanel()
  const [branch, setBranch] = useState(me.branches.length === 1 ? me.branches[0].slug : '')
  const [days, setDays] = useState(30)
  const [d, setD] = useState<Dashboard | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    setErr(null)
    panelApi.dashboard(branch || undefined, days).then((x) => alive && setD(x)).catch((e: Error) => alive && setErr(e.message))
    return () => { alive = false }
  }, [branch, days])

  const exportXlsx = async () => {
    setBusy(true)
    try { await downloadBlob(() => panelApi.exportDashboard(branch || undefined, days), `khashayar-report-${branch || 'all'}.xlsx`) }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const change = d && d.previousPeriod.total > 0 ? Math.round((100 * (d.period.total - d.previousPeriod.total)) / d.previousPeriod.total) : null

  return (
    <>
      <PanelTitle title="داشبورد مدیریت" sub={me.roles.includes('SuperAdmin') ? 'همهٔ شعبه‌ها — درآمد بر اساس زمان پرداخت (به وقت تهران)' : 'فقط شعبه‌های شما'}>
        <BranchSelect value={branch} onChange={setBranch} allowAll />
        <div role="group" aria-label="بازهٔ زمانی" className="inline-flex rounded-[3px] border border-steel-2 bg-white p-0.5">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)}
              className={cn('h-10 cursor-pointer rounded-[2px] px-3 text-[13px] font-bold', days === r ? 'bg-chalk text-white' : 'text-chalk hover:bg-steel')}>
              {faNum(r)} روز
            </button>
          ))}
        </div>
        <Btn variant="ghost" busy={busy} onClick={exportXlsx} className="h-11"><Download className="size-4" aria-hidden />خروجی اکسل</Btn>
      </PanelTitle>

      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {!d ? <Spinner /> : (
        <div className="grid gap-5 [&>*]:min-w-0">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi icon={Wallet} label={`درآمد ${faNum(days)} روز`} value={short(d.period.total)} unit="تومان"
              foot={change === null ? undefined : <span className={cn('inline-flex items-center gap-0.5 font-bold', change >= 0 ? 'text-[#1f7a46]' : 'text-danger')}>
                {change >= 0 ? <ArrowUpLeft className="size-3.5" aria-hidden /> : <ArrowDownLeft className="size-3.5" aria-hidden />}{faNum(Math.abs(change))}٪ نسبت به {faNum(days)} روز قبل</span>} />
            <Kpi icon={Users} label="اعضای فعال" value={faNum(d.activeMembers)} foot={<>{faNum(d.newMembers)} عضو جدید در این بازه</>} />
            <Kpi icon={DoorOpen} label="ورود امروز" value={faNum(d.checkInsToday)} foot={<>درآمد امروز {short(d.today.total)}</>} />
            <Kpi icon={Repeat} label="نرخ تمدید" value={`${faNum(d.renewalRate)}٪`} foot="عضویت‌های تمام‌شده در ۹۰ روز اخیر" />
          </div>

          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[17px] font-black text-chalk">درآمد روزانه</h2>
              <Legend />
            </div>
            <DailyRevenueChart data={d.daily} />
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-steel-2 pt-4 text-center">
              {SERIES.map((s) => (
                <div key={s.key}><dt className="text-[12px] text-rubber">{s.label}</dt><dd className="text-[16px] font-black text-chalk">{short(d.period[s.key])}</dd></div>
              ))}
            </dl>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
            <Panel>
              <h2 className="mb-4 text-[17px] font-black text-chalk">مقایسهٔ شعبه‌ها</h2>
              <BranchBars rows={d.branches.map((b) => ({ name: b.name, ...b.revenue }))} />
              <div className="relative mt-5 overflow-x-auto">
                <table className="w-full min-w-[460px] text-[13px]">
                  <thead><tr className="border-b border-steel-2 text-rubber"><th className="py-2 text-right font-bold">شعبه</th><th className="font-bold">عضو فعال</th><th className="font-bold">ورود</th><th className="font-bold">عضو جدید</th><th className="text-left font-bold">درآمد</th></tr></thead>
                  <tbody>
                    {d.branches.map((b) => (
                      <tr key={b.slug} className="border-b border-steel-2/60 last:border-0">
                        <td className="max-w-[200px] truncate py-2 font-bold text-chalk">{b.name}</td>
                        <td className="text-center">{faNum(b.activeMembers)}</td><td className="text-center">{faNum(b.checkIns)}</td><td className="text-center">{faNum(b.newMembers)}</td>
                        <td className="text-left font-bold">{short(b.revenue.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <div className="grid content-start gap-5">
              <Panel>
                <h2 className="mb-1 text-[17px] font-black text-chalk">ساعت‌های شلوغ</h2>
                <p className="mb-4 text-[13px] text-rubber">ورودها در {faNum(days)} روز اخیر، بر حسب ساعت</p>
                <HourBars counts={d.checkInsByHour} />
              </Panel>
              <Panel>
                <h2 className="mb-3 text-[17px] font-black text-chalk">اثر جشنواره‌ها</h2>
                {d.campaigns.length === 0 ? <p className="text-[14px] text-rubber">جشنواره‌ای ثبت نشده.</p> : (
                  <ul className="grid gap-3">
                    {d.campaigns.map((c) => (
                      <li key={c.id} className="rounded-[6px] bg-steel p-3">
                        <p className="flex items-center justify-between gap-2 text-[14px] font-black text-chalk">{rebrand(c.title)}
                          {c.isRunning && <span className="rounded-full bg-[#ecf8f1] px-2 py-0.5 text-[11px] text-[#14532d]">در حال اجرا</span>}</p>
                        <p className="text-[12px] text-rubber">{jalali(c.startsAtUtc)} تا {jalali(c.endsAtUtc)}</p>
                        <p className="mt-1 text-[13px] text-chalk">{faNum(c.registrations)} ثبت‌نام – فروش {short(c.revenueToman)} – تخفیف داده‌شده {short(c.discountGivenToman)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {me.roles.includes('SuperAdmin') && <Link to="/panel/campaigns" className="mt-3 inline-block text-[13px] font-bold text-plate hover:underline">مدیریت جشنواره‌ها</Link>}
              </Panel>
            </div>
          </div>

          <Panel>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[17px] font-black text-chalk"><CalendarClock className="size-5 text-plate" aria-hidden />عضویت‌هایی که تا ۷ روز دیگر تمام می‌شوند</h2>
              <span className="text-[13px] text-rubber">یادآوری پیامکی ۷ و ۱ روز مانده خودکار ارسال می‌شود</span>
            </div>
            {d.expiring.length === 0 ? <p className="text-[14px] text-rubber">کسی در این هفته تمام نمی‌شود.</p> : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[620px] text-[13.5px]">
                  <thead><tr className="border-b border-steel-2 text-rubber"><th className="py-2 text-right font-bold">عضو</th><th className="text-right font-bold">شعبه</th><th className="text-right font-bold">پکیج</th><th className="font-bold">پایان</th><th className="font-bold">تماس</th></tr></thead>
                  <tbody>
                    {d.expiring.map((m) => (
                      <tr key={m.userId} className="border-b border-steel-2/60 last:border-0">
                        <td className="py-2 font-bold text-chalk">{m.fullName ?? '—'}</td>
                        <td className="max-w-[180px] truncate">{m.branchName}</td><td>{m.packageName}</td>
                        <td className="text-center"><span className={cn('rounded-full px-2 py-0.5 text-[12px] font-bold', m.daysLeft <= 1 ? 'bg-[#fdecee] text-[#8a1020]' : 'bg-[#fff6e0] text-[#5c4300]')}>
                          {m.daysLeft <= 0 ? 'امروز' : m.daysLeft === 1 ? 'فردا' : `${faNum(m.daysLeft)} روز`}</span></td>
                        <td className="text-center"><a href={`tel:${m.phone}`} dir="ltr" className="inline-flex items-center gap-1 font-bold text-plate hover:underline"><Phone className="size-3.5" aria-hidden />{faDigits(m.phone)}</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <p className="text-[12px] text-rubber">درآمد امروز: عضویت {toman(d.today.membership)} – فروشگاه {toman(d.today.shop)} – بوفه {toman(d.today.canteen)}. شارژ کیف پول درآمد حساب نمی‌شود؛ خرجش در بوفه و فروشگاه حساب می‌شود.</p>
        </div>
      )}
    </>
  )
}

function Kpi({ icon: Icon, label, value, unit, foot }: { icon: typeof Users; label: string; value: string; unit?: string; foot?: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-steel-2 bg-white p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[13px] font-bold text-rubber"><Icon className="size-4 text-plate" aria-hidden />{label}</p>
      <p className="mt-2 text-[24px] font-black leading-none text-chalk sm:text-[28px]">{value}{unit && <span className="ms-1 text-[13px] font-bold text-rubber">{unit}</span>}</p>
      {foot && <p className="mt-2 text-[12px] text-rubber">{foot}</p>}
    </div>
  )
}
