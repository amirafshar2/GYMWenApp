import SiteHero from '../site/SiteHero'
import SiteStats from '../site/SiteStats'
import SiteBranches from '../site/SiteBranches'
import SiteDisciplines from '../site/SiteDisciplines'
import SiteCoaches from '../site/SiteCoaches'
import SitePricing from '../site/SitePricing'
import SiteFaq from '../site/SiteFaq'
import SiteContact from '../site/SiteContact'

export default function Home() {
  return (
    <>
      <SiteHero />
      <SiteBranches />
      <SiteStats />
      <SiteDisciplines />
      <SiteCoaches />
      <SitePricing />
      <SiteFaq />
      <SiteContact />
    </>
  )
}
