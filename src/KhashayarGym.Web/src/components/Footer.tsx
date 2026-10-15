import { Link } from 'react-router-dom'
import { brand } from '../lib/brand'
import { faDigits, faNum } from '../lib/fa'

export default function Footer() {
  return (
    <footer className="border-t border-steel-2 bg-iron">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img src={brand.logo} alt="" width={48} height={48} className="size-12" loading="lazy" />
            <p className="text-xl font-black">{brand.name}</p>
          </div>
          <p className="max-w-sm leading-7 text-rubber">{faNum(12)} شعبه در {brand.city}، با سالن‌های جدای آقایان و بانوان.</p>
        </div>
        <div>
          <p className="mb-4 font-bold">تماس</p>
          <ul className="space-y-3 text-rubber">
            <li>تلفن مرکزی: <a className="text-chalk hover:text-plate-hi" href={`tel:${brand.phone}`} dir="ltr">{faDigits(brand.phone)}</a></li>
            {brand.instagram && (
              <li><a className="hover:text-plate-hi" href={brand.instagram} target="_blank" rel="noopener noreferrer">اینستاگرام</a></li>
            )}
          </ul>
        </div>
        <div>
          <p className="mb-4 font-bold">دسترسی سریع</p>
          <ul className="space-y-3 text-rubber">
            <li><Link className="hover:text-plate-hi" to="/branches">همهٔ شعبه‌ها</Link></li>
            <li><Link className="hover:text-plate-hi" to="/packages">پکیج‌ها و قیمت‌ها</Link></li>
            <li><Link className="hover:text-plate-hi" to="/#consult">مشاورهٔ رایگان</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-steel-2 px-4 py-5 text-center text-xs text-rubber">
        © {new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date())} {brand.name}
      </p>
    </footer>
  )
}
