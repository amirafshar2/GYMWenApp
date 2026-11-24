import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { CalendarClock, MapPin, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { faNum, jalali, toman } from '@/lib/fa'
import { Spinner } from '@/member/ui'

/** Aktionsseite: Countdown, berechtigte Pakete mit Preis nach Rabatt, Filialen und verbleibende Kapazität */
export default function FestivalPage() {
  const reduced = useReducedMotion()
  const { data: c, loading } = useData('campaign', api.campaign)
  const { data: pkgs = [] } = useData('packages', api.packages)
  const { data: branches = [] } = useData('branches', api.branches)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { document.title = c ? `${c.title} | ${brand.name}` : `Aktion | ${brand.name}` }, [c])

  if (loading) return <Spinner />
  if (!c) return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="text-[30px] font-black text-chalk">Gerade läuft keine Aktion</h1>
      <p className="mt-3 text-rubber">Hinterlasse unten auf der Seite deine Nummer, damit wir dir die nächste Aktion zuerst melden.</p>
      <Link to="/#packages" className="mt-6 inline-flex h-[52px] items-center rounded-[3px] bg-plate px-6 font-bold text-white">Pakete ansehen</Link>
    </div>
  )

  const ms = Math.max(0, Date.parse(c.endsAtUtc) - now)
  const parts = [[Math.floor(ms / 86_400_000), 'Tage'], [Math.floor(ms / 3_600_000) % 24, 'Stunden'], [Math.floor(ms / 60_000) % 60, 'Minuten'], [Math.floor(ms / 1000) % 60, 'Sekunden']] as const
  const eligible = pkgs.filter((p) => c.eligiblePackageSlugs.length === 0 || c.eligiblePackageSlugs.includes(p.slug))
  const branchNames = c.eligibleBranchSlugs?.length ? branches.filter((b) => c.eligibleBranchSlugs!.includes(b.slug)).map((b) => b.name) : null
  const off = c.discountAmountToman ? toman(c.discountAmountToman) : `${faNum(c.discountPercent)}%`

  return (
    <div className="bg-steel">
      <section className="relative overflow-hidden bg-night text-white">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-plate/40 blur-[140px]" />
        <div className="relative mx-auto max-w-[1100px] px-5 py-16 text-center sm:py-24">
          <p className="text-[14px] font-bold text-plate-lt">Rabattaktion</p>
          <h1 className="mt-3 text-[34px] font-black leading-tight sm:text-[56px]">{c.title}</h1>
          {c.description && <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-8 text-white/70">{c.description}</p>}
          <motion.p initial={reduced ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120 }}
            className="mt-8 text-[72px] font-black leading-none text-white sm:text-[110px]">{off}<span className="text-[28px] sm:text-[40px]"> Rabatt</span></motion.p>
          <div role="timer" aria-label="Verbleibende Zeit" className="mx-auto mt-10 grid max-w-xl grid-cols-4 gap-2 sm:gap-4">
            {parts.map(([v, l]) => (
              <div key={l} className="rounded-[10px] bg-white/10 py-4 backdrop-blur"><p className="text-[30px] font-black tabular-nums sm:text-[44px]">{faNum(v)}</p><p className="text-[13px] text-white/60">{l}</p></div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-[14px] text-white/70">
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4" />bis {jalali(c.endsAtUtc, { day: 'numeric', month: 'long' })}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{branchNames ? branchNames.join(', ') : 'Alle Filialen'}</span>
            {c.remainingSlots !== null && <span className="inline-flex items-center gap-1.5 font-bold text-sun"><Users className="size-4" />Nur {faNum(c.remainingSlots)} Verbleibende Plätze</span>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-5 py-12">
        <h2 className="mb-6 text-[24px] font-black text-chalk">Berechtigte Pakete</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eligible.map((p) => (
            <li key={p.slug} className="flex flex-col rounded-[10px] border border-steel-2 bg-white p-6">
              <h3 className="text-[20px] font-black text-chalk">{p.name}</h3>
              {p.tagline && <p className="text-[14px] text-rubber">{p.tagline}</p>}
              <div className="mt-4">
                {p.discountedPriceToman && <s className="text-[14px] text-rubber">{toman(p.priceToman)}</s>}
                <p className="text-[26px] font-black text-chalk">{toman(p.discountedPriceToman ?? p.priceToman)}</p>
                {p.discountedPriceToman && <p className="text-[14px] font-bold text-plate">{toman(p.priceToman - p.discountedPriceToman)} Ersparnis</p>}
              </div>
              <Link to={`/join?package=${p.slug}`} className="mt-6 inline-flex h-[52px] items-center justify-center rounded-[3px] bg-plate font-bold text-white hover:bg-plate-hi">Mit Rabatt anmelden</Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[13px] text-rubber">Der Aktionsrabatt wird bei der Online-Anmeldung automatisch abgezogen und ist mit einem Rabattcode kombinierbar.</p>
      </section>
    </div>
  )
}
