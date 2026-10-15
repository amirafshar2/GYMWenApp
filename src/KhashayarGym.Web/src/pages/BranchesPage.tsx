import { useEffect } from 'react'
import SiteBranches from '../site/SiteBranches'
import { brand } from '../lib/brand'

export default function BranchesPage() {
  useEffect(() => { document.title = `شعبه‌های ${brand.shortName} در ${brand.city}` }, [])
  return <div className="pt-20"><SiteBranches /></div>
}
