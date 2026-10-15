import { useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { useData, prefersReducedMotion } from '../lib/useData'
import { brand } from '../lib/brand'
import { faNum } from '../lib/fa'
import { gsap, ScrollTrigger } from '../lib/motion'

/** «چرا خشایار؟» — شمارنده‌های آماری که یک‌بار با ورود به دید می‌شمارند */
export default function WhyUs() {
  const { data: s } = useData('stats', api.stats)
  const nums = useRef<HTMLSpanElement[]>([])

  const items = s ? [
    { value: s.branches, suffix: '', label: `شعبه در ${brand.city}` },
    { value: s.members, suffix: '+', label: 'شاگرد فعال' },
    { value: s.yearsActive, suffix: '', label: 'سال سابقه' },
    { value: Math.round(s.instagramFollowers / 1000), suffix: ' هزار', label: 'دنبال‌کننده در اینستاگرام' },
  ] : []

  useEffect(() => {
    if (!s) return
    const els = nums.current.filter(Boolean)
    if (prefersReducedMotion()) return
    const triggers = els.map((el, i) => {
      const end = items[i].value
      const obj = { v: 0 }
      el.textContent = faNum(0)
      return ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => gsap.to(obj, { v: end, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = faNum(Math.round(obj.v)) } }),
      })
    })
    return () => triggers.forEach((t) => t.kill())
  }, [s]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-labelledby="why-title" className="border-y border-steel-2 bg-steel/60">
      <div className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-end">
          <div>
            <h2 id="why-title" className="section-title">{brand.whySlogan}</h2>
            <p className="lede mt-5">چون باشگاه نزدیک خانه را راحت‌تر ادامه می‌دهی. با یک عضویت، سالن هم‌جنس در هر محله در دسترس است و مربی، تغذیه و فروشگاه همه زیر یک سقف‌اند.</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 xl:grid-cols-4">
            {items.map((it, i) => (
              <div key={it.label} className="flex flex-col-reverse border-r-2 border-plate pr-4">
                <dt className="mt-2 text-sm text-rubber">{it.label}</dt>
                <dd className="font-black leading-none tabular-nums" style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}>
                  <span ref={(n) => { if (n) nums.current[i] = n }}>{faNum(it.value)}</span>
                  <span className="text-[0.45em] font-bold text-plate-hi">{it.suffix}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
