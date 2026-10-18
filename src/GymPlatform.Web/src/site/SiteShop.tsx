import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { shopApi } from '@/lib/commerce'
import { useData } from '@/lib/useData'
import { toman } from '@/lib/fa'
import { fill, site, splitAccent } from '@/lib/site'
import { SectionHead, useFadeUp, wrap } from './ui/SectionHead'

/** معرفی فروشگاه در صفحهٔ اصلی: شش کالای اول (به ترتیبی که مدیر در پنل چیده) + لینک فروشگاه */
export default function SiteShop() {
  const { data } = useData('shop-home', () => shopApi.catalog({ kind: 'all' }))
  const fade = useFadeUp(0.1)
  const items = (data?.products ?? []).slice(0, 6)
  const sec = site.home.shop
  const [title, accent] = splitAccent(sec.title)
  if (data && items.length === 0) return null
  return (
    <section id="shop" aria-labelledby="shop-title" className="bg-steel py-[clamp(80px,9vw,130px)]">
      <div className={wrap}>
        <SectionHead id="shop-title" eyebrow={fill(sec.eyebrow)} title={accent ? `${title}؛` : title} accent={accent}
          body={fill(sec.text)}
          aside={<Link to="/shop" className="inline-flex h-[52px] items-center rounded-[3px] bg-plate px-7 text-[15px] font-bold text-white transition-colors hover:bg-plate-hi">ورود به فروشگاه</Link>} />
        <motion.ul {...fade} className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {items.map((p) => (
            <li key={p.slug}>
              <Link to={`/shop/${p.slug}`} className="group block overflow-hidden rounded-[8px] bg-white transition-shadow hover:shadow-[0_14px_40px_rgb(0_0_0/0.08)]">
                <div className="aspect-square bg-[#EEF3F9]"><img src={p.imagePath} alt="" loading="lazy" className="size-full object-contain transition-transform duration-500 group-hover:scale-105" /></div>
                <div className="p-3"><p className="line-clamp-1 text-[14px] font-bold text-chalk">{p.name}</p><p className="text-[13px] font-bold text-plate">{toman(p.priceToman)}</p></div>
              </Link>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
