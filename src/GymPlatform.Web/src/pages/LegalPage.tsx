import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { brand } from '@/lib/brand'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'
import LiteDoc from '@/components/LiteDoc'

/**
 * Rechtsseiten; Text aus „Website-Einstellungen → Rechtsseiten“.
 * Die Stellen [[…]] füllt das Studio aus (bis dahin gelb) und den finalen Text prüft eine Rechtsberatung.
 */

const DOCS: Record<string, { title: string; key: 'about' | 'terms' | 'privacy' | 'refund' }> = {
  about: { title: 'Über uns', key: 'about' },
  terms: { title: 'AGB', key: 'terms' },
  privacy: { title: 'Datenschutz', key: 'privacy' },
  refund: { title: 'Kündigung und Erstattung', key: 'refund' },
}

export const LEGAL_LINKS = [
  { to: '/about', text: 'Über uns' },
  { to: '/terms', text: 'AGB' },
  { to: '/privacy', text: 'Datenschutz' },
  { to: '/refund', text: 'Kündigung und Erstattung' },
]

export default function LegalPage() {
  const key = useLocation().pathname.slice(1)
  const doc = DOCS[key] ?? DOCS.terms
  useEffect(() => { document.title = `${doc.title} | ${brand.name}` }, [doc.title])
  return (
    <div className="bg-steel">
      <div className="mx-auto grid w-full max-w-[1100px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Rechtliches" className="lg:sticky lg:top-[100px] lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:grid">
            {LEGAL_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} aria-current={l.to === `/${key}` ? 'page' : undefined}
                  className={cn('block rounded-[3px] px-4 py-2.5 text-[14px] font-bold transition-colors',
                    l.to === `/${key}` ? 'bg-chalk text-white' : 'bg-white text-chalk hover:text-plate')}>{l.text}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="rounded-[6px] border border-steel-2 bg-white p-6 sm:p-10 [&_a]:font-bold [&_a]:text-plate [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-[19px] [&_h2]:font-black [&_h2]:text-chalk [&_li]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ps-5 text-[15px] leading-8 text-chalk/90">
          <h1 className="mb-1 text-[28px] font-black text-chalk sm:text-[34px]">{doc.title}</h1>
          <div className="mt-8"><LiteDoc text={site.legal[doc.key]} /></div>
        </article>
      </div>
    </div>
  )
}
