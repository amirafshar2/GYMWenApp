import FooterSection5 from '@/components/ui/footer-section-5'
import { brand } from '@/lib/brand'
import { faDigits } from '@/lib/fa'

/** فوتر — Footer Section 5 از 21st.dev (پنل آبی با شیدر Fluted Glass) */
export default function SiteFooter() {
  return (
    <div dir="ltr">
      <FooterSection5
        companyName={brand.latinName.split(' ')[0]}
        logo={<img src={brand.logo} alt="" className="mb-3 size-12" />}
        tagline={<span dir="rtl" className="block text-right">{brand.name}<br />{brand.slogan}</span>}
        links={[
          { title: 'سایت', links: [{ name: 'شعبه‌ها', href: '/#branches' }, { name: 'رشته‌ها', href: '/#disciplines' }, { name: 'مربیان', href: '/#coaches' }, { name: 'پکیج‌ها', href: '/#packages' }] },
          { title: 'تماس', links: [{ name: faDigits(brand.phone), href: `tel:${brand.phone}` }, { name: 'مشاورهٔ رایگان', href: '/#consult' }, ...(brand.instagram ? [{ name: 'اینستاگرام', href: brand.instagram }] : [])] },
        ]}
        bottom={<span />}
        background="#ebe9e5"
        strokeColor="rgba(21,21,20,0.45)"
        panelColor="#2c6bae"
        copyright={<span dir="rtl">© {new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date())} {brand.name}</span>}
      />
    </div>
  )
}
