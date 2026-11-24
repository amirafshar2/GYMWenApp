import { CalendarDays, Dumbbell, Infinity as InfinityIcon, Salad, UserRound } from 'lucide-react'
import PricingSection, { type PricingGroup, type PricingPlan } from '@/components/ui/pricing-section'
import { api, type Pkg } from '@/lib/api'
import { useData } from '@/lib/useData'
import { fill, site, splitAccent } from '@/lib/site'
import { faNum, tomanShort } from '@/lib/fa'
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
    badge: p.discountPercent ? `${faNum(p.discountPercent)}% Aktionsrabatt` : undefined,
    note: p.durationMonths > 1 ? `monatlich ca. ${monthly.value} ${monthly.unit}` : undefined,
    buttonText: 'Dieses Paket wählen',
    popular: p.isFeatured,
    features: [
      { text: `${faNum(p.durationMonths)} ${p.durationMonths === 1 ? 'Monat' : 'Monate'}`, icon: <CalendarDays size={20} aria-hidden /> },
      p.sessions
        ? { text: `${faNum(p.sessions)} Einheiten`, icon: <Dumbbell size={20} aria-hidden /> }
        : { text: 'Unbegrenzte Einheiten', icon: <InfinityIcon size={20} aria-hidden /> },
      ...(p.includesPersonalCoach ? [{ text: 'Persönlicher Trainer', icon: <UserRound size={20} aria-hidden /> }] : []),
      ...(p.includesNutritionPlan ? [{ text: 'Ernährungsplan', icon: <Salad size={20} aria-hidden /> }] : []),
    ],
    includes: ['Enthält:', ...p.features],
  }
}

/** Pakete — Pricing Section von 21st.dev in Theme-Farben (Preise aus der API, Aktionsrabatt berücksichtigt) */
export default function SitePricing() {
  const nav = useNavigate()
  const { data: pkgs = [] } = useData('packages', api.packages)
  if (!pkgs.length) return <section id="packages" className="h-[900px]" />
  // Unbegrenzte Studiomitgliedschaft in der ersten Gruppe; Einheiten- und Spezialpakete (Trainer, Ernährung, …) in der zweiten
  const membership = pkgs.filter((p) => p.category === 'Gym' && !p.sessions)
  const special = pkgs.filter((p) => p.category !== 'Gym' || !!p.sessions)
  const [title, accent] = splitAccent(site.home.pricing.title)
  const maxOff = Math.max(0, ...membership.map((p) => p.discountPercent ?? 0))
  const groups: PricingGroup[] = [
    { key: 'gym', label: 'Studio-Mitgliedschaft', tag: maxOff ? `bis ${faNum(maxOff)}% Rabatt` : undefined, plans: membership.map(toPlan) },
    { key: 'special', label: 'Spezialpakete', plans: special.map(toPlan) },
  ].filter((g) => g.plans.length > 0)
  return (
    <section id="packages" aria-labelledby="packages-title">
      <PricingSection
        id="packages-grid"
        title={<span id="packages-title">{title}</span>}
        accent={accent}
        subtitle={fill(site.home.pricing.text)}
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
