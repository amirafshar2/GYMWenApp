import { useState } from 'react'
import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import { api, type Coach } from '@/lib/api'
import { useData } from '@/lib/useData'
import { faNum } from '@/lib/fa'
import { rebrand } from '@/lib/brand'

/**
 * عکس‌های موقت (Unsplash، مجوز آزاد) تا عکس واقعی مربی‌ها برسد — نام‌ها هم نمونه‌اند.
 * با رسیدن عکس واقعی، photoUrl از API جای این‌ها را می‌گیرد.
 */
const PLACEHOLDER: Record<string, string> = {
  'coach-1': '1704223523169-52feeed90365',
  'coach-2': '1787154604451-82f21e34e59b',
  'coach-3': '1738523686578-f18348c8292b',
  'coach-4': '1787154604266-e29f25f07056',
  'coach-5': '1619361814016-4acc36025fa9',
  'coach-6': '1738523686879-cc1fc43b4afd',
}
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=480&h=600&fit=crop&crop=faces&q=72&auto=format`

/** اگر عکس بارگذاری نشد (مثلاً بدون اینترنت): حرف اول نام روی زمینهٔ تیره */
const initials = (name: string) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect width="120" height="150" fill="#2c2c2c"/><text x="60" y="92" text-anchor="middle" font-family="Vazirmatn, Tahoma" font-size="56" font-weight="900" fill="#e8283c">${name.trim()[0]}</text></svg>`)

function CoachCard({ c }: { c: Coach }) {
  const ph = PLACEHOLDER[c.slug]
  const [src, setSrc] = useState(c.photoUrl ?? (ph ? unsplash(ph) : initials(c.fullName)))
  return (
    <article className="group relative h-full w-[72%] shrink-0 snap-center overflow-hidden rounded-xl bg-[#222] sm:w-[45%] md:w-auto">
      <img src={src} alt={`${c.fullName}، ${c.specialty}`} loading="lazy" draggable={false}
        onError={() => setSrc(initials(c.fullName))}
        className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <span className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white ${c.section === 'Women' ? 'bg-women' : 'bg-plate'}`}>
        {c.section === 'Women' ? 'سالن بانوان' : c.section === 'Men' ? 'سالن آقایان' : 'آقایان و بانوان'}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h3 className="text-[19px] font-black leading-tight">{c.fullName}</h3>
        <p className="mt-1 text-[13px] font-bold text-white/85">{c.specialty}</p>
        <p className="mt-0.5 text-[12px] text-white/60">{faNum(c.yearsOfExperience)} سال سابقه · {rebrand(c.branchName)}</p>
        <span aria-hidden className="mt-3 block h-[3px] w-10 origin-right rounded-full bg-plate transition-[width] duration-500 group-hover:w-20" />
      </div>
    </article>
  )
}

/** مربیان — داخل Container Scroll Animation از 21st.dev: قاب کج با اسکرول صاف می‌شود */
export default function SiteCoaches() {
  const { data: coaches = [] } = useData('coaches', api.coaches)
  return (
    <section id="coaches" aria-labelledby="coaches-title" className="overflow-hidden bg-steel">
      <ContainerScroll
        titleComponent={
          <div className="px-4">
            <p className="text-[13px] font-bold text-plate">مربیان {coaches.length ? `· ${faNum(coaches.length)} نفر` : ''}</p>
            <h2 id="coaches-title" className="mt-3 text-[clamp(1.9rem,4vw,3.2rem)] font-bold leading-[1.3] text-chalk">
              کسانی که <span className="text-plate">کنارت تمرین می‌کنند</span>
            </h2>
            <p className="mx-auto mt-4 mb-6 max-w-xl text-[15px] leading-7 text-rubber">مربی آقایان برای سالن آقایان، مربی بانوان برای سالن بانوان؛ همه با مدرک فدراسیون.</p>
          </div>
        }
      >
        <div dir="rtl" className="flex h-full snap-x snap-mandatory gap-3 overflow-x-auto p-1 [scrollbar-width:none] md:grid md:grid-cols-3 md:grid-rows-2 md:gap-4 md:overflow-visible md:p-0 [&::-webkit-scrollbar]:hidden">
          {coaches.map((c) => <CoachCard key={c.slug} c={c} />)}
        </div>
      </ContainerScroll>
    </section>
  )
}
