import { ShieldCheck } from 'lucide-react'

/** Die echte Anbieterkennzeichnung und Datenschutzerklärung dieser Demo liegen auf der Portfolio-Website. */
export const DEMO_IMPRESSUM = 'https://amirrezaafshar.de/impressum'
export const DEMO_DATENSCHUTZ = 'https://amirrezaafshar.de/datenschutz'

/** Ersetzt in der Demo jedes Formular, das personenbezogene Daten erfragen würde. */
export function DemoFormNotice({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  return (
    <div role="note" className={`rounded-[6px] p-6 sm:p-9 ${dark ? 'border border-white/10 bg-white/[.04] text-white/70' : 'bg-white text-chalk shadow-[0_40px_80px_-30px_rgb(0_0_0/.6)]'} ${className}`}>
      <p className={`flex items-center gap-2 text-[17px] font-black ${dark ? 'text-white' : ''}`}><ShieldCheck className="size-5 text-plate" aria-hidden />Demo-Projekt</p>
      <p className="mt-3 text-[15px] leading-7">
        Dieses Formular ist in der Demo abgeschaltet – es werden keine persönlichen Daten erhoben. Zum Ausprobieren melden Sie sich über die Demo-Buttons im Login an.
      </p>
      <p className="mt-3 text-[14px]">
        <a href={DEMO_IMPRESSUM} target="_blank" rel="noopener noreferrer" className="font-bold text-plate underline-offset-4 hover:underline">Impressum</a>
        {' · '}
        <a href={DEMO_DATENSCHUTZ} target="_blank" rel="noopener noreferrer" className="font-bold text-plate underline-offset-4 hover:underline">Datenschutz</a>
      </p>
    </div>
  )
}
