import { motion, useReducedMotion } from 'motion/react'
import { brand } from '@/lib/brand'
import { faNum } from '@/lib/fa'
import { Btn, Eyebrow, useFadeUp, wrap } from './ui/SectionHead'

/** تصویرها فریم‌هایی از ویدیوی خود باشگاه‌اند */
const CARDS = [
  { title: 'بدنسازی', img: '/media/gym/dumbbells-tall.webp', alt: 'ردیف دمبل‌ها در سالن' },
  { title: 'پاورلیفتینگ', img: '/media/gym/lift-tall.webp', alt: 'ورزشکار در حال ددلیفت' },
  { title: 'کراس‌فیت', img: '/media/gym/rack-tall.webp', alt: 'تمرین با هالتر کنار رک دمبل' },
  { title: 'تمرین قدرتی', img: '/media/gym/grip-tall.webp', alt: 'دست گچ‌خورده روی میلهٔ هالتر' },
]

/** «چه می‌کنیم»: نقل‌قول بزرگ وسط‌چین + چهار کارت تصویری شماره‌دار */
export default function SiteWhatWeDo() {
  const fade = useFadeUp()
  const reduced = useReducedMotion()
  return (
    <section id="disciplines" aria-labelledby="wwd-title" className="bg-steel py-[clamp(80px,9vw,130px)]">
      <div className={wrap}>
        <motion.div {...fade} className="mx-auto max-w-[900px] text-center">
          <Eyebrow>چه می‌کنیم</Eyebrow>
          <h2 id="wwd-title" className="mt-4 text-[clamp(1.8rem,3.4vw,3rem)] font-bold leading-[1.35] text-chalk">
            هر رشته‌ای که انتخاب کنی، در {brand.shortName} مربی، سالن و برنامه‌اش آماده است
          </h2>
          <p className="mt-6 text-[17px] font-bold text-chalk">{brand.name}</p>
          <p className="mt-1 text-[14px] text-rubber">{faNum(12)} شعبه – سالن‌های جدای آقایان و بانوان</p>
        </motion.div>

        <ul className="mt-16 grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-[30px]">
          {CARDS.map((c, k) => (
            <motion.li key={c.title}
              {...(reduced ? {} : { initial: { opacity: 0, y: 60 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.8, delay: k * 0.12, ease: [0.2, 0.7, 0.2, 1] as const } })}>
              <a href="#packages" className="group relative block aspect-[3/4] overflow-hidden bg-chalk">
                <img src={c.img} alt={c.alt} loading="lazy" width={720} height={960}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-110" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="absolute top-5 right-5 text-[15px] font-bold text-white/85">{faNum(k + 1).padStart(2, '۰')}.</span>
                <span className="absolute inset-x-5 bottom-5 text-white">
                  <span className="block text-[13px] text-white/75">رشته</span>
                  <span className="block text-[clamp(1.25rem,2vw,1.75rem)] font-bold">{c.title}</span>
                </span>
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-right scale-x-0 bg-plate transition-transform duration-500 group-hover:scale-x-100" />
              </a>
            </motion.li>
          ))}
        </ul>
        <motion.div {...useFadeUp(0.2)} className="mt-14 text-center">
          <Btn href="#packages">پکیج‌های تمرینی</Btn>
        </motion.div>
      </div>
    </section>
  )
}
