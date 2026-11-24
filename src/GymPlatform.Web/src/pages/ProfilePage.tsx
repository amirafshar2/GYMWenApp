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

  useEffect(() => { document.title = `Profil | ${brand.name}` }, [])
  const [balance, setBalance] = useState<number | null>(null)
  const [orders, setOrders] = useState<{ shop: ShopOrder[]; canteen: CanteenOrder[] } | null>(null)
  useEffect(() => {
    if (!ready || !user) return
    memberApi.profile().then(setP).catch((e: Error) => setErr(e.message))
    walletApi.get().then((w) => setBalance(w.balanceToman)).catch(() => null)
    shopApi.myOrders().then(setOrders).catch(() => null)
  }, [ready, user])

  if (err) return <PageShell title="Profil"><Notice tone="err">{err}</Notice></PageShell>
  if (!p) return <Spinner />

  const m = p.active
  const latest = p.memberships[0]
  const renewTo = m ?? latest
  const renew = () => nav(`/join?package=${renewTo!.packageSlug}&branch=${renewTo!.branchSlug}&section=${renewTo!.section}`)

  return (
    <PageShell eyebrow="Benutzerkonto" title={p.user.fullName ? `Hallo, ${p.user.fullName.split(' ')[0]}` : 'Mein Profil'}
      aside={<Btn variant="ghost" onClick={async () => { await authApi.logout(); nav('/', { replace: true }) }}><LogOut className="size-4" aria-hidden />Abmelden</Btn>}>
      <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr] [&>*]:min-w-0">
        <div className="grid gap-6 [&>*]:min-w-0">
          {m ? <MemberCard m={m} name={p.user.fullName ?? ''} /> : (
            <Panel>
              <p className="text-[18px] font-black text-chalk">Keine aktive Mitgliedschaft</p>
              <p className="mt-1 text-[14px] text-rubber">{latest ? 'Ihre letzte Mitgliedschaft ist abgelaufen.' : 'Sie sind noch in keiner Filiale angemeldet.'}</p>
              <Link to="/join" className="mt-5 inline-flex h-[52px] items-center rounded-[3px] bg-plate px-6 text-[15px] font-bold text-white hover:bg-plate-hi">Online anmelden</Link>
            </Panel>
          )}
          {renewTo && (
            <Panel className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[16px] font-black text-chalk">Verlängern mit einem Klick</p>
                <p className="text-[13px] text-rubber">{renewTo.packageName} – {renewTo.branchName}{m?.endsAtUtc && <><br />Anschluss ab {jalali(m.endsAtUtc, D)}</>}</p>
              </div>
              <Btn onClick={renew}><RefreshCcw className="size-4" aria-hidden />Verlängern</Btn>
            </Panel>
          )}
          <Link to="/wallet" className="flex items-center gap-4 rounded-[6px] bg-[linear-gradient(135deg,#0b2f57,#0b5fb0)] p-5 text-white transition-shadow hover:shadow-[0_14px_40px_rgb(11_95_176/0.35)]">
            <WalletIcon className="size-8 shrink-0" aria-hidden />
            <span className="flex-1"><span className="block text-[13px] text-white/70">Guthaben</span><span className="text-[22px] font-black">{balance === null ? '…' : toman(balance)}</span></span>
            <span className="rounded-[3px] bg-white/15 px-3 py-2 text-[13px] font-bold">Aufladen</span>
          </Link>
          <Preferences />
          <Panel>
            <h2 className="mb-3 text-[16px] font-black text-chalk">Kontodaten</h2>
            <dl className="grid gap-2 text-[14px]">
              <div className="flex justify-between"><dt className="text-rubber">Handy</dt><dd dir="ltr" className="font-bold">{faDigits(p.user.phoneNumber)}</dd></div>
              <div className="flex justify-between"><dt className="text-rubber">Name</dt><dd className="font-bold">{p.user.fullName ?? '—'}</dd></div>
            </dl>
          </Panel>
        </div>

        <div className="grid gap-6 [&>*]:min-w-0">
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
      <p className="text-[15px] text-rubber">Noch keine Käufe im Shop oder Bistro.</p>
      <Link to="/shop" className="inline-flex h-11 items-center gap-2 rounded-[3px] bg-plate px-5 text-[14px] font-bold text-white hover:bg-plate-hi"><ShoppingBag className="size-4" />Shop {brand.shortName}</Link>
    </Panel>
  )
  return (
    <Panel aria-labelledby="ord-h">
      <h2 id="ord-h" className="mb-4 text-[18px] font-black text-chalk">Bestellungen Shop und Bistro</h2>
      <ul className="divide-y divide-steel-2">
        {orders.shop.map((o) => (
          <li key={`s${o.id}`}><Link to={`/shop/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:text-plate">
            <ShoppingBag className="size-5 shrink-0 text-plate" aria-hidden />
            <span className="min-w-0 flex-1"><span className="block truncate font-bold">{o.items.map((i) => i.productName).join(', ')}</span>
              <span className="text-[12px] text-rubber">{faDigits(o.number ?? '')} – {jalali(o.createdAtUtc, D)} – {SHOP_STATUS[o.status].text}</span></span>
            <span className="font-bold">{toman(o.totalToman)}</span></Link></li>
        ))}
        {orders.canteen.map((o) => (
          <li key={`c${o.id}`}><Link to={`/canteen/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:text-plate">
            <Coffee className="size-5 shrink-0 text-plate" aria-hidden />
            <span className="min-w-0 flex-1"><span className="block truncate font-bold">Bistro — {o.items.map((i) => i.name).join(', ')}</span>
              <span className="text-[12px] text-rubber">Nr. {faNum(o.dailyNumber)} – {jalali(o.createdAtUtc, D)} – {CANTEEN_STATUS[o.status]}</span></span>
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
      <h2 id="pay-h" className="mb-4 text-[18px] font-black text-chalk">Zahlungen und Rechnungen</h2>
      {p.payments.length === 0 ? <p className="text-[14px] text-rubber">Noch keine Zahlungen.</p> : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[14px]">
            <thead className="text-[12.5px] text-rubber"><tr className="border-b border-steel-2">
              <th scope="col" className="py-2 font-bold">Datum</th><th scope="col" className="font-bold">Paket</th>
              <th scope="col" className="font-bold">Betrag</th><th scope="col" className="font-bold">Status</th><th scope="col"><span className="sr-only">Rechnung</span></th>
            </tr></thead>
            <tbody>
              {p.payments.map((x) => (
                <tr key={x.id} className="border-b border-steel-2 last:border-0">
                  <td className="py-3">{jalali(x.paidAtUtc ?? x.createdAtUtc, D)}</td>
                  <td>{x.packageName}</td>
                  <td className="font-bold">{toman(x.amountToman)}</td>
                  <td><span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold', statusLabel[x.status]?.cls)}>{statusLabel[x.status]?.text ?? x.status}</span></td>
                  <td className="text-right">
                    {x.invoiceNumber && (
                      <button type="button" disabled={busy === x.id} aria-label={`Rechnung herunterladen: ${faDigits(x.invoiceNumber)}`}
                        onClick={async () => { setBusy(x.id); try { await downloadBlob(() => memberApi.invoicePdf(x.id), `invoice-${x.invoiceNumber}.pdf`) } finally { setBusy(null) } }}
                        className="inline-flex cursor-pointer items-center gap-1 font-bold text-plate hover:underline disabled:opacity-50">
                        <Download className="size-4" aria-hidden />Rechnung
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
      <h2 id="ct-h" className="mb-4 text-[18px] font-black text-chalk">Unterschriebene Verträge</h2>
      {p.contracts.length === 0 ? <p className="text-[14px] text-rubber">Kein Vertrag unterschrieben.</p> : (
        <ul className="divide-y divide-steel-2">
          {p.contracts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-2 text-[14px]"><FileText className="size-4 text-rubber" aria-hidden />{c.title} — Version {faNum(c.version)}<span className="text-rubber">({jalali(c.signedAtUtc, D)})</span></span>
              <button type="button" onClick={() => void downloadBlob(() => memberApi.contractPdf(c.id), `contract-v${c.version}.pdf`)}
                className="inline-flex cursor-pointer items-center gap-1 text-[14px] font-bold text-plate hover:underline"><Download className="size-4" aria-hidden />PDF</button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** Beispiel-Trainingsplan, bis der Trainer im Trainerpanel einen individuellen Plan einträgt */
const PLAN: Record<'men' | 'women', { day: string; focus: string; items: string[] }[]> = {
  men: [
    { day: 'Montag', focus: 'Brust und Trizeps', items: ['Bankdrücken Langhantel 4×8', 'Schrägbankdrücken Kurzhantel 3×10', 'Dips 3×max.', 'Trizepsdrücken am Kabel 3×12'] },
    { day: 'Mittwoch', focus: 'Rücken und Bizeps', items: ['Klimmzüge 4×max.', 'Vorgebeugtes Rudern Langhantel 4×8', 'Langhantel-Curls 3×10', 'Hammer-Curls 3×12'] },
    { day: 'Freitag', focus: 'Beine und Bauch', items: ['Kniebeugen 4×8', 'Rumänisches Kreuzheben 3×10', 'Beinpresse 3×12', 'Unterarmstütz 3×45 Sekunden'] },
  ],
  women: [
    { day: 'Montag', focus: 'Unterkörper', items: ['Goblet Squats 4×12', 'Hip Thrusts 4×10', 'Ausfallschritte Kurzhantel 3×10 je Bein', 'Abduktorenmaschine 3×15'] },
    { day: 'Mittwoch', focus: 'Oberkörper und Core', items: ['Latzug 3×12', 'Schulterdrücken Kurzhantel 3×10', 'Unterarmstütz 3×40 Sekunden', 'Dead Bug 3×12'] },
    { day: 'Freitag', focus: 'Ganzkörper + Ausdauer', items: ['Kettlebell-Kreuzheben 4×10', 'TRX-Rudern 3×12', 'Seilspringen 5×1 Minute', 'Radfahren 20 Minuten'] },
  ],
}

function TrainingPlan({ section }: { section: 'men' | 'women' }) {
  const [plan, setPlan] = useState<CoachPlan | null | undefined>(undefined)
  useEffect(() => { myCoachingApi.plan().then(setPlan).catch(() => setPlan(null)) }, [])
  const days = plan?.days.length ? plan.days : PLAN[section]
  return (
    <Panel aria-labelledby="tp-h">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="tp-h" className="flex items-center gap-2 text-[18px] font-black text-chalk"><Dumbbell className="size-5 text-plate" aria-hidden />{plan ? plan.title : 'Trainingsplan dieser Woche'}</h2>
        {plan === undefined ? null : plan
          ? <span className="rounded-full bg-[#ecf8f1] px-3 py-1 text-[12px] font-bold text-[#14532d]">Dein Trainer: {plan.coachName} – {jalali(plan.updatedAtUtc, D)}</span>
          : <span className="rounded-full bg-steel px-3 py-1 text-[12px] font-bold text-rubber">Beispiel — dein Trainer ersetzt deinen Plan</span>}
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
          <div><p className="mb-1 text-[14px] font-black text-chalk">Ernährungsplan</p><p className="whitespace-pre-line text-[13.5px] leading-7 text-rubber">{plan.nutrition}</p></div>
        </div>
      )}
    </Panel>
  )
}

/** Gewichtsverlauf: wird auf dem Server gespeichert und ist auch für den Trainer sichtbar */
function WeightChart() {
  const uid = useId()
  const [list, setList] = useState<BodyMetric[] | null>(null)
  const [kg, setKg] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const load = () => myCoachingApi.metrics().then(setList).catch(() => setList([]))
  useEffect(() => { void load() }, [])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const v = Number(toLatinDigits(kg).replace('/', '.').replace(',', '.'))
    if (!(v >= 30 && v <= 250)) return setErr('Gewicht bitte zwischen 30 und 250 kg eingeben.')
    setErr(null)
    try { await myCoachingApi.addMetric(Math.round(v * 10) / 10); setKg(''); void load() } catch (x) { setErr((x as Error).message) }
  }
  const pts = list ?? []
  const delta = pts.length >= 2 ? pts[pts.length - 1].weightKg - pts[0].weightKg : 0

  return (
    <Panel aria-labelledby={`${uid}-h`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${uid}-h`} className="flex items-center gap-2 text-[18px] font-black text-chalk"><Scale className="size-5 text-plate" aria-hidden />Gewichtsverlauf</h2>
        {pts.length >= 2 && <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold', delta <= 0 ? 'bg-[#ecf8f1] text-[#14532d]' : 'bg-steel text-chalk')}>
          {delta === 0 ? 'Unverändert' : `${delta < 0 ? '−' : '+'}${faNum(Math.abs(Math.round(delta * 10) / 10))} kg seit Beginn`}</span>}
      </div>
      {list === null ? <p className="text-rubber">…</p> : <WeightLine points={pts.map((p) => ({ label: jalali(p.measuredOn + 'T12:00:00Z', { day: 'numeric', month: 'short' }), kg: p.weightKg }))} />}
      <form onSubmit={add} noValidate className="mt-4 flex flex-wrap items-start gap-2">
        <label htmlFor={`${uid}-kg`} className="sr-only">Gewicht heute (Kilogramm)</label>
        <input id={`${uid}-kg`} value={kg} onChange={(e) => setKg(e.target.value)} inputMode="decimal" placeholder="Gewicht heute, z. B. 78,5" aria-invalid={!!err || undefined}
          className={`${inputCls} max-w-[240px]`} />
        <Btn type="submit" variant="dark"><Plus className="size-4" aria-hidden />Speichern</Btn>
        {err && <p role="alert" className="w-full text-[13px] text-danger">{err}</p>}
      </form>
      <p className="mt-2 text-[12px] text-rubber">Die Gewichte werden in Ihrem Konto gespeichert und Ihr Trainer sieht sie auch.</p>
    </Panel>
  )
}

/** Geburtsdatum (für Glückwünsche und Geschenkcode) und Einwilligung in Werbe-SMS */
const J_MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
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
    try { setP(await myCoachingApi.savePreferences(next)); setMsg({ ok: true, text: 'Gespeichert.' }) } catch (x) { setMsg({ ok: false, text: (x as Error).message }) }
  }
  const setBirth = (n: typeof j) => {
    setJ(n)
    if (n.y && n.m && n.d) void save({ ...p, birthDate: toGregorian(+n.y, +n.m, +n.d) })
  }
  const sel = 'h-11 cursor-pointer rounded-[3px] border border-steel-2 bg-white px-2 text-[14px]'
  return (
    <Panel>
      <h2 className="mb-3 flex items-center gap-2 text-[16px] font-black text-chalk"><Cake className="size-5 text-plate" aria-hidden />Geburtstag und SMS</h2>
      <fieldset>
        <legend className="mb-2 text-[13px] text-rubber">Geburtsdatum — an deinem Geburtstag bekommst du per SMS einen Geschenkcode für den Shop</legend>
        <div className="flex gap-2">
          <select aria-label="Tag" value={j.d} onChange={(e) => setBirth({ ...j, d: e.target.value })} className={sel}><option value="">Tag</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{faNum(i + 1)}</option>)}</select>
          <select aria-label="Monat" value={j.m} onChange={(e) => setBirth({ ...j, m: e.target.value })} className={`${sel} flex-1`}><option value="">Monat</option>{J_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <select aria-label="Jahr" value={j.y} onChange={(e) => setBirth({ ...j, y: e.target.value })} className={sel}><option value="">Jahr</option>{Array.from({ length: 80 }, (_, i) => thisJy - 10 - i).map((y) => <option key={y} value={y}>{faNum(y).replace('.', '')}</option>)}</select>
        </div>
      </fieldset>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14px] leading-7 text-chalk">
        <input type="checkbox" checked={p.marketingSmsOptIn} onChange={(e) => void save({ ...p, marketingSmsOptIn: e.target.checked })} className="mt-1.5 size-4 accent-[var(--color-plate)]" />
        Aktionen und Rabatte per SMS erhalten (jederzeit hier oder mit „STOP“ abbestellbar)
      </label>
      {msg && <p role="status" className={cn('mt-2 text-[13px]', msg.ok ? 'text-[#1f7a46]' : 'text-danger')}>{msg.text}</p>}
    </Panel>
  )
}

// ---- Datum ↔ ISO (gregorianisch)
function toGregorian(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function toJalali(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return [y, m, d]
}
