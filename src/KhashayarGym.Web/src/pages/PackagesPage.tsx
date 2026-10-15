import { useEffect } from 'react'
import SitePricing from '../site/SitePricing'
import SiteFaq from '../site/SiteFaq'
import { brand } from '../lib/brand'

export default function PackagesPage() {
  useEffect(() => { document.title = `پکیج‌ها و قیمت‌های ${brand.shortName}` }, [])
  return <div className="pt-24"><SitePricing /><SiteFaq /></div>
}
