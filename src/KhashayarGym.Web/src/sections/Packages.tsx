import { useMemo, useState } from 'react'
import { api, type Pkg } from '../lib/api'
import { useData } from '../lib/useData'
import { faNum, toman, tomanShort } from '../lib/fa'
import { rebrand } from '../lib/brand'
import { scrollToId } from '../lib/motion'

const TABS = [
  { key: 'all', label: 'همه' },
  { key: 'Gym', label: 'بدنسازی' },
  { key: 'PersonalTraining', label: 'مربی خصوصی' },
  { key: 'Nutrition', label: 'تمرین + تغذیه' },
  { key: 'Climbing', label: 'صخره‌نوردی' },
] as const

/** نوار صفحه‌های وزنه: هر دیسک یک ماه از مدت پکیج — مدت را بدون خواندن عدد نشان می‌دهد */
function Duration({ months }: { months: number }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      <span className="h-1 w-3 rounded-full bg-rubber/50" />
      {Array.from({ length: months }, (_, i) => (
        <span key={i} className="h-5 w-1.5 rounded-[2px] bg-plate" style={{ height: `${20 - (i % 3) * 0}px` }} />
      ))}
      <span className="h-1 w-3 rounded-full bg-rubber/50" />
    </span>
  )
}

function PackageRow({ p }: { p: Pkg }) {
  const price = p.discountedPriceToman ?? p.priceToman
  const big = tomanShort(price)
  return (
    <li
      className={`relative grid gap-6 rounded-3xl border p-6 md:grid-cols-[1.3fr_1.4fr_1fr] md:items-center md:p-8 ${
        p.isFeatured ? 'border-plate bg-plate/[.07] shadow-[0_0_60px_-20px_rgba(76,143,217,.6)]' : 'border-steel-2 bg-steel'
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-2xl font-black">{p.name}</h3>
          {p.isFeatured && <span className="rounded-full bg-plate px-3 py-1 text-xs font-bold text-white">محبوب‌ترین</span>}
        </div>
        {p.tagline && <p className="mt-1 text-rubber">{p.tagline}</p>}
        <div className="mt-4 flex items-center gap-3 text-sm text-rubber">
          <Duration months={p.durationMonths} />
          <span>{faNum(p.durationMonths)} ماه، {p.sessions ? `${faNum(p.sessions)} جلسه` : 'جلسات نامحدود'}</span>
        </div>
      </div>

      <ul className="grid gap-2 text-sm">
        {p.features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <svg viewBox="0 0 16 16" className="mt-1 size-3.5 shrink-0 text-plate-hi" aria-hidden><path d="M2 8.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {rebrand(f)}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4 md:items-end md:text-left">
        <div className="md:text-left">
          {p.discountedPriceToman && (
            <p className="flex items-center gap-2 text-sm md:justify-end">
              <span className="rounded-full bg-plate px-2 py-0.5 text-xs font-bold text-white">{faNum(p.discountPercent!)}٪ جشنواره</span>
              <s className="text-rubber" aria-label={`قیمت قبلی ${toman(p.priceToman)}`}>{toman(p.priceToman)}</s>
            </p>
          )}
          <p className="mt-1" aria-label={toman(price)}>
            <span className="text-4xl font-black tabular-nums">{big.value}</span>
            <span className="mr-1.5 text-sm text-rubber">{big.unit}</span>
          </p>
          {p.durationMonths > 1 && <p className="text-xs text-rubber">ماهی {toman(p.monthlyEquivalentToman)}</p>}
        </div>
        <button
          className={p.isFeatured ? 'btn-plate w-full md:w-auto' : 'btn-ghost w-full md:w-auto'}
          onClick={() => { sessionStorage.setItem('chosen-package', p.slug); scrollToId('consult') }}
        >
          انتخاب این پکیج
        </button>
      </div>
    </li>
  )
}

export default function Packages({ standalone = false }: { standalone?: boolean }) {
  const { data: packages = [], loading, error } = useData('packages', api.packages)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all')
  const list = useMemo(() => packages.filter((p) => tab === 'all' || p.category === tab), [packages, tab])

  return (
    <section id="packages" aria-labelledby="packages-title" className="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          {standalone ? <h1 id="packages-title" className="section-title">پکیج‌ها و قیمت‌ها</h1> : <h2 id="packages-title" className="section-title">پکیج‌ها و قیمت‌ها</h2>}
          <p className="lede mt-4">قیمت‌ها به تومان است. تخفیف جشنواره روی پکیج‌های مشمول خودکار اعمال شده.</p>
        </div>
        <div role="tablist" aria-label="دسته‌بندی پکیج‌ها" className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-steel-2 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${tab === t.key ? 'bg-chalk text-iron' : 'text-rubber hover:text-chalk'}`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {error && <p className="mt-10 text-amber-300">قیمت‌ها بارگذاری نشد. اتصال اینترنت را بررسی و صفحه را دوباره بارگذاری کنید.</p>}
      {loading && <div className="mt-12 h-64 animate-pulse rounded-3xl bg-steel" />}
      <div role="tabpanel" aria-labelledby="packages-title">
        <ul className="mt-12 space-y-4">
          {list.map((p) => <PackageRow key={p.slug} p={p} />)}
        </ul>
      </div>
    </section>
  )
}
