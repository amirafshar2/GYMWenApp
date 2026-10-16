import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { shopApi } from '@/lib/commerce'
import { useData } from '@/lib/useData'
import { brand, rebrand } from '@/lib/brand'
import { toman } from '@/lib/fa'
import { SectionHead, useFadeUp, wrap } from './ui/SectionHead'

const pick = ['tshirt-dry', 'hoodie', 'shaker-700', 'whey-2kg', 'women-long-tee', 'creatine-300']

/** معرفی «شاپ خشایار» در صفحهٔ اصلی: چند کالای منتخب + لینک فروشگاه */
export default function SiteShop() {
  const { data } = useData('shop-home', () => shopApi.catalog({ kind: 'all' }))
  const fade = useFadeUp(0.1)
  const items = (data?.products ?? []).filter((p) => pick.includes(p.slug)).sort((a, b) => pick.indexOf(a.slug) - pick.indexOf(b.slug))
  return (
    <section id="shop" aria-labelledby="shop-title" className="bg-steel py-[clamp(80px,9vw,130px)]">
      <div className={wrap}>
        <SectionHead id="shop-title" eyebrow={`شاپ ${brand.shortName}`} title="لباس، شیکر و مکمل؛" accent="تحویل همان روز در شعبه"
          body="پوشاک و لوازم با برند خودمان و مکمل‌های اصل. آنلاین سفارش بده، در باشگاه تحویل بگیر یا بفرست خانه. موجودی هر شعبه را همان‌جا ببین."
          aside={<Link to="/shop" className="inline-flex h-[52px] items-center rounded-[3px] bg-plate px-7 text-[15px] font-bold text-white transition-colors hover:bg-plate-hi">ورود به فروشگاه</Link>} />
        <motion.ul {...fade} className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {items.map((p) => (
            <li key={p.slug}>
              <Link to={`/shop/${p.slug}`} className="group block overflow-hidden rounded-[8px] bg-white transition-shadow hover:shadow-[0_14px_40px_rgb(0_0_0/0.08)]">
                <div className="aspect-square bg-[#EEF3F9]"><img src={p.imagePath} alt="" loading="lazy" className="size-full object-contain transition-transform duration-500 group-hover:scale-105" /></div>
                <div className="p-3"><p className="line-clamp-1 text-[14px] font-bold text-chalk">{rebrand(p.name)}</p><p className="text-[13px] font-bold text-plate">{toman(p.priceToman)}</p></div>
              </Link>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
