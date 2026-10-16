import { useSyncExternalStore } from 'react'

/** سبد خرید فروشگاه — فقط روی همین مرورگر (اطلاعات قیمت و موجودی همیشه از سرور دوباره گرفته می‌شود) */
export interface CartItem { variantId: number; quantity: number; slug: string; name: string; label: string | null; imagePath: string; priceToman: number }
interface CartState { items: CartItem[]; branch: string | null }

const KEY = 'kg-cart'
const read = (): CartState => { try { return { items: [], branch: null, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return { items: [], branch: null } } }
let state: CartState = read()
const subs = new Set<() => void>()
const save = (s: CartState) => { state = s; try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* */ } subs.forEach((f) => f()) }

export const cart = {
  add(item: CartItem) {
    const found = state.items.find((i) => i.variantId === item.variantId)
    save({ ...state, items: found ? state.items.map((i) => i.variantId === item.variantId ? { ...i, quantity: Math.min(10, i.quantity + item.quantity) } : i) : [...state.items, item] })
  },
  setQty(variantId: number, quantity: number) {
    save({ ...state, items: quantity <= 0 ? state.items.filter((i) => i.variantId !== variantId) : state.items.map((i) => i.variantId === variantId ? { ...i, quantity: Math.min(10, quantity) } : i) })
  },
  setBranch(branch: string | null) { save({ ...state, branch }) },
  clear() { save({ ...state, items: [] }) },
}

export function useCart() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
}
export const cartCount = (s: CartState) => s.items.reduce((n, i) => n + i.quantity, 0)
