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
  // منوی خود هیرو بالای صفحه است؛ Tubelight بعد از عبور از هیرو ظاهر می‌شود
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(window.scrollY > window.innerHeight * 0.7)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <div className={`transition-opacity duration-500 ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`} inert={!show}>
      <NavBar items={ITEMS} active={active} className="sm:top-[var(--festival-h,0px)]" />
    </div>
  )
}
