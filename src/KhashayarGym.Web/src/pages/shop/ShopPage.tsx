import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ShoppingBag, SlidersHorizontal } from 'lucide-react'
import { api } from '@/lib/api'
import { shopApi, type ProductCard, type ShopCatalog } from '@/lib/commerce'
import { cart, cartCount, useCart } from '@/lib/cart'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { faNum, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { inputCls, Spinner } from '@/member/ui'

const TABS = [
  { key: 'supplement', label: 'مکمل‌ها' },
  { key: 'merch', label: 'پوشاک و لوازم خشایار' },
] as const

/** شاپ خشایار: مکمل‌ها + پوشاک و لوازم با برند باشگاه، با موجودی هر شعبه */
export default function ShopPage() {
  const [params, setParams] = useSearchParams()
  const kind = params.get('kind') === 'merch' ? 'merch' : 'supplement'
  const category = params.get('category') ?? ''
  const sort = params.get('sort') ?? ''
  const { branch } = useCart()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [inStock, setInStock] = useState(false)
  const [data, setData] = useState<ShopCatalog | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const { data: branches = [] } = useData('branches', api.branches)
  const cartState = useCart()

  useEffect(() => { document.title = `شاپ ${brand.shortName} — مکمل، پوشاک و لوازم` }, [])
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      shopApi.catalog({ kind, category, q: q.trim(), branch: branch ?? undefined, inStock: inStock || undefined, sort })
        .then((d) => alive && (setData(d), setErr(null))).catch((e: Error) => alive && setErr(e.message))
    }, q ? 250 : 0)
    return () => { alive = false; clearTimeout(t) }
  }, [kind, category, q, branch, inStock, sort])

  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(params)
    if (v) n.set(k, v); else n.delete(k)
    if (k === 'kind') n.delete('category')
    setParams(n, { replace: true })
  }
  const cats = useMemo(() => (data?.categories ?? []).filter((c) => kind === 'merch' ? c.kind !== 'supplement' : c.kind === 'supplement'), [data, kind])

  return (
    <div className="bg-steel">
      <section className="relative overflow-hidden bg-night text-white">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-40 size-[520px] rounded-full bg-plate/30 blur-[120px]" />
        <div className="relative mx-auto w-full max-w-[1290px] px-5 py-12 sm:px-8 sm:py-16">
          <p className="text-[13px] font-bold text-plate-lt">شاپ {brand.shortName}</p>
          <h1 className="mt-2 text-[32px] font-black leading-tight sm:text-[46px]">مکمل، پوشاک و لوازم تمرین</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-8 text-white/65">تحویل همان روز در شعبهٔ خودت یا ارسال به خانه. اعضای باشگاه با کد <b className="text-white">MEMBER15</b> پانزده درصد تخفیف دارند.</p>
          <div role="tablist" aria-label="بخش فروشگاه" className="mt-8 inline-flex rounded-full bg-white/10 p-1">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={kind === t.key} onClick={() => set('kind', t.key === 'supplement' ? null : t.key)}
                className={cn('h-11 cursor-pointer rounded-full px-5 text-[15px] font-bold transition-colors', kind === t.key ? 'bg-white text-chalk' : 'text-white/75 hover:text-white')}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1290px] px-5 py-8 sm:px-8">
        <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">جست‌وجو در فروشگاه</span>
            <Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-rubber" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو: پروتئین، شیکر، تیشرت…" className={`${inputCls} pe-4 ps-12`} />
          </label>
          <label className="flex items-center gap-2">
            <span className="shrink-0 text-[14px] font-bold text-chalk">موجودی در</span>
            <select value={branch ?? ''} onChange={(e) => cart.setBranch(e.target.value || null)} className={`${inputCls} min-w-[200px] cursor-pointer`}>
              <option value="">همهٔ شعبه‌ها</option>
              {branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
            </select>
          </label>
          <label className="flex h-[52px] cursor-pointer items-center gap-2 rounded-[3px] border border-steel-2 bg-white px-4 text-[14px] font-bold text-chalk">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="size-4 accent-[var(--color-plate)]" />فقط موجودها
          </label>
          <label className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-rubber" aria-hidden /><span className="sr-only">مرتب‌سازی</span>
            <select value={sort} onChange={(e) => set('sort', e.target.value || null)} className={`${inputCls} cursor-pointer`}>
              <option value="">پیشنهاد ما</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option>
            </select>
          </label>
        </div>

        <div className="mb-8 flex flex-wrap gap-2" aria-label="دسته‌بندی">
          <Chip active={!category} onClick={() => set('category', null)}>همه</Chip>
          {cats.map((c) => <Chip key={c.category} active={category === c.category} onClick={() => set('category', c.category)}>{c.category} <span className="text-[12px] opacity-60">{faNum(c.count)}</span></Chip>)}
        </div>

        {err ? <p role="alert" className="text-danger">{err}</p> : !data ? <Spinner /> : data.products.length === 0 ? (
          <p className="rounded-[6px] bg-white p-10 text-center text-rubber">کالایی با این فیلترها پیدا نشد.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {data.products.map((p) => <li key={p.id}><Card p={p} /></li>)}
          </ul>
        )}
      </div>

      {cartCount(cartState) > 0 && (
        <Link to="/cart" className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center gap-3 rounded-full bg-plate px-6 text-[15px] font-bold text-white shadow-[0_12px_30px_rgb(11_95_176/0.4)] transition-colors hover:bg-plate-hi">
          <ShoppingBag className="size-5" aria-hidden />سبد خرید <span className="grid size-7 place-items-center rounded-full bg-white text-[13px] text-plate">{faNum(cartCount(cartState))}</span>
        </Link>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('h-10 cursor-pointer rounded-full border px-4 text-[14px] font-bold transition-colors', active ? 'border-chalk bg-chalk text-white' : 'border-steel-2 bg-white text-chalk hover:border-chalk/40')}>
      {children}
    </button>
  )
}

