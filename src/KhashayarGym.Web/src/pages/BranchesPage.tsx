import { useEffect } from 'react'
import Branches from '../sections/Branches'
import { brand } from '../lib/brand'

export default function BranchesPage() {
  useEffect(() => { document.title = `شعبه‌های ${brand.shortName} در ${brand.city}` }, [])
  return <div className="pt-24"><Branches standalone /></div>
}
