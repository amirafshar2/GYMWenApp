import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Wallet as WalletIcon } from 'lucide-react'
import { memberApi, type PaymentResult } from '@/lib/api'
import { continuePurchase, newKey, walletApi, type Wallet } from '@/lib/commerce'
import { brand } from '@/lib/brand'
import { faNum, jalali, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { useRequireAuth } from '@/member/MemberCard'
import { Btn, inputCls, Notice, PageShell, Panel, Spinner, toLatinDigits } from '@/member/ui'

const D = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const

/** کیف پول: شارژ با درگاه، خرج در بوفه و فروشگاه */
export default function WalletPage() {
  const { ready, user } = useRequireAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [w, setW] = useState<Wallet | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [back, setBack] = useState<PaymentResult | null>(null)
  const key = useRef(newKey())

  useEffect(() => { document.title = `کیف پول | ${brand.name}` }, [])
  useEffect(() => {
    if (!ready || !user) return
    walletApi.get().then((x) => { setW(x); setAmount((a) => a ?? x.topUpPresets[1] ?? x.topUpPresets[0]) }).catch((e: Error) => setErr(e.message))
    const pid = Number(params.get('payment'))
    if (pid) memberApi.payment(pid).then(setBack).catch(() => null)
  }, [ready, user, params])

  const value = custom ? Number(toLatinDigits(custom).replace(/[^\d]/g, '')) : amount ?? 0
  const top = async (e: FormEvent) => {
    e.preventDefault()
    if (!w) return
    if (value < w.minTopUpToman || value > w.maxTopUpToman) return setErr(`مبلغ باید بین ${toman(w.minTopUpToman)} و ${toman(w.maxTopUpToman)} باشد.`)
    setBusy(true); setErr(null)
    try { continuePurchase(await walletApi.topUp(Math.round(value / 1000) * 1000, key.current), nav) }
    catch (x) { setErr((x as Error).message); setBusy(false); key.current = newKey() }
  }

  if (!w) return err ? <PageShell title="کیف پول"><Notice tone="err">{err}</Notice></PageShell> : <Spinner />

  return (
    <PageShell eyebrow="حساب کاربری" title="کیف پول">
      {params.get('payment') && back && (
        <Notice tone={back.status === 'succeeded' ? 'ok' : 'err'} className="mb-6">
          {back.status === 'succeeded' ? `${toman(back.amountToman)} به کیف پول اضافه شد.` : 'شارژ انجام نشد. اگر مبلغی کم شده، بانک تا ۷۲ ساعت برمی‌گرداند.'}
        </Notice>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr] [&>*]:min-w-0">
        <div className="grid gap-6">
          <section aria-label="موجودی" className="relative overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#0b2f57,#0b5fb0)] p-7 text-white shadow-[0_20px_50px_rgb(11_95_176/0.3)]">
            <WalletIcon className="absolute -bottom-6 -left-6 size-40 text-white/10" aria-hidden />
            <p className="text-[14px] text-white/70">موجودی</p>
            <p className="mt-1 text-[36px] font-black tabular-nums">{toman(w.balanceToman)}</p>
            <p className="mt-4 text-[13px] text-white/70">برای خرید از بوفه و فروشگاه همهٔ شعبه‌ها</p>
          </section>
          <Panel>
            <h2 className="mb-4 text-[18px] font-black text-chalk">شارژ کیف پول</h2>
            <form onSubmit={top} className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                {w.topUpPresets.map((p) => (
                  <button key={p} type="button" aria-pressed={!custom && amount === p} onClick={() => { setAmount(p); setCustom('') }}
                    className={cn('h-12 cursor-pointer rounded-[3px] border-2 text-[15px] font-bold transition-colors', !custom && amount === p ? 'border-plate bg-plate/5 text-plate' : 'border-steel-2 text-chalk hover:border-chalk/30')}>
                    {toman(p)}
                  </button>
                ))}
              </div>
              <label className="grid gap-2"><span className="text-[13px] text-rubber">یا مبلغ دلخواه (تومان)</span>
                <input value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="numeric" placeholder="مثلاً ۷۵۰۰۰۰" className={inputCls} /></label>
              {err && <p role="alert" className="text-[14px] text-danger">{err}</p>}
              <Btn type="submit" busy={busy} className="mt-2"><CreditCard className="size-5" aria-hidden />پرداخت {value ? toman(value) : ''}</Btn>
            </form>
          </Panel>
        </div>
        <Panel aria-labelledby="w-h">
          <h2 id="w-h" className="mb-4 text-[18px] font-black text-chalk">گردش حساب</h2>
          {w.transactions.length === 0 ? <p className="text-[14px] text-rubber">هنوز تراکنشی ندارید.</p> : (
            <ul className="divide-y divide-steel-2">
              {w.transactions.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span className={cn('grid size-10 place-items-center rounded-full', t.amountToman > 0 ? 'bg-[#ecf8f1] text-[#1f9d55]' : 'bg-steel text-chalk')}>
                    {t.amountToman > 0 ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1"><p className="truncate font-bold text-chalk">{t.description}</p><p className="text-[12px] text-rubber">{jalali(t.createdAtUtc, D)}</p></div>
                  <div className="text-left"><p className={cn('font-black tabular-nums', t.amountToman > 0 ? 'text-[#1f7a46]' : 'text-chalk')}>{t.amountToman > 0 ? '+' : '−'}{faNum(Math.abs(t.amountToman))}</p>
                    <p className="text-[12px] text-rubber">مانده {faNum(t.balanceAfterToman)}</p></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PageShell>
  )
}
