import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Cake, Coffee, Download, Dumbbell, FileText, LogOut, Plus, RefreshCcw, Salad, Scale, ShoppingBag, Wallet as WalletIcon } from 'lucide-react'
import { CANTEEN_STATUS, SHOP_STATUS, shopApi, walletApi, type CanteenOrder, type ShopOrder } from '@/lib/commerce'
import { authApi, downloadBlob, memberApi, type Profile } from '@/lib/api'
import { brand } from '@/lib/brand'
import { faDigits, faNum, jalali, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import MemberCard, { useRequireAuth } from '@/member/MemberCard'
import { myCoachingApi, type BodyMetric, type Preferences as Prefs, type TrainingPlan as CoachPlan } from '@/lib/panel'
import { WeightLine } from '@/panel/charts'
import { Btn, inputCls, Notice, PageShell, Panel, Spinner, statusLabel, toLatinDigits } from '@/member/ui'

const D = { year: 'numeric', month: 'short', day: 'numeric' } as const

export default function ProfilePage() {
  const { ready, user } = useRequireAuth()
  const nav = useNavigate()
  const [p, setP] = useState<Profile | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { document.title = `پروفایل | ${brand.name}` }, [])
  const [balance, setBalance] = useState<number | null>(null)
  const [orders, setOrders] = useState<{ shop: ShopOrder[]; canteen: CanteenOrder[] } | null>(null)
  useEffect(() => {
    if (!ready || !user) return
    memberApi.profile().then(setP).catch((e: Error) => setErr(e.message))
    walletApi.get().then((w) => setBalance(w.balanceToman)).catch(() => null)
    shopApi.myOrders().then(setOrders).catch(() => null)
  }, [ready, user])

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
                <p className="text-[13px] text-rubber">{renewTo.packageName} – {renewTo.branchName}{m?.endsAtUtc && <><br />از {jalali(m.endsAtUtc, D)} ادامه پیدا می‌کند</>}</p>
              </div>
              <Btn onClick={renew}><RefreshCcw className="size-4" aria-hidden />تمدید</Btn>
            </Panel>
          )}
          <Link to="/wallet" className="flex items-center gap-4 rounded-[6px] bg-[linear-gradient(135deg,#0b2f57,#0b5fb0)] p-5 text-white transition-shadow hover:shadow-[0_14px_40px_rgb(11_95_176/0.35)]">
            <WalletIcon className="size-8 shrink-0" aria-hidden />
            <span className="flex-1"><span className="block text-[13px] text-white/70">کیف پول</span><span className="text-[22px] font-black">{balance === null ? '…' : toman(balance)}</span></span>
            <span className="rounded-[3px] bg-white/15 px-3 py-2 text-[13px] font-bold">شارژ</span>
          </Link>
          <Preferences />
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
          <WeightChart />
          <Orders orders={orders} />
          <Payments p={p} />
          <Contracts p={p} />
        </div>
      </div>
    </PageShell>
  )
}

