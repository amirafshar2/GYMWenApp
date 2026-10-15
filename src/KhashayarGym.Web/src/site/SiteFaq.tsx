import FrequentlyAskedQuestions from '@/components/ui/frequently-asked-questions-with-accordion'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand, rebrand } from '@/lib/brand'
import { faDigits } from '@/lib/fa'

/** سؤالات متداول — FAQ Accordion از 21st.dev */
export default function SiteFaq() {
  const { data: faq = [] } = useData('faq', api.faq)
  if (!faq.length) return null
  return (
    <FrequentlyAskedQuestions
      title="سؤال‌های رایج"
      description="جواب سؤالت را این‌جا پیدا نکردی؟ تماس بگیر:"
      contactHref={`tel:${brand.phone}`}
      contactLabel={faDigits(brand.phone)}
      data={faq.map((f) => ({ question: rebrand(f.question), answer: rebrand(f.answer) }))}
    />
  )
}
