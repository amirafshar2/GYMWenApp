import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { CountUp } from '@/components/ui/count-up'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { faNum } from '@/lib/fa'
import { fill, site } from '@/lib/site'
import { Btn, Eyebrow, useFadeUp, wrap } from './ui/SectionHead'

/** «چرا ما»: تصویر بلند با کادر قرمز، فهرست شماره‌دار و اعداد بزرگ کم‌رنگ پشت برچسب‌ها */
export default function SiteWhy() {
  const { data: s } = useData('stats', api.stats)
  const reduced = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-8%', '8%'])
  const fadeA = useFadeUp()
  const fadeB = useFadeUp(0.15)
  const w = site.home.why

  // عددی که صفر یا خالی است (مثلاً سال تأسیس وارد نشده) نمایش داده نمی‌شود
  const stats = (s ? [
    { v: s.branches, label: 'شعبه' },
    { v: s.coaches, label: 'مربی' },
    { v: s.yearsActive, label: 'سال سابقه' },
    { v: s.members, label: 'شاگرد فعال' },
  ] : []).filter((x): x is { v: number; label: string } => !!x.v)

  return (
    <section aria-labelledby="why-title" className="py-[clamp(80px,9vw,130px)]">
      <div className={`${wrap} grid items-center gap-14 lg:grid-cols-2 lg:gap-[70px]`}>
        <motion.div {...fadeA} ref={box} className="relative">
          <div className="relative aspect-[4/5] overflow-hidden bg-chalk">
            <motion.img src={w.imageUrl || '/media/gym/lift-tall.webp'} alt={`تمرین در سالن ${brand.shortName}`} loading="lazy" width={720} height={960}
              style={{ y: imgY, scale: 1.18 }} className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <a href="#packages" className="group absolute bottom-0 left-0 flex w-[min(78%,340px)] items-end justify-between gap-4 bg-plate p-7 text-white transition-colors hover:bg-plate-hi sm:p-9 lg:-left-10 lg:bottom-10">
            <span className="text-[clamp(1.25rem,2vw,1.6rem)] font-bold leading-snug">{fill(w.imageCta) || 'پکیج‌ها'}</span>
            <ArrowLeft className="mb-1 size-6 shrink-0 transition-transform group-hover:-translate-x-1" aria-hidden />
          </a>
        </motion.div>

        <motion.div {...fadeB}>
          {brand.whySlogan && <Eyebrow>{fill(brand.whySlogan)}</Eyebrow>}
          <h2 id="why-title" className="mt-3 text-[clamp(1.9rem,3.4vw,3rem)] font-bold leading-[1.3] text-chalk">{fill(w.title)}</h2>
          <p className="mt-5 max-w-xl text-[16px] leading-8 text-rubber">{fill(w.text)}</p>
          {w.points.length > 0 && <ul className="mt-8 border-t border-steel-2">
            {w.points.map((p, k) => (
              <li key={p.title + k} className="flex items-baseline gap-4 border-b border-steel-2 py-5">
                <span className="text-[15px] font-bold text-rubber">{faNum(k + 1).padStart(2, '۰')}.</span>
                <span>
                  <span className="block text-[19px] font-bold text-chalk">{fill(p.title)}</span>
                  {p.text && <span className="mt-1 block text-[15px] text-rubber">{fill(p.text)}</span>}
                </span>
              </li>
            ))}
          </ul>}
          <Btn href={site.modules.consultation ? '#consult' : '#packages'} tone="sun" className="mt-9">شروع کن</Btn>

          <dl className="mt-14 grid grid-cols-2 gap-y-10">
            {stats.map((it, k) => (
              <div key={it.label} className={`relative grid min-h-[110px] place-items-center ${k % 2 === 0 ? 'border-l border-steel-2' : ''}`}>
                {/* عدد بزرگ و کم‌رنگ پشت برچسب، مثل صفحهٔ مرجع */}
                <dd aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center text-[clamp(4.5rem,8vw,7rem)] font-black leading-none text-chalk/[.06] tabular-nums">
                  <CountUp to={it.v} locale="fa-IR" />
                </dd>
                <dt className="relative text-[19px] font-bold text-chalk">
                  <span className="sr-only">{faNum(it.v)} </span>{it.label}
                </dt>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </section>
  )
}
