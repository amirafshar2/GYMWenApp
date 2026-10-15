import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { brand } from '../lib/brand'
import { scrollToId } from '../lib/motion'

const NAV = [
  { id: 'branches', label: 'شعبه‌ها' },
  { id: 'disciplines', label: 'رشته‌ها' },
  { id: 'coaches', label: 'مربیان' },
  { id: 'packages', label: 'پکیج‌ها' },
  { id: 'consult', label: 'مشاورهٔ رایگان' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (id: string) => {
    setOpen(false)
    if (pathname === '/') scrollToId(id)
    else navigate(`/#${id}`)
  }

  return (
    <header
      className={`fixed inset-x-0 top-[var(--festival-h,0px)] z-50 transition-[background-color,backdrop-filter] duration-500 ${
        scrolled || open ? 'bg-iron/85 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:h-20 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={brand.logo} alt="" width={44} height={44} className="size-10 md:size-11" />
          <span className="leading-tight">
            <span className="block text-lg font-black">{brand.shortName}</span>
            <span className="block text-[10px] tracking-[.18em] text-rubber" dir="ltr">{brand.latinName}</span>
          </span>
        </Link>

        <nav aria-label="منوی اصلی" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[15px] text-chalk/80">
            {NAV.map((n) => (
              <li key={n.id}>
                <button onClick={() => go(n.id)} className="transition-colors hover:text-plate-hi">{n.label}</button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={() => go('packages')} className="btn-plate hidden !py-2.5 sm:inline-flex">ثبت‌نام آنلاین</button>
          <button
            className="grid size-11 place-items-center rounded-full border border-steel-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'بستن منو' : 'باز کردن منو'}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-5">
              <span className={`absolute inset-x-0 top-0 h-0.5 bg-chalk transition-transform ${open ? 'translate-y-[5px] rotate-45' : ''}`} />
              <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-chalk transition-transform ${open ? '-translate-y-[5px] -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="منوی موبایل" className="border-t border-steel-2 px-4 pb-6 lg:hidden">
          <ul className="flex flex-col">
            {NAV.map((n) => (
              <li key={n.id}>
                <button onClick={() => go(n.id)} className="w-full py-4 text-right text-xl font-bold">{n.label}</button>
              </li>
            ))}
          </ul>
          <button onClick={() => go('packages')} className="btn-plate mt-2 w-full">ثبت‌نام آنلاین</button>
        </nav>
      )}
    </header>
  )
}
