import { useEffect, useSyncExternalStore } from 'react'
import { refreshSession, tokenStore, type AuthResult, type User } from './api'

/**
 * Login-Status in der gesamten App.
 * Nur ein „Merker“ (kein Token) liegt im localStorage, damit für Gäste keine unnötige Refresh-Anfrage gesendet wird.
 */
const HINT = 'kg-signed-in'
type State = { ready: boolean; user: User | null }
let state: State = { ready: false, user: null }
const subs = new Set<() => void>()
const emit = (s: State) => { state = s; subs.forEach((f) => f()) }

const hint = {
  get: () => { try { return localStorage.getItem(HINT) === '1' } catch { return false } },
  set: (on: boolean) => { try { if (on) localStorage.setItem(HINT, '1'); else localStorage.removeItem(HINT) } catch { /* privater Modus */ } },
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

/** Wenn sich das Profil ändert (z. B. der Name), wird der Benutzer auch im Header aktualisiert */
export const setUser = (user: User) => emit({ ready: true, user })
