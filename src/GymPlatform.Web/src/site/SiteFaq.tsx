import FrequentlyAskedQuestions from '@/components/ui/frequently-asked-questions-with-accordion'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { faDigits } from '@/lib/fa'
import { fill, site } from '@/lib/site'

/** سؤالات متداول — FAQ Accordion از 21st.dev */
export default function SiteFaq() {
  const { data: faq = [] } = useData('faq', api.faq)
  if (!faq.length) return null
  return (
    <FrequentlyAskedQuestions
      title={fill(site.home.faq.title) || 'سؤال‌های رایج'}
      description={brand.phone ? fill(site.home.faq.text) : ''}
      contactHref={brand.phone ? `tel:${brand.phone}` : ''}
      contactLabel={faDigits(brand.phone)}
      data={faq.map((f) => ({ question: f.question, answer: f.answer }))}
    />
  )
}
