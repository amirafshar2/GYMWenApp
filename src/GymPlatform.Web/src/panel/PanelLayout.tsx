import { createContext, Suspense, useContext, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, Coffee, Dumbbell, FileSignature, HelpCircle, MapPin, MessageSquareText, Package, Paintbrush, Presentation, Rocket, UserCog, ScanLine, ShoppingBag, Tags, UsersRound, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { can, panelApi, ROLE_LABEL, type PanelMe } from '@/lib/panel'
import { faNum } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { useRequireAuth } from '@/member/MemberCard'
import { Notice, Spinner } from '@/member/ui'
import { presentation } from './PresentationBar'
import { site } from '@/lib/site'
import { DemoStrip } from '@/site/SiteBanner'
import { SetupGuide } from './SetupGuide'

const Ctx = createContext<PanelMe | null>(null)
/** کارمند فعلی (نقش‌ها و شعبه‌ها از سرور) */
export const usePanel = () => useContext(Ctx)!

export interface NavItem { to: string; label: string; icon: LucideIcon; roles: string[]; group: string }
export const NAV: NavItem[] = [
  { to: '/panel/dashboard', label: 'داشبورد', icon: BarChart3, roles: ['BranchManager'], group: 'گزارش' },
  { to: '/panel/reception', label: 'پذیرش و ورود', icon: ScanLine, roles: ['Reception', 'BranchManager'], group: 'روزانه' },
  { to: '/panel/canteen', label: 'تابلوی بوفه', icon: Coffee, roles: ['CanteenStaff', 'BranchManager'], group: 'روزانه' },
  { to: '/panel/coach', label: 'شاگردهای من', icon: Dumbbell, roles: ['Coach'], group: 'روزانه' },
  { to: '/panel/shop', label: 'فروشگاه و انبار', icon: ShoppingBag, roles: ['ShopStaff', 'BranchManager'], group: 'فروش' },
  { to: '/panel/menu', label: 'منوی بوفه', icon: UtensilsCrossed, roles: ['CanteenStaff', 'BranchManager'], group: 'فروش' },
  { to: '/panel/setup', label: 'دستیار راه‌اندازی', icon: Rocket, roles: ['SuperAdmin'], group: 'سایت' },
  { to: '/panel/site', label: 'تنظیمات سایت', icon: Paintbrush, roles: ['SuperAdmin'], group: 'سایت' },
  { to: '/panel/branches', label: 'شعبه‌ها', icon: MapPin, roles: ['SuperAdmin'], group: 'سایت' },
  { to: '/panel/faq', label: 'سؤالات پرتکرار', icon: HelpCircle, roles: ['SuperAdmin'], group: 'سایت' },
  { to: '/panel/packages', label: 'پکیج‌ها و قیمت', icon: Package, roles: ['SuperAdmin'], group: 'مدیریت' },
  { to: '/panel/campaigns', label: 'جشنواره و کد تخفیف', icon: Tags, roles: ['SuperAdmin'], group: 'مدیریت' },
  { to: '/panel/contract', label: 'قرارداد عضویت', icon: FileSignature, roles: ['SuperAdmin'], group: 'مدیریت' },
  { to: '/panel/coaches', label: 'مربیان', icon: UserCog, roles: ['SuperAdmin'], group: 'مدیریت' },
  { to: '/panel/staff', label: 'کارکنان و دسترسی', icon: UsersRound, roles: ['SuperAdmin'], group: 'مدیریت' },
  { to: '/panel/sms', label: 'پیامک‌ها', icon: MessageSquareText, roles: ['SuperAdmin'], group: 'مدیریت' },
]

export default function PanelLayout() {
  const { ready, user } = useRequireAuth()
  const [me, setMe] = useState<PanelMe | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const { pathname } = useLocation()

  // در موبایل منوی افقی است؛ گزینهٔ فعال را در دید نگه دار
  useEffect(() => { document.querySelector('nav[aria-label="منوی پنل"] a[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [pathname, me])
  useEffect(() => { if (ready && user) panelApi.me().then(setMe).catch((e: Error) => setErr(e.message)) }, [ready, user])
  if (err) return <div className="mx-auto max-w-lg p-10"><Notice tone="err">{err}</Notice></div>
  if (!me) return <Spinner />

  // ماژول خاموش (فروشگاه، بوفه) از منوی پنل هم حذف می‌شود
  const off = (to: string) => (!site.modules.shop && to === '/panel/shop') || (!site.modules.canteen && (to === '/panel/canteen' || to === '/panel/menu'))
  const items = NAV.filter((n) => can(me, ...n.roles) && !off(n.to))
  const isSuper = me.roles.includes('SuperAdmin')
  // مدیر کلِ سایتی که هنوز منتشر نشده مستقیم به دستیار راه‌اندازی می‌رود
  const home = isSuper && !site.published ? '/panel/setup' : items[0]?.to ?? '/profile'
  if (pathname === '/panel' || pathname === '/panel/') return <Navigate to={home} replace />
  const current = NAV.find((n) => pathname.startsWith(n.to))
  const groups = [...new Set(items.map((i) => i.group))]

  return (
    <Ctx.Provider value={me}>
      <div className="min-h-[calc(100svh-78px)] bg-steel lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-steel-2 bg-white lg:sticky lg:top-[78px] lg:h-[calc(100svh-78px)] lg:overflow-y-auto lg:border-b-0 lg:border-l">
          <div className="hidden p-5 lg:block">
            <p className="text-[13px] text-rubber">پنل کارکنان</p>
            <p className="mt-1 truncate text-[17px] font-black text-chalk">{me.fullName ?? 'کارمند'}</p>
            <p className="mt-2 flex flex-wrap gap-1">
              {me.roles.filter((r) => ROLE_LABEL[r]).map((r) => <span key={r} className="rounded-full bg-steel px-2 py-0.5 text-[11px] font-bold text-rubber">{ROLE_LABEL[r]}</span>)}
            </p>
            <p className="mt-3 text-[12px] text-rubber">{me.roles.includes('SuperAdmin') ? `همهٔ ${faNum(me.branches.length)} شعبه` : me.branches.map((b) => b.name).join('، ') || 'بدون شعبه'}</p>
          </div>
          <nav aria-label="منوی پنل" className="flex gap-1 overflow-x-auto p-2 lg:block lg:p-3 lg:pt-0">
            {groups.map((g) => (
              <div key={g} className="contents lg:mb-4 lg:block">
                <p className="hidden px-3 pb-1 pt-2 text-[11px] font-bold text-rubber lg:block">{g}</p>
                {items.filter((i) => i.group === g).map((i) => (
                  <NavLink key={i.to} to={i.to}
                    className={({ isActive }) => cn('flex shrink-0 items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-[14px] font-bold transition-colors',
                      isActive ? 'bg-plate text-white' : 'text-chalk hover:bg-steel')}>
                    <i.icon className="size-[18px] shrink-0" aria-hidden />{i.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className="hidden p-3 pt-0 lg:block">
            <button type="button" onClick={() => presentation.set(true)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] border border-dashed border-steel-2 px-3 py-2.5 text-[13px] font-bold text-rubber hover:border-plate hover:text-plate">
              <Presentation className="size-[18px]" aria-hidden />حالت پرزنت (جابه‌جایی بین نماها)
            </button>
          </div>
        </aside>
        <div className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
          {site.demo && <DemoStrip className="mb-5 rounded-[6px]" />}
          {isSuper && <SetupGuide />}
          {current && !can(me, ...current.roles) ? <Notice tone="err">به این بخش دسترسی ندارید.</Notice> : <Suspense fallback={<Spinner />}><Outlet /></Suspense>}
        </div>
      </div>
    </Ctx.Provider>
  )
}

export function PanelTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  useEffect(() => { document.title = `${title} | پنل` }, [title])
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-black leading-tight text-chalk sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-rubber">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

/** انتخاب شعبه از میان شعبه‌های در دسترس کارمند */
export function BranchSelect({ value, onChange, allowAll }: { value: string; onChange: (v: string) => void; allowAll?: boolean }) {
  const me = usePanel()
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="شعبه"
      className="h-11 min-w-[200px] cursor-pointer rounded-[3px] border border-steel-2 bg-white px-3 text-[14px] font-bold text-chalk">
      {allowAll && <option value="">{me.branches.length > 1 ? 'همهٔ شعبه‌ها' : me.branches[0]?.name}</option>}
      {(!allowAll || me.branches.length > 1) && me.branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
    </select>
  )
}
