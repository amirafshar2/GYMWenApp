import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { BellRing, Check, ChefHat, Clock, XCircle } from 'lucide-react'
import { CANTEEN_STATUS, canteenApi, type CanteenOrder } from '@/lib/commerce'
import { beep, useCanteenHub } from '@/lib/hub'
import { faNum, jalali, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { useRequireAuth } from '@/member/MemberCard'
import { Notice, Spinner } from '@/member/ui'

const STEPS = [
  { key: 'queued', label: 'در صف', icon: Clock },
  { key: 'preparing', label: 'آماده‌سازی', icon: ChefHat },
  { key: 'ready', label: 'آماده است', icon: BellRing },
] as const

/** پیگیری لحظه‌ای سفارش بوفه: با «آماده است»، گوشی بوق و لرزش می‌زند */
export default function CanteenOrderPage() {
  const { ready, user } = useRequireAuth()
  const id = Number(useParams().id)
  const reduced = useReducedMotion()
  const [o, setO] = useState<CanteenOrder | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const last = useRef<string | null>(null)

  const apply = useCallback((n: CanteenOrder) => {
    if (n.id !== id) return
    if (last.current && last.current !== 'ready' && n.status === 'ready') {
      beep(3)
      try { navigator.vibrate?.([200, 100, 200]) } catch { /* */ }
    }
    last.current = n.status
    setO(n)
  }, [id])

  const load = useCallback(() => canteenApi.order(id).then(apply).catch((e: Error) => setErr(e.message)), [id, apply])
  useEffect(() => { if (ready && user) void load() }, [ready, user, load])
  // پشتیبان: اگر اتصال لحظه‌ای قطع بود
  useEffect(() => { const t = setInterval(() => { if (o && !['collected', 'cancelled'].includes(o.status)) void load() }, 20000); return () => clearInterval(t) }, [o, load])
  const status = useCanteenHub(ready && user ? (c) => c.invoke('WatchOrder', id) : null, apply)
  useEffect(() => { document.title = o?.status === 'ready' ? '🔔 سفارشت آماده است' : 'سفارش بوفه' }, [o?.status])

  if (err) return <div className="mx-auto max-w-md p-8"><Notice tone="err">{err}</Notice></div>
  if (!o) return <Spinner />

  const idx = STEPS.findIndex((s) => s.key === o.status)
  const isReady = o.status === 'ready'
  return (
    <div className={cn('min-h-[calc(100svh-78px)] px-5 py-10 transition-colors duration-500', isReady ? 'bg-[#0f7a45]' : 'bg-steel')}>
      <div className="mx-auto max-w-md">
        <motion.div layout className={cn('rounded-[18px] p-7 text-center shadow-[0_20px_60px_rgb(0_0_0/0.12)]', isReady ? 'bg-white' : 'bg-white')}>
          <p className="text-[14px] text-rubber">شمارهٔ سفارش</p>
          <motion.p key={o.status} initial={reduced ? false : { scale: 0.8 }} animate={{ scale: 1 }} className="text-[84px] font-black leading-none text-chalk tabular-nums">{faNum(o.dailyNumber)}</motion.p>
          <p className="mt-2 text-[14px] text-rubber">{o.branchName}{o.tableCode ? ` – ${o.tableCode}` : ''}</p>
          <p role="status" aria-live="assertive" className={cn('mt-6 text-[26px] font-black', isReady ? 'text-[#0f7a45]' : o.status === 'cancelled' ? 'text-danger' : 'text-plate')}>
            {isReady ? 'سفارشت آماده است! از بوفه تحویل بگیر' : CANTEEN_STATUS[o.status]}
          </p>
          {o.status === 'cancelled' && <p className="mt-2 text-[14px] text-rubber">مبلغ به کیف پول شما برگشت.</p>}

          {o.status !== 'cancelled' && o.status !== 'pending' && (
            <ol className="mt-8 flex items-start justify-between" aria-label="مراحل">
              {STEPS.map((s, i) => {
                const done = o.status === 'collected' || i <= idx
                const Icon = done && i < idx ? Check : s.icon
                return (
                  <li key={s.key} className="flex flex-1 flex-col items-center gap-2">
                    <span className={cn('grid size-12 place-items-center rounded-full transition-colors', done ? 'bg-plate text-white' : 'bg-steel text-rubber', i === idx && !reduced && 'animate-pulse')}><Icon className="size-6" aria-hidden /></span>
                    <span className={cn('text-[13px] font-bold', done ? 'text-chalk' : 'text-rubber')}>{s.label}</span>
                  </li>
                )
              })}
            </ol>
          )}
          {o.status === 'pending' && <p className="mt-6 flex items-center justify-center gap-2 text-rubber"><XCircle className="size-5" />پرداخت انجام نشده است.</p>}
        </motion.div>

        <div className="mt-5 rounded-[14px] bg-white p-5">
          <ul className="grid gap-1 text-[14px]">{o.items.map((i, n) => <li key={n} className="flex justify-between"><span>{i.name} × {faNum(i.quantity)}</span><span>{toman(i.unitPriceToman * i.quantity)}</span></li>)}</ul>
          <p className="mt-3 flex justify-between border-t border-steel-2 pt-3 font-black"><span>جمع</span><span>{toman(o.totalToman)}</span></p>
          {o.note && <p className="mt-2 text-[13px] text-rubber">توضیح: {o.note}</p>}
          <p className="mt-2 text-[12px] text-rubber">{jalali(o.createdAtUtc, { hour: '2-digit', minute: '2-digit' })} – {o.payMethod === 'wallet' ? 'کیف پول' : 'درگاه'}</p>
        </div>
        <p className={cn('mt-4 text-center text-[12px]', isReady ? 'text-white/80' : 'text-rubber')}>
          {status === 'live' ? '● اتصال لحظه‌ای برقرار است' : status === 'reconnecting' ? 'در حال اتصال دوباره…' : 'به‌روزرسانی هر ۲۰ ثانیه'}
        </p>
      </div>
    </div>
  )
}
