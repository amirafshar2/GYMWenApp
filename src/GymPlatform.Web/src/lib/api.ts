export interface Branch {
  id: number; slug: string; name: string; district: string; address: string; phone: string | null
  latitude: number; longitude: number; hasMen: boolean; hasWomen: boolean; addressConfirmed: boolean
  menHours: string | null; womenHours: string | null; disciplines: string[]
}
export interface Pkg {
  id: number; slug: string; name: string; tagline: string | null; category: string; durationMonths: number
  sessions: number | null; priceToman: number; discountedPriceToman: number | null; discountPercent: number | null
  monthlyEquivalentToman: number; includesPersonalCoach: boolean; includesNutritionPlan: boolean
  isFeatured: boolean; features: string[]
}
export interface Coach {
  id: number; slug: string; fullName: string; specialty: string; bio: string | null; yearsOfExperience: number
  section: 'Men' | 'Women' | 'Both'; branchName: string; photoUrl: string | null; achievements: string[]
}
export interface Campaign {
  id: number; title: string; description: string | null; startsAtUtc: string; endsAtUtc: string
  discountPercent: number; eligiblePackageSlugs: string[]
  discountAmountToman: number | null; eligibleBranchSlugs: string[] | null; remainingSlots: number | null
}
export interface Faq { question: string; answer: string }
export interface Stats { branches: number; members: number | null; yearsActive: number | null; coaches: number }

// ---- فاز ۲: عضویت ----
export type Section = 'men' | 'women'
export interface User { id: number; phoneNumber: string; fullName: string | null; gender: 'male' | 'female' | null; roles: string[] }
export interface AuthResult { accessToken: string; accessTokenExpiresAtUtc: string; user: User }
export interface OtpSent { expiresInSeconds: number; resendInSeconds: number; demoCode: string | null }
export interface Quote {
  branchName: string; packageName: string; section: Section; durationMonths: number; sessions: number | null
  baseAmountToman: number; campaignPercent: number | null; campaignTitle: string | null; campaignDiscountToman: number
  discountCode: string | null; discountCodePercent: number | null; codeDiscountToman: number; totalToman: number
  discountCodeError: string | null
}
export interface Membership {
  id: number; status: string; branchName: string; branchSlug: string; packageName: string; packageSlug: string; section: Section
  startsAtUtc: string | null; endsAtUtc: string | null; daysLeft: number | null; totalDays: number
  sessionsTotal: number | null; sessionsUsed: number; isActive: boolean; cardToken: string
}
export interface PaymentRow { id: number; status: PaymentStatus; amountToman: number; packageName: string; invoiceNumber: string | null; createdAtUtc: string; paidAtUtc: string | null }
export type PaymentStatus = 'pending' | 'succeeded' | 'failed'
export interface PaymentResult {
  id: number; status: PaymentStatus; amountToman: number; baseAmountToman: number; campaignDiscountToman: number; codeDiscountToman: number
  discountCode: string | null; transactionCode: string | null; invoiceNumber: string | null; createdAtUtc: string; paidAtUtc: string | null
  packageName: string; branchName: string; section: Section; gatewayMessage: string | null; membership: Membership | null
}
export interface Profile {
  user: User; active: Membership | null; memberships: Membership[]; payments: PaymentRow[]
  contracts: { id: number; version: number; title: string; signedAtUtc: string }[]; hasSignedLatestContract: boolean
}
export interface Contract { id: number; version: number; title: string; clauses: string[]; healthQuestions: string[] }
export interface SignedContract { id: number; version: number; signedAtUtc: string; contentHash: string; healthWarning: boolean }
export interface GatewayRedirect { paymentId: number; alreadyPaid: boolean; method: string | null; url: string | null; form: Record<string, string> | null }


export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>
  constructor(status: number, errors: Record<string, string[]> = {}, message = 'خطا در ارتباط با سرور') {
    super(message)
    this.status = status
    this.errors = errors
  }
  /** اولین پیام خطای یک فیلد (کلیدها camelCase یا PascalCase) */
  field(name: string) {
    const k = Object.keys(this.errors).find((x) => x.toLowerCase() === name.toLowerCase())
    return k ? this.errors[k]?.[0] : undefined
  }
}

const BASE = '/api/v1'

// ---- توکن دسترسی فقط در حافظه؛ توکن تازه‌سازی در کوکی HttpOnly که JS به آن دسترسی ندارد ----
let accessToken: string | null = null
let refreshing: Promise<AuthResult | null> | null = null
type Listener = (r: AuthResult | null) => void
const listeners = new Set<Listener>()
export const tokenStore = {
  set(r: AuthResult | null) { accessToken = r?.accessToken ?? null; listeners.forEach((l) => l(r)) },
  has: () => accessToken !== null,
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l) } },
}

let csrf: string | null = null
async function csrfToken() {
  if (csrf) return csrf
  const res = await fetch(`${BASE}/security/csrf`, { credentials: 'same-origin', headers: { 'X-KG-Client': 'web' } })
  csrf = ((await res.json()) as { token: string }).token
  return csrf
}

async function toError(res: Response): Promise<ApiError> {
  const p = await res.json().catch(() => ({})) as { title?: string; errors?: Record<string, string[]> }
  if (res.status === 429 && !p.title) return new ApiError(429, {}, 'تعداد درخواست‌ها زیاد است. یک دقیقهٔ دیگر دوباره امتحان کنید.')
  if (res.status === 401) return new ApiError(401, p.errors ?? {}, p.title ?? 'برای ادامه وارد حساب شوید.')
  return new ApiError(res.status, p.errors ?? {}, p.title ?? (res.status >= 500 ? 'خطای سرور؛ چند لحظهٔ دیگر امتحان کنید.' : 'لطفاً خطاهای فرم را برطرف کنید.'))
}

