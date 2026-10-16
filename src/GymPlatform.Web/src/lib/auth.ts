import { useEffect, useSyncExternalStore } from 'react'
import { refreshSession, tokenStore, type AuthResult, type User } from './api'

/**
 * وضعیت ورود در کل برنامه.
 * فقط یک «نشانه» (نه توکن) در localStorage نگه داشته می‌شود تا برای مهمان‌ها درخواست refresh بی‌دلیل زده نشود.
 */
const HINT = 'kg-signed-in'
type State = { ready: boolean; user: User | null }
let state: State = { ready: false, user: null }
const subs = new Set<() => void>()
const emit = (s: State) => { state = s; subs.forEach((f) => f()) }

const hint = {
  get: () => { try { return localStorage.getItem(HINT) === '1' } catch { return false } },
  set: (on: boolean) => { try { if (on) localStorage.setItem(HINT, '1'); else localStorage.removeItem(HINT) } catch { /* حالت خصوصی */ } },
}

tokenStore.subscribe((r: AuthResult | null) => {
  hint.set(!!r)
  emit({ ready: true, user: r?.user ?? null })
})

let booted = false
function boot() {
  if (booted) return
  booted = true
  if (!hint.get()) { emit({ ready: true, user: null }); return }
  void refreshSession().then((r) => { if (!r) emit({ ready: true, user: null }) })
}

export function useAuth() {
  useEffect(boot, [])
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
}

/** وقتی پروفایل عوض شد (مثلاً نام)، کاربر در هدر هم به‌روز شود */
export const setUser = (user: User) => emit({ ready: true, user })
