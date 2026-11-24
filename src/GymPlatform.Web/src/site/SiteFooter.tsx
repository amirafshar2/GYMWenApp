import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowUp, Phone, Send } from 'lucide-react'
import { Instagram } from '@/components/ui/brand-icons'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { faDigits, faNum } from '@/lib/fa'
import { fill, site } from '@/lib/site'
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

/** Links, deren Bereich oder Modul aus ist, werden entfernt */
const links = () => [
  { text: 'Start', href: '/#top', on: true }, { text: 'Filialen', href: '/#branches', on: true }, { text: 'Angebote', href: '/#disciplines', on: on('intro') },
  { text: 'Pakete', href: '/#packages', on: on('pricing') }, { text: 'Trainer', href: '/#coaches', on: site.modules.coaches && on('coaches') },
  { text: 'Galerie', href: '/#gallery', on: on('gallery') }, { text: 'Kostenlose Beratung', href: '/#consult', on: site.modules.consultation && on('contact') },
].filter((l) => l.on)
const on = (k: string) => site.home.sections.find((s) => s.key === k)?.enabled ?? true

/** Dunkler vierspaltiger Footer wie auf der Referenzseite: Öffnungszeiten, Büro, Links, Kontakt */
export default function SiteFooter() {
  const year = new Date().getFullYear()
  const { data: branches = [] } = useData('branches', api.branches)
  const hours = useMemo(() => ({ men: mostCommon(branches.map((b) => b.menHours)), women: mostCommon(branches.map((b) => b.womenHours)) }), [branches])

  const [mobile, setMobile] = useState('')
  const [state, setState] = useState<{ s: 'idle' | 'busy' | 'ok' | 'err'; msg?: string }>({ s: 'idle' })
  const subscribe = async (e: FormEvent) => {
    e.preventDefault()
    const m = toLatin(mobile)
    if (!/^(\+49|0049|0)?1[5-7]\d{8,9}$/.test(m)) return setState({ s: 'err', msg: 'Bitte die Handynummer im Format 01512 3456789 eingeben.' })
    setState({ s: 'busy' })
    try {
      await api.consult({ fullName: 'Newsletter abonnieren', mobile: m, goal: null, message: 'Newsletter für Aktionen abonnieren', branchId: null })
      setState({ s: 'ok', msg: 'Eingetragen. Die erste Aktions-SMS kommt bald.' }); setMobile('')
    } catch (err) { setState({ s: 'err', msg: (err as Error).message || 'Nicht gesendet. Bitte erneut versuchen.' }) }
  }

  const h = 'mb-6 text-[19px] font-bold text-white'
  const t = 'text-[15px] leading-8 text-white/60'
  return (
    <footer className="bg-night text-white">
      <div className={`${wrap} grid gap-12 py-[clamp(64px,7vw,100px)] sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_.8fr_1.3fr]`}>
        <div>
          <h2 className={h}>Öffnungszeiten</h2>
          {hours.men || hours.women ? (
            <dl className={t}>
              {hours.men && <><dt className="font-bold text-white/85">Herren</dt><dd>{faDigits(hours.men)}</dd></>}
              {hours.women && <><dt className="mt-2 font-bold text-white/85">Damen</dt><dd>{faDigits(hours.women)}</dd></>}
              <dd className="mt-2 text-[13px] text-white/60">Genaue Zeiten jeder Filiale in der Filialliste</dd>
            </dl>
          ) : <p className={t}>Die genauen Zeiten jeder Filiale stehen in der Filialliste.</p>}
        </div>
        <div>
          <h2 className={h}>{brand.name}</h2>
          <p className={t}>{faNum(branches.length)} {branches.length === 1 ? 'Filiale' : 'Filialen'}{brand.city ? ` in ${brand.city}` : ''}{site.home.footerNote && <><br />{fill(site.home.footerNote)}</>}</p>
          {site.contact.address && <p className={`${t} mt-1`}>{site.contact.address}</p>}
          {brand.phone && <a href={`tel:${brand.phone}`} className="mt-3 inline-flex items-center gap-2 text-[17px] font-bold text-white transition-colors hover:text-plate-lt">
            <Phone className="size-4" aria-hidden /><span dir="ltr">{faDigits(brand.phone)}</span>
          </a>}
        </div>
        <nav aria-label="Footer-Links">
          <h2 className={h}>Links</h2>
          <ul className="grid gap-1.5">
            {links().map((l) => <li key={l.text}><a href={l.href} className="text-[15px] text-white/60 transition-colors hover:text-white">{l.text}</a></li>)}
          </ul>
        </nav>
        <div>
          <h2 className={h}>Kontakt</h2>
          <form onSubmit={subscribe} noValidate>
            <label htmlFor="nl-mobile" className="text-[15px] text-white/60">Hinterlasse deine Nummer und wir schicken dir Aktionen zuerst per SMS.</label>
            <div className="mt-4 flex h-[52px] overflow-hidden rounded-[3px] bg-white/[.07] focus-within:ring-2 focus-within:ring-plate">
              <input id="nl-mobile" type="tel" inputMode="numeric" autoComplete="tel" dir="ltr" placeholder="01512 3456789"
                value={mobile} onChange={(e) => setMobile(e.target.value)} aria-invalid={state.s === 'err'} aria-describedby="nl-msg"
                className="min-w-0 flex-1 bg-transparent px-4 text-left text-[15px] text-white placeholder:text-white/35 focus:outline-none" />
              <button type="submit" disabled={state.s === 'busy'} aria-label="Newsletter abonnieren"
                className="grid w-[52px] shrink-0 cursor-pointer place-items-center bg-plate transition-colors hover:bg-plate-hi disabled:opacity-60"><Send className="size-5" aria-hidden /></button>
            </div>
            <p id="nl-msg" role="status" className={`mt-2 min-h-6 text-[14px] ${state.s === 'err' ? 'text-[#ff8a95]' : 'text-[#8ee3a6]'}`}>{state.msg}</p>
          </form>
          <div className="mt-3 flex gap-3">
            {brand.instagram && (
              <a href={brand.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="grid size-11 place-items-center rounded-full bg-white/[.07] transition-colors hover:bg-plate"><Instagram className="size-5" /></a>
            )}
            {site.contact.telegram && <a href={site.contact.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="grid size-11 place-items-center rounded-full bg-white/[.07] transition-colors hover:bg-plate"><Send className="size-5" aria-hidden /></a>}
            {brand.phone && <a href={`tel:${brand.phone}`} aria-label={`Anrufen ${faDigits(brand.phone)}`} className="grid size-11 place-items-center rounded-full bg-white/[.07] transition-colors hover:bg-plate"><Phone className="size-5" aria-hidden /></a>}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 py-6`}>
          <Logo light />
          <nav aria-label="AGB" className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            {[['/about', 'Über uns'], ['/terms', 'AGB'], ['/privacy', 'Datenschutz'], ['/refund', 'Kündigung und Erstattung']].map(([to, t]) => (
              <Link key={to} to={to} className="text-white/55 transition-colors hover:text-white">{t}</Link>
            ))}
          </nav>
          <Enamad />
          <p className="text-[14px] text-white/50">© {year} {brand.name}. Alle Rechte vorbehalten.</p>
        </div>
      </div>
      <BackToTop />
    </footer>
  )
}

/** Vertrauenssiegel (optional). Solange keines vorliegt, wird der Platzhalter nur in der Entwicklung gezeigt. */
function Enamad() {
  if (brand.enamad) {
    const q = `id=${encodeURIComponent(brand.enamad.id)}&Code=${encodeURIComponent(brand.enamad.code)}`
    return (
      <a href={`https://trustseal.enamad.ir/?${q}`} target="_blank" rel="noopener" referrerPolicy="origin" aria-label="Vertrauenssiegel"
        className="grid size-[76px] place-items-center rounded-[6px] bg-white">
        <img src={`https://trustseal.enamad.ir/logo.aspx?${q}`} alt="Vertrauenssiegel" referrerPolicy="origin" width={70} height={70} />
      </a>
    )
  }
  if (!import.meta.env.DEV) return null
  return <span className="grid size-[76px] place-items-center rounded-[6px] border border-dashed border-white/25 text-center text-[11px] leading-5 text-white/60">Platz für Siegel<br />Siegel</span>
}

/** Button zurück nach oben (untere Ecke der Referenzseite) */
function BackToTop() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const f = () => setOn(window.scrollY > 700)
    f(); window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  return (
    <a href="#top" aria-label="Zurück nach oben" tabIndex={on ? 0 : -1} aria-hidden={!on}
      className={`transition-[opacity,transform,background-color] duration-300 ${on ? 'opacity-100' : 'pointer-events-none translate-y-3 opacity-0'} fixed bottom-5 right-5 z-40 grid size-11 place-items-center rounded-[3px] bg-chalk text-white shadow-lg hover:bg-plate`}>
      <ArrowUp className="size-5" aria-hidden />
    </a>
  )
}
