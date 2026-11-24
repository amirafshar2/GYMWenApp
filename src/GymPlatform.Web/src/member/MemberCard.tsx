import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { memberApi, type Membership } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { brand } from '@/lib/brand'
import { faNum, jalali } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { sectionLabel } from './ui'

/** Mitgliederseiten: ohne Login zu /login mit Rückkehr zu dieser Seite */
export function useRequireAuth() {
  const auth = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  useEffect(() => {
    if (auth.ready && !auth.user) nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`, { replace: true })
  }, [auth.ready, auth.user]) // eslint-disable-line react-hooks/exhaustive-deps
  return auth
}

/** QR-Bild der Karte (mit Token geladen, daher als Blob) */
function useCardQr(enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    let u: string | null = null
    memberApi.card().then((b) => { u = URL.createObjectURL(b); setUrl(u) }).catch(() => setUrl(null))
    return () => { if (u) URL.revokeObjectURL(u) }
  }, [enabled])
  return url
}

const D = { year: 'numeric', month: 'long', day: 'numeric' } as const

/** Digitale Mitgliedskarte: Name, Paket, Gültigkeit und QR für den Zutritt am Gate */
export default function MemberCard({ m, name }: { m: Membership; name: string }) {
  const qr = useCardQr(m.isActive)
  const pct = m.totalDays > 0 && m.daysLeft !== null ? Math.max(0, Math.min(1, m.daysLeft / m.totalDays)) : 0
  const women = m.section === 'women'
  return (
    <article aria-label="Mitgliedskarte"
      className={cn('relative overflow-hidden rounded-[14px] p-6 text-white shadow-[0_20px_50px_rgb(0_0_0/0.18)] sm:p-7', women ? 'bg-[linear-gradient(135deg,#5d2858,#8e3f86_60%,#b0569f)]' : 'bg-[linear-gradient(135deg,#181818,#2c2c2c_55%,#0b2f57)]')}>
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-plate/30 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src={brand.logo} alt="" className="size-10 rounded-full bg-white" />
          <span className="text-[20px] font-black">{brand.shortName}</span>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold', m.isActive ? 'bg-[#1f9d55]' : 'bg-white/20')}>{m.isActive ? 'Aktiv' : 'Inaktiv'}</span>
      </div>
      <div className="relative mt-6 flex items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[13px] text-white/60">Mitglied</p>
          <p className="truncate text-[22px] font-black">{name}</p>
          <p className="mt-3 text-[14px] text-white/80">{m.packageName} – {sectionLabel(m.section)}</p>
          <p className="text-[14px] text-white/80">{m.branchName}</p>
          {m.endsAtUtc && <p className="mt-3 text-[13px] text-white/60">Gültig bis {jalali(m.endsAtUtc, D)}</p>}
        </div>
        {m.isActive && (
          <div className="grid shrink-0 place-items-center rounded-[10px] bg-white p-2">
            {qr ? <img src={qr} alt="QR-Code für den Studiozutritt" width={112} height={112} className="size-28" /> : <div className="size-28 animate-pulse bg-steel" />}
          </div>
        )}
      </div>
      {m.daysLeft !== null && (
        <div className="relative mt-6">
          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="text-white/70">Verbleibende Tage</span>
            <b>{faNum(m.daysLeft)} von {faNum(m.totalDays)} Tagen</b>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={m.totalDays} aria-valuenow={m.daysLeft} aria-label="Verbleibende Tage">
            <div className={cn('h-full rounded-full', pct < 0.15 ? 'bg-sun' : 'bg-plate')} style={{ width: `${pct * 100}%` }} />
          </div>
          {m.sessionsTotal !== null && <p className="mt-2 text-[13px] text-white/70">Einheiten: {faNum(m.sessionsUsed)} von {faNum(m.sessionsTotal)}</p>}
        </div>
      )}
    </article>
  )
}
