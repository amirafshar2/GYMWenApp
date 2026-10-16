import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Banner1 } from '@/components/ui/banner-1'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { faNum } from '@/lib/fa'
import { rebrand } from '@/lib/brand'

/** نوار «جشنواره» — کامپوننت Promo Banner از 21st.dev با شمارش معکوس */
export default function SiteBanner() {
  const { data: c } = useData('campaign', api.campaign)
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('festival-hidden') === '1' } catch { return false } })
  const [now, setNow] = useState(Date.now())
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const end = c ? Date.parse(c.endsAtUtc) : 0
  const ms = Math.max(0, end - now)
  const show = !!c && !hidden && ms > 0
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--festival-h', `${show && box.current ? box.current.offsetHeight : 0}px`)
    return () => document.documentElement.style.setProperty('--festival-h', '0px')
  }, [show])
  if (!show || !c) return null

  const d = Math.floor(ms / 86_400_000), h = Math.floor(ms / 3_600_000) % 24, m = Math.floor(ms / 60_000) % 60, s = Math.floor(ms / 1000) % 60
  return (
    <div ref={box} className="kg-chrome fixed inset-x-0 top-0 z-[60]">
      <Banner1
        href="/festival"
        label="جشنوارهٔ تخفیف"
        closeLabel="بستن نوار جشنواره"
        className="!bg-[#181818] !pl-10 !pr-6"
        onClose={() => { setHidden(true); try { sessionStorage.setItem('festival-hidden', '1') } catch { /* */ } }}
      >
        <span className="font-semibold">{rebrand(c.title)}</span> – {c.discountAmountToman ? `${faNum(c.discountAmountToman)} تومان` : `${faNum(c.discountPercent)}٪`} تخفیف — <span className="tabular-nums">{faNum(d)} روز {faNum(h)} ساعت {faNum(m)} دقیقه <span className="hidden sm:inline">{faNum(s)} ثانیه</span></span>
      </Banner1>
    </div>
  )
}
