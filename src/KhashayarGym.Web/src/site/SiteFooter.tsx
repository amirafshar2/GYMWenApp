import { Phone } from 'lucide-react'
import FooterNewsletter from '@/components/ui/footer-newsletter'
import { Instagram } from '@/components/ui/brand-icons'
import { api } from '@/lib/api'
import { brand } from '@/lib/brand'
import { faDigits, faNum } from '@/lib/fa'

const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s|-/g, '')

/** فوتر — Footer Column (نسخهٔ خبرنامه) از 21st.dev، با پالت سایت */
export default function SiteFooter() {
  const year = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date())
  return (
    <FooterNewsletter
      newsletterTitle={<>از جشنواره‌ها <span className="font-['Noto_Naskh_Arabic'] font-semibold text-plate">زودتر باخبر شو.</span></>}
      newsletterText="شماره‌ات را بگذار تا تخفیف‌های جشنواره و افتتاح شعبه‌های جدید را قبل از همه پیامک کنیم."
      inputLabel="شمارهٔ موبایل"
      inputType="tel"
      inputPlaceholder="۰۹۱۲۳۴۵۶۷۸۹"
      buttonLabel="عضویت در خبرنامه"
      onSubscribe={async (v) => {
        const mobile = toLatin(v)
        if (!/^(\+98|0098|0)?9\d{9}$/.test(mobile)) throw new Error('شمارهٔ موبایل را مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.')
        try {
          await api.consult({ fullName: 'عضو خبرنامه', mobile, goal: null, message: 'عضویت در خبرنامهٔ جشنواره', branchId: null })
        } catch (e) { throw new Error((e as Error).message || 'ثبت نشد. دوباره امتحان کنید.') }
        return 'ثبت شد. اولین پیامک جشنواره برایت می‌آید.'
      }}
      image="/media/hero/dumbbell-mobile.webp"
      imageAlt="مجسمهٔ دمبل خشایار"
      logo={<img src={brand.logo} alt="" width={40} height={40} className="size-10 rounded-full" />}
      brandName={brand.name}
      description={`${faNum(12)} شعبه در ${brand.city} با سالن‌های جدای آقایان و بانوان. ${brand.slogan}`}
      socials={[
        ...(brand.instagram ? [{ icon: <Instagram className="h-5 w-5" />, href: brand.instagram, label: 'اینستاگرام' }] : []),
        { icon: <Phone className="h-5 w-5" aria-hidden />, href: `tel:${brand.phone}`, label: `تماس ${faDigits(brand.phone)}` },
      ]}
      columns={[
        { title: 'باشگاه', links: [
          { text: 'شعبه‌ها', href: '/#branches' }, { text: 'رشته‌ها', href: '/#disciplines' },
          { text: 'مربیان', href: '/#coaches' }, { text: 'پکیج‌ها و قیمت‌ها', href: '/#packages' },
        ] },
        { title: 'رشته‌ها', links: [
          { text: 'بدنسازی', href: '/#disciplines' }, { text: 'کراس‌فیت', href: '/#disciplines' },
          { text: 'پیلاتس و یوگا', href: '/#disciplines' }, { text: 'صخره‌نوردی', href: '/#disciplines' },
        ] },
        { title: 'تماس', links: [
          { text: faDigits(brand.phone), href: `tel:${brand.phone}` }, { text: 'مشاورهٔ رایگان', href: '/#consult' },
          { text: 'سؤال‌های رایج', href: '/packages' },
          ...(brand.instagram ? [{ text: 'اینستاگرام', href: brand.instagram }] : []),
        ] },
      ]}
      legal={[{ text: 'نزدیک‌ترین شعبه', href: '/#branches' }, { text: 'مشاورهٔ رایگان', href: '/#consult' }]}
      copyright={`© ${year} ${brand.name}`}
    />
  )
}
