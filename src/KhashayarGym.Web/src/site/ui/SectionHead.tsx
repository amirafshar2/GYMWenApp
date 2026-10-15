import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/** انیمیشن ورود «fade in up» که در همهٔ بخش‌های صفحهٔ مرجع تکرار می‌شود */
export function useFadeUp(delay = 0) {
  const reduced = useReducedMotion()
  return reduced ? {} : {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.8, delay, ease: [0.2, 0.7, 0.2, 1] as const },
  }
}

/** برچسب کوچک و پررنگ بالای تیترها («WHAT WE DO» در صفحهٔ مرجع) */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[13px] font-bold text-chalk', className)}>{children}</p>
}

/** سرتیتر بخش‌ها: برچسب + تیتر پررنگ + توضیح؛ وسط‌چین یا راست‌چین */
export function SectionHead({ eyebrow, title, accent, body, id, align = 'start', aside, dark }: {
  eyebrow: string
  title: string
  accent?: string
  body?: ReactNode
  id?: string
  align?: 'start' | 'center'
  aside?: ReactNode
  dark?: boolean
}) {
  const fade = useFadeUp()
  const center = align === 'center'
  return (
    <motion.div {...fade} className={cn('grid gap-6', center ? 'justify-items-center text-center' : 'md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-end')}>
      <div className={center ? 'max-w-3xl' : undefined}>
        <Eyebrow className={cn('mb-3', dark && 'text-white/80')}>{eyebrow}</Eyebrow>
        <h2 id={id} className={cn('text-[clamp(1.9rem,3.6vw,3.25rem)] font-bold leading-[1.25]', dark ? 'text-white' : 'text-chalk')}>
          {title}{accent && <> {accent}</>}
        </h2>
        {center && body && <p className={cn('mx-auto mt-5 max-w-xl text-[16px] leading-8', dark ? 'text-white/70' : 'text-rubber')}>{body}</p>}
      </div>
      {!center && (body || aside) && (
        <div className="max-w-[440px] md:justify-self-end">
          {body && <p className={cn('text-[16px] leading-8', dark ? 'text-white/70' : 'text-rubber')}>{body}</p>}
          {aside && <div className="mt-6">{aside}</div>}
        </div>
      )}
      {center && aside && <div className="mt-2">{aside}</div>}
    </motion.div>
  )
}

type Tone = 'red' | 'sun' | 'outline' | 'outline-dark' | 'ink'
const tones: Record<Tone, string> = {
  red: 'bg-plate text-white hover:bg-plate-hi',
  sun: 'bg-sun text-chalk hover:bg-[#f0a800]',
  ink: 'bg-chalk text-white hover:bg-black',
  outline: 'border-2 border-white text-white hover:bg-white hover:text-chalk',
  'outline-dark': 'border-2 border-chalk text-chalk hover:bg-chalk hover:text-white',
}

/** دکمهٔ مستطیلی صفحهٔ مرجع (قرمز، زرد یا دورخط) */
export function Btn({ children, onClick, href, type = 'button', disabled, tone = 'red', className }: { children: ReactNode; onClick?: () => void; href?: string; type?: 'button' | 'submit'; disabled?: boolean; tone?: Tone; className?: string }) {
  const cls = cn('inline-flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[3px] px-8 text-[15px] font-bold transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60', tones[tone], className)
  return href
    ? <a href={href} onClick={onClick} className={cls}>{children}</a>
    : <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>
}

/** سازگاری با بخش‌های قبلی */
export function InkButton(p: { children: ReactNode; onClick?: () => void; href?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <Btn {...p} tone="red" />
}

export function TextLink({ children, href, onClick }: { children: ReactNode; href?: string; onClick?: () => void }) {
  const cls = 'inline-flex cursor-pointer items-center gap-2 border-b-2 border-chalk/20 py-1 text-[15px] font-bold text-chalk transition-colors hover:border-plate hover:text-plate'
  return href ? <a href={href} className={cls}>{children}</a> : <button type="button" onClick={onClick} className={cls}>{children}</button>
}

/** ظرف عرض صفحه مثل «boxed» صفحهٔ مرجع */
export const wrap = 'mx-auto w-full max-w-[1290px] px-5 sm:px-8'
