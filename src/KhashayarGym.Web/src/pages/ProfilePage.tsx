import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, Dumbbell, FileText, LogOut, Plus, RefreshCcw, Scale } from 'lucide-react'
import { authApi, downloadBlob, memberApi, type Profile } from '@/lib/api'
import { brand } from '@/lib/brand'
import { faDigits, faNum, jalali, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import MemberCard, { useRequireAuth } from '@/member/MemberCard'
import { Btn, inputCls, Notice, PageShell, Panel, Spinner, statusLabel, toLatinDigits } from '@/member/ui'

const D = { year: 'numeric', month: 'short', day: 'numeric' } as const

export default function ProfilePage() {
  const { ready, user } = useRequireAuth()
  const nav = useNavigate()
  const [p, setP] = useState<Profile | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { document.title = `پروفایل | ${brand.name}` }, [])
  useEffect(() => { if (ready && user) memberApi.profile().then(setP).catch((e: Error) => setErr(e.message)) }, [ready, user])

  if (err) return <PageShell title="پروفایل"><Notice tone="err">{err}</Notice></PageShell>
  if (!p) return <Spinner />

  const m = p.active
  const latest = p.memberships[0]
  const renewTo = m ?? latest
  const renew = () => nav(`/join?package=${renewTo!.packageSlug}&branch=${renewTo!.branchSlug}&section=${renewTo!.section}`)

  return (
    <PageShell eyebrow="حساب کاربری" title={p.user.fullName ? `سلام، ${p.user.fullName.split(' ')[0]}` : 'پروفایل من'}
      aside={<Btn variant="ghost" onClick={async () => { await authApi.logout(); nav('/', { replace: true }) }}><LogOut className="size-4" aria-hidden />خروج</Btn>}>
      <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr] [&>*]:min-w-0">
        <div className="grid gap-6">
          {m ? <MemberCard m={m} name={p.user.fullName ?? ''} /> : (
            <Panel>
              <p className="text-[18px] font-black text-chalk">عضویت فعالی ندارید</p>
              <p className="mt-1 text-[14px] text-rubber">{latest ? 'عضویت قبلی شما تمام شده است.' : 'هنوز در هیچ شعبه‌ای ثبت‌نام نکرده‌اید.'}</p>
              <Link to="/join" className="mt-5 inline-flex h-[52px] items-center rounded-[3px] bg-plate px-6 text-[15px] font-bold text-white hover:bg-plate-hi">ثبت‌نام آنلاین</Link>
            </Panel>
          )}
          {renewTo && (
            <Panel className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[16px] font-black text-chalk">تمدید با یک کلیک</p>
                <p className="text-[13px] text-rubber">{renewTo.packageName} · {renewTo.branchName}{m?.endsAtUtc && <><br />از {jalali(m.endsAtUtc, D)} ادامه پیدا می‌کند</>}</p>
              </div>
              <Btn onClick={renew}><RefreshCcw className="size-4" aria-hidden />تمدید</Btn>
            </Panel>
          )}
          <Panel>
            <h2 className="mb-3 text-[16px] font-black text-chalk">اطلاعات حساب</h2>
            <dl className="grid gap-2 text-[14px]">
              <div className="flex justify-between"><dt className="text-rubber">موبایل</dt><dd dir="ltr" className="font-bold">{faDigits(p.user.phoneNumber)}</dd></div>
              <div className="flex justify-between"><dt className="text-rubber">نام</dt><dd className="font-bold">{p.user.fullName ?? '—'}</dd></div>
            </dl>
          </Panel>
        </div>

        <div className="grid gap-6">
          <TrainingPlan section={m?.section ?? latest?.section ?? (p.user.gender === 'female' ? 'women' : 'men')} />
          <WeightChart userId={p.user.id} />
          <Payments p={p} />
          <Contracts p={p} />
        </div>
      </div>
    </PageShell>
  )
}

