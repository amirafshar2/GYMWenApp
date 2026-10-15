import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** ادغام کلاس‌های Tailwind (الگوی shadcn که کامپوننت‌های 21st.dev لازم دارند) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
