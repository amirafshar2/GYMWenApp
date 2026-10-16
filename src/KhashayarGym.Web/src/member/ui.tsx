import type { ComponentProps, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** کلاس‌های مشترک صفحه‌های عضویت (هم‌سبک فرم مشاوره: گوشهٔ ۳px، قرمز تم) */
export const inputCls =
  'h-[52px] w-full rounded-[3px] border border-steel-2 bg-white px-4 text-[15px] text-chalk outline-none transition-colors placeholder:text-rubber/60 hover:border-chalk/30 focus:border-plate focus:ring-2 focus:ring-plate/15 aria-[invalid=true]:border-plate disabled:bg-steel'

export function Btn({ busy, variant = 'primary', className, children, disabled, ...p }: ComponentProps<'button'> & { busy?: boolean; variant?: 'primary' | 'dark' | 'ghost' }) {
  return (
    <button {...p} disabled={disabled || busy} aria-busy={busy || undefined}
      className={cn('inline-flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[3px] px-6 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-plate text-white hover:bg-plate-hi',
        variant === 'dark' && 'bg-chalk text-white hover:bg-night',
        variant === 'ghost' && 'border border-steel-2 bg-white text-chalk hover:border-chalk',
        className)}>
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Panel({ className, children, ...p }: ComponentProps<'section'>) {
  return <section {...p} className={cn('rounded-[6px] border border-steel-2 bg-white p-5 sm:p-7', className)}>{children}</section>
}

export function Notice({ tone = 'info', children, className }: { tone?: 'info' | 'ok' | 'err' | 'warn'; children: ReactNode; className?: string }) {
  return (
    <div role={tone === 'err' ? 'alert' : 'status'}
      className={cn('rounded-[3px] border-r-4 px-4 py-3 text-[14px] leading-7',
        tone === 'info' && 'border-chalk bg-steel text-chalk',
        tone === 'ok' && 'border-[#1f9d55] bg-[#ecf8f1] text-[#14532d]',
        tone === 'err' && 'border-plate bg-[#fdecee] text-[#8a1020]',
        tone === 'warn' && 'border-sun bg-[#fff6e0] text-[#5c4300]',
        className)}>
      {children}
    </div>
  )
}

export function PageShell({ title, eyebrow, children, aside }: { title: string; eyebrow?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="bg-steel">
      <div className="mx-auto w-full max-w-[1100px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && <p className="mb-2 text-[13px] font-bold text-plate">{eyebrow}</p>}
            <h1 className="text-[28px] font-black leading-tight text-chalk sm:text-[36px]">{title}</h1>
          </div>
          {aside}
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[40vh] place-items-center text-rubber">
      <span className="flex items-center gap-2"><Loader2 className="size-5 animate-spin" aria-hidden />{label}</span>
    </div>
  )
}

export const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))

export const sectionLabel = (s: string) => (s === 'women' ? 'سالن بانوان' : 'سالن آقایان')

export const statusLabel: Record<string, { text: string; cls: string }> = {
  succeeded: { text: 'موفق', cls: 'bg-[#ecf8f1] text-[#14532d]' },
  failed: { text: 'ناموفق', cls: 'bg-[#fdecee] text-[#8a1020]' },
  pending: { text: 'در انتظار', cls: 'bg-[#fff6e0] text-[#5c4300]' },
}
