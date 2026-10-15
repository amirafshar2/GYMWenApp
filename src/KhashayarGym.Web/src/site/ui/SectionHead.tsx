import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * سرتیتر بخش‌ها با همان زبان بصری هیروی Liquid Sculpture:
 * خط کوچک + برچسب، تیتر Vazirmatn با بخش تأکیدی نسخ آبی، و توضیح با شفافیت ۷۸٪.
 */
export function SectionHead({ eyebrow, title, accent, body, id, align = 'start', aside }: {
  eyebrow: string
  title: string
  accent?: string
  body?: ReactNode
  id?: string
  align?: 'start' | 'center'
  aside?: ReactNode
}) {
  const reduced = useReducedMotion()
  const anim = reduced ? {} : { initial: { opacity: 0, y: 12 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.4 }, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] as const } }
  return (
    <motion.div {...anim} className={`grid gap-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-end ${align === 'center' ? 'text-center md:grid-cols-1 justify-items-center' : ''}`}>
      <div>
        <p className="mb-5 flex items-center gap-3 text-[13px] text-rubber">
          <span aria-hidden className="h-px w-7 bg-current opacity-70" />
          {eyebrow}
        </p>
        <h2 id={id} className="text-[clamp(2.25rem,5vw,4.5rem)] font-medium leading-[1.05] text-chalk">
          {title}
          {accent && <span className="block font-['Noto_Naskh_Arabic'] font-semibold text-plate">{accent}</span>}
        </h2>
      </div>
      {(body || aside) && (
        <div className="max-w-[420px] md:justify-self-end">
          {body && <p className="text-[clamp(15px,1.1vw,17px)] leading-7 text-chalk/80">{body}</p>}
          {aside && <div className="mt-6">{aside}</div>}
        </div>
      )}
    </motion.div>
  )
}

/** دکمهٔ اصلی و لینک متنی، همان سبک .sh-btn و .sh-txt هیرو */
export function InkButton({ children, onClick, href, type = 'button', disabled }: { children: ReactNode; onClick?: () => void; href?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  const cls = 'inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-full bg-chalk px-6 text-[15px] font-medium text-iron transition-[transform,opacity] duration-300 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60'
  const arrow = <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="-scale-x-100"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
  return href
    ? <a href={href} className={cls}>{children}{arrow}</a>
    : <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}{arrow}</button>
}

export function TextLink({ children, href, onClick }: { children: ReactNode; href?: string; onClick?: () => void }) {
  const cls = 'inline-flex cursor-pointer items-center gap-2 border-b border-chalk/30 py-1 text-[15px] font-medium text-chalk transition-colors hover:border-chalk'
  return href ? <a href={href} className={cls}>{children}</a> : <button type="button" onClick={onClick} className={cls}>{children}</button>
}
