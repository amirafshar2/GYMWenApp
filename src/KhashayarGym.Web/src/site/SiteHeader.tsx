import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Phone, Menu, X, MapPin, Clock, LayoutGrid, UserRound, ShoppingBag, LayoutDashboard } from 'lucide-react'
import { cartCount, useCart } from '@/lib/cart'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { brand } from '@/lib/brand'
import { faDigits, faNum } from '@/lib/fa'
import { Instagram } from '@/components/ui/brand-icons'
import { cn } from '@/lib/utils'
import { wrap } from './ui/SectionHead'

const LINKS = [
  { label: 'خانه', href: '/#top', id: 'top' },
  { label: 'شعبه‌ها', href: '/#branches', id: 'branches' },
  { label: 'رشته‌ها', href: '/#disciplines', id: 'disciplines' },
  { label: 'پکیج‌ها', href: '/#packages', id: 'packages' },
  { label: 'مربیان', href: '/#coaches', id: 'coaches' },
  { label: 'شاپ', href: '/shop', id: 'shop' },
  { label: 'گالری', href: '/#gallery', id: 'gallery' },
  { label: 'تماس', href: '/#consult', id: 'consult' },
]

/** لوگو + نام برند با فونت سیاه و کج، همان جای لوگوی «GYM» در صفحهٔ مرجع */
export function Logo({ light }: { light?: boolean }) {
  return (
    <a href="/#top" className="flex shrink-0 items-center gap-2.5" aria-label={`${brand.name} — صفحهٔ اصلی`}>
      <img src={brand.logo} alt="" width={44} height={44} className="size-11 rounded-full" />
      <span className={cn('inline-block -skew-x-[8deg] text-[28px] font-black leading-none', light ? 'text-white' : 'text-chalk')}>{brand.shortName}</span>
    </a>
  )
}