function Payments({ p }: { p: Profile }) {
  const [busy, setBusy] = useState<number | null>(null)
  return (
    <Panel aria-labelledby="pay-h">
      <h2 id="pay-h" className="mb-4 text-[18px] font-black text-chalk">پرداخت‌ها و فاکتورها</h2>
      {p.payments.length === 0 ? <p className="text-[14px] text-rubber">هنوز پرداختی ثبت نشده است.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-right text-[14px]">
            <thead className="text-[12.5px] text-rubber"><tr className="border-b border-steel-2">
              <th scope="col" className="py-2 font-bold">تاریخ</th><th scope="col" className="font-bold">پکیج</th>
              <th scope="col" className="font-bold">مبلغ</th><th scope="col" className="font-bold">وضعیت</th><th scope="col"><span className="sr-only">فاکتور</span></th>
            </tr></thead>
            <tbody>
              {p.payments.map((x) => (
                <tr key={x.id} className="border-b border-steel-2 last:border-0">
                  <td className="py-3">{jalali(x.paidAtUtc ?? x.createdAtUtc, D)}</td>
                  <td>{x.packageName}</td>
                  <td className="font-bold">{toman(x.amountToman)}</td>
                  <td><span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold', statusLabel[x.status]?.cls)}>{statusLabel[x.status]?.text ?? x.status}</span></td>
                  <td className="text-left">
                    {x.invoiceNumber && (
                      <button type="button" disabled={busy === x.id} aria-label={`دانلود فاکتور ${faDigits(x.invoiceNumber)}`}
                        onClick={async () => { setBusy(x.id); try { await downloadBlob(() => memberApi.invoicePdf(x.id), `invoice-${x.invoiceNumber}.pdf`) } finally { setBusy(null) } }}
                        className="inline-flex cursor-pointer items-center gap-1 font-bold text-plate hover:underline disabled:opacity-50">
                        <Download className="size-4" aria-hidden />فاکتور
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

function Contracts({ p }: { p: Profile }) {
  return (
    <Panel aria-labelledby="ct-h">
      <h2 id="ct-h" className="mb-4 text-[18px] font-black text-chalk">قراردادهای امضاشده</h2>
      {p.contracts.length === 0 ? <p className="text-[14px] text-rubber">قراردادی امضا نشده است.</p> : (
        <ul className="divide-y divide-steel-2">
          {p.contracts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-2 text-[14px]"><FileText className="size-4 text-rubber" aria-hidden />{c.title} — نسخهٔ {faNum(c.version)}<span className="text-rubber">({jalali(c.signedAtUtc, D)})</span></span>
              <button type="button" onClick={() => void downloadBlob(() => memberApi.contractPdf(c.id), `contract-v${c.version}.pdf`)}
                className="inline-flex cursor-pointer items-center gap-1 text-[14px] font-bold text-plate hover:underline"><Download className="size-4" aria-hidden />PDF</button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** برنامهٔ تمرینی نمونه تا وقتی مربی برنامهٔ اختصاصی را در پنل مربی (فاز ۴) ثبت کند */
const PLAN: Record<'men' | 'women', { day: string; focus: string; items: string[] }[]> = {
  men: [
    { day: 'شنبه', focus: 'سینه و پشت بازو', items: ['پرس سینه هالتر ۴×۸', 'پرس بالاسینه دمبل ۳×۱۰', 'دیپ ۳×حداکثر', 'پشت بازو سیم‌کش ۳×۱۲'] },
    { day: 'دوشنبه', focus: 'پشت و جلو بازو', items: ['بارفیکس ۴×حداکثر', 'زیربغل هالتر خم ۴×۸', 'جلو بازو هالتر ۳×۱۰', 'چکشی دمبل ۳×۱۲'] },
    { day: 'چهارشنبه', focus: 'پا و شکم', items: ['اسکوات ۴×۸', 'ددلیفت رومانیایی ۳×۱۰', 'پرس پا ۳×۱۲', 'پلانک ۳×۴۵ ثانیه'] },
  ],
  women: [
    { day: 'شنبه', focus: 'پایین‌تنه', items: ['اسکوات گابلت ۴×۱۲', 'هیپ تراست ۴×۱۰', 'لانج دمبل ۳×۱۰ هر پا', 'ابداکشن دستگاه ۳×۱۵'] },
    { day: 'دوشنبه', focus: 'بالاتنه و کور', items: ['زیربغل سیم‌کش ۳×۱۲', 'پرس سرشانه دمبل ۳×۱۰', 'پلانک ۳×۴۰ ثانیه', 'ددباگ ۳×۱۲'] },
    { day: 'چهارشنبه', focus: 'کل بدن + هوازی', items: ['ددلیفت کتل‌بل ۴×۱۰', 'TRX رو ۳×۱۲', 'طناب ۵×۱ دقیقه', 'دوچرخه ۲۰ دقیقه'] },
  ],
}

function TrainingPlan({ section }: { section: 'men' | 'women' }) {
  return (
    <Panel aria-labelledby="tp-h">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="tp-h" className="flex items-center gap-2 text-[18px] font-black text-chalk"><Dumbbell className="size-5 text-plate" aria-hidden />برنامهٔ تمرینی این هفته</h2>
        <span className="rounded-full bg-steel px-3 py-1 text-[12px] font-bold text-rubber">نمونه — مربی برنامهٔ شما را جایگزین می‌کند</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PLAN[section].map((d) => (
          <div key={d.day} className="rounded-[6px] bg-steel p-4">
            <p className="text-[13px] font-bold text-plate">{d.day}</p>
            <p className="mb-2 text-[15px] font-black text-chalk">{d.focus}</p>
            <ul className="grid gap-1 text-[13.5px] text-rubber">{d.items.map((x) => <li key={x}>• {x}</li>)}</ul>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/** نمودار وزن: داده‌ها فقط در همین مرورگر ذخیره می‌شوند (ثبت سمت سرور در فاز ۴ با پنل مربی) */
type W = { d: string; kg: number }
function WeightChart({ userId }: { userId: number }) {
  const uid = useId()
  const key = `kg-weights-${userId}`
  const [list, setList] = useState<W[]>(() => { try { return JSON.parse(localStorage.getItem(key) ?? '[]') as W[] } catch { return [] } })
  const [kg, setKg] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const persist = (l: W[]) => { setList(l); try { localStorage.setItem(key, JSON.stringify(l)) } catch { /* */ } }

  const add = (e: FormEvent) => {
    e.preventDefault()
    const v = Number(toLatinDigits(kg).replace('/', '.').replace('٫', '.'))
    if (!(v >= 30 && v <= 250)) return setErr('وزن را بین ۳۰ تا ۲۵۰ کیلوگرم وارد کنید.')
    setErr(null); setKg('')
    persist([...list, { d: new Date().toISOString(), kg: Math.round(v * 10) / 10 }].slice(-24))
  }

  const pts = list.length ? list : []
  const chart = useMemo(() => {
    if (pts.length < 2) return null
    const W = 600, H = 180, P = 28
    const ys = pts.map((p) => p.kg), min = Math.min(...ys) - 1, max = Math.max(...ys) + 1
    const x = (i: number) => P + (i * (W - 2 * P)) / (pts.length - 1)
    const y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P)
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')
    return { W, H, line, area: `${line} L${x(pts.length - 1)},${H - P} L${x(0)},${H - P} Z`, dots: pts.map((p, i) => ({ cx: x(i), cy: y(p.kg), p })) }
  }, [pts])
  const delta = pts.length >= 2 ? pts[pts.length - 1].kg - pts[0].kg : 0

  return (
    <Panel aria-labelledby={`${uid}-h`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${uid}-h`} className="flex items-center gap-2 text-[18px] font-black text-chalk"><Scale className="size-5 text-plate" aria-hidden />روند وزن</h2>
        {pts.length >= 2 && <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold', delta <= 0 ? 'bg-[#ecf8f1] text-[#14532d]' : 'bg-steel text-chalk')}>
          {delta === 0 ? 'بدون تغییر' : `${delta < 0 ? '−' : '+'}${faNum(Math.abs(Math.round(delta * 10) / 10))} کیلو از شروع`}</span>}
      </div>
      {chart ? (
        <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="h-auto w-full" role="img" aria-label={`نمودار وزن: از ${faNum(pts[0].kg)} تا ${faNum(pts[pts.length - 1].kg)} کیلوگرم`}>
          <defs><linearGradient id={`${uid}-g`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e8283c" stopOpacity=".25" /><stop offset="1" stopColor="#e8283c" stopOpacity="0" /></linearGradient></defs>
          <path d={chart.area} fill={`url(#${uid}-g)`} />
          <path d={chart.line} fill="none" stroke="#e8283c" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {chart.dots.map(({ cx, cy, p }, i) => (
            <g key={i}><circle cx={cx} cy={cy} r="5" fill="#fff" stroke="#2c2c2c" strokeWidth="2" />
              <text x={cx} y={cy - 12} textAnchor="middle" fontSize="13" fontWeight="700" fill="#2c2c2c">{faNum(p.kg)}</text></g>
          ))}
        </svg>
      ) : <p className="rounded-[3px] bg-steel px-4 py-8 text-center text-[14px] text-rubber">حداقل دو وزن ثبت کنید تا نمودار ساخته شود.</p>}
      <form onSubmit={add} noValidate className="mt-4 flex flex-wrap items-start gap-2">
        <label htmlFor={`${uid}-kg`} className="sr-only">وزن امروز (کیلوگرم)</label>
        <input id={`${uid}-kg`} value={kg} onChange={(e) => setKg(e.target.value)} inputMode="decimal" placeholder="وزن امروز، مثلاً ۷۸٫۵" aria-invalid={!!err || undefined}
          className={`${inputCls} max-w-[240px]`} />
        <Btn type="submit" variant="dark"><Plus className="size-4" aria-hidden />ثبت</Btn>
        {err && <p role="alert" className="w-full text-[13px] text-plate">{err}</p>}
      </form>
      <p className="mt-2 text-[12px] text-rubber">این اعداد فقط روی همین دستگاه ذخیره می‌شوند.</p>
    </Panel>
  )
}
