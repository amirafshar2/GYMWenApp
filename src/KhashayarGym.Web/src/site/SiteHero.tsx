import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { brand } from '@/lib/brand'
import { faNum } from '@/lib/fa'
import { Btn, wrap } from './ui/SectionHead'

/** تصویر دمبل (رشته‌های فلزی و ذرات)، ساخته‌شده با Canva AI؛ اسلاید ۲ و ۳ برش‌های پرجزئیات از همان فایل اصلی */
const H = '/media/hero/'
const DURATION = 6500

/**
 * هر اسلاید همان دمبل است با قاب‌بندی متفاوت (کل دمبل، صفحهٔ وزنه، دستهٔ آج‌دار).
 * x جای دمبل را طوری تنظیم می‌کند که متنِ سمت راست روی آن نیفتد.
 */
const SLIDES = [
  {
    eyebrow: `${faNum(12)} شعبه در ${brand.city}`,
    lines: brand.slogan.split('؛').map((s, i, a) => (i < a.length - 1 ? `${s.trim()}؛` : s.trim())),
    img: 'dumbbell', frame: { x: '-17%', scale: 1, origin: '50% 50%' },
  },
  {
    eyebrow: 'نزدیک‌ترین شعبه، یک دکمه فاصله',
    lines: [`${brand.nearSlogan.split('،')[0]}،`, brand.nearSlogan.split('،').slice(1).join('،').trim()],
    img: 'dumbbell-plate', frame: { x: '0%', scale: 1, origin: '30% 50%' },
  },
  {
    eyebrow: 'بدنسازی تا صخره‌نوردی',
    lines: ['قدرت را', 'تکرار به تکرار بساز'],
    img: 'dumbbell-grip', frame: { x: '0%', scale: 1, origin: '30% 50%' },
  },
]

const ease = [0.7, 0, 0.2, 1] as const