/** هدر سفید چسبان: لوگو، منوی متنی با خط زیر قرمزِ فعال، آیکون‌ها و پنل کناری */
export default function SiteHeader() {
  const [activeSection, setActive] = useState('top')
  const { pathname } = useLocation()
  const active = pathname.startsWith('/shop') || pathname === '/cart' ? 'shop' : pathname === '/' ? activeSection : ''
  const [scrolled, setScrolled] = useState(false)
  const [panel, setPanel] = useState(false)
  const { user } = useAuth()
  const items = cartCount(useCart())
  const account = user
    ? { to: '/profile', text: user.fullName?.split(' ')[0] ?? 'پروفایل', label: 'پروفایل من' }
    : { to: '/login', text: 'ورود', label: 'ورود یا ثبت‌نام' }

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on(); window.addEventListener('scroll', on, { passive: true })
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActive(e.target.id) }, { rootMargin: '-45% 0px -50% 0px' })
    // بخش‌ها ممکن است کمی دیرتر بار شوند (فایل جدا)؛ چند بار تلاش تا همه دیده شوند
    const seen = new Set<string>()
    const t = setInterval(() => {
      LINKS.forEach((l) => { const el = document.getElementById(l.id); if (el && !seen.has(l.id)) { seen.add(l.id); io.observe(el) } })
      if (seen.size === LINKS.length) clearInterval(t)
    }, 500)
    const stop = setTimeout(() => clearInterval(t), 10000)
    return () => { window.removeEventListener('scroll', on); clearInterval(t); clearTimeout(stop); io.disconnect() }
  }, [])

  useEffect(() => {
    if (!panel) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(false)
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [panel])

  return (
    <>
      <header
        style={{ top: 'var(--festival-h, 0px)' }}
        className={cn('kg-chrome fixed inset-x-0 z-50 border-b bg-white', scrolled ? 'border-transparent shadow-[0_6px_30px_rgb(0_0_0/0.07)]' : 'border-steel-2')}
      >
        <div className={cn(wrap, 'flex h-[78px] items-center gap-6 2xl:gap-10')}>
          <Logo />
          <nav aria-label="منوی اصلی" className="hidden flex-1 xl:block">
            <ul className="flex items-center gap-7">
              {LINKS.map((l) => (
                <li key={l.id}>
                  <a href={l.href} aria-current={active === l.id ? 'true' : undefined}
                    className={cn('relative py-2 text-[16px] font-bold transition-colors hover:text-plate',
                      "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:origin-right after:bg-chalk after:transition-transform after:duration-300",
                      active === l.id ? 'text-chalk after:scale-x-100' : 'text-chalk after:scale-x-0 hover:after:scale-x-100 hover:after:bg-plate')}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ms-auto flex items-center gap-1 xl:ms-0">
            <a href={`tel:${brand.phone}`} className="hidden items-center gap-2 px-3 text-[15px] font-bold text-chalk transition-colors hover:text-plate md:flex xl:hidden 2xl:flex">
              <Phone className="size-[18px]" aria-hidden />
              <span dir="ltr">{faDigits(brand.phone)}</span>
            </a>
            {items > 0 && (
              <Link to="/cart" aria-label={`سبد خرید، ${faNum(items)} کالا`} className="relative grid size-11 place-items-center text-chalk transition-colors hover:text-plate">
                <ShoppingBag className="size-5" aria-hidden />
                <span className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-plate text-[11px] font-bold text-white">{faNum(items)}</span>
              </Link>
            )}
            {user?.roles.some((r) => r !== 'Member') && (
              <Link to="/panel" className="hidden h-11 items-center gap-2 rounded-[3px] px-3 text-[15px] font-bold text-chalk transition-colors hover:text-plate md:flex">
                <LayoutDashboard className="size-5" aria-hidden />پنل
              </Link>
            )}
            <Link to={account.to} aria-label={account.label}
              className="flex h-11 items-center gap-2 rounded-[3px] px-3 text-[15px] font-bold text-chalk transition-colors hover:text-plate">
              <UserRound className="size-5" aria-hidden /><span className="hidden max-w-[110px] truncate sm:inline">{account.text}</span>
            </Link>
            <Link to="/join" className="ms-1 hidden h-11 items-center rounded-[3px] bg-plate px-5 text-[14px] font-bold text-white transition-colors hover:bg-plate-hi sm:inline-flex">ثبت‌نام آنلاین</Link>
            <button type="button" onClick={() => setPanel(true)} aria-label="باز کردن منو" aria-expanded={panel}
              className="grid size-11 cursor-pointer place-items-center text-chalk transition-colors hover:text-plate">
              <Menu className="size-6 xl:hidden" aria-hidden />
              <LayoutGrid className="hidden size-[22px] xl:block" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {panel && (
          <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="بستن منو" onClick={() => setPanel(false)} className="absolute inset-0 cursor-default bg-black/50" />
            <motion.aside role="dialog" aria-modal="true" aria-label="منو"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.45, ease: [0.7, 0, 0.2, 1] }}
              className="absolute inset-y-0 left-0 flex w-[min(420px,88vw)] flex-col overflow-y-auto bg-white p-8 sm:p-10">
              <div className="flex items-center justify-between">
                <Logo />
                <button type="button" onClick={() => setPanel(false)} aria-label="بستن" autoFocus
                  className="grid size-11 cursor-pointer place-items-center rounded-full bg-steel transition-colors hover:bg-plate hover:text-white"><X className="size-5" aria-hidden /></button>
              </div>
              <nav aria-label="منوی موبایل" className="mt-10">
                <ul className="grid gap-1">
                  {LINKS.map((l) => (
                    <li key={l.id}><a href={l.href} onClick={() => setPanel(false)} className="block border-b border-steel-2 py-3.5 text-[20px] font-bold text-chalk transition-colors hover:text-plate">{l.label}</a></li>
                  ))}
                </ul>
              </nav>
              <p className="mt-8 text-[15px] leading-8 text-rubber">{faNum(12)} شعبه در {brand.city} با سالن‌های جدای آقایان و بانوان. {brand.nearSlogan}.</p>
              <ul className="mt-6 grid gap-4 text-[15px] text-chalk">
                <li className="flex items-center gap-3"><Phone className="size-5 text-plate" aria-hidden /><a href={`tel:${brand.phone}`} dir="ltr" className="font-bold hover:text-plate">{faDigits(brand.phone)}</a></li>
                <li className="flex items-center gap-3"><MapPin className="size-5 text-plate" aria-hidden />{brand.city}، {faNum(12)} شعبه</li>
                <li className="flex items-center gap-3"><Clock className="size-5 text-plate" aria-hidden />ساعت کاری هر شعبه در فهرست شعبه‌ها</li>
              </ul>
              <div className="mt-auto flex items-center gap-3 pt-10">
                {brand.instagram && (
                  <a href={brand.instagram} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام"
                    className="grid size-11 place-items-center rounded-full bg-steel text-chalk transition-colors hover:bg-plate hover:text-white"><Instagram className="size-5" /></a>
                )}
                <Link to="/join" onClick={() => setPanel(false)} className="inline-flex h-11 flex-1 items-center justify-center rounded-[3px] bg-plate text-[15px] font-bold text-white hover:bg-plate-hi">ثبت‌نام آنلاین</Link>
                <Link to={account.to} onClick={() => setPanel(false)} className="inline-flex h-11 items-center justify-center gap-2 rounded-[3px] border border-steel-2 px-4 text-[15px] font-bold text-chalk hover:border-chalk"><UserRound className="size-4" aria-hidden />{account.text}</Link>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
