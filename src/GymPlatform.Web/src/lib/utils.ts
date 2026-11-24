import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Zusammenführen von Tailwind-Klassen (shadcn-Muster, das die 21st.dev-Komponenten brauchen) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
