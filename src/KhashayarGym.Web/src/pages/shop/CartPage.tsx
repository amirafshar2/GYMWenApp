import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, Minus, Plus, Store, TicketPercent, Trash2, Truck, Wallet as WalletIcon } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cart, useCart } from '@/lib/cart'
import { continuePurchase, newKey, shopApi, walletApi, type PayMethod, type ShopQuote } from '@/lib/commerce'
import { useData } from '@/lib/useData'
import { brand, rebrand } from '@/lib/brand'
import { faNum, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, inputCls, Notice, PageShell, Panel } from '@/member/ui'

export default function CartPage() {
  const uid = useId()
  const nav = useNavigate()
  const { user } = useAuth()
  const { items, branch } = useCart()
  const { data: branches = [] } = useData('branches', api.branches)
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [code, setCode] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [pay, setPay] = useState<PayMethod>('gateway')
  const [addr, setAddr] = useState({ recipientName: '', recipientPhone: '', address: '', postalCode: '' })
  const [quote, setQuote] = useState<ShopQuote | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<ApiError | null>(null)
  const key = useRef(newKey())

  useEffect(() => { document.title = `سبد خرید | شاپ ${brand.shortName}` }, [])
  useEffect(() => { if (user) walletApi.get().then((w) => { setBalance(w.balanceToman); if (w.balanceToman > 0) setPay('wallet') }).catch(() => setBalance(null)) }, [user])
  useEffect(() => { if (user?.fullName && !addr.recipientName) setAddr((a) => ({ ...a, recipientName: user.fullName ?? '', recipientPhone: user.phoneNumber })) }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const lines = useMemo(() => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), [items])
  useEffect(() => {
    if (!branch || lines.length === 0) { setQuote(null); return }
    let alive = true
    const t = setTimeout(() => shopApi.quote({ items: lines, branchSlug: branch, fulfillment, discountCode: appliedCode })
      .then((q) => alive && setQuote(q)).catch(() => alive && setQuote(null)), 200)
    return () => { alive = false; clearTimeout(t) }
  }, [lines, branch, fulfillment, appliedCode, user])

  // هر تغییر در سفارش = درخواست تازه (کلید یکتا جدید)
  useEffect(() => { key.current = newKey() }, [lines, branch, fulfillment, appliedCode, pay])

  const checkout = async () => {
    if (!user) return nav(`/login?next=${encodeURIComponent('/cart')}`)
    if (!branch || !quote) return
    setBusy(true); setErr(null)
    try {
      const r = await shopApi.checkout({ items: lines, branchSlug: branch, fulfillment, discountCode: appliedCode, payMethod: pay, ...(fulfillment === 'delivery' ? addr : {}), idempotencyKey: key.current })
      if (r.completed) cart.clear()
      else try { sessionStorage.setItem('kg-cart-pending', String(r.orderId)) } catch { /* */ }
      continuePurchase(r, nav)
    } catch (e) { setErr(e as ApiError); setBusy(false) }
  }

  if (items.length === 0) return (
    <PageShell title="سبد خرید">
      <Panel className="text-center"><p className="text-[16px] text-rubber">سبد خرید خالی است.</p><Link to="/shop" className="mt-5 inline-flex h-[52px] items-center rounded-[3px] bg-plate px-6 font-bold text-white hover:bg-plate-hi">رفتن به فروشگاه</Link></Panel>
    </PageShell>
  )

  const line = (variantId: number) => quote?.lines.find((l) => l.variantId === variantId)
  const walletShort = pay === 'wallet' && balance !== null && quote && balance < quote.totalToman

  return (
    <PageShell eyebrow={`شاپ ${brand.shortName}`} title="سبد خرید">
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="grid gap-6">
          <Panel aria-labelledby={`${uid}-items`}>
            <h2 id={`${uid}-items`} className="sr-only">کالاها</h2>
            <ul className="divide-y divide-steel-2">
              {items.map((i) => {
                const q = line(i.variantId)
                return (
                  <li key={i.variantId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <Link to={`/shop/${i.slug}`} className="shrink-0"><img src={i.imagePath} alt="" className="size-20 rounded-[6px] bg-[#EEF3F9] object-contain sm:size-24" /></Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/shop/${i.slug}`} className="text-[15px] font-bold text-chalk hover:text-plate">{rebrand(i.name)}</Link>
                      {i.label && <p className="text-[13px] text-rubber">{i.label}</p>}
                      <p className="mt-1 text-[14px] font-bold text-chalk">{toman(q?.unitPriceToman ?? i.priceToman)}</p>
                      {q?.problem && <p role="alert" className="mt-1 text-[13px] text-danger">{q.problem}</p>}
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2">
                      <button type="button" aria-label={`حذف ${i.name}`} onClick={() => cart.setQty(i.variantId, 0)} className="cursor-pointer text-rubber hover:text-danger"><Trash2 className="size-5" /></button>
                      <div className="flex h-10 items-center rounded-[3px] border border-steel-2">
                        <button type="button" aria-label="کم کردن" onClick={() => cart.setQty(i.variantId, i.quantity - 1)} className="grid size-9 cursor-pointer place-items-center"><Minus className="size-4" /></button>
                        <span className="w-7 text-center font-bold">{faNum(i.quantity)}</span>
                        <button type="button" aria-label="زیاد کردن" onClick={() => cart.setQty(i.variantId, i.quantity + 1)} className="grid size-9 cursor-pointer place-items-center"><Plus className="size-4" /></button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel>
            <h2 className="mb-4 text-[18px] font-black text-chalk">تحویل</h2>
            <div className="grid grid-cols-2 gap-3">
              {([['pickup', 'تحویل در باشگاه', Store, 'رایگان، همان روز'], ['delivery', 'ارسال به نشانی', Truck, `${toman(150000)} — بالای ${quote ? toman(quote.freeShippingFromToman) : '…'} رایگان`]] as const).map(([k, t, Icon, sub]) => (
                <button key={k} type="button" aria-pressed={fulfillment === k} onClick={() => setFulfillment(k)}
                  className={cn('flex cursor-pointer flex-col items-start gap-1 rounded-[6px] border-2 p-4 text-right transition-colors', fulfillment === k ? 'border-plate bg-plate/5' : 'border-steel-2 hover:border-chalk/30')}>
                  <Icon className="size-6 text-plate" aria-hidden /><span className="text-[15px] font-bold text-chalk">{t}</span><span className="text-[12px] text-rubber">{sub}</span>
                </button>
              ))}
            </div>
            <label className="mt-5 grid gap-2">
              <span className="text-[14px] font-bold text-chalk">{fulfillment === 'pickup' ? 'شعبهٔ تحویل' : 'ارسال از انبار شعبهٔ'}</span>
              <select value={branch ?? ''} onChange={(e) => cart.setBranch(e.target.value || null)} className={`${inputCls} cursor-pointer`} aria-invalid={!branch || undefined}>
                <option value="">— شعبه را انتخاب کنید —</option>
                {branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </select>
            </label>
            {fulfillment === 'delivery' && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="نام گیرنده" err={err?.field('recipientName')}><input value={addr.recipientName} onChange={(e) => setAddr({ ...addr, recipientName: e.target.value })} autoComplete="name" className={inputCls} /></Field>
                <Field label="موبایل گیرنده" err={err?.field('recipientPhone')}><input value={addr.recipientPhone} onChange={(e) => setAddr({ ...addr, recipientPhone: e.target.value })} inputMode="numeric" dir="ltr" autoComplete="tel" className={`${inputCls} text-right`} /></Field>
                <Field label="نشانی کامل" err={err?.field('address')} wide><textarea value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} rows={2} autoComplete="street-address" className={`${inputCls} h-auto py-3`} /></Field>
                <Field label="کد پستی ۱۰ رقمی" err={err?.field('postalCode')}><input value={addr.postalCode} onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })} inputMode="numeric" dir="ltr" autoComplete="postal-code" className={`${inputCls} text-right`} /></Field>
              </div>
            )}
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-[100px]">
          <Panel>
            <h2 className="mb-4 text-[18px] font-black text-chalk">پرداخت</h2>
            <form onSubmit={(e) => { e.preventDefault(); setAppliedCode(code.trim().toUpperCase() || null) }} className="mb-2 flex gap-2">
              <label className="sr-only" htmlFor={`${uid}-c`}>کد تخفیف</label>
              <div className="relative flex-1"><TicketPercent className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-rubber" aria-hidden />
                <input id={`${uid}-c`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد تخفیف (MEMBER15)" dir="ltr" className={`${inputCls} ps-9 text-left uppercase`} /></div>
              <Btn type="submit" variant="dark">اعمال</Btn>
            </form>
            <p role="status" className={cn('min-h-6 text-[13px]', quote?.discountCodeError ? 'text-danger' : 'text-[#1f7a46]')}>
              {quote?.discountCodeError ?? (quote?.discountCode ? `کد ${quote.discountCode} اعمال شد (${faNum(quote.discountPercent ?? 0)}٪)` : '')}
            </p>
            <dl className="mt-2 grid gap-2 border-y border-steel-2 py-3 text-[14px]">
              <Row k="جمع کالاها" v={quote ? toman(quote.subtotalToman) : '—'} />
              {!!quote?.discountToman && <Row k="تخفیف" v={`− ${toman(quote.discountToman)}`} cls="text-plate" />}
              {fulfillment === 'delivery' && <Row k="ارسال" v={quote ? (quote.shippingToman ? toman(quote.shippingToman) : 'رایگان') : '—'} />}
            </dl>
            <div className="flex items-baseline justify-between py-3"><span className="font-bold">مبلغ نهایی</span><span className="text-[22px] font-black">{quote ? toman(quote.totalToman) : '—'}</span></div>

            <fieldset className="grid gap-2">
              <legend className="mb-2 text-[14px] font-bold text-chalk">روش پرداخت</legend>
              {([['wallet', 'کیف پول', WalletIcon], ['gateway', 'درگاه بانکی', CreditCard]] as const).map(([k, t, Icon]) => (
                <label key={k} className={cn('flex cursor-pointer items-center gap-3 rounded-[6px] border-2 p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-plate/40', pay === k ? 'border-plate bg-plate/5' : 'border-steel-2')}>
                  <input type="radio" name="pay" className="sr-only" checked={pay === k} onChange={() => setPay(k)} />
                  <Icon className="size-5 text-plate" aria-hidden /><span className="flex-1 font-bold">{t}</span>
                  {k === 'wallet' && <span className="text-[13px] text-rubber">{user ? (balance === null ? '…' : `موجودی ${toman(balance)}`) : 'بعد از ورود'}</span>}
                </label>
              ))}
            </fieldset>
            {walletShort && <Notice tone="warn" className="mt-3">موجودی کیف پول کافی نیست. <Link to="/wallet" className="font-bold underline">شارژ کیف پول</Link> یا درگاه بانکی.</Notice>}
            {err && !err.field('recipientName') && !err.field('address') && !err.field('postalCode') && !err.field('recipientPhone') && <Notice tone="err" className="mt-3">{Object.values(err.errors)[0]?.[0] ?? err.message}</Notice>}
            <Btn onClick={checkout} busy={busy} disabled={!quote?.canCheckout || !!walletShort} className="mt-4 w-full">
              {user ? (quote ? `ثبت و پرداخت ${toman(quote.totalToman)}` : 'شعبه را انتخاب کنید') : 'ورود و پرداخت'}
            </Btn>
          </Panel>
        </aside>
      </div>
    </PageShell>
  )
}

const Row = ({ k, v, cls }: { k: string; v: string; cls?: string }) => <div className="flex justify-between"><dt className="text-rubber">{k}</dt><dd className={cn('font-bold', cls)}>{v}</dd></div>
function Field({ label, err, wide, children }: { label: string; err?: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={cn('grid gap-2', wide && 'sm:col-span-2')}><span className="text-[14px] font-bold text-chalk">{label}</span>{children}{err && <span role="alert" className="text-[13px] text-danger">{err}</span>}</label>
}
