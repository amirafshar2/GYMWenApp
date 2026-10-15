import { CountUp } from '@/components/ui/count-up'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { SectionHead } from './ui/SectionHead'

/** «چرا خشایار؟» — جملهٔ سردبیری + ردیف اعداد با خط‌های مویی (Count Up از 21st.dev) */
export default function SiteStats() {
  const { data: s } = useData('stats', api.stats)
  const items = s ? [
    { v: s.branches, suf: '', label: `شعبه در ${brand.city}` },
    { v: s.members, suf: '+', label: 'شاگرد فعال' },
    { v: s.yearsActive, suf: '', label: 'سال سابقه' },
    { v: Math.round(s.instagramFollowers / 1000), suf: ' هزار', label: 'دنبال‌کننده در اینستاگرام' },
  ] : []
  return (
    <section aria-labelledby="why-title" className="border-y border-chalk/15 bg-steel">
      <div className="mx-auto max-w-[1440px] px-[clamp(20px,3.2vw,48px)] py-[clamp(72px,9vw,140px)]">
        <SectionHead
          id="why-title"
          eyebrow={brand.whySlogan}
          title="باشگاه نزدیک خانه را"
          accent="راحت‌تر ادامه می‌دهی."
          body="با یک عضویت، سالن هم‌جنس در هر محله در دسترس است؛ مربی، برنامهٔ تغذیه و فروشگاه هم زیر یک سقف."
        />
        <dl className="mt-16 grid grid-cols-2 border-t border-chalk/15 md:grid-cols-4">
          {items.map((it, i) => (
            <div key={it.label} className={['flex flex-col-reverse gap-3 border-chalk/15 py-8 pl-6', i % 2 === 0 ? 'border-l' : '', i < 2 ? 'border-b md:border-b-0' : '', i === 1 ? 'md:border-l' : '', i === 3 ? 'md:border-l-0' : 'md:border-l'].join(' ')}>
              <dt className="text-sm text-rubber">{it.label}</dt>
              <dd className="text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-none tabular-nums">
                <CountUp to={it.v} locale="fa-IR" />{it.suf && <span className="text-[0.45em] text-rubber">{it.suf}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
