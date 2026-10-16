import { request, submitToGateway, type GatewayRedirect } from './api'

// ---------------- انواع
export interface WalletTx { id: number; amountToman: number; balanceAfterToman: number; type: string; description: string; createdAtUtc: string }
export interface Wallet { balanceToman: number; transactions: WalletTx[]; topUpPresets: number[]; minTopUpToman: number; maxTopUpToman: number }

export interface ProductCard {
  id: number; slug: string; name: string; brandName: string; kind: 'supplement' | 'apparel' | 'gear'; category: string; imagePath: string
  priceToman: number; minVariantPriceToman: number | null; isKhashayarBrand: boolean; inStock: boolean; colors: string[]; sizes: string[]; flavors: string[]
}
export interface ShopCatalog { products: ProductCard[]; categories: { kind: string; category: string; count: number }[]; brands: string[] }
export interface VariantStock { branchSlug: string; branchName: string; quantity: number }
export interface Variant { id: number; sku: string; size: string | null; color: string | null; colorHex: string | null; flavor: string | null; label: string; priceToman: number; totalStock: number; stock: VariantStock[] }
export interface ProductDetail {
  id: number; slug: string; name: string; brandName: string; kind: string; category: string; description: string | null; imagePath: string
  priceToman: number; isKhashayarBrand: boolean; highlights: string[]; variants: Variant[]
}
export interface QuoteLine { variantId: number; productSlug: string; productName: string; variantLabel: string | null; imagePath: string; unitPriceToman: number; quantity: number; lineToman: number; availableInBranch: number; problem: string | null }
export interface ShopQuote {
  lines: QuoteLine[]; subtotalToman: number; discountToman: number; shippingToman: number; totalToman: number
  discountCode: string | null; discountPercent: number | null; discountCodeError: string | null; canCheckout: boolean; freeShippingFromToman: number
}
export interface ShopOrder {
  id: number; number: string | null; status: 'pending' | 'paid' | 'ready' | 'shipped' | 'completed' | 'cancelled'; fulfillment: 'pickup' | 'delivery'
  branchName: string; address: string | null; subtotalToman: number; discountToman: number; shippingToman: number; totalToman: number
  payMethod: 'wallet' | 'gateway'; createdAtUtc: string; paidAtUtc: string | null
  items: { productName: string; variantLabel: string | null; imagePath: string; unitPriceToman: number; quantity: number }[]
}
export interface CanteenMenuItem { id: number; slug: string; name: string; description: string | null; category: 'coffee' | 'shake' | 'drink' | 'snack' | 'meal'; priceToman: number; kcal: number | null; proteinG: number | null; imagePath: string; isAvailable: boolean }
export interface CanteenMenu { branchSlug: string; branchName: string; tableCode: string | null; items: CanteenMenuItem[] }
export type CanteenStatus = 'pending' | 'queued' | 'preparing' | 'ready' | 'collected' | 'cancelled'
export interface CanteenOrder {
  id: number; dailyNumber: number; status: CanteenStatus; branchId: number; branchName: string; tableCode: string | null; customerName: string | null
  totalToman: number; payMethod: 'wallet' | 'gateway'; note: string | null; createdAtUtc: string; paidAtUtc: string | null; readyAtUtc: string | null
  items: { name: string; unitPriceToman: number; quantity: number }[]
}
export interface PurchaseResponse { completed: boolean; orderId: number; redirectPath: string | null; gateway: GatewayRedirect | null }
export type PayMethod = 'wallet' | 'gateway'

