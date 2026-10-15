import { Building2, Users, Trophy, AtSign } from 'lucide-react'
import Stats from '@/components/ui/stats-05'
import { CountUp } from '@/components/ui/count-up'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'

/** «چرا خشایار؟» — Stats Section + Count Up از 21st.dev */
export default function SiteStats() {
  const { data: s } = useData('stats', api.stats)
  if (!s) return <div className="h-[420px]" />
  const n = (v: number, suffix = '') => <><CountUp to={v} locale="fa-IR" />{suffix}</>
  return (
    <section aria-label={brand.whySlogan}>
      <Stats
        title={brand.whySlogan}
        subtitle="باشگاه نزدیک خانه را راحت‌تر ادامه می‌دهی؛ مربی، تغذیه و فروشگاه هم زیر یک سقف."
        className="!max-w-6xl"
        items={[
          { icon: Building2, iconClassName: 'text-blue-500', value: n(s.branches), label: `شعبه در ${brand.city}` },
          { icon: Users, iconClassName: 'text-sky-400', value: n(s.members, '+'), label: 'شاگرد فعال' },
          { icon: Trophy, iconClassName: 'text-amber-400', value: n(s.yearsActive), label: 'سال سابقه' },
          { icon: AtSign, iconClassName: 'text-pink-500', value: n(Math.round(s.instagramFollowers / 1000), 'K'), label: 'دنبال‌کننده در اینستاگرام' },
        ]}
      />
    </section>
  )
}
