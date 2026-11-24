import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3, ShieldCheck, Store, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { authApi } from '@/lib/api'
import { site } from '@/lib/site'
import { faDigits } from '@/lib/fa'
import { brand } from '@/lib/brand'
import OtpLogin from '@/member/OtpLogin'
import { Notice, Panel, Spinner } from '@/member/ui'

/** Nur interne Pfade für die Rückkehr nach dem Login (verhindert Open Redirect) */
export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/profile')

export default function LoginPage() {
  const { ready, user } = useAuth()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const next = safeNext(params.get('next'))
  const dest = useRef<string | null>(null)
  useEffect(() => { document.title = `Anmelden | ${brand.name}` }, [])
  useEffect(() => { if (ready && user) nav(dest.current ?? next, { replace: true }) }, [ready, user, next, nav])

  if (!ready || user) return <Spinner />
  return (
    <div className="bg-steel">
      <div className="mx-auto grid min-h-[calc(100svh-78px)] w-full max-w-[1100px] items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_440px]">
        <div className="hidden lg:block">
          <p className="mb-3 text-[13px] font-bold text-plate">Benutzerkonto</p>
          <h1 className="text-[40px] font-black leading-[1.3] text-chalk">Anmelden oder registrieren<br />Mit Handynummer</h1>
          <ul className="mt-8 grid gap-4 text-[16px] text-rubber">
            <li>Online-Mitgliedschaft in jeder Filiale</li>
            <li>Digitale Vertragsunterschrift, ohne Papier</li>
            <li>QR-Mitgliedskarte und Verlängerung mit einem Klick</li>
          </ul>
        </div>
        <Panel aria-labelledby="login-title" className="shadow-[0_20px_60px_rgb(0_0_0/0.06)]">
          <h2 id="login-title" className="mb-6 text-[22px] font-black text-chalk">Anmelden</h2>
          <DemoQuickLogin next={next} onPick={(to) => { dest.current = to }} />
          <OtpLogin onDone={() => nav(dest.current ?? next, { replace: true })} />
          <p className="mt-6 flex items-start gap-2 text-[12.5px] leading-6 text-rubber">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-chalk" aria-hidden />
            Ihre Anmeldung wird mit einem sicheren Cookie gehalten. Mit der Anmeldung akzeptieren Sie die <Link to="/join" className="font-bold text-chalk underline">Mitgliedschaftsbedingungen</Link> .
          </p>
        </Panel>
      </div>
    </div>
  )
}

const DEMO_ACCOUNTS = [
  { phone: '01510000000', label: 'Gesamtadmin', hint: 'Alle Panelbereiche und alle Filialen', to: '/panel', Icon: BarChart3 },
  { phone: '01510000001', label: 'Filialleitung', hint: 'Nur eine Filiale', to: '/panel', Icon: Store },
  { phone: '01521000001', label: 'Studiomitglied', hint: 'Mitgliedskarte, Plan und Bestellungen', to: null, Icon: UserRound },
] as const

/** Nur in der Demo-Version: Login mit einem Klick statt Nummer und Code */
function DemoQuickLogin({ next, onPick }: { next: string; onPick: (to: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  if (!site.demo) return null
  const go = async (a: (typeof DEMO_ACCOUNTS)[number]) => {
    setBusy(a.phone); setErr(null)
    try {
      onPick(a.to ?? next)
      await authApi.demoLogin(a.phone)
    } catch (x) { setErr((x as Error).message); setBusy(null) }
  }
  return (
    <section aria-labelledby="demo-quick" className="mb-6 rounded-[8px] border border-[#F2A33A] bg-[#FFF6E8] p-4">
      <h3 id="demo-quick" className="text-[15px] font-black text-chalk">Schnell-Login der Demo-Version</h3>
      <p className="mt-1 text-[13px] text-rubber">Eine Rolle wählen; Sie werden ohne Nummer und Code angemeldet.</p>
      <div className="mt-3 grid gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.phone} type="button" disabled={!!busy} onClick={() => void go(a)}
            className="flex cursor-pointer items-center gap-3 rounded-[6px] border border-steel-2 bg-white px-3 py-2.5 text-left hover:border-plate disabled:cursor-wait disabled:opacity-60">
            <a.Icon className="size-5 shrink-0 text-plate" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-bold text-chalk">{busy === a.phone ? 'Anmeldung läuft…' : `Anmelden als ${a.label}`}</span>
              <span className="block text-[12.5px] text-rubber">{a.hint} · <span dir="ltr">{faDigits(a.phone)}</span></span>
            </span>
          </button>
        ))}
      </div>
      {err && <Notice tone="err" className="mt-3">{err}</Notice>}
    </section>
  )
}
