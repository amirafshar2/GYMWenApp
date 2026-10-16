import SculptureHero from '@/components/ui/liquid-sculpture-hero'
import { brand } from '@/lib/brand'
import { faNum } from '@/lib/fa'

/** تصویر مجسمهٔ دمبل (رشته‌های فلزی و ذرات)، ساخته‌شده با Canva AI */
const SCULPTURE = '/media/hero/dumbbell.webp'
const SCULPTURE_MOBILE = '/media/hero/dumbbell-mobile.webp'

/**
 * هیرو: Liquid Sculpture Hero از 21st.dev (guglielmogiannattasio.it) زیر هدر سفید سایت.
 * دمبل از ~۱۰۰ هزار ذرهٔ GPU ساخته می‌شود؛ با حرکت ماوس مایع می‌شود و دوباره شکل می‌گیرد.
 * منوی خود کامپوننت خاموش است (showNav=false) چون هدر قالب جدید بالای آن است.
 */
export default function SiteHero() {
  const [first, ...rest] = brand.slogan.split('؛').map((s) => s.trim())
  const accent = rest.join(' ')
  const near = () => setTimeout(() => window.dispatchEvent(new Event('kg:locate')), 700)

  return (
    <div id="top" dir="rtl" className="kg-hero bg-[#EBE9E5]" onClickCapture={(e) => {
      if ((e.target as HTMLElement).closest('.sh-btn')) near()
    }}>
      <SculptureHero
        src={SCULPTURE}
        darkSrc={SCULPTURE}
        mobileSrc={SCULPTURE_MOBILE}
        mobileDarkSrc={SCULPTURE_MOBILE}
        imageAlt="مجسمهٔ دمبلی که از رشته‌های فلزی و ذرات ساخته شده"
        showNav={false}
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
        accentFont="'Vazirmatn Variable', Tahoma, sans-serif"
        loadFonts={false}
        textColor="#2C2C2C"
        accentColor="#0B5FB0"
        height="calc(100svh - 78px - var(--festival-h, 0px))"
        showCredit
      />
    </div>
  )
}