/** توکن تازه با کوکی HttpOnly؛ هم‌زمان فقط یک درخواست. */
export function refreshSession(): Promise<AuthResult | null> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin', headers: { 'X-KG-Client': 'web', Accept: 'application/json' } })
    .then(async (res) => {
      const r = res.ok ? (await res.json()) as AuthResult : null
      tokenStore.set(r)
      return r
    })
    .catch(() => null)
    .finally(() => { refreshing = null })
  return refreshing
}

type Opts = { body?: unknown; auth?: boolean; raw?: boolean }
/** توکن فعلی برای اتصال SignalR (WebSocket هدر ندارد) */
export const currentAccessToken = () => accessToken
export async function request<T>(method: string, path: string, { body, auth, raw }: Opts = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-KG-Client': 'web' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  else if (method !== 'GET') headers['X-XSRF-TOKEN'] = await csrfToken()
  const res = await fetch(BASE + path, { method, credentials: 'same-origin', headers, body: body === undefined ? undefined : JSON.stringify(body) })

  // توکن دسترسی کوتاه‌عمر است؛ یک بار تازه‌سازی و تکرار
  if (res.status === 401 && auth && !retried && await refreshSession()) return request<T>(method, path, { body, auth, raw }, true)
  if (res.status === 400 && !accessToken && method !== 'GET' && !retried) {
    // ممکن است توکن ضد CSRF با کوکی جدید هم‌خوان نباشد
    const p = await res.clone().json().catch(() => null) as { errors?: Record<string, unknown> } | null
    if (p && !p.errors) { csrf = null; return request<T>(method, path, { body, auth, raw }, true) }
  }
  if (res.status === 204) return null as T
  if (!res.ok) throw await toError(res)
  if (raw) return res.blob() as Promise<T>
  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>('GET', path)

export const api = {
  branches: () => get<Branch[]>('/branches').then((x) => x ?? []),
  packages: () => get<Pkg[]>('/packages').then((x) => x ?? []),
  coaches: () => get<Coach[]>('/coaches').then((x) => x ?? []),
  campaign: () => get<Campaign | null>('/campaigns/active'),
  faq: () => get<Faq[]>('/faq').then((x) => x ?? []),
  stats: () => get<Stats>('/stats'),
  site: () => get<import('./site').SiteInfo>('/site'),
  consult: (body: { fullName: string; mobile: string; goal: string | null; message: string | null; branchId: number | null }) =>
    request<{ id: number; message: string }>('POST', '/consultations', { body }),
}

export const authApi = {
  sendOtp: (phoneNumber: string) => request<OtpSent>('POST', '/auth/otp', { body: { phoneNumber } }),
  verify: async (phoneNumber: string, code: string) => {
    const r = await request<AuthResult>('POST', '/auth/verify', { body: { phoneNumber, code } })
    tokenStore.set(r)
    return r
  },
  /** فقط نسخهٔ نمایشی: ورود یک‌کلیکی به حساب‌های دمو */
  demoLogin: async (phoneNumber: string) => {
    const r = await request<AuthResult>('POST', '/auth/demo', { body: { phoneNumber } })
    tokenStore.set(r)
    return r
  },
  logout: async () => {
    await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'same-origin', headers: { 'X-KG-Client': 'web' } }).catch(() => null)
    tokenStore.set(null)
  },
}

export const memberApi = {
  me: () => request<User>('GET', '/me', { auth: true }),
  updateMe: (fullName: string, gender: 'male' | 'female' | null) => request<User>('PUT', '/me', { body: { fullName, gender }, auth: true }),
  profile: () => request<Profile>('GET', '/me/profile', { auth: true }),
  payment: (id: number) => request<PaymentResult>('GET', `/me/payments/${id}`, { auth: true }),
  invoicePdf: (id: number) => request<Blob>('GET', `/me/payments/${id}/invoice.pdf`, { auth: true, raw: true }),
  contractPdf: (id: number) => request<Blob>('GET', `/me/contracts/${id}/pdf`, { auth: true, raw: true }),
  card: () => request<Blob>('GET', '/me/card.svg', { auth: true, raw: true }),
  contract: () => request<Contract>('GET', '/contracts/active'),
  signOtp: () => request<OtpSent>('POST', '/contracts/sign/otp', { auth: true }),
  sign: (body: { version: number; fullName: string; accepted: boolean; healthAnswers: boolean[]; healthNotes: string | null; code: string }) =>
    request<SignedContract>('POST', '/contracts/sign', { body, auth: true }),
  quote: (body: { branchSlug: string; packageSlug: string; section: Section; discountCode: string | null }) =>
    request<Quote>('POST', '/checkout/quote', { body }),
  checkout: (body: { branchSlug: string; packageSlug: string; section: Section; discountCode: string | null; idempotencyKey: string }) =>
    request<GatewayRedirect>('POST', '/checkout', { body, auth: true }),
}

/** دانلود فایل محافظت‌شده (با توکن) */
export async function downloadBlob(load: () => Promise<Blob>, fileName: string) {
  const blob = await load()
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** فرم پرداخت را مثل یک فرم HTML معمولی به درگاه ارسال می‌کند (درگاه‌های ایرانی POST می‌خواهند). */
export function submitToGateway(g: GatewayRedirect) {
  if (!g.url) return
  if ((g.method ?? 'get') === 'get') { window.location.assign(g.url); return }
  const f = Object.assign(document.createElement('form'), { method: 'post', action: g.url })
  for (const [name, value] of Object.entries(g.form ?? {}))
    f.append(Object.assign(document.createElement('input'), { type: 'hidden', name, value }))
  document.body.append(f)
  f.submit()
}
