import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useData } from '../lib/useData'
import { faNum } from '../lib/fa'
import { rebrand } from '../lib/brand'
import { scrollToId } from '../lib/motion'

function remaining(end: number) {
  const ms = Math.max(0, end - Date.now())
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor(ms / 3_600_000) % 24,
    m: Math.floor(ms / 60_000) % 60,
    s: Math.floor(ms / 1000) % 60,
    over: ms === 0,
  }
}

/** نوار «جشنواره» با شمارش معکوس زنده */
export default function FestivalBar() {
  const { data: c } = useData('campaign', api.campaign)
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem('festival-hidden') === '1' } catch { return false }
  })
  const [, tick] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const show = !!c && !hidden && !remaining(Date.parse(c.endsAtUtc)).over

  useLayoutEffect(() => {
    const h = show && ref.current ? ref.current.offsetHeight : 0
    document.documentElement.style.setProperty('--festival-h', `${h}px`)
  }, [show])

  if (!show || !c) return null
  const r = remaining(Date.parse(c.endsAtUtc))
  const unit = (v: number, label: string) => (
    <span className="inline-flex items-baseline gap-1">
      <b className="inline-block min-w-[2ch] text-center tabular-nums">{faNum(v)}</b>
      <span className="text-xs text-white/90">{label}</span>
    </span>
  )

  return (
    <div ref={ref} role="region" aria-label="جشنوارهٔ تخفیف" className="fixed inset-x-0 top-0 z-[60] bg-plate text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm md:px-8">
        <button
          onClick={() => (pathname === '/' ? scrollToId('packages') : navigate('/#packages'))}
          className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-right"
        >
          <span className="font-bold">{rebrand(c.title)} — {faNum(c.discountPercent)}٪ تخفیف</span>
          <span className="flex items-center gap-3" aria-label="زمان باقی‌مانده" aria-live="off">
            {unit(r.d, 'روز')}{unit(r.h, 'ساعت')}{unit(r.m, 'دقیقه')}<span className="hidden sm:inline-flex">{unit(r.s, 'ثانیه')}</span>
          </span>
          <span className="hidden underline underline-offset-4 md:inline">دیدن پکیج‌های مشمول</span>
        </button>
        <button
          aria-label="بستن نوار جشنواره"
          className="grid size-8 place-items-center rounded-full hover:bg-white/15"
          onClick={() => { setHidden(true); try { sessionStorage.setItem('festival-hidden', '1') } catch { /* */ } }}
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  )
}
