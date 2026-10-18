import SculptureHero from '@/components/ui/liquid-sculpture-hero'
import { brand } from '@/lib/brand'
import { fill, fillCount, site } from '@/lib/site'

/**
 * هیرو: Liquid Sculpture Hero از 21st.dev (guglielmogiannattasio.it) زیر هدر سفید سایت.
 * دمبل از ~۱۰۰ هزار ذرهٔ GPU ساخته می‌شود؛ با حرکت ماوس مایع می‌شود و دوباره شکل می‌گیرد.
 * منوی خود کامپوننت خاموش است (showNav=false) چون هدر قالب جدید بالای آن است.
 */
export default function SiteHero() {
  const h = site.home.hero
  // تصویر پیش‌فرض: مجسمهٔ دمبل (رشته‌های فلزی و ذرات)، ساخته‌شده با Canva AI؛ مالک می‌تواند عوضش کند
  const img = h.imageUrl, mobile = h.mobileImageUrl || h.imageUrl
  const [first, ...rest] = (brand.slogan || brand.name).split('؛').map((s) => s.trim())
  const accent = rest.join(' ')
  const near = () => setTimeout(() => window.dispatchEvent(new Event('kg:locate')), 700)

  return (
    <div id="top" dir="rtl" className="kg-hero bg-[#EBE9E5]" onClickCapture={(e) => {
      if ((e.target as HTMLElement).closest('.sh-btn')) near()
    }}>
      <SculptureHero
        src={img}
        darkSrc={img}
        mobileSrc={mobile}
        mobileDarkSrc={mobile}
        imageAlt={`تصویر اصلی ${brand.name}`}
        showNav={false}
        eyebrow={fillCount(h.eyebrow)}
        headline={accent ? `${first}؛\n${accent}` : first}
        headlineAccent={accent}
        body={fill(h.body)}
        primaryCta={{ label: h.primaryCta, href: '#branches' }}
        secondaryCta={{ label: h.secondaryCta, href: '#packages' }}
        hint="ماوس را روی دمبل حرکت بده"
        hintTouch="دمبل را لمس کن"
        backdropText={(brand.latinName.split(' ')[0] || '').toLowerCase()}
        headingFont="'Vazirmatn Variable', Tahoma, sans-serif"
        bodyFont="'Vazirmatn Variable', Tahoma, sans-serif"
        accentFont="'Vazirmatn Variable', Tahoma, sans-serif"
        loadFonts={false}
        textColor="#2C2C2C"
        accentColor={site.theme.primary}
        height="calc(100svh - 78px - var(--festival-h, 0px))"
        showCredit
      />
    </div>
  )
}
