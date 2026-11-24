import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Banner1 } from '@/components/ui/banner-1'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { faNum, toman } from '@/lib/fa'
import { site } from '@/lib/site'

/** Leiste oben: „Demo-Version“ (nur in der Demo) + „Aktion“ — Promo Banner von 21st.dev mit Countdown */
export default function SiteBanner() {
  const { data: c, error } = useData('campaign', () => (site.modules.festival ? api.campaign() : Promise.resolve(null)))
  const demo = site.demo
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('festival-hidden') === '1' } catch { return false } })
  const [now, setNow] = useState(Date.now())
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const end = c ? Date.parse(c.endsAtUtc) : 0
  const ms = Math.max(0, end - now)
  const show = !!c && !hidden && ms > 0
  // Bis die Aktion geladen ist, bleibt der von index.html reservierte Platz unangetastet (Seite springt nicht)
  const pending = c === undefined && !error && !hidden
  useLayoutEffect(() => {
    if (pending) return
    document.documentElement.style.setProperty('--festival-h', `${(show || demo) && box.current ? box.current.offsetHeight : 0}px`)
    return () => document.documentElement.style.setProperty('--festival-h', '0px')
  }, [show, demo, pending])
  if (!show && !demo) return null

  const d = Math.floor(ms / 86_400_000), h = Math.floor(ms / 3_600_000) % 24, m = Math.floor(ms / 60_000) % 60, s = Math.floor(ms / 1000) % 60
  return (
    <div ref={box} className="kg-chrome fixed inset-x-0 top-0 z-[60]">
      {demo && <DemoStrip />}
      {show && c && <Banner1
        href="/festival"
        label="Rabattaktion"
        closeLabel="Aktionsleiste schließen"
        className="!bg-[#181818] !pr-10 !pl-6"
        onClose={() => { setHidden(true); try { sessionStorage.setItem('festival-hidden', '1') } catch { /* */ } }}
      >
        <span className="font-semibold">{c.title}</span> – {c.discountAmountToman ? toman(c.discountAmountToman) : `${faNum(c.discountPercent)}%`} Rabatt — <span className="tabular-nums">{faNum(d)} Tage {faNum(h)} Std. {faNum(m)} Min. <span className="hidden sm:inline">{faNum(s)} Sek.</span></span>
      </Banner1>}
    </div>
  )
}

/** Schmale „Demo-Version“-Leiste, damit Besucher wissen, dass die Daten fiktiv sind */
export function DemoStrip({ className = '' }: { className?: string }) {
  return (
    <p role="note" className={`bg-[#F2A33A] px-4 py-1.5 text-center text-[12.5px] font-bold leading-5 text-[#10161F] sm:text-[13px] ${className}`}>
      Demo-Version — <span className="sm:hidden">Daten sind fiktiv, Zahlungen nur Test.</span><span className="hidden sm:inline">Mitglieder und Statistiken sind fiktiv, Zahlungen nur Test und es werden keine echten SMS gesendet.</span>
    </p>
  )
}
