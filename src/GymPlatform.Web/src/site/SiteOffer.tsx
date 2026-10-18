import { useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { iconOf } from '@/lib/icons'
import { fill, site } from '@/lib/site'
import { Eyebrow, useFadeUp, wrap } from './ui/SectionHead'

/** «آنچه ارائه می‌دهیم»: کاروسل آیکون‌ها با پس‌زمینهٔ حبابی، مثل صفحهٔ مرجع */
export default function SiteOffer() {
  const track = useRef<HTMLUListElement>(null)
  const reduced = useReducedMotion()
  const fade = useFadeUp()
  const o = site.home.offer
  const slide = (dir: 1 | -1) => {
    const el = track.current
    if (!el) return
    const card = el.querySelector('li')
    // در RTL حرکت به «بعدی» یعنی اسکرول به سمت چپ (منفی)
    el.scrollBy({ left: -dir * ((card?.clientWidth ?? 300) + 30), behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <section aria-labelledby="offer-title" className="py-[clamp(80px,9vw,130px)]">
      <div className={wrap}>
        <motion.div {...fade} className="flex flex-wrap items-end justify-between gap-6">
          <div>
            {o.eyebrow && <Eyebrow>{fill(o.eyebrow)}</Eyebrow>}
            <h2 id="offer-title" className="mt-3 text-[clamp(1.9rem,3.4vw,3rem)] font-bold leading-[1.3] text-chalk">{fill(o.title)}</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => slide(-1)} aria-label="قبلی" className="grid size-12 cursor-pointer place-items-center border-2 border-steel-2 text-chalk transition-colors hover:border-chalk hover:bg-chalk hover:text-white"><ChevronRight className="size-5" aria-hidden /></button>
            <button type="button" onClick={() => slide(1)} aria-label="بعدی" className="grid size-12 cursor-pointer place-items-center border-2 border-steel-2 text-chalk transition-colors hover:border-chalk hover:bg-chalk hover:text-white"><ChevronLeft className="size-5" aria-hidden /></button>
          </div>
        </motion.div>

        <ul ref={track} className="-mx-5 mt-14 flex snap-x snap-mandatory gap-[30px] overflow-x-auto scroll-px-5 px-5 pb-4 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
          {o.items.map((it, k) => { const Icon = iconOf(it.icon); return (
            <motion.li key={it.title + k} className="w-[78%] shrink-0 snap-start sm:w-[calc((100%-30px)/2)] lg:w-[calc((100%-90px)/4)]"
              {...(reduced ? {} : { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.7, delay: (k % 4) * 0.1 } })}>
              <a href={it.href || '#packages'} className="group flex h-full flex-col items-center px-2 text-center">
                <span className="blob grid size-[120px] place-items-center bg-steel transition-colors duration-500 group-hover:bg-plate/10">
                  <Icon className="size-12 stroke-[1.4] text-plate" aria-hidden />
                </span>
                <span className="mt-7 text-[21px] font-bold text-chalk">{fill(it.title)}</span>
                <span className="mt-3 text-[15px] leading-7 text-rubber">{fill(it.text)}</span>
                <ArrowLeft className="mt-5 size-5 text-chalk transition-all group-hover:-translate-x-1 group-hover:text-plate" aria-hidden />
              </a>
            </motion.li>
          ) })}
        </ul>
      </div>
    </section>
  )
}
