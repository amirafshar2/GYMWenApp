// حداقل پیاده‌سازی Field مطابق API کامپوننت field در shadcn (در رجیستری 21st موجود نبود)
import * as React from 'react'
import { cn } from '@/lib/utils'

export function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field" className={cn('flex w-full flex-col gap-2', className)} {...props} />
}

export function FieldLabel({ className, ...props }: React.ComponentProps<'label'>) {
  return <label data-slot="field-label" className={cn('text-sm font-medium leading-none', className)} {...props} />
}

export function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="field-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function FieldError({ className, ...props }: React.ComponentProps<'p'>) {
  return <p role="alert" data-slot="field-error" className={cn('text-sm text-destructive', className)} {...props} />
}
