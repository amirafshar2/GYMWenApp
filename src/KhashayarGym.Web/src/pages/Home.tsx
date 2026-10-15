import SiteHero from '../site/SiteHero'
import SiteWhatWeDo from '../site/SiteWhatWeDo'
import SiteWhy from '../site/SiteWhy'
import SiteVideo from '../site/SiteVideo'
import SiteOffer from '../site/SiteOffer'
import SiteBranches from '../site/SiteBranches'
import SitePricing from '../site/SitePricing'
import SiteEvents from '../site/SiteEvents'
import SiteCoaches from '../site/SiteCoaches'
import SiteFaq from '../site/SiteFaq'
import SiteContact from '../site/SiteContact'

/** ترتیب بخش‌ها از روی صفحهٔ مرجع (GYM Store / Sports Complex) + بخش‌های لازمِ پروژه */
export default function Home() {
  return (
    <>
      <SiteHero />
      <SiteWhatWeDo />
      <SiteWhy />
      <SiteVideo />
      <SiteOffer />
      <SiteBranches />
      <SitePricing />
      <SiteEvents />
      <SiteCoaches />
      <SiteFaq />
      <SiteContact />
    </>
  )
}
