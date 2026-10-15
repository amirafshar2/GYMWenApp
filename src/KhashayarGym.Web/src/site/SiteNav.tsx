import { useEffect, useState } from 'react'
import { MapPin, Dumbbell, Users, BadgePercent, MessageCircle } from 'lucide-react'
import { NavBar } from '@/components/ui/tubelight-navbar'

const ITEMS = [
  { name: 'شعبه‌ها', url: '/#branches', icon: MapPin, id: 'branches' },
  { name: 'رشته‌ها', url: '/#disciplines', icon: Dumbbell, id: 'disciplines' },
  { name: 'مربیان', url: '/#coaches', icon: Users, id: 'coaches' },
  { name: 'پکیج‌ها', url: '/#packages', icon: BadgePercent, id: 'packages' },
  { name: 'مشاوره', url: '/#consult', icon: MessageCircle, id: 'consult' },
]

/** منوی Tubelight Navbar از 21st.dev؛ تب فعال با بخشِ در دید هماهنگ می‌شود */
export default function SiteNav() {
  const [active, setActive] = useState('شعبه‌ها')
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) {
        const it = ITEMS.find((i) => i.id === e.target.id)
        if (it) setActive(it.name)
      }
    }, { rootMargin: '-45% 0px -50% 0px' })
    const t = setTimeout(() => ITEMS.forEach((i) => { const el = document.getElementById(i.id); if (el) io.observe(el) }), 500)
    return () => { clearTimeout(t); io.disconnect() }
  }, [])
  return <NavBar items={ITEMS} active={active} className="sm:top-[var(--festival-h,0px)]" />
}
