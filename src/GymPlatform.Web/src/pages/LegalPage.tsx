import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { brand } from '@/lib/brand'
import { site } from '@/lib/site'
import { cn } from '@/lib/utils'
import LiteDoc from '@/components/LiteDoc'

/**
 * صفحه‌هایی که اینماد و درگاه پرداخت لازم دارند؛ متن از «تنظیمات سایت ← صفحه‌های قانونی».
 * جاهای [[…]] را باشگاه پر می‌کند (تا پر نشده، زرد دیده می‌شود) و متن نهایی را مشاور حقوقی تأیید می‌کند.
 */

const DOCS: Record<string, { title: string; key: 'about' | 'terms' | 'privacy' | 'refund' }> = {
  about: { title: 'درباره ما', key: 'about' },
  terms: { title: 'قوانین و مقررات', key: 'terms' },
  privacy: { title: 'حریم خصوصی', key: 'privacy' },
  refund: { title: 'لغو و بازگشت وجه', key: 'refund' },
}

export const LEGAL_LINKS = [
  { to: '/about', text: 'درباره ما' },
  { to: '/terms', text: 'قوانین و مقررات' },
  { to: '/privacy', text: 'حریم خصوصی' },
  { to: '/refund', text: 'لغو و بازگشت وجه' },
]

export default function LegalPage() {
  const key = useLocation().pathname.slice(1)
  const doc = DOCS[key] ?? DOCS.terms
  useEffect(() => { document.title = `${doc.title} | ${brand.name}` }, [doc.title])
  return (
    <div className="bg-steel">
      <div className="mx-auto grid w-full max-w-[1100px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="صفحه‌های قوانین" className="lg:sticky lg:top-[100px] lg:self-start">
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
