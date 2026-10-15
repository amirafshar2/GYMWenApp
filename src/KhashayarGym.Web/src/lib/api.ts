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
}
export interface Faq { question: string; answer: string }
export interface Stats { branches: number; members: number; yearsActive: number; instagramFollowers: number; coaches: number }

import { brand } from './brand'

/** در حالت برند دمو (اسکرین‌شات پرتفولیو) نام، آدرس و تلفن واقعی شعبه‌ها نمایش داده نمی‌شود. */
const anonymize = (list: Branch[]): Branch[] =>
  brand.key !== 'demo' ? list : list.map((b, i) => ({
    ...b,
    name: `شعبهٔ ${(i + 1).toLocaleString('fa-IR')}`,
    district: 'محلهٔ نمونه',
    address: 'آدرس نمونه برای نمایش',
    phone: b.phone ? '07100000000' : null,
  }))

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>
  constructor(status: number, errors: Record<string, string[]> = {}, message = 'خطا در ارتباط با سرور') {
    super(message)
    this.status = status
    this.errors = errors
  }
}

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`/api${path}`, { headers: { Accept: 'application/json' } })
  if (res.status === 204) return null
  if (!res.ok) throw new ApiError(res.status)
  return res.json() as Promise<T>
}

let csrf: string | null = null
async function csrfToken() {
  if (csrf) return csrf
  const res = await fetch('/api/security/csrf', { credentials: 'same-origin' })
  csrf = ((await res.json()) as { token: string }).token
  return csrf
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': await csrfToken() },
    body: JSON.stringify(body),
  })
  if (res.status === 429) throw new ApiError(429, {}, 'تعداد درخواست‌ها زیاد است. یک دقیقهٔ دیگر دوباره امتحان کنید.')
  if (!res.ok) {
    const problem = await res.json().catch(() => ({}))
    throw new ApiError(res.status, problem.errors ?? {}, 'لطفاً خطاهای فرم را برطرف کنید.')
  }
  return res.json() as Promise<T>
}

export const api = {
  branches: () => get<Branch[]>('/branches').then((x) => anonymize(x ?? [])),
  packages: () => get<Pkg[]>('/packages').then((x) => x ?? []),
  coaches: () => get<Coach[]>('/coaches').then((x) => x ?? []),
  campaign: () => get<Campaign>('/campaigns/active'),
  faq: () => get<Faq[]>('/faq').then((x) => x ?? []),
  stats: () => get<Stats>('/stats'),
  consult: (body: { fullName: string; mobile: string; goal: string | null; message: string | null; branchId: number | null }) =>
    post<{ id: number; message: string }>('/consultations', body),
}
