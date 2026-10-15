import { Dumbbell, Flame, Activity, Cable, HeartPulse, PersonStanding, Flower2, Timer, Mountain } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { SectionHead } from './ui/SectionHead'

const ITEMS = [
  { title: 'بدنسازی', note: 'حجم، قدرت و فرم بدن با برنامهٔ شخصی', icon: Dumbbell },
  { title: 'کراس‌فیت', note: 'تمرین‌های شدید و متنوع گروهی', icon: Flame },
  { title: 'فیتنس فانکشنال', note: 'حرکت‌هایی که در زندگی روزمره به کار می‌آیند', icon: Activity },
  { title: 'TRX', note: 'تمرین با وزن بدن و تسمه‌های معلق', icon: Cable },
  { title: 'ایروبیک', note: 'استقامت قلبی و چربی‌سوزی با ریتم', icon: HeartPulse },
  { title: 'پیلاتس', note: 'قدرت مرکز بدن و فرم صحیح', icon: PersonStanding },
  { title: 'یوگا', note: 'انعطاف، تنفس و تمرکز', icon: Flower2 },
  { title: 'CX WORX', note: 'سی دقیقه تمرین فشرده برای میان‌تنه', icon: Timer },
  { title: 'صخره‌نوردی', note: 'دیوار سالنی، بولدرینگ و طناب', icon: Mountain },
]

/** رشته‌ها — شبکهٔ سه‌ستونه با خطوط مویی (سبک Minimal/Swiss از اسکیل ui-ux-pro-max) */
export default function SiteDisciplines() {
  const reduced = useReducedMotion()
  return (
    <section id="disciplines" aria-labelledby="disc-title" className="mx-auto max-w-[1440px] px-[clamp(20px,3.2vw,48px)] py-[clamp(72px,9vw,140px)]">
      <SectionHead
        id="disc-title"
        eyebrow="رشته‌ها"
        title="۹ رشته،"
        accent="یک عضویت."
        body="هر شعبه بخشی از این رشته‌ها را دارد؛ روی هر شعبه در نقشه می‌بینی کدام."
      />
      <ul className="mt-16 grid border-t border-r border-chalk/15 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((d, i) => (
          <motion.li
            key={d.title}
            {...(reduced ? {} : { initial: { opacity: 0, y: 12 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.35, delay: (i % 3) * 0.06, ease: [0.2, 0.7, 0.2, 1] as const } })}
            className="group flex min-h-[220px] flex-col justify-between gap-10 border-b border-l border-chalk/15 p-[clamp(20px,2.4vw,36px)] transition-colors duration-300 hover:bg-steel"
          >
            <d.icon className="size-7 stroke-[1.5] text-chalk transition-colors duration-300 group-hover:text-plate" aria-hidden />
            <div>
              <h3 className="text-[clamp(1.5rem,2.2vw,2rem)] font-medium leading-tight">{d.title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-rubber">{d.note}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
