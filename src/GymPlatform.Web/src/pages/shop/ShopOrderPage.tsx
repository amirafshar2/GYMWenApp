import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Printer, Store, Truck, XCircle } from 'lucide-react'
import { cart } from '@/lib/cart'
import { brand, rebrand } from '@/lib/brand'
import { SHOP_STATUS, shopApi, type ShopOrder } from '@/lib/commerce'
import { faDigits, faNum, jalali, toman } from '@/lib/fa'
import { useRequireAuth } from '@/member/MemberCard'
import { Notice, PageShell, Panel, Spinner } from '@/member/ui'

const DT = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const

export default function ShopOrderPage() {
  const { ready, user } = useRequireAuth()
  const id = Number(useParams().id)
  const [o, setO] = useState<ShopOrder | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !user) return
    shopApi.order(id).then((r) => {
      setO(r)
      document.title = `سفارش ${r.number ?? ''}`
      // بعد از بازگشت موفق از بانک، سبد خالی شود
      try { if (r.status !== 'pending' && r.status !== 'cancelled' && sessionStorage.getItem('kg-cart-pending') === String(r.id)) { cart.clear(); sessionStorage.removeItem('kg-cart-pending') } } catch { /* */ }
    }).catch((e: Error) => setErr(e.message))
  }, [ready, user, id])

  if (err) return <PageShell title="سفارش فروشگاه"><Notice tone="err">{err}</Notice></PageShell>
  if (!o) return <Spinner />
  const st = SHOP_STATUS[o.status]
  const ok = o.status !== 'cancelled' && o.status !== 'pending'

  return (
    <PageShell eyebrow={`شاپ ${brand.shortName}`} title={ok ? 'سفارش ثبت شد' : o.status === 'pending' ? 'در انتظار پرداخت' : 'سفارش لغو شد'}
      aside={<button type="button" onClick={() => window.print()} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[3px] border border-steel-2 bg-white px-4 text-[14px] font-bold text-chalk hover:border-chalk print:hidden"><Printer className="size-4" aria-hidden />چاپ رسید</button>}>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px] [&>*]:min-w-0">
        <Panel>
          <div className="mb-5 flex items-center gap-3">
            {ok ? <CheckCircle2 className="size-10 text-[#1f9d55]" aria-hidden /> : <XCircle className="size-10 text-danger" aria-hidden />}
            <div>
              <p className="text-[18px] font-black text-chalk">{st.text}</p>
              <p className="text-[14px] text-rubber">شمارهٔ سفارش <b dir="ltr">{faDigits(o.number ?? String(o.id))}</b> – {jalali(o.createdAtUtc, DT)}</p>
            </div>
          </div>
          <ul className="divide-y divide-steel-2 border-y border-steel-2">
            {o.items.map((i, n) => (
              <li key={n} className="flex items-center gap-3 py-3">
                <img src={i.imagePath} alt="" className="size-14 rounded-[6px] bg-[#EEF3F9] object-contain" />
                <div className="min-w-0 flex-1"><p className="font-bold text-chalk">{rebrand(i.productName)}</p>{i.variantLabel && <p className="text-[13px] text-rubber">{i.variantLabel}</p>}</div>
                <p className="text-[14px] text-rubber">{faNum(i.quantity)} ×</p>
                <p className="w-32 text-left font-bold">{toman(i.unitPriceToman * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid gap-2 text-[14px]">
            <div className="flex justify-between"><dt className="text-rubber">جمع کالاها</dt><dd className="font-bold">{toman(o.subtotalToman)}</dd></div>
            {o.discountToman > 0 && <div className="flex justify-between"><dt className="text-rubber">تخفیف</dt><dd className="font-bold text-plate">− {toman(o.discountToman)}</dd></div>}
            {o.fulfillment === 'delivery' && <div className="flex justify-between"><dt className="text-rubber">ارسال</dt><dd className="font-bold">{o.shippingToman ? toman(o.shippingToman) : 'رایگان'}</dd></div>}
            <div className="flex justify-between border-t border-steel-2 pt-2 text-[16px]"><dt className="font-bold">مبلغ</dt><dd className="font-black">{toman(o.totalToman)}</dd></div>
            <div className="flex justify-between"><dt className="text-rubber">پرداخت</dt><dd>{o.payMethod === 'wallet' ? 'کیف پول' : 'درگاه بانکی'}</dd></div>
          </dl>
        </Panel>
        <Panel>
          <p className="mb-2 flex items-center gap-2 text-[16px] font-black text-chalk">{o.fulfillment === 'pickup' ? <Store className="size-5 text-plate" /> : <Truck className="size-5 text-plate" />}{o.fulfillment === 'pickup' ? 'تحویل در باشگاه' : 'ارسال به نشانی'}</p>
          <p className="text-[14px] leading-7 text-rubber">{o.fulfillment === 'pickup' ? <>به پذیرش {o.branchName} مراجعه کنید و شمارهٔ سفارش را بگویید.</> : o.address}</p>
          <div className="mt-6 flex flex-wrap gap-3 print:hidden">
            <Link to="/shop" className="inline-flex h-11 items-center rounded-[3px] bg-plate px-5 text-[14px] font-bold text-white hover:bg-plate-hi">ادامهٔ خرید</Link>
            <Link to="/profile" className="inline-flex h-11 items-center rounded-[3px] border border-steel-2 px-5 text-[14px] font-bold text-chalk hover:border-chalk">سفارش‌های من</Link>
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}