/** هیروی اسلایدری مثل صفحهٔ مرجع: تصویرها از پایین بالا می‌آیند و آرام بالا و پایین می‌روند */
export default function SiteHero() {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const go = useCallback((n: number) => setI((n + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    if (paused || reduced) return
    timer.current = window.setTimeout(() => go(i + 1), DURATION)
    return () => window.clearTimeout(timer.current)
  }, [i, paused, reduced, go])

  useEffect(() => {
    const v = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', v)
    return () => document.removeEventListener('visibilitychange', v)
  }, [])

  // روی موبایل تصویر زیر متن است و جابه‌جایی افقی لازم نیست
  const [wide, setWide] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const m = window.matchMedia('(min-width: 768px)')
    const f = () => setWide(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  const s = SLIDES[i]
  const x = wide ? s.frame.x : '0%'
  const near = () => setTimeout(() => window.dispatchEvent(new Event('kg:locate')), 700)

  return (
    <section id="top" aria-roledescription="carousel" aria-label="معرفی باشگاه"
      className="relative isolate overflow-hidden bg-[#ebeae7]"
      style={{ height: 'clamp(560px, calc(100svh - 78px - var(--festival-h, 0px)), 860px)' }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>

      {/* لایهٔ تصویر: اسلاید تازه با پردهٔ رو به بالا ظاهر می‌شود و تصویر داخلش از پایین بالا می‌آید */}
      <AnimatePresence initial={false}>
        <motion.div key={i} className="absolute inset-0"
          initial={reduced ? { opacity: 0 } : { clipPath: 'inset(100% 0 0 0)' }}
          animate={reduced ? { opacity: 1 } : { clipPath: 'inset(0% 0 0 0)' }}
          exit={reduced ? { opacity: 0 } : { opacity: 1, transition: { duration: 1.3 } }}
          transition={{ duration: 1.3, ease }}
          style={{ zIndex: 1 }}>
          <motion.div className="absolute inset-0 bg-[#ebeae7]"
            initial={reduced ? false : { y: '22%' }} animate={{ y: '0%' }} exit={reduced ? undefined : { y: '-14%' }}
            transition={{ duration: 1.3, ease }}>
            {/* حرکت آرام و پیوستهٔ بالا-پایین */}
            <motion.div className="absolute inset-0 scale-[1.07]"
              animate={reduced ? undefined : { y: ['-2.5%', '2.5%'] }}
              transition={{ duration: 5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}>
              <picture>
                <source media="(max-width: 767px)" srcSet={`${H}${s.img}-mobile.webp`} />
                <motion.img src={`${H}${s.img}.webp`} alt="" aria-hidden draggable={false}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  className="absolute inset-0 h-full w-full select-none object-cover max-md:top-auto max-md:h-[44%]"
                  style={{ transformOrigin: s.frame.origin }}
                  initial={reduced ? false : { scale: s.frame.scale * 1.12, x }}
                  animate={{ scale: s.frame.scale, x }}
                  transition={{ duration: 2.2, ease: [0.2, 0.7, 0.2, 1] }} />
              </picture>
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* مه روشن پشت متن برای خوانایی */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(to_left,#ebeae7_0%,rgb(235_234_231/.9)_32%,rgb(235_234_231/0)_62%)] max-md:bg-[linear-gradient(to_bottom,#ebeae7_0%,rgb(235_234_231/.92)_50%,rgb(235_234_231/0)_66%)]" />

      <div className={`${wrap} relative z-[3] flex h-full flex-col justify-center max-md:justify-start max-md:pt-14`}>
        <AnimatePresence mode="wait">
          <motion.div key={i} className="max-w-[780px]" initial="in" animate="show" exit="out">
            <motion.p variants={line(0)} className="mb-5 flex items-center gap-3 text-[14px] font-bold text-plate">
              <span aria-hidden className="h-[2px] w-8 bg-plate" />{s.eyebrow}
            </motion.p>
            <h1 className="text-[clamp(2.6rem,6.4vw,5.6rem)] font-black leading-[1.12] text-chalk">
              {s.lines.map((l, k) => (
                <span key={k} className="block overflow-hidden pb-[0.08em]">
                  <motion.span variants={line(0.08 + k * 0.1, reduced)} className="block">{l}</motion.span>
                </span>
              ))}
            </h1>
          </motion.div>
        </AnimatePresence>
        <motion.div initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-10 flex flex-wrap gap-3">
          <Btn href="#branches" onClick={near}>نزدیک‌ترین شعبه به من</Btn>
          <Btn href="#packages" tone="outline-dark">دیدن پکیج‌ها</Btn>
        </motion.div>
      </div>

      {/* نوار پیشرفت، شماره و فلش‌ها — مثل خط پایین اسلایدر مرجع */}
      <div className="absolute inset-x-0 bottom-0 z-[4]">
        <div className={`${wrap} flex items-center justify-between pb-6`}>
          <p className="text-[15px] font-bold tabular-nums text-chalk" aria-live="polite">
            <span className="text-[22px]">{faNum(i + 1).padStart(2, '۰')}</span>
            <span className="mx-2 text-rubber">/</span>
            <span className="text-rubber">{faNum(SLIDES.length).padStart(2, '۰')}</span>
          </p>
          <div className="flex gap-2 max-md:hidden">
            <button type="button" onClick={() => go(i - 1)} aria-label="اسلاید قبلی" className="grid size-12 cursor-pointer place-items-center border-2 border-chalk/15 text-chalk transition-colors hover:border-chalk hover:bg-chalk hover:text-white"><ChevronRight className="size-5" aria-hidden /></button>
            <button type="button" onClick={() => go(i + 1)} aria-label="اسلاید بعدی" className="grid size-12 cursor-pointer place-items-center border-2 border-chalk/15 text-chalk transition-colors hover:border-chalk hover:bg-chalk hover:text-white"><ChevronLeft className="size-5" aria-hidden /></button>
          </div>
        </div>
        <div className="h-[3px] w-full bg-chalk/10">
          <motion.div key={`${i}-${paused}`} className="h-full origin-right bg-plate"
            initial={{ scaleX: 0 }} animate={{ scaleX: paused || reduced ? 0 : 1 }}
            transition={{ duration: paused ? 0 : DURATION / 1000, ease: 'linear' }} />
        </div>
      </div>
    </section>
  )
}

function line(delay: number, reduced?: boolean | null) {
  return reduced
    ? { in: { opacity: 0 }, show: { opacity: 1 }, out: { opacity: 0 } }
    : {
      in: { y: '105%', opacity: 0 },
      show: { y: '0%', opacity: 1, transition: { delay: 0.35 + delay, duration: 0.9, ease: [0.2, 0.7, 0.2, 1] as const } },
      out: { y: '-60%', opacity: 0, transition: { duration: 0.4, ease: [0.7, 0, 0.8, 0.3] as const } },
    }
}
