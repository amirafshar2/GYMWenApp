import { Dumbbell, Flame, Activity, Cable, HeartPulse, PersonStanding, Flower2, Timer, Mountain } from 'lucide-react'
import { FeatureVelocity } from '@/components/ui/feature-velocity'

/** رشته‌ها — Feature Velocity از 21st.dev */
export default function SiteDisciplines() {
  return (
    <FeatureVelocity
      id="disciplines"
      heading={<>۹ رشته،<br />یک عضویت.</>}
      description="هر شعبه بخشی از این رشته‌ها را دارد؛ روی کارت هر شعبه می‌بینید کدام."
      cards={[
        { title: 'بدنسازی', label: 'حجم، قدرت و فرم بدن', color: 'from-blue-500/25', icon: Dumbbell },
        { title: 'کراس‌فیت', label: 'تمرین شدید گروهی', color: 'from-orange-500/20', icon: Flame },
        { title: 'فیتنس فانکشنال', label: 'حرکت‌های کاربردی روزمره', color: 'from-emerald-500/20', icon: Activity },
        { title: 'TRX', label: 'وزن بدن و تسمهٔ معلق', color: 'from-sky-500/20', icon: Cable },
        { title: 'ایروبیک', label: 'استقامت و چربی‌سوزی', color: 'from-rose-500/20', icon: HeartPulse },
        { title: 'پیلاتس', label: 'قدرت مرکز بدن', color: 'from-violet-500/20', icon: PersonStanding },
        { title: 'یوگا', label: 'انعطاف، تنفس و تمرکز', color: 'from-teal-500/20', icon: Flower2 },
        { title: 'CX WORX', label: 'سی دقیقه تمرین میان‌تنه', color: 'from-amber-500/20', icon: Timer },
        { title: 'صخره‌نوردی', label: 'دیوار، بولدرینگ و طناب', color: 'from-blue-600/25', icon: Mountain },
      ]}
    />
  )
}
