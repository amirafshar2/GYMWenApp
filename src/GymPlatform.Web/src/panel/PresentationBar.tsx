import { useEffect, useSyncExternalStore } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Coffee, Dumbbell, Presentation, ScanLine, UserRound, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

/**
 * حالت پرزنت: نوار شناور برای جابه‌جایی سریع بین نمای مشتری، پذیرش، بوفه، مربی و مدیر
 * (برای نشان دادن کل سیستم در یک جلسه). فقط برای کارکنان و با ?present=1 یا دکمهٔ پنل روشن می‌شود.
 */
const KEY = 'kg-present'
const subs = new Set<() => void>()
const read = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }
export const presentation = {
  set(on: boolean) { try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY) } catch { /* */ } subs.forEach((f) => f()) },
  use: () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, read),
}

const VIEWS = [
  { to: '/profile', label: 'مشتری', icon: UserRound },
  { to: '/panel/reception', label: 'پذیرش', icon: ScanLine },
  { to: '/panel/canteen', label: 'بوفه', icon: Coffee },
  { to: '/panel/coach', label: 'مربی', icon: Dumbbell },
  { to: '/panel/dashboard', label: 'مدیر', icon: BarChart3 },
]

export default function PresentationBar() {
  const on = presentation.use()
  const { user } = useAuth()
  const { search, pathname } = useLocation()
  useEffect(() => { if (new URLSearchParams(search).get('present') === '1') presentation.set(true) }, [search])
  const staff = !!user?.roles.some((r) => r !== 'Member')
  if (!on || !staff) return null
  return (
    <nav aria-label="حالت پرزنت" className="kg-chrome fixed inset-x-0 bottom-4 z-[65] flex justify-center px-3">
      <div className="flex items-center gap-1 overflow-x-auto rounded-full bg-night/95 p-1.5 text-white shadow-[0_18px_40px_rgb(0_0_0/0.35)] backdrop-blur">
        <span className="hidden items-center gap-1.5 px-3 text-[12px] font-bold text-white/60 sm:flex"><Presentation className="size-4" aria-hidden />نمای</span>
        {VIEWS.map((v) => (
          <NavLink key={v.to} to={v.to} className={() => cn('flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors',
            pathname.startsWith(v.to) ? 'bg-plate text-white' : 'text-white/80 hover:bg-white/10')}>
            <v.icon className="size-4" aria-hidden />{v.label}
          </NavLink>
        ))}
        <button type="button" onClick={() => presentation.set(false)} aria-label="بستن حالت پرزنت" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
      </div>
    </nav>
  )
}
