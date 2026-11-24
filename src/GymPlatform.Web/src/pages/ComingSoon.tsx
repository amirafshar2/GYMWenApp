import { useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { brand } from '@/lib/brand'
import { faDigits } from '@/lib/fa'

/** Leere Installation: bis der Inhaber im Assistenten „Veröffentlichen“ drückt, sehen Besucher diese Seite (Panel und Login sind offen) */
export default function ComingSoon() {
  const named = brand.name !== 'Studio'
  // Den von index.html reservierten Platz der Aktionsleiste freigeben
  useLayoutEffect(() => { document.documentElement.style.setProperty('--festival-h', '0px') }, [])
  return (
    <div className="grid min-h-[calc(100svh-78px)] place-items-center bg-steel px-5 py-16 text-center">
      <div className="max-w-lg">
        <img src={brand.logo} alt="" width={96} height={96} className="mx-auto size-24 rounded-full object-contain" />
        <h1 className="mt-6 text-[clamp(1.8rem,5vw,2.6rem)] font-black leading-tight text-chalk">{named ? brand.name : 'die Website des Studios'}</h1>
        <p className="mt-4 text-[17px] leading-8 text-rubber">Die Seite wird gerade eingerichtet und ist bald verfügbar.</p>
        {brand.phone && (
          <a href={`tel:${brand.phone}`} className="mt-8 inline-flex h-12 items-center gap-2 rounded-[3px] bg-plate px-6 font-bold text-white hover:bg-plate-hi">
            <Phone className="size-4" aria-hidden /><span dir="ltr">{faDigits(brand.phone)}</span>
          </a>
        )}
        <p className="mt-10 text-[14px] text-rubber">Sie sind der Seitenadmin? <Link to="/login?next=/panel/setup" className="font-bold text-plate">Anmelden und Einrichtung fortsetzen</Link></p>
      </div>
    </div>
  )
}
