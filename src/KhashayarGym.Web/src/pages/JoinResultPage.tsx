import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Download, RotateCcw, XCircle } from 'lucide-react'
import { downloadBlob, memberApi, type PaymentResult } from '@/lib/api'
import { brand } from '@/lib/brand'
import { faDigits, jalali, toman } from '@/lib/fa'
import MemberCard, { useRequireAuth } from '@/member/MemberCard'
import { Btn, Notice, PageShell, Panel, Spinner } from '@/member/ui'
import { clearJoinDraft } from './JoinPage'

const DT = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const

/** صفحهٔ بازگشت از درگاه: نتیجهٔ تأییدشدهٔ سرور (نه پارامترهای آدرس) نمایش داده می‌شود */
export default function JoinResultPage() {
  const { ready, user } = useRequireAuth()
  const [params] = useSearchParams()
  const id = Number(params.get('id'))
  const [p, setP] = useState<PaymentResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [dl, setDl] = useState(false)

  useEffect(() => { document.title = `نتیجهٔ پرداخت | ${brand.name}` }, [])
  useEffect(() => {
    if (!ready || !user) return
    if (!id) { setErr('پرداختی پیدا نشد.'); return }
    memberApi.payment(id).then((r) => { setP(r); if (r.status === 'succeeded') clearJoinDraft() }).catch((e: Error) => setErr(e.message))
  }, [ready, user, id])

  if (err) return <PageShell title="نتیجهٔ پرداخت"><Notice tone="err">{err}</Notice><Link to="/profile" className="mt-4 inline-block font-bold text-plate">رفتن به پروفایل</Link></PageShell>
  if (!p || !user) return <Spinner label="در حال بررسی نتیجهٔ پرداخت…" />

  const ok = p.status === 'succeeded'
  const row = (k: string, v: string, red = false) => (
    <div className="flex justify-between gap-4 py-2.5 text-[14px]"><dt className="text-rubber">{k}</dt><dd className={red ? 'font-bold text-plate' : 'font-bold text-chalk'}>{v}</dd></div>
  )

  return (
    <PageShell eyebrow="ثبت‌نام آنلاین" title={ok ? 'عضویت شما فعال شد' : 'پرداخت انجام نشد'}>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px] [&>*]:min-w-0">
        <Panel>
          <div className="mb-5 flex items-center gap-3">
            {ok ? <CheckCircle2 className="size-10 text-[#1f9d55]" aria-hidden /> : <XCircle className="size-10 text-plate" aria-hidden />}
            <div>
              <p className="text-[18px] font-black text-chalk">{ok ? 'پرداخت موفق بود' : p.status === 'pending' ? 'پرداخت هنوز تأیید نشده' : 'پرداخت لغو شد یا ناموفق بود'}</p>
              <p className="text-[14px] text-rubber">{ok ? 'رسید پرداخت و فاکتور رسمی آماده است.' : 'اگر مبلغی از حساب شما کم شده، حداکثر تا ۷۲ ساعت توسط بانک برمی‌گردد.'}</p>
            </div>
          </div>
          <dl className="divide-y divide-steel-2 border-y border-steel-2">
            {p.invoiceNumber && row('شمارهٔ فاکتور', faDigits(p.invoiceNumber))}
            {row('پکیج', `${p.packageName} — ${p.branchName}`)}
            {row('قیمت پکیج', toman(p.baseAmountToman))}
            {p.campaignDiscountToman > 0 && row('تخفیف جشنواره', `− ${toman(p.campaignDiscountToman)}`, true)}
            {p.codeDiscountToman > 0 && row(`کد تخفیف ${p.discountCode ?? ''}`, `− ${toman(p.codeDiscountToman)}`, true)}
            {row(ok ? 'مبلغ پرداخت‌شده' : 'مبلغ', toman(p.amountToman))}
            {p.paidAtUtc && row('زمان پرداخت', jalali(p.paidAtUtc, DT))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            {ok ? <>
              <Btn busy={dl} onClick={async () => { setDl(true); try { await downloadBlob(() => memberApi.invoicePdf(p.id), `invoice-${p.invoiceNumber}.pdf`) } finally { setDl(false) } }}>
                <Download className="size-5" aria-hidden />دانلود فاکتور PDF
              </Btn>
              <Link to="/profile" className="inline-flex h-[52px] items-center rounded-[3px] bg-chalk px-6 text-[15px] font-bold text-white hover:bg-night">پروفایل و کارت عضویت</Link>
            </> : <>
              <Link to="/join" className="inline-flex h-[52px] items-center gap-2 rounded-[3px] bg-plate px-6 text-[15px] font-bold text-white hover:bg-plate-hi"><RotateCcw className="size-5" aria-hidden />تلاش دوباره</Link>
              <Link to="/#consult" className="inline-flex h-[52px] items-center rounded-[3px] border border-steel-2 bg-white px-6 text-[15px] font-bold text-chalk hover:border-chalk">مشاوره و پشتیبانی</Link>
            </>}
          </div>
        </Panel>
        {ok && p.membership && <MemberCard m={p.membership} name={user.fullName ?? ''} />}
      </div>
    </PageShell>
  )
}