function Orders({ orders }: { orders: { shop: ShopOrder[]; canteen: CanteenOrder[] } | null }) {
  if (!orders || (orders.shop.length === 0 && orders.canteen.length === 0)) return (
    <Panel className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[15px] text-rubber">هنوز از فروشگاه یا بوفه خرید نکرده‌اید.</p>
      <Link to="/shop" className="inline-flex h-11 items-center gap-2 rounded-[3px] bg-plate px-5 text-[14px] font-bold text-white hover:bg-plate-hi"><ShoppingBag className="size-4" />شاپ {brand.shortName}</Link>
    </Panel>
  )
  return (
    <Panel aria-labelledby="ord-h">
      <h2 id="ord-h" className="mb-4 text-[18px] font-black text-chalk">سفارش‌های فروشگاه و بوفه</h2>
      <ul className="divide-y divide-steel-2">
        {orders.shop.map((o) => (
          <li key={`s${o.id}`}><Link to={`/shop/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:text-plate">
            <ShoppingBag className="size-5 shrink-0 text-plate" aria-hidden />
            <span className="min-w-0 flex-1"><span className="block truncate font-bold">{o.items.map((i) => i.productName).join('، ')}</span>
              <span className="text-[12px] text-rubber">{faDigits(o.number ?? '')} – {jalali(o.createdAtUtc, D)} – {SHOP_STATUS[o.status].text}</span></span>
            <span className="font-bold">{toman(o.totalToman)}</span></Link></li>
        ))}
        {orders.canteen.map((o) => (
          <li key={`c${o.id}`}><Link to={`/canteen/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:text-plate">
            <Coffee className="size-5 shrink-0 text-plate" aria-hidden />
            <span className="min-w-0 flex-1"><span className="block truncate font-bold">بوفه — {o.items.map((i) => i.name).join('، ')}</span>
              <span className="text-[12px] text-rubber">شمارهٔ {faNum(o.dailyNumber)} – {jalali(o.createdAtUtc, D)} – {CANTEEN_STATUS[o.status]}</span></span>
            <span className="font-bold">{toman(o.totalToman)}</span></Link></li>
        ))}
      </ul>
    </Panel>
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

/** برنامهٔ تمرینی نمونه تا وقتی مربی برنامهٔ اختصاصی را در پنل مربی ثبت کند */
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
  const [plan, setPlan] = useState<CoachPlan | null | undefined>(undefined)
  useEffect(() => { myCoachingApi.plan().then(setPlan).catch(() => setPlan(null)) }, [])
  const days = plan?.days.length ? plan.days : PLAN[section]
  return (
    <Panel aria-labelledby="tp-h">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="tp-h" className="flex items-center gap-2 text-[18px] font-black text-chalk"><Dumbbell className="size-5 text-plate" aria-hidden />{plan ? plan.title : 'برنامهٔ تمرینی این هفته'}</h2>
        {plan === undefined ? null : plan
          ? <span className="rounded-full bg-[#ecf8f1] px-3 py-1 text-[12px] font-bold text-[#14532d]">مربی شما: {plan.coachName} – {jalali(plan.updatedAtUtc, D)}</span>
          : <span className="rounded-full bg-steel px-3 py-1 text-[12px] font-bold text-rubber">نمونه — مربی برنامهٔ شما را جایگزین می‌کند</span>}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {days.map((d, i) => (
          <div key={`${d.day}-${i}`} className="rounded-[6px] bg-steel p-4">
            <p className="text-[13px] font-bold text-plate">{d.day}</p>
            <p className="mb-2 text-[15px] font-black text-chalk">{d.focus}</p>
            <ul className="grid gap-1 text-[13.5px] text-rubber">{d.items.map((x) => <li key={x}>• {x}</li>)}</ul>
          </div>
        ))}
      </div>
      {plan?.nutrition && (
        <div className="mt-4 flex gap-3 rounded-[6px] border border-steel-2 p-4">
          <Salad className="size-5 shrink-0 text-[#1f7a46]" aria-hidden />
          <div><p className="mb-1 text-[14px] font-black text-chalk">برنامهٔ تغذیه</p><p className="whitespace-pre-line text-[13.5px] leading-7 text-rubber">{plan.nutrition}</p></div>
        </div>
      )}
    </Panel>
  )
}

/** روند وزن: روی سرور ذخیره می‌شود و مربی هم می‌بیند */
function WeightChart() {
  const uid = useId()
  const [list, setList] = useState<BodyMetric[] | null>(null)
  const [kg, setKg] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const load = () => myCoachingApi.metrics().then(setList).catch(() => setList([]))
  useEffect(() => { void load() }, [])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const v = Number(toLatinDigits(kg).replace('/', '.').replace('٫', '.'))
    if (!(v >= 30 && v <= 250)) return setErr('وزن را بین ۳۰ تا ۲۵۰ کیلوگرم وارد کنید.')
    setErr(null)
    try { await myCoachingApi.addMetric(Math.round(v * 10) / 10); setKg(''); void load() } catch (x) { setErr((x as Error).message) }
  }
  const pts = list ?? []
  const delta = pts.length >= 2 ? pts[pts.length - 1].weightKg - pts[0].weightKg : 0

  return (
    <Panel aria-labelledby={`${uid}-h`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${uid}-h`} className="flex items-center gap-2 text-[18px] font-black text-chalk"><Scale className="size-5 text-plate" aria-hidden />روند وزن</h2>
        {pts.length >= 2 && <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold', delta <= 0 ? 'bg-[#ecf8f1] text-[#14532d]' : 'bg-steel text-chalk')}>
          {delta === 0 ? 'بدون تغییر' : `${delta < 0 ? '−' : '+'}${faNum(Math.abs(Math.round(delta * 10) / 10))} کیلو از شروع`}</span>}
      </div>
      {list === null ? <p className="text-rubber">…</p> : <WeightLine points={pts.map((p) => ({ label: jalali(p.measuredOn + 'T12:00:00Z', { day: 'numeric', month: 'short' }), kg: p.weightKg }))} />}
      <form onSubmit={add} noValidate className="mt-4 flex flex-wrap items-start gap-2">
        <label htmlFor={`${uid}-kg`} className="sr-only">وزن امروز (کیلوگرم)</label>
        <input id={`${uid}-kg`} value={kg} onChange={(e) => setKg(e.target.value)} inputMode="decimal" placeholder="وزن امروز، مثلاً ۷۸٫۵" aria-invalid={!!err || undefined}
          className={`${inputCls} max-w-[240px]`} />
        <Btn type="submit" variant="dark"><Plus className="size-4" aria-hidden />ثبت</Btn>
        {err && <p role="alert" className="w-full text-[13px] text-danger">{err}</p>}
      </form>
      <p className="mt-2 text-[12px] text-rubber">وزن‌ها در حساب شما ذخیره می‌شوند و مربی‌تان هم می‌بیند.</p>
    </Panel>
  )
}

/** تاریخ تولد (برای تبریک و کد هدیه) و رضایت پیامک تبلیغاتی */
const J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
function Preferences() {
  const [p, setP] = useState<Prefs | null>(null)
  const [j, setJ] = useState<{ y: string; m: string; d: string }>({ y: '', m: '', d: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => {
    myCoachingApi.preferences().then((x) => {
      setP(x)
      if (x.birthDate) { const [y, m, d] = toJalali(x.birthDate); setJ({ y: String(y), m: String(m), d: String(d) }) }
    }).catch(() => null)
  }, [])
  if (!p) return null
  const thisJy = toJalali(new Date().toISOString().slice(0, 10))[0]
  const save = async (next: Prefs) => {
    setMsg(null)
    try { setP(await myCoachingApi.savePreferences(next)); setMsg({ ok: true, text: 'ذخیره شد.' }) } catch (x) { setMsg({ ok: false, text: (x as Error).message }) }
  }
  const setBirth = (n: typeof j) => {
    setJ(n)
    if (n.y && n.m && n.d) void save({ ...p, birthDate: toGregorian(+n.y, +n.m, +n.d) })
  }
  const sel = 'h-11 cursor-pointer rounded-[3px] border border-steel-2 bg-white px-2 text-[14px]'
  return (
    <Panel>
      <h2 className="mb-3 flex items-center gap-2 text-[16px] font-black text-chalk"><Cake className="size-5 text-plate" aria-hidden />تولد و پیامک‌ها</h2>
      <fieldset>
        <legend className="mb-2 text-[13px] text-rubber">تاریخ تولد — روز تولدت یک کد هدیهٔ تخفیف شاپ برایت پیامک می‌شود</legend>
        <div className="flex gap-2">
          <select aria-label="روز" value={j.d} onChange={(e) => setBirth({ ...j, d: e.target.value })} className={sel}><option value="">روز</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{faNum(i + 1)}</option>)}</select>
          <select aria-label="ماه" value={j.m} onChange={(e) => setBirth({ ...j, m: e.target.value })} className={`${sel} flex-1`}><option value="">ماه</option>{J_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <select aria-label="سال" value={j.y} onChange={(e) => setBirth({ ...j, y: e.target.value })} className={sel}><option value="">سال</option>{Array.from({ length: 80 }, (_, i) => thisJy - 10 - i).map((y) => <option key={y} value={y}>{faNum(y).replace('٬', '')}</option>)}</select>
        </div>
      </fieldset>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14px] leading-7 text-chalk">
        <input type="checkbox" checked={p.marketingSmsOptIn} onChange={(e) => void save({ ...p, marketingSmsOptIn: e.target.checked })} className="mt-1.5 size-4 accent-[var(--color-plate)]" />
        خبر جشنواره‌ها و تخفیف‌ها را پیامک کنید (هر وقت خواستید از همین‌جا یا با «لغو11» قطعش کنید)
      </label>
      {msg && <p role="status" className={cn('mt-2 text-[13px]', msg.ok ? 'text-[#1f7a46]' : 'text-danger')}>{msg.text}</p>}
    </Panel>
  )
}

// ---- تبدیل شمسی ↔ میلادی (الگوریتم استاندارد jalaali)
function div(a: number, b: number) { return ~~(a / b) }
function jalCal(jy: number) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]
  const gy = jy + 621
  let leapJ = -14, jp = breaks[0], jump = 0
  for (let i = 1; i < breaks.length; i++) {
    const jm = breaks[i]; jump = jm - jp
    if (jy < jm) break
    leapJ += div(jump, 33) * 8 + div(jump % 33, 4); jp = jm
  }
  let n = jy - jp
  leapJ += div(n, 33) * 8 + div((n % 33) + 3, 4)
  if (jump % 33 === 4 && jump - n === 4) leapJ++
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  return { gy, march }
}
function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * ((gm + 9) % 12) + 2, 5) + gd - 34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}
function d2g(jdn: number) {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(j % 1461, 4) * 5 + 308
  const gd = div(i % 153, 5) + 1, gm = (div(i, 153) % 12) + 1, gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return [gy, gm, gd]
}
function toGregorian(jy: number, jm: number, jd: number) {
  const r = jalCal(jy)
  const jdn = g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
  const [gy, gm, gd] = d2g(jdn)
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
}
function toJalali(iso: string): [number, number, number] {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' }).formatToParts(new Date(iso + 'T12:00:00Z'))
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return [g('year'), g('month'), g('day')]
}
