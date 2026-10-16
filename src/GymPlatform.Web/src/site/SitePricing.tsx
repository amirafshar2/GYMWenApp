import { CalendarDays, Dumbbell, Infinity as InfinityIcon, Salad, UserRound } from 'lucide-react'
import PricingSection, { type PricingGroup, type PricingPlan } from '@/components/ui/pricing-section'
import { api, type Pkg } from '@/lib/api'
import { useData } from '@/lib/useData'
import { faNum, tomanShort } from '@/lib/fa'
import { rebrand } from '@/lib/brand'
import { useNavigate } from 'react-router-dom'

const short = (n: number) => tomanShort(n)

const toPlan = (p: Pkg): PricingPlan => {
  const price = short(p.discountedPriceToman ?? p.priceToman)
  const monthly = short(p.monthlyEquivalentToman)
  return {
    id: p.slug,
    name: p.name,
    description: p.tagline ?? '',
    price: price.value,
    priceUnit: price.unit,
    oldPrice: p.discountedPriceToman ? `${short(p.priceToman).value} ${short(p.priceToman).unit}` : undefined,
    badge: p.discountPercent ? `${faNum(p.discountPercent)}٪ تخفیف جشنواره` : undefined,
    note: p.durationMonths > 1 ? `ماهانه حدود ${monthly.value} ${monthly.unit}` : undefined,
    buttonText: 'انتخاب این پکیج',
    popular: p.isFeatured,
    features: [
      { text: `${faNum(p.durationMonths)} ماه`, icon: <CalendarDays size={20} aria-hidden /> },
      p.sessions
        ? { text: `${faNum(p.sessions)} جلسه`, icon: <Dumbbell size={20} aria-hidden /> }
        : { text: 'جلسات نامحدود', icon: <InfinityIcon size={20} aria-hidden /> },
      ...(p.includesPersonalCoach ? [{ text: 'مربی اختصاصی', icon: <UserRound size={20} aria-hidden /> }] : []),
      ...(p.includesNutritionPlan ? [{ text: 'برنامهٔ تغذیه', icon: <Salad size={20} aria-hidden /> }] : []),
    ],
    includes: ['شامل:', ...p.features.map(rebrand)],
  }
}

/** پکیج‌ها — Pricing Section از 21st.dev با رنگ‌های تم (قیمت‌ها از API، تخفیف جشنواره اعمال‌شده) */
export default function SitePricing() {
  const nav = useNavigate()
  const { data: pkgs = [] } = useData('packages', api.packages)
  if (!pkgs.length) return <section id="packages" className="h-[900px]" />
  const membership = pkgs.filter((p) => p.category === 'Gym' && p.slug !== 'month-12')
  const special = pkgs.filter((p) => p.category !== 'Gym' || p.slug === 'month-12')
  const maxOff = Math.max(0, ...membership.map((p) => p.discountPercent ?? 0))
  const groups: PricingGroup[] = [
    { key: 'gym', label: 'عضویت سالن', tag: maxOff ? `تا ${faNum(maxOff)}٪ تخفیف` : undefined, plans: membership.map(toPlan) },
    { key: 'special', label: 'پکیج‌های تخصصی', plans: special.map(toPlan) },
  ]
  return (
    <section id="packages" aria-labelledby="packages-title">
      <PricingSection
        id="packages-grid"
        title={<span id="packages-title">عضویتی که با</span>}
        accent="برنامه‌ات جور است"
        subtitle="قیمت‌ها به تومان است و تخفیف جشنوارهٔ فعال خودکار روی پکیج‌های مشمول اعمال شده. پکیج‌های تخصصی: مربی خصوصی، تغذیه و صخره‌نوردی."
        groups={groups}
        onSelect={(plan) => {
          try { sessionStorage.setItem('chosen-package', plan.id) } catch { /* */ }
          window.dispatchEvent(new Event('kg:package'))
          nav(`/join?package=${encodeURIComponent(plan.id)}`)
        }}
      />
    </section>
  )
}
