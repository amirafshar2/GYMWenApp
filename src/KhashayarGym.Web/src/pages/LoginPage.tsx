import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { brand } from '@/lib/brand'
import OtpLogin from '@/member/OtpLogin'
import { Panel, Spinner } from '@/member/ui'

/** فقط مسیرهای داخلی سایت برای بازگشت بعد از ورود (جلوگیری از open redirect) */
export const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/profile')

export default function LoginPage() {
  const { ready, user } = useAuth()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const next = safeNext(params.get('next'))
  useEffect(() => { document.title = `ورود | ${brand.name}` }, [])
  useEffect(() => { if (ready && user) nav(next, { replace: true }) }, [ready, user, next, nav])

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
          <OtpLogin onDone={() => nav(next, { replace: true })} />
          <p className="mt-6 flex items-start gap-2 text-[12.5px] leading-6 text-rubber">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-chalk" aria-hidden />
            ورود شما با کوکی امن نگه داشته می‌شود. با ورود، <Link to="/join" className="font-bold text-chalk underline">قوانین عضویت</Link> را می‌پذیرید.
          </p>
        </Panel>
      </div>
    </div>
  )
}
