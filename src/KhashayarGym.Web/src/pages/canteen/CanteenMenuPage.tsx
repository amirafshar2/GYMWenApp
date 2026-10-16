import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronUp, CreditCard, Flame, Minus, Plus, Wallet as WalletIcon, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { CANTEEN_CATEGORIES, canteenApi, continuePurchase, newKey, walletApi, type CanteenMenu, type PayMethod } from '@/lib/commerce'
import { brand } from '@/lib/brand'
import { faNum, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import OtpLogin from '@/member/OtpLogin'
import { Btn, inputCls, Notice, Spinner } from '@/member/ui'

/** منوی بوفه — صفحهٔ موبایلی که با اسکن QR روی میز باز می‌شود */
export default function CanteenMenuPage() {
  const { branch = '' } = useParams()
  const [params] = useSearchParams()
  const table = params.get('table')
  const nav = useNavigate()
  const { ready, user } = useAuth()
  const [menu, setMenu] = useState<CanteenMenu | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [qty, setQty] = useState<Record<number, number>>({})
  const [cat, setCat] = useState<string>('all')
  const [sheet, setSheet] = useState(false)
  const [note, setNote] = useState('')
  const [pay, setPay] = useState<PayMethod>('wallet')
  const [balance, setBalance] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [payErr, setPayErr] = useState<string | null>(null)
  const key = useRef(newKey())

  useEffect(() => {
    canteenApi.menu(branch, table).then((m) => { setMenu(m); document.title = `بوفه ${m.branchName} | ${brand.shortName}` }).catch((e: Error) => setErr(e.message))
  }, [branch, table])
  useEffect(() => { if (user) walletApi.get().then((w) => { setBalance(w.balanceToman); if (w.balanceToman === 0) setPay('gateway') }).catch(() => null) }, [user])
  useEffect(() => { key.current = newKey() }, [qty, pay, note])

  const items = useMemo(() => (menu?.items ?? []).filter((i) => cat === 'all' || i.category === cat), [menu, cat])
  const chosen = (menu?.items ?? []).filter((i) => qty[i.id])
  const total = chosen.reduce((s, i) => s + i.priceToman * qty[i.id], 0)
  const count = chosen.reduce((s, i) => s + qty[i.id], 0)
  const change = (id: number, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(10, (q[id] ?? 0) + d)) }))

  const order = async () => {
    if (!menu) return
    setBusy(true); setPayErr(null)
    try {
      continuePurchase(await canteenApi.place({ branchSlug: menu.branchSlug, tableCode: menu.tableCode, items: chosen.map((i) => ({ itemId: i.id, quantity: qty[i.id] })), note: note.trim() || null, payMethod: pay, idempotencyKey: key.current }), nav)
    } catch (e) { setPayErr((e as Error).message); setBusy(false) }
  }

  if (err) return <div className="mx-auto max-w-md p-8"><Notice tone="err">{err}</Notice></div>
  if (!menu) return <Spinner />

  return (
    <div className="min-h-[calc(100svh-78px)] bg-steel pb-32">
      <header className="bg-night px-5 pb-6 pt-8 text-white">
        <div className="mx-auto max-w-[720px]">
          <p className="text-[13px] font-bold text-plate-lt">بوفهٔ {brand.shortName}</p>
          <h1 className="mt-1 text-[28px] font-black">{menu.branchName}</h1>
          {menu.tableCode && <p className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-[13px]">محل تحویل: {menu.tableCode}</p>}
        </div>
      </header>
      <nav aria-label="دسته‌ها" className="sticky top-[calc(78px+var(--festival-h,0px))] z-30 border-b border-steel-2 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[720px] gap-2 overflow-x-auto px-5 py-3">
          {[{ key: 'all', label: 'همه' }, ...CANTEEN_CATEGORIES].map((c) => (
            <button key={c.key} type="button" aria-pressed={cat === c.key} onClick={() => setCat(c.key)}
              className={cn('h-9 shrink-0 cursor-pointer rounded-full px-4 text-[14px] font-bold', cat === c.key ? 'bg-chalk text-white' : 'bg-steel text-chalk')}>{c.label}</button>
          ))}
        </div>
      </nav>
      <ul className="mx-auto grid max-w-[720px] gap-3 px-5 pt-5">
        {items.map((i) => (
          <li key={i.id} className={cn('flex gap-4 rounded-[10px] bg-white p-3', !i.isAvailable && 'opacity-50')}>
            <img src={i.imagePath} alt="" className="size-24 shrink-0 rounded-[8px] object-cover" />
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="text-[16px] font-bold text-chalk">{i.name}</h2>
              {i.description && <p className="text-[13px] leading-6 text-rubber">{i.description}</p>}
              <p className="mt-1 flex flex-wrap gap-2 text-[12px] text-rubber">
                {i.kcal && <span className="inline-flex items-center gap-1"><Flame className="size-3.5" aria-hidden />{faNum(i.kcal)} کالری</span>}
                {i.proteinG && <span className="rounded-full bg-plate/10 px-2 font-bold text-plate">{faNum(i.proteinG)}g پروتئین</span>}
              </p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="font-black text-chalk">{toman(i.priceToman)}</span>
                {!i.isAvailable ? <span className="text-[13px] text-rubber">تمام شد</span> : qty[i.id] ? (
                  <span className="flex items-center gap-1">
                    <button type="button" aria-label={`یکی کمتر ${i.name}`} onClick={() => change(i.id, -1)} className="grid size-9 cursor-pointer place-items-center rounded-full bg-steel"><Minus className="size-4" /></button>
                    <span className="w-6 text-center font-bold" aria-live="polite">{faNum(qty[i.id])}</span>
                    <button type="button" aria-label={`یکی بیشتر ${i.name}`} onClick={() => change(i.id, 1)} className="grid size-9 cursor-pointer place-items-center rounded-full bg-plate text-white"><Plus className="size-4" /></button>
                  </span>
                ) : (
                  <button type="button" onClick={() => change(i.id, 1)} className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-full bg-plate px-4 text-[14px] font-bold text-white"><Plus className="size-4" aria-hidden />افزودن</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {count > 0 && !sheet && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4">
          <button type="button" onClick={() => setSheet(true)} className="mx-auto flex h-14 w-full max-w-[720px] cursor-pointer items-center justify-between rounded-[10px] bg-plate px-5 font-bold text-white shadow-[0_12px_30px_rgb(11_95_176/0.4)]">
            <span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-white text-[13px] text-plate">{faNum(count)}</span>مشاهده و پرداخت</span>
            <span className="flex items-center gap-1">{toman(total)}<ChevronUp className="size-4" aria-hidden /></span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {sheet && (
          <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="بستن" onClick={() => setSheet(false)} className="absolute inset-0 cursor-default bg-black/50" />
            <motion.div role="dialog" aria-modal="true" aria-label="سفارش شما" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.3 }}
              className="absolute inset-x-0 bottom-0 mx-auto max-h-[88svh] max-w-[720px] overflow-y-auto rounded-t-[18px] bg-white p-5 pb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[20px] font-black text-chalk">سفارش شما</h2>
                <button type="button" onClick={() => setSheet(false)} aria-label="بستن" autoFocus className="grid size-10 cursor-pointer place-items-center rounded-full bg-steel"><X className="size-5" /></button>
              </div>
              <ul className="divide-y divide-steel-2">
                {chosen.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="font-bold">{i.name}</span>
                    <span className="flex items-center gap-1">
                      <button type="button" aria-label="کمتر" onClick={() => change(i.id, -1)} className="grid size-8 cursor-pointer place-items-center rounded-full bg-steel"><Minus className="size-4" /></button>
                      <span className="w-6 text-center">{faNum(qty[i.id])}</span>
                      <button type="button" aria-label="بیشتر" onClick={() => change(i.id, 1)} className="grid size-8 cursor-pointer place-items-center rounded-full bg-steel"><Plus className="size-4" /></button>
                    </span>
                    <span className="w-28 text-left font-bold">{toman(i.priceToman * qty[i.id])}</span>
                  </li>
                ))}
              </ul>
              <label className="mt-4 grid gap-2"><span className="text-[14px] font-bold">توضیح برای بوفه (اختیاری)</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="مثلاً: بدون شکر" className={inputCls} /></label>
              <div className="mt-4 flex items-baseline justify-between border-t border-steel-2 pt-3"><span className="font-bold">جمع</span><span className="text-[22px] font-black">{toman(total)}</span></div>

              {!ready ? <Spinner /> : !user ? (
                <div className="mt-4 rounded-[8px] bg-steel p-4"><p className="mb-3 text-[14px] font-bold">برای پرداخت با موبایل وارد شوید</p><OtpLogin compact onDone={() => null} /></div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {([['wallet', 'کیف پول', WalletIcon], ['gateway', 'درگاه بانکی', CreditCard]] as const).map(([k, t, Icon]) => (
                      <button key={k} type="button" aria-pressed={pay === k} onClick={() => setPay(k)}
                        className={cn('flex cursor-pointer flex-col items-start gap-1 rounded-[8px] border-2 p-3 text-right', pay === k ? 'border-plate bg-plate/5' : 'border-steel-2')}>
                        <Icon className="size-5 text-plate" aria-hidden /><span className="font-bold">{t}</span>
                        {k === 'wallet' && <span className="text-[12px] text-rubber">{balance === null ? '…' : `موجودی ${toman(balance)}`}</span>}
                      </button>
                    ))}
                  </div>
                  {pay === 'wallet' && balance !== null && balance < total && <Notice tone="warn" className="mt-3">موجودی کافی نیست؛ درگاه بانکی را انتخاب کنید یا <a href="/wallet" className="font-bold underline">کیف پول را شارژ کنید</a>.</Notice>}
                  {payErr && <Notice tone="err" className="mt-3">{payErr}</Notice>}
                  <Btn onClick={order} busy={busy} disabled={pay === 'wallet' && balance !== null && balance < total} className="mt-4 w-full">ثبت سفارش و پرداخت {toman(total)}</Btn>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
