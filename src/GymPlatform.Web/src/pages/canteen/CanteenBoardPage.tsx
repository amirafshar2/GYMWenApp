import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BellRing, ChefHat, Clock, HandPlatter, QrCode, Volume2, VolumeX, X } from 'lucide-react'
import { panelApi, type BranchRef } from '@/lib/panel'
import { canteenApi, type CanteenOrder } from '@/lib/commerce'
import { beep, useCanteenHub } from '@/lib/hub'
import { faNum, jalali } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { useRequireAuth } from '@/member/MemberCard'
import { inputCls, Notice, Spinner } from '@/member/ui'

const STAFF = ['CanteenStaff', 'BranchManager', 'SuperAdmin']
const COLS = [
  { key: 'queued', title: 'سفارش‌های تازه', icon: Clock, next: 'preparing', action: 'شروع آماده‌سازی', tone: 'bg-sun/20 text-[#7a5600]' },
  { key: 'preparing', title: 'در حال آماده‌سازی', icon: ChefHat, next: 'ready', action: 'آماده شد', tone: 'bg-plate/10 text-plate' },
  { key: 'ready', title: 'آماده — منتظر مشتری', icon: BellRing, next: 'collected', action: 'تحویل داده شد', tone: 'bg-[#ecf8f1] text-[#14532d]' },
] as const

