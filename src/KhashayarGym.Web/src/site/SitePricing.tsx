import { PricingSection } from '@/components/ui/pricing-section'
import type { PricingTier } from '@/components/ui/pricing-card'
import { api, type Pkg } from '@/lib/api'
import { useData } from '@/lib/useData'
import { faNum, tomanShort } from '@/lib/fa'
import { rebrand } from '@/lib/brand'

const TOTAL = 'مبلغ کل'
const MONTHLY = 'ماهانه'

const short = (n: number) => { const s = tomanShort(n); return `${s.value} ${s.unit.replace(' تومان', '')}` }

const toTier = (p: Pkg): PricingTier & { id: string } => ({
  id: p.slug,
  name: p.name,
  // NumberFlow ارقام فارسی ندارد؛ قیمت به‌صورت متن فارسی کوتاه (مثلاً «۲٫۶ میلیون») داده می‌شود
  price: { [TOTAL]: short(p.discountedPriceToman ?? p.priceToman), [MONTHLY]: short(p.monthlyEquivalentToman) },
  description: [p.tagline, p.discountPercent ? `${faNum(p.discountPercent)}٪ تخفیف جشنواره` : null].filter(Boolean).join(' · '),
  features: [`${faNum(p.durationMonths)} ماه، ${p.sessions ? `${faNum(p.sessions)} جلسه` : 'جلسات نامحدود'}`, ...p.features.map(rebrand)],
  cta: 'انتخاب این پکیج',
  popular: p.isFeatured,
  highlighted: p.includesPersonalCoach,
})

/** پکیج‌ها — Pricing Section از 21st.dev (قیمت‌ها از API، تخفیف جشنواره اعمال‌شده) */
export default function SitePricing() {
  const { data: pkgs = [] } = useData('packages', api.packages)
  if (!pkgs.length) return <div id="packages" className="h-[700px]" />
  const membership = pkgs.filter((p) => p.category === 'Gym' && p.slug !== 'month-12').map(toTier)
  const special = pkgs.filter((p) => p.category !== 'Gym' || p.slug === 'month-12').map(toTier)
  const cardProps = {
    locale: 'fa-IR',
    currencyFormat: { maximumFractionDigits: 0 },
    priceSuffix: (f: string) => (f === MONTHLY ? 'تومان در ماه' : 'تومان'),
    popularLabel: '🔥 محبوب‌ترین',
    onSelect: (t: PricingTier) => {
      try { sessionStorage.setItem('chosen-package', (t as PricingTier & { id: string }).id) } catch { /* */ }
      document.getElementById('consult')?.scrollIntoView({ behavior: 'smooth' })
    },
  }
  return (
    <div className="px-4">
      <PricingSection id="packages" title="پکیج‌های عضویت" subtitle="قیمت‌ها به تومان است؛ تخفیف جشنوارهٔ فعال خودکار اعمال شده." frequencies={[TOTAL, MONTHLY]} discountFrequency="" tiers={membership} cardProps={cardProps} />
      <PricingSection title="پکیج‌های تخصصی" subtitle="مربی خصوصی، برنامهٔ تغذیه و صخره‌نوردی." frequencies={[TOTAL, MONTHLY]} discountFrequency="" tiers={special} cardProps={cardProps} />
    </div>
  )
}
