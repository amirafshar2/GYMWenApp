import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowUp, Phone, Send } from 'lucide-react'
import { Instagram } from '@/components/ui/brand-icons'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { faDigits, faNum } from '@/lib/fa'
import { Logo } from './SiteHeader'
import { Link } from 'react-router-dom'
import { wrap } from './ui/SectionHead'

const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s|-/g, '')
const mostCommon = (xs: (string | null)[]) => {
  xs = xs.filter((x) => x && /[0-9۰-۹]/.test(x))
  const m = new Map<string, number>()
  xs.forEach((x) => x && m.set(x, (m.get(x) ?? 0) + 1))
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

const LINKS = [
  { text: 'خانه', href: '/#top' }, { text: 'شعبه‌ها', href: '/#branches' }, { text: 'رشته‌ها', href: '/#disciplines' },
  { text: 'پکیج‌ها', href: '/#packages' }, { text: 'مربیان', href: '/#coaches' }, { text: 'گالری', href: '/#gallery' }, { text: 'مشاورهٔ رایگان', href: '/#consult' },
]

/** فوتر تیرهٔ چهارستونه مثل صفحهٔ مرجع: ساعات کاری، دفتر، لینک‌ها، در تماس باشید */
export default function SiteFooter() {
  const year = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date())
  const { data: branches = [] } = useData('branches', api.branches)
  const hours = useMemo(() => ({ men: mostCommon(branches.map((b) => b.menHours)), women: mostCommon(branches.map((b) => b.womenHours)) }), [branches])

  const [mobile, setMobile] = useState('')
  const [state, setState] = useState<{ s: 'idle' | 'busy' | 'ok' | 'err'; msg?: string }>({ s: 'idle' })
  const subscribe = async (e: FormEvent) => {
    e.preventDefault()
    const m = toLatin(mobile)
    if (!/^(\+98|0098|0)?9\d{9}$/.test(m)) return setState({ s: 'err', msg: 'شمارهٔ موبایل را مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.' })
    setState({ s: 'busy' })
    try {
      await api.consult({ fullName: 'عضو خبرنامه', mobile: m, goal: null, message: 'عضویت در خبرنامهٔ جشنواره', branchId: null })
      setState({ s: 'ok', msg: 'ثبت شد. اولین پیامک جشنواره برایت می‌آید.' }); setMobile('')
    } catch (err) { setState({ s: 'err', msg: (err as Error).message || 'ثبت نشد. دوباره امتحان کنید.' }) }
  }

  const h = 'mb-6 text-[19px] font-bold text-white'
  const t = 'text-[15px] leading-8 text-white/60'
  return (
    <footer className="bg-night text-white">
      <div className={`${wrap} grid gap-12 py-[clamp(64px,7vw,100px)] sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_.8fr_1.3fr]`}>
        <div>
          <h2 className={h}>ساعات کاری</h2>
          {hours.men || hours.women ? (
            <dl className={t}>
              {hours.men && <><dt className="font-bold text-white/85">آقایان</dt><dd>{faDigits(hours.men)}</dd></>}
              {hours.women && <><dt className="mt-2 font-bold text-white/85">بانوان</dt><dd>{faDigits(hours.women)}</dd></>}
              <dd className="mt-2 text-[13px] text-white/60">ساعت دقیق هر شعبه در فهرست شعبه‌ها</dd>
            </dl>
          ) : <p className={t}>ساعت دقیق هر شعبه در فهرست شعبه‌ها آمده است.</p>}
        </div>
        <div>
          <h2 className={h}>{brand.name}</h2>
          <p className={t}>{faNum(12)} شعبه در {brand.city}<br />سالن‌های جدای آقایان و بانوان</p>
          <a href={`tel:${brand.phone}`} className="mt-3 inline-flex items-center gap-2 text-[17px] font-bold text-white transition-colors hover:text-plate-lt">
            <Phone className="size-4" aria-hidden /><span dir="ltr">{faDigits(brand.phone)}</span>
          </a>
        </div>
        <nav aria-label="لینک‌های فوتر">
          <h2 className={h}>لینک‌ها</h2>
          <ul className="grid gap-1.5">
            {LINKS.map((l) => <li key={l.text}><a href={l.href} className="text-[15px] text-white/60 transition-colors hover:text-white">{l.text}</a></li>)}
          </ul>
        </nav>
        <div>
          <h2 className={h}>در تماس باشید</h2>
          <form onSubmit={subscribe} noValidate>
            <label htmlFor="nl-mobile" className="text-[15px] text-white/60">شماره‌ات را بگذار تا خبر جشنواره‌ها را زودتر پیامک کنیم.</label>
            <div className="mt-4 flex h-[52px] overflow-hidden rounded-[3px] bg-white/[.07] focus-within:ring-2 focus-within:ring-plate">
              <input id="nl-mobile" type="tel" inputMode="numeric" autoComplete="tel" dir="ltr" placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={mobile} onChange={(e) => setMobile(e.target.value)} aria-invalid={state.s === 'err'} aria-describedby="nl-msg"
                className="min-w-0 flex-1 bg-transparent px-4 text-right text-[15px] text-white placeholder:text-white/35 focus:outline-none" />
              <button type="submit" disabled={state.s === 'busy'} aria-label="عضویت در خبرنامه"
                className="grid w-[52px] shrink-0 cursor-pointer place-items-center bg-plate transition-colors hover:bg-plate-hi disabled:opacity-60"><Send className="size-5 -scale-x-100" aria-hidden /></button>
            </div>
            <p id="nl-msg" role="status" className={`mt-2 min-h-6 text-[14px] ${state.s === 'err' ? 'text-[#ff8a95]' : 'text-[#8ee3a6]'}`}>{state.msg}</p>
          </form>
          <div className="mt-3 flex gap-3">
            {brand.instagram && (
              <a href={brand.instagram} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام"
                className="grid size-11 place-items-center rounded-full bg-white/[.07] transition-colors hover:bg-plate"><Instagram className="size-5" /></a>
            )}
            <a href={`tel:${brand.phone}`} aria-label={`تماس ${faDigits(brand.phone)}`} className="grid size-11 place-items-center rounded-full bg-white/[.07] transition-colors hover:bg-plate"><Phone className="size-5" aria-hidden /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 py-6`}>
          <Logo light />
          <nav aria-label="قوانین" className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            {[['/about', 'درباره ما'], ['/terms', 'قوانین و مقررات'], ['/privacy', 'حریم خصوصی'], ['/refund', 'لغو و بازگشت وجه']].map(([to, t]) => (
              <Link key={to} to={to} className="text-white/55 transition-colors hover:text-white">{t}</Link>
            ))}
          </nav>
          <Enamad />
          <p className="text-[14px] text-white/50">© {year} {brand.name}. همهٔ حقوق محفوظ است.</p>
        </div>
      </div>
      <BackToTop />
    </footer>
  )
}

/** نماد اعتماد الکترونیکی (کد رسمی enamad.ir). تا صادر نشده، فقط در حالت توسعه جای آن نشان داده می‌شود. */
function Enamad() {
  if (brand.enamad) {
    const q = `id=${encodeURIComponent(brand.enamad.id)}&Code=${encodeURIComponent(brand.enamad.code)}`
    return (
      <a href={`https://trustseal.enamad.ir/?${q}`} target="_blank" rel="noopener" referrerPolicy="origin" aria-label="نماد اعتماد الکترونیکی"
        className="grid size-[76px] place-items-center rounded-[6px] bg-white">
        <img src={`https://trustseal.enamad.ir/logo.aspx?${q}`} alt="نماد اعتماد الکترونیکی" referrerPolicy="origin" width={70} height={70} />
      </a>
    )
  }
  if (!import.meta.env.DEV) return null
  return <span className="grid size-[76px] place-items-center rounded-[6px] border border-dashed border-white/25 text-center text-[11px] leading-5 text-white/60">جای نماد<br />اینماد</span>
}

/** دکمهٔ برگشت به بالا (گوشهٔ پایین صفحهٔ مرجع) */
function BackToTop() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const f = () => setOn(window.scrollY > 700)
    f(); window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  return (
    <a href="#top" aria-label="برگشت به بالای صفحه" tabIndex={on ? 0 : -1} aria-hidden={!on}
      className={`transition-[opacity,transform,background-color] duration-300 ${on ? 'opacity-100' : 'pointer-events-none translate-y-3 opacity-0'} fixed bottom-5 left-5 z-40 grid size-11 place-items-center rounded-[3px] bg-chalk text-white shadow-lg hover:bg-plate`}>
      <ArrowUp className="size-5" aria-hidden />
    </a>
  )
}