/** تابلوی لحظه‌ای بوفه برای تبلت/مانیتور پشت پیشخوان */
export default function CanteenBoardPage() {
  const { ready, user } = useRequireAuth()
  const [params, setParams] = useSearchParams()
  // فقط شعبه‌هایی که کارمند به آن‌ها دسترسی دارد
  const [branches, setBranches] = useState<BranchRef[]>([])
  const branch = params.get('branch') ?? ''
  const [orders, setOrders] = useState<CanteenOrder[] | null>(null)
  const [sound, setSound] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const soundRef = useRef(sound)
  useEffect(() => { soundRef.current = sound }, [sound])
  const isStaff = !!user?.roles.some((r) => STAFF.includes(r))
  useEffect(() => {
    if (!isStaff) return
    panelApi.me().then((m) => {
      setBranches(m.branches)
      if (!params.get('branch') && m.branches.length === 1) setParams({ branch: m.branches[0].slug }, { replace: true })
    }).catch((e: Error) => setErr(e.message))
  }, [isStaff]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.title = 'تابلوی بوفه' }, [])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  const load = useCallback(() => { if (branch) canteenApi.board(branch).then(setOrders).catch((e: Error) => setErr(e.message)) }, [branch])
  useEffect(() => { if (isStaff) load() }, [isStaff, load])
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

  const onOrder = useCallback((o: CanteenOrder) => {
    setOrders((list) => {
      const l = list ?? []
      const exists = l.some((x) => x.id === o.id)
      if (!exists && o.status === 'queued' && soundRef.current) beep(2)
      const next = exists ? l.map((x) => (x.id === o.id ? o : x)) : [...l, o]
      return next.filter((x) => x.status !== 'cancelled')
    })
  }, [])
  const status = useCanteenHub(isStaff && branch ? (c) => c.invoke('WatchBranch', branch) : null, onOrder)

  const move = async (o: CanteenOrder, s: 'preparing' | 'ready' | 'collected' | 'cancelled') => {
    try { onOrder(await canteenApi.setStatus(o.id, s)) } catch (e) { setErr((e as Error).message); load() }
  }

  if (!ready) return <Spinner />
  if (!isStaff) return <div className="mx-auto max-w-lg p-10"><Notice tone="err">این صفحه فقط برای کارکنان بوفه است.</Notice></div>

  return (
    <div className="min-h-[calc(100svh-78px)] bg-night px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-black">تابلوی بوفه</h1>
          <select value={branch} onChange={(e) => setParams({ branch: e.target.value })} aria-label="شعبه" className={`${inputCls} h-11 w-auto min-w-[220px] cursor-pointer text-chalk`}>
            <option value="">— شعبه —</option>
            {branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
          <span className={cn('rounded-full px-3 py-1 text-[12px] font-bold', status === 'live' ? 'bg-[#14783f]' : 'bg-white/15')}>{status === 'live' ? '● لحظه‌ای' : 'در حال اتصال…'}</span>
          <div className="ms-auto flex gap-2">
            <button type="button" onClick={() => { setSound(!sound); if (!sound) beep() }} aria-pressed={sound} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[3px] bg-white/10 px-4 text-[14px] font-bold hover:bg-white/20">
              {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}{sound ? 'صدا روشن' : 'بی‌صدا'}
            </button>
            {branch && <Link to={`/panel/canteen/qr?branch=${branch}`} className="inline-flex h-11 items-center gap-2 rounded-[3px] bg-white/10 px-4 text-[14px] font-bold hover:bg-white/20"><QrCode className="size-5" />QR میزها</Link>}
          </div>
        </div>
        {err && <Notice tone="err" className="mb-4">{err}</Notice>}
        {!branch ? <p className="rounded-[10px] bg-white/5 p-10 text-center text-white/60">شعبه را انتخاب کنید.</p> : !orders ? <Spinner /> : (
          <div className="grid gap-4 lg:grid-cols-3">
            {COLS.map((col) => {
              const list = orders.filter((o) => o.status === col.key)
              return (
                <section key={col.key} aria-label={col.title} className="rounded-[12px] bg-white/[.04] p-3">
                  <h2 className="mb-3 flex items-center gap-2 px-1 text-[17px] font-black"><col.icon className="size-5" aria-hidden />{col.title}<span className="ms-auto rounded-full bg-white/10 px-2.5 text-[14px]">{faNum(list.length)}</span></h2>
                  <ul className="grid gap-3">
                    <AnimatePresence initial={false}>
                      {list.map((o) => {
                        const mins = Math.floor((now - Date.parse(o.paidAtUtc ?? o.createdAtUtc)) / 60000)
                        return (
                          <motion.li key={o.id} layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="rounded-[10px] bg-white p-4 text-chalk">
                            <div className="flex items-start justify-between gap-3">
                              <div><p className="text-[40px] font-black leading-none tabular-nums">{faNum(o.dailyNumber)}</p>
                                <p className="mt-1 text-[13px] text-rubber">{o.customerName ?? 'مشتری'}{o.tableCode ? ` – ${o.tableCode}` : ''}</p></div>
                              <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold', mins >= 10 && col.key !== 'ready' ? 'bg-danger text-white' : col.tone)}>{faNum(mins)} دقیقه</span>
                            </div>
                            <ul className="mt-3 grid gap-1 border-t border-steel-2 pt-3 text-[15px] font-bold">{o.items.map((i, n) => <li key={n}>{faNum(i.quantity)} × {i.name}</li>)}</ul>
                            {o.note && <p className="mt-2 rounded-[3px] bg-sun/20 px-2 py-1 text-[13px]">📝 {o.note}</p>}
                            <div className="mt-4 flex gap-2">
                              <button type="button" onClick={() => move(o, col.next)} className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[3px] bg-plate text-[15px] font-bold text-white hover:bg-plate-hi">
                                <HandPlatter className="size-5" aria-hidden />{col.action}</button>
                              {col.key !== 'ready' && <button type="button" aria-label={`لغو سفارش ${o.dailyNumber}`} title="لغو و برگشت پول به کیف پول"
                                onClick={() => { if (window.confirm(`سفارش ${o.dailyNumber} لغو و مبلغ به کیف پول مشتری برگردد؟`)) void move(o, 'cancelled') }}
                                className="grid size-12 cursor-pointer place-items-center rounded-[3px] border border-steel-2 text-rubber hover:border-danger hover:text-danger"><X className="size-5" /></button>}
                            </div>
                            <p className="mt-2 text-[11px] text-rubber">{jalali(o.createdAtUtc, { hour: '2-digit', minute: '2-digit' })}</p>
                          </motion.li>
                        )
                      })}
                    </AnimatePresence>
                    {list.length === 0 && <li className="rounded-[10px] border border-dashed border-white/15 p-6 text-center text-[14px] text-white/40">خالی</li>}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
