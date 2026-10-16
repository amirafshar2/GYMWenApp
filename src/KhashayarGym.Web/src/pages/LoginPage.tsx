import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3, ShieldCheck, Store, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api, authApi } from '@/lib/api'
import { useData } from '@/lib/useData'
import { faDigits } from '@/lib/fa'
import { brand } from '@/lib/brand'
import OtpLogin from '@/member/OtpLogin'
import { Notice, Panel, Spinner } from '@/member/ui'

/** فقط مسیرهای داخلی سایت برای بازگشت بعد از ورود (جلوگیری از open redirect) */
export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/profile')

export default function LoginPage() {
  const { ready, user } = useAuth()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const next = safeNext(params.get('next'))
  const dest = useRef<string | null>(null)
  useEffect(() => { document.title = `ورود | ${brand.name}` }, [])
  useEffect(() => { if (ready && user) nav(dest.current ?? next, { replace: true }) }, [ready, user, next, nav])

  if (!ready || user) return <Spinner />
  return (
    <div className="bg-steel">
      <div className="mx-auto grid min-h-[calc(100svh-78px)] w-full max-w-[1100px] items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_440px]">
        <div className="hidden lg:block">
          <p className="mb-3 text-[13px] font-bold text-plate">حساب کاربری</p>
          <h1 className="text-[40px] font-black leading-[1.3] text-chalk">ورود یا ثبت‌نام<br />با شمارهٔ موبایل</h1>
          <ul className="mt-8 grid gap-4 text-[16px] text-rubber">
            <li>عضویت آنلاین در هر کدام از شعبه‌ها</li>
            <li>امضای دیجیتال قرارداد، بدون کاغذ</li>
            <li>کارت عضویت QR و تمدید با یک کلیک</li>
          </ul>
        </div>
        <Panel aria-labelledby="login-title" className="shadow-[0_20px_60px_rgb(0_0_0/0.06)]">
          <h2 id="login-title" className="mb-6 text-[22px] font-black text-chalk">ورود به حساب</h2>
          <DemoQuickLogin next={next} onPick={(to) => { dest.current = to }} />
          <OtpLogin onDone={() => nav(dest.current ?? next, { replace: true })} />
          <p className="mt-6 flex items-start gap-2 text-[12.5px] leading-6 text-rubber">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-chalk" aria-hidden />
            ورود شما با کوکی امن نگه داشته می‌شود. با ورود، <Link to="/join" className="font-bold text-chalk underline">قوانین عضویت</Link> را می‌پذیرید.
          </p>
        </Panel>
      </div>
    </div>
  )
}

const DEMO_ACCOUNTS = [
  { phone: '09100000000', label: 'مدیر کل', hint: 'همهٔ بخش‌های پنل و ۱۲ شعبه', to: '/panel', Icon: BarChart3 },
  { phone: '09100000001', label: 'مدیر شعبه', hint: 'فقط شعبهٔ قدوسی غربی', to: '/panel', Icon: Store },
  { phone: '09391000001', label: 'عضو باشگاه', hint: 'کارت عضویت، برنامه و سفارش‌ها', to: null, Icon: UserRound },
] as const

/** فقط در نسخهٔ نمایشی: ورود با یک کلیک به‌جای واردکردن شماره و کد */
function DemoQuickLogin({ next, onPick }: { next: string; onPick: (to: string) => void }) {
  const { data: site } = useData('site', api.site)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  if (!site?.demo) return null
  const go = async (a: (typeof DEMO_ACCOUNTS)[number]) => {
    setBusy(a.phone); setErr(null)
    try {
      onPick(a.to ?? next)
      await authApi.demoLogin(a.phone)
    } catch (x) { setErr((x as Error).message); setBusy(null) }
  }
  return (
    <section aria-labelledby="demo-quick" className="mb-6 rounded-[8px] border border-[#F2A33A] bg-[#FFF6E8] p-4">
      <h3 id="demo-quick" className="text-[15px] font-black text-chalk">ورود سریع نسخهٔ نمایشی</h3>
      <p className="mt-1 text-[13px] text-rubber">یکی را بزنید؛ بدون شماره و کد وارد می‌شوید.</p>
      <div className="mt-3 grid gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.phone} type="button" disabled={!!busy} onClick={() => void go(a)}
            className="flex cursor-pointer items-center gap-3 rounded-[6px] border border-steel-2 bg-white px-3 py-2.5 text-right hover:border-plate disabled:cursor-wait disabled:opacity-60">
            <a.Icon className="size-5 shrink-0 text-plate" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-bold text-chalk">{busy === a.phone ? 'در حال ورود…' : `ورود به‌عنوان ${a.label}`}</span>
              <span className="block text-[12.5px] text-rubber">{a.hint} · <span dir="ltr">{faDigits(a.phone)}</span></span>
            </span>
          </button>
        ))}
      </div>
      {err && <Notice tone="err" className="mt-3">{err}</Notice>}
    </section>
  )
}
