import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { rebrand } from '@/lib/brand'
import { faNum, jalali } from '@/lib/fa'
import { Btn, Eyebrow, useFadeUp, wrap } from './ui/SectionHead'

/** «فراتر از تمرین»: دو تصویر بلند که با اسکرول در جهت مخالف بالا و پایین می‌روند + متن جشنواره */
export default function SiteEvents() {
  const { data: c } = useData('campaign', api.campaign)
  const reduced = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'end start'] })
  const up = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [90, -90])
  const down = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-30, 110])
  const fade = useFadeUp(0.1)

  const points = [
    c ? `${rebrand(c.title)} — ${faNum(c.discountPercent)}٪ تخفیف تا ${jalali(c.endsAtUtc)}` : 'جشنوارهٔ تخفیف فصلی روی پکیج‌های منتخب',
    'تخفیف جشنواره خودکار روی پکیج‌های مشمول اعمال می‌شود',
    'خبر جشنواره‌های بعدی با پیامک به عضوهای خبرنامه می‌رسد',
  ]

  return (
    <section aria-labelledby="events-title" className="overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f3f3f3_100%)] py-[clamp(80px,9vw,140px)]">
      <div className={`${wrap} grid items-center gap-16 lg:grid-cols-2 lg:gap-[70px]`}>
        <div ref={box} className="grid grid-cols-2 gap-5 lg:gap-[30px]">
          <motion.div style={{ y: up }} className="aspect-[3/5] overflow-hidden bg-chalk">
            <img src="/media/gym/grip-tall.webp" alt="دست گچ‌خورده روی هالتر" loading="lazy" width={720} height={960} className="h-full w-full object-cover" />
          </motion.div>
          <motion.div style={{ y: down }} className="mt-16 aspect-[3/5] overflow-hidden bg-chalk">
            <img src="/media/gym/empty-tall.webp" alt="سالن تجهیزات خشایار" loading="lazy" width={720} height={960} className="h-full w-full object-cover" />
          </motion.div>
        </div>
        <motion.div {...fade}>
          <Eyebrow>فراتر از تمرین</Eyebrow>
          <h2 id="events-title" className="mt-3 text-[clamp(1.9rem,3.4vw,3rem)] font-bold leading-[1.3] text-chalk">در جشنواره‌های ما شرکت کن</h2>
          <p className="mt-5 max-w-xl text-[16px] leading-8 text-rubber">{c?.description ? rebrand(c.description) : 'چند بار در سال جشنوارهٔ تخفیف برگزار می‌کنیم؛ زمان باقی‌مانده را بالای صفحه می‌بینی.'}</p>
          <ul className="mt-8 grid gap-4">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[16px] font-bold text-chalk">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-plate text-white"><Check className="size-3.5" strokeWidth={3} aria-hidden /></span>
                {p}
              </li>
            ))}
          </ul>
          <Btn href="#packages" className="mt-10">پکیج‌های جشنواره</Btn>
        </motion.div>
      </div>
    </section>
  )
}
