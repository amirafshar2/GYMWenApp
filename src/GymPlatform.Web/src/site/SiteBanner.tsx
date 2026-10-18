import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Banner1 } from '@/components/ui/banner-1'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { faNum } from '@/lib/fa'
import { site } from '@/lib/site'

/** نوار بالای سایت: «نسخهٔ نمایشی» (فقط در دمو) + نوار «جشنواره» — کامپوننت Promo Banner از 21st.dev با شمارش معکوس */
export default function SiteBanner() {
  const { data: c, error } = useData('campaign', () => (site.modules.festival ? api.campaign() : Promise.resolve(null)))
  const demo = site.demo
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('festival-hidden') === '1' } catch { return false } })
  const [now, setNow] = useState(Date.now())
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const end = c ? Date.parse(c.endsAtUtc) : 0
  const ms = Math.max(0, end - now)
  const show = !!c && !hidden && ms > 0
  // تا جواب جشنواره نیامده، جای نوار که index.html از قبل رزرو کرده دست نمی‌خورد (صفحه جابه‌جا نشود)
  const pending = c === undefined && !error && !hidden
  useLayoutEffect(() => {
    if (pending) return
    document.documentElement.style.setProperty('--festival-h', `${(show || demo) && box.current ? box.current.offsetHeight : 0}px`)
    return () => document.documentElement.style.setProperty('--festival-h', '0px')
  }, [show, demo, pending])
  if (!show && !demo) return null

  const d = Math.floor(ms / 86_400_000), h = Math.floor(ms / 3_600_000) % 24, m = Math.floor(ms / 60_000) % 60, s = Math.floor(ms / 1000) % 60
  return (
    <div ref={box} className="kg-chrome fixed inset-x-0 top-0 z-[60]">
      {demo && <DemoStrip />}
      {show && c && <Banner1
        href="/festival"
        label="جشنوارهٔ تخفیف"
        closeLabel="بستن نوار جشنواره"
        className="!bg-[#181818] !pl-10 !pr-6"
        onClose={() => { setHidden(true); try { sessionStorage.setItem('festival-hidden', '1') } catch { /* */ } }}
      >
        <span className="font-semibold">{c.title}</span> – {c.discountAmountToman ? `${faNum(c.discountAmountToman)} تومان` : `${faNum(c.discountPercent)}٪`} تخفیف — <span className="tabular-nums">{faNum(d)} روز {faNum(h)} ساعت {faNum(m)} دقیقه <span className="hidden sm:inline">{faNum(s)} ثانیه</span></span>
      </Banner1>}
    </div>
  )
}

/** نوار باریک «نسخهٔ نمایشی» تا بیننده بداند داده‌ها ساختگی‌اند */
export function DemoStrip({ className = '' }: { className?: string }) {
  return (
    <p role="note" className={`bg-[#F2A33A] px-4 py-1.5 text-center text-[12.5px] font-bold leading-5 text-[#10161F] sm:text-[13px] ${className}`}>
      نسخهٔ نمایشی (دمو) — <span className="sm:hidden">داده‌ها ساختگی و پرداخت آزمایشی است.</span><span className="hidden sm:inline">اعضا و آمار ساختگی‌اند، پرداخت آزمایشی است و پیامک واقعی ارسال نمی‌شود.</span>
    </p>
  )
}
