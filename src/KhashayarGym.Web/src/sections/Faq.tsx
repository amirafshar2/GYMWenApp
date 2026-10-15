import { api } from '../lib/api'
import { useData } from '../lib/useData'
import { rebrand } from '../lib/brand'

export default function Faq() {
  const { data: faq = [] } = useData('faq', api.faq)
  return (
    <section aria-labelledby="faq-title" className="mx-auto max-w-4xl px-4 py-24 md:px-8">
      <h2 id="faq-title" className="section-title">سؤال‌های رایج</h2>
      <div className="mt-10 divide-y divide-steel-2 border-y border-steel-2">
        {faq.map((f) => (
          <details key={f.question} className="group py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold">
              {rebrand(f.question)}
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-steel-2 transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="pb-5 leading-8 text-rubber">{rebrand(f.answer)}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
