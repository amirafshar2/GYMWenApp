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

/** بخش‌های زیر هیرو در یک فایل جدا بار می‌شوند تا هیرو (بزرگ‌ترین المان صفحه) زودتر نمایش داده شود */
export default function HomeRest() {
  return (
    <>
      <SiteWhatWeDo />
      <SiteWhy />
      <SiteVideo />
      <SiteOffer />
      <SiteBranches />
      <SitePricing />
      <SiteShop />
      <SiteEvents />
      <SiteGallery />
      <SiteCoaches />
      <SiteFaq />
      <SiteContact />
    </>
  )
}