function Card({ p }: { p: ProductCard }) {
  return (
    <Link to={`/shop/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-[8px] border border-steel-2 bg-white transition-shadow hover:shadow-[0_14px_40px_rgb(0_0_0/0.08)]">
      <div className="relative aspect-square bg-[#EEF3F9]">
        <img src={p.imagePath} alt="" loading="lazy" className={cn('size-full object-contain transition-transform duration-500 group-hover:scale-105', !p.inStock && 'opacity-50 grayscale')} />
        {p.isKhashayarBrand && <span className="absolute right-3 top-3 rounded-full bg-plate px-2.5 py-1 text-[11px] font-bold text-white">برند {brand.shortName}</span>}
        {!p.inStock && <span className="absolute inset-x-3 bottom-3 rounded-[3px] bg-white/90 py-1.5 text-center text-[12px] font-bold text-rubber">ناموجود</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-[12px] text-rubber">{p.brandName} · {p.category}</p>
        <h2 className="line-clamp-2 text-[14px] font-bold leading-6 text-chalk sm:text-[15px]">{p.name}</h2>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="text-[15px] font-black text-chalk sm:text-[16px]">{toman(p.priceToman)}</p>
          {p.colors.length > 0 && (
            <span className="flex -space-x-1 space-x-reverse" aria-label={`${faNum(p.colors.length)} رنگ`}>
              {p.colors.slice(0, 4).map((c) => <span key={c} className="size-4 rounded-full border-2 border-white shadow" style={{ background: c }} />)}
            </span>
          )}
        </div>
        {(p.sizes.length > 0 || p.flavors.length > 0) && <p className="text-[12px] text-rubber">{p.sizes.length ? `سایز ${p.sizes.join('، ')}` : `${faNum(p.flavors.length)} طعم`}</p>}
      </div>
    </Link>
  )
}