const qs = (o: Record<string, string | boolean | undefined | null>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ---------------- API
export const walletApi = {
  get: () => request<Wallet>('GET', '/me/wallet', { auth: true }),
  topUp: (amountToman: number, idempotencyKey: string) => request<PurchaseResponse>('POST', '/me/wallet/topups', { body: { amountToman, idempotencyKey }, auth: true }),
}

export const shopApi = {
  catalog: (f: { kind?: string; category?: string; q?: string; branch?: string; inStock?: boolean; sort?: string }) =>
    request<ShopCatalog>('GET', `/shop/products${qs(f)}`),
  product: (slug: string) => request<ProductDetail>('GET', `/shop/products/${encodeURIComponent(slug)}`),
  quote: (body: { items: { variantId: number; quantity: number }[]; branchSlug: string; fulfillment: 'pickup' | 'delivery'; discountCode: string | null }) =>
    request<ShopQuote>('POST', '/shop/quote', { body }),
  checkout: (body: {
    items: { variantId: number; quantity: number }[]; branchSlug: string; fulfillment: 'pickup' | 'delivery'; discountCode: string | null; payMethod: PayMethod
    recipientName?: string | null; recipientPhone?: string | null; address?: string | null; postalCode?: string | null; idempotencyKey: string
  }) => request<PurchaseResponse>('POST', '/shop/orders', { body, auth: true }),
  order: (id: number) => request<ShopOrder>('GET', `/me/shop-orders/${id}`, { auth: true }),
  myOrders: () => request<{ shop: ShopOrder[]; canteen: CanteenOrder[] }>('GET', '/me/orders', { auth: true }),
}

export const canteenApi = {
  menu: (branch: string, table?: string | null) => request<CanteenMenu>('GET', `/canteen/${encodeURIComponent(branch)}/menu${qs({ table })}`),
  place: (body: { branchSlug: string; tableCode: string | null; items: { itemId: number; quantity: number }[]; note: string | null; payMethod: PayMethod; idempotencyKey: string }) =>
    request<PurchaseResponse>('POST', '/canteen/orders', { body, auth: true }),
  order: (id: number) => request<CanteenOrder>('GET', `/me/canteen-orders/${id}`, { auth: true }),
  board: (branch: string) => request<CanteenOrder[]>('GET', `/canteen/staff/${encodeURIComponent(branch)}/orders`, { auth: true }),
  setStatus: (id: number, status: 'preparing' | 'ready' | 'collected' | 'cancelled') =>
    request<CanteenOrder>('POST', `/canteen/staff/orders/${id}/status`, { body: { status }, auth: true }),
}

/** نتیجهٔ خرید: کیف پول ← مستقیم به صفحهٔ نتیجه؛ درگاه ← فرم بانک */
export function continuePurchase(r: PurchaseResponse, navigate: (to: string) => void) {
  if (r.completed || !r.gateway) { if (r.redirectPath) navigate(r.redirectPath); return }
  submitToGateway(r.gateway)
}

export const newKey = () => crypto.randomUUID().replace(/-/g, '')

export const SHOP_STATUS: Record<ShopOrder['status'], { text: string; tone: 'ok' | 'warn' | 'err' | 'info' }> = {
  pending: { text: 'در انتظار پرداخت', tone: 'warn' }, paid: { text: 'پرداخت شد — در حال آماده‌سازی ارسال', tone: 'ok' },
  ready: { text: 'آمادهٔ تحویل در باشگاه', tone: 'ok' }, shipped: { text: 'ارسال شد', tone: 'ok' },
  completed: { text: 'تحویل شد', tone: 'info' }, cancelled: { text: 'لغو شد', tone: 'err' },
}
export const CANTEEN_STATUS: Record<CanteenStatus, string> = {
  pending: 'در انتظار پرداخت', queued: 'در صف', preparing: 'در حال آماده‌سازی', ready: 'آماده است', collected: 'تحویل شد', cancelled: 'لغو شد',
}
export const CANTEEN_CATEGORIES: { key: CanteenMenuItem['category']; label: string }[] = [
  { key: 'shake', label: 'شیک و اسموتی' }, { key: 'coffee', label: 'قهوه' }, { key: 'meal', label: 'غذا' }, { key: 'snack', label: 'میان‌وعده' }, { key: 'drink', label: 'نوشیدنی' },
]
