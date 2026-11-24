import SculptureHero from '@/components/ui/liquid-sculpture-hero'
import { brand } from '@/lib/brand'
import { fill, fillCount, site } from '@/lib/site'

/**
 * Hero: Liquid Sculpture Hero von 21st.dev (guglielmogiannattasio.it) unter dem weißen Header der Seite.
 * Die Hantel besteht aus ~100.000 GPU-Partikeln; bei Mausbewegung wird sie flüssig und formt sich neu.
 * Das eigene Menü der Komponente ist aus (showNav=false), weil der Header der neuen Vorlage darüber liegt.
 */
export default function SiteHero() {
  const h = site.home.hero
  // Standardbild: Hantelskulptur (Metallstränge und Partikel), mit Canva AI erstellt; der Inhaber kann es ändern
  const img = h.imageUrl, mobile = h.mobileImageUrl || h.imageUrl
  const [first, ...rest] = (brand.slogan || brand.name).split(';').map((s) => s.trim())
  const accent = rest.join(' ')
  const near = () => setTimeout(() => window.dispatchEvent(new Event('kg:locate')), 700)

  return (
    <div id="top" className="kg-hero bg-[#EBE9E5]" onClickCapture={(e) => {
      if ((e.target as HTMLElement).closest('.sh-btn')) near()
    }}>
      <SculptureHero
        src={img}
        darkSrc={img}
        mobileSrc={mobile}
        mobileDarkSrc={mobile}
        imageAlt={`Hauptbild ${brand.name}`}
        showNav={false}
        eyebrow={fillCount(h.eyebrow)}
        headline={accent ? `${first}\n${accent}` : first}
        headlineAccent={accent}
        body={fill(h.body)}
        primaryCta={{ label: h.primaryCta, href: '#branches' }}
        secondaryCta={{ label: h.secondaryCta, href: '#packages' }}
        hint="Bewege die Maus über die Hantel"
        hintTouch="Tippe auf die Hantel"
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
