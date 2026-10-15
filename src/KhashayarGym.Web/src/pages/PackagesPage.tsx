import { useEffect } from 'react'
import Packages from '../sections/Packages'
import Faq from '../sections/Faq'
import { brand } from '../lib/brand'

export default function PackagesPage() {
  useEffect(() => { document.title = `پکیج‌ها و قیمت‌های ${brand.shortName}` }, [])
  return <div className="pt-24"><Packages standalone /><Faq /></div>
}
