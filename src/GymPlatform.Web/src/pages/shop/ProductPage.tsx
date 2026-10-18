import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, MapPin, Minus, Plus, ShoppingBag } from 'lucide-react'
import { shopApi, type ProductDetail, type Variant } from '@/lib/commerce'
import { cart, useCart } from '@/lib/cart'
import { brand } from '@/lib/brand'
import { faNum, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, Notice, Spinner } from '@/member/ui'

export default function ProductPage() {
  const { slug = '' } = useParams()
  const nav = useNavigate()
  const { branch } = useCart()
  const [p, setP] = useState<ProductDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [flavor, setFlavor] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    shopApi.product(slug).then((d) => {
      setP(d); document.title = `${d.name} | شاپ ${brand.shortName}`
      const first = d.variants.find((v) => v.totalStock > 0) ?? d.variants[0]
      setFlavor(first?.flavor ?? null); setColor(first?.color ?? null); setSize(first?.size ?? null)
    }).catch((e: Error) => setErr(e.message))
  }, [slug])

  const flavors = useMemo(() => [...new Set(p?.variants.map((v) => v.flavor).filter(Boolean) as string[])], [p])
  const colors = useMemo(() => [...new Map(p?.variants.filter((v) => v.color).map((v) => [v.color!, v.colorHex ?? '#ccc'])).entries()], [p])
  const sizes = useMemo(() => [...new Set(p?.variants.map((v) => v.size).filter(Boolean) as string[])], [p])
  const variant: Variant | undefined = p?.variants.find((v) => v.flavor === flavor && v.color === color && v.size === size)
  const inBranch = variant && branch ? variant.stock.find((s) => s.branchSlug === branch)?.quantity ?? 0 : variant?.totalStock ?? 0
  const sizeAvail = (s: string) => p?.variants.some((v) => v.size === s && v.color === color && v.flavor === flavor && v.totalStock > 0)

  if (err) return <div className="mx-auto max-w-3xl p-10"><Notice tone="err">{err}</Notice></div>
  if (!p) return <Spinner />

  const add = () => {
    if (!variant) return
    cart.add({ variantId: variant.id, quantity: qty, slug: p.slug, name: p.name, label: variant.label || null, imagePath: p.imagePath, priceToman: variant.priceToman })
    setAdded(true); setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className="bg-steel">
      <div className="mx-auto w-full max-w-[1290px] px-5 py-8 sm:px-8 sm:py-12">
        <Link to={p.kind === 'supplement' ? '/shop' : '/shop?kind=merch'} className="mb-6 inline-flex items-center gap-1 text-[14px] font-bold text-rubber hover:text-chalk">
          <ChevronRight className="size-4" aria-hidden />بازگشت به فروشگاه
        </Link>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-[10px] bg-white">
            <img src={p.imagePath} alt={p.name} className="aspect-square w-full object-contain" />
            {p.isHouseBrand && <span className="absolute right-4 top-4 rounded-full bg-plate px-3 py-1 text-[12px] font-bold text-white">برند {brand.shortName}</span>}
          </div>

          <div>
            <p className="text-[14px] text-rubber">{p.brandName} – {p.category}</p>
            <h1 className="mt-1 text-[28px] font-black leading-tight text-chalk sm:text-[34px]">{p.name}</h1>
            <p className="mt-4 text-[28px] font-black text-chalk">{toman(variant?.priceToman ?? p.priceToman)}</p>
            {p.description && <p className="mt-4 text-[15px] leading-8 text-rubber">{p.description}</p>}
            {p.highlights.length > 0 && (
              <ul className="mt-4 grid gap-2">{p.highlights.map((h) => <li key={h} className="flex items-center gap-2 text-[14px] text-chalk"><Check className="size-4 text-plate" aria-hidden />{h}</li>)}</ul>
            )}

            <div className="mt-8 grid gap-6">
              {flavors.length > 0 && (
                <Picker label="طعم">{flavors.map((f) => <Opt key={f} active={flavor === f} onClick={() => setFlavor(f)}>{f}</Opt>)}</Picker>
              )}
              {colors.length > 0 && (
                <Picker label={`رنگ${color ? `: ${color}` : ''}`}>
                  {colors.map(([c, hex]) => (
                    <button key={c} type="button" aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)}
                      className={cn('grid size-11 cursor-pointer place-items-center rounded-full border-2 transition-shadow', color === c ? 'border-plate shadow-[0_0_0_3px_rgb(11_95_176/0.2)]' : 'border-steel-2')}>
                      <span className="size-7 rounded-full border border-black/10" style={{ background: hex }} />
                    </button>
                  ))}
                </Picker>
              )}
              {sizes.length > 0 && (
                <Picker label="سایز">{sizes.map((s) => <Opt key={s} active={size === s} disabled={!sizeAvail(s)} onClick={() => setSize(s)}>{s}</Opt>)}</Picker>
              )}
            </div>

            <div className="mt-8 rounded-[8px] border border-steel-2 bg-white p-4">
              <p className="mb-3 flex items-center gap-2 text-[14px] font-bold text-chalk"><MapPin className="size-4 text-plate" aria-hidden />موجودی در شعبه‌ها</p>
              {!variant ? <p className="text-[14px] text-rubber">این ترکیب موجود نیست.</p> : (
                <ul className="grid max-h-48 gap-1 overflow-y-auto text-[14px] sm:grid-cols-2">
                  {variant.stock.map((s) => (
                    <li key={s.branchSlug} className={cn('flex justify-between gap-2 rounded-[3px] px-2 py-1.5', s.branchSlug === branch && 'bg-plate/10 font-bold')}>
                      <button type="button" onClick={() => cart.setBranch(s.branchSlug)} className="cursor-pointer truncate text-right hover:text-plate">{s.branchName}</button>
                      <span className={s.quantity === 0 ? 'text-rubber' : 'text-[#1f7a46]'}>{s.quantity === 0 ? 'ناموجود' : `${faNum(s.quantity)} عدد`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex h-[52px] items-center rounded-[3px] border border-steel-2 bg-white">
                <button type="button" aria-label="کم کردن" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-[50px] cursor-pointer place-items-center hover:text-plate"><Minus className="size-4" /></button>
                <span className="w-10 text-center text-[16px] font-bold" aria-live="polite">{faNum(qty)}</span>
                <button type="button" aria-label="زیاد کردن" onClick={() => setQty((q) => Math.min(10, q + 1))} className="grid size-[50px] cursor-pointer place-items-center hover:text-plate"><Plus className="size-4" /></button>
              </div>
              <Btn onClick={add} disabled={!variant || inBranch < 1} className="min-w-[220px] flex-1">
                <ShoppingBag className="size-5" aria-hidden />{!variant || inBranch < 1 ? (branch ? 'در این شعبه ناموجود' : 'ناموجود') : 'افزودن به سبد'}
              </Btn>
            </div>
            {added && (
              <Notice tone="ok" className="mt-4">به سبد اضافه شد. <button type="button" onClick={() => nav('/cart')} className="cursor-pointer font-bold underline">مشاهدهٔ سبد خرید</button></Notice>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Picker({ label, children }: { label: string; children: React.ReactNode }) {
  return <fieldset><legend className="mb-2 text-[14px] font-bold text-chalk">{label}</legend><div className="flex flex-wrap gap-2">{children}</div></fieldset>
}
function Opt({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} disabled={disabled} onClick={onClick}
      className={cn('h-11 min-w-12 cursor-pointer rounded-[3px] border px-4 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through',
        active ? 'border-plate bg-plate text-white' : 'border-steel-2 bg-white text-chalk hover:border-chalk/40')}>
      {children}
    </button>
  )
}
