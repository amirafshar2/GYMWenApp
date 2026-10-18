import type { ComponentType } from 'react'
import SiteWhatWeDo from '../site/SiteWhatWeDo'
import SiteWhy from '../site/SiteWhy'
import SiteVideo from '../site/SiteVideo'
import SiteOffer from '../site/SiteOffer'
import SiteBranches from '../site/SiteBranches'
import SitePricing from '../site/SitePricing'
import SiteEvents from '../site/SiteEvents'
import SiteShop from '../site/SiteShop'
import SiteGallery from '../site/SiteGallery'
import SiteCoaches from '../site/SiteCoaches'
import SiteFaq from '../site/SiteFaq'
import SiteContact from '../site/SiteContact'
import { site, type SectionKey } from '@/lib/site'

const SECTIONS: Record<SectionKey, ComponentType> = {
  intro: SiteWhatWeDo, why: SiteWhy, video: SiteVideo, offer: SiteOffer, branches: SiteBranches, pricing: SitePricing,
  shop: SiteShop, events: SiteEvents, gallery: SiteGallery, coaches: SiteCoaches, faq: SiteFaq, contact: SiteContact,
}

/** بخش‌هایی که به ماژول خاموش وابسته‌اند نمایش داده نمی‌شوند */
const moduleOff = (k: SectionKey) =>
  (k === 'shop' && !site.modules.shop) || (k === 'coaches' && !site.modules.coaches) ||
  (k === 'events' && !site.modules.festival) || (k === 'contact' && !site.modules.consultation)

/**
 * بخش‌های زیر هیرو با ترتیب و روشن/خاموشی که مالک در «تنظیمات سایت» انتخاب کرده؛
 * در یک فایل جدا بار می‌شوند تا هیرو (بزرگ‌ترین المان صفحه) زودتر نمایش داده شود.
 */
export default function HomeRest() {
  const list = (site.home?.sections ?? []).filter((s) => s.enabled && SECTIONS[s.key] && !moduleOff(s.key))
  return <>{list.map(({ key }) => { const C = SECTIONS[key]; return <C key={key} /> })}</>
}
