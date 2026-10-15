import SculptureHero from '@/components/ui/liquid-sculpture-hero'
import { brand } from '@/lib/brand'
import { faNum } from '@/lib/fa'
import '@fontsource/noto-naskh-arabic/600.css'

/** تصویر مجسمهٔ دمبل (رشته‌های فلزی و ذرات)، ساخته‌شده با Canva AI */
const LOCAL_SCULPTURE = '/media/hero/dumbbell.webp'
const LOCAL_SCULPTURE_MOBILE = '/media/hero/dumbbell-mobile.webp'

/**
 * هیرو: Liquid Sculpture Hero از 21st.dev (guglielmogiannattasio.it).
 * مجسمه از ~۱۰۰ هزار ذرهٔ GPU ساخته می‌شود؛ با حرکت ماوس مایع می‌شود و دوباره شکل می‌گیرد.
 */
export default function SiteHero() {
  const [first, ...rest] = brand.slogan.split('؛').map((s) => s.trim())
  const accent = rest.join(' ')

  return (
    <div id="top" dir="rtl" style={{ paddingTop: 'var(--festival-h, 0px)' }} className="bg-[#EBE9E5]">
      <SculptureHero
        src={LOCAL_SCULPTURE}
        darkSrc={LOCAL_SCULPTURE}
        mobileSrc={LOCAL_SCULPTURE_MOBILE}
        mobileDarkSrc={LOCAL_SCULPTURE_MOBILE}
        imageAlt="مجسمهٔ دمبلی که از رشته‌های فلزی و ذرات ساخته شده"
        brand={brand.shortName}
        navLinks={[
          { label: 'شعبه‌ها', href: '#branches' },
          { label: 'رشته‌ها', href: '#disciplines' },
          { label: 'مربیان', href: '#coaches' },
          { label: 'پکیج‌ها', href: '#packages' },
        ]}
        navCta={{ label: 'مشاورهٔ رایگان', href: '#consult' }}
        eyebrow={`${faNum(12)} شعبه در ${brand.city}`}
        headline={`${first}؛\n${accent}`}
        headlineAccent={accent}
        body="سالن‌های جدای آقایان و بانوان، از بدنسازی تا صخره‌نوردی. نزدیک‌ترین شعبه را پیدا کن و همین امروز شروع کن."
        primaryCta={{ label: 'نزدیک‌ترین شعبه به من', href: '#branches' }}
        secondaryCta={{ label: 'دیدن پکیج‌ها', href: '#packages' }}
        hint="ماوس را روی دمبل حرکت بده"
        hintTouch="دمبل را لمس کن"
        backdropText={brand.latinName.split(' ')[0].toLowerCase()}
        headingFont="'Vazirmatn Variable', Tahoma, sans-serif"
        bodyFont="'Vazirmatn Variable', Tahoma, sans-serif"
        accentFont="'Noto Naskh Arabic', 'Vazirmatn Variable', serif"
        loadFonts={false}
        accentColor="#2C6BAE"
        height="calc(100svh - var(--festival-h, 0px))"
        showCredit
      />
    </div>
  )
}
