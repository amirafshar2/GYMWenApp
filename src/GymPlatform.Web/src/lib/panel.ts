import { currentAccessToken, refreshSession, request, type Membership } from './api'

// ---------------- انواع (هم‌نام با DTOهای سرور)
export interface BranchRef { id: number; slug: string; name: string }
export interface PanelMe { userId: number; fullName: string | null; roles: string[]; branches: BranchRef[]; coachId: number | null }
export interface Split { membership: number; shop: number; canteen: number; total: number }
export interface DailyRevenue { date: string; membership: number; shop: number; canteen: number }
export interface BranchStat { slug: string; name: string; revenue: Split; activeMembers: number; checkIns: number; newMembers: number }
export interface ExpiringMember { userId: number; fullName: string | null; phone: string; branchName: string; packageName: string; endsAtUtc: string; daysLeft: number }
export interface CampaignEffect { id: number; title: string; startsAtUtc: string; endsAtUtc: string; registrations: number; revenueToman: number; discountGivenToman: number; isRunning: boolean }
export interface Dashboard {
  branch: string | null; days: number; today: Split; period: Split; previousPeriod: Split
  activeMembers: number; checkInsToday: number; newMembers: number; renewalRate: number
  daily: DailyRevenue[]; branches: BranchStat[]; expiring: ExpiringMember[]; campaigns: CampaignEffect[]; checkInsByHour: number[]
}
export interface MemberRow { userId: number; fullName: string | null; phone: string; activePackage: string | null; activeBranch: string | null; daysLeft: number | null }
export interface Credential { id: number; type: string; valueHint: string; label: string | null; externalRef: string | null; createdAtUtc: string; isActive: boolean }
export interface CheckInRow { id: number; occurredAtUtc: string; branchName: string; memberName: string | null; userId: number | null; allowed: boolean; reason: string; method: string }
export interface MemberSummary {
  userId: number; fullName: string | null; phone: string; gender: string | null; active: Membership | null; memberships: Membership[]
  credentials: Credential[]; recentCheckIns: CheckInRow[]; walletToman: number; hasSignedContract: boolean
}
export interface AccessResult { allowed: boolean; reason: string; message: string; memberFirstName: string | null; daysLeft: number | null; sessionsLeft: number | null; sessionCounted: boolean }
export interface PlanDay { day: string; focus: string; items: string[] }
export interface TrainingPlan { id: number; title: string; days: PlanDay[]; nutrition: string | null; coachName: string; updatedAtUtc: string }
export interface BodyMetric { id: number; measuredOn: string; weightKg: number; bodyFatPercent: number | null; waistCm: number | null }
export interface TraineeRow {
  userId: number; fullName: string | null; phone: string; gender: string | null; activePackage: string | null; daysLeft: number | null
  lastWeightKg: number | null; weightChangeKg: number | null; planUpdatedAtUtc: string | null; lastCheckInUtc: string | null
}
export interface TraineeDetail { member: TraineeRow; active: Membership | null; metrics: BodyMetric[]; plan: TrainingPlan | null; checkIns30: number }
export interface Preferences { birthDate: string | null; marketingSmsOptIn: boolean }

export interface AdminPackage { id: number; slug: string; name: string; tagline: string | null; category: string; durationMonths: number; sessions: number | null; priceToman: number; isActive: boolean; isFeatured: boolean; sortOrder: number; features: string[]; memberships: number }
export interface SavePackage { name: string; tagline: string | null; category: string; durationMonths: number; sessions: number | null; priceToman: number; features: string[]; isActive: boolean; isFeatured: boolean }
export interface AdminCampaign {
  id: number; title: string; description: string | null; startsAtUtc: string; endsAtUtc: string; discountPercent: number; discountAmountToman: number | null
  eligiblePackageSlugs: string[]; eligibleBranchSlugs: string[]; maxRedemptions: number | null; redemptionCount: number; isActive: boolean; isRunning: boolean
}
export type SaveCampaign = Omit<AdminCampaign, 'id' | 'redemptionCount' | 'isRunning'>
export interface Audience { recipients: number; expiredMembers: number; optedOut: number; preview: string }
export interface AdminCode { id: number; code: string; percent: number; maxUses: number | null; usedCount: number; expiresAtUtc: string | null; isActive: boolean; scope: 'membership' | 'shop' | 'any'; membersOnly: boolean }
export interface AdminContract { id: number; version: number; title: string; clauses: string[]; healthQuestions: string[]; isActive: boolean; publishedAtUtc: string | null; signatures: number }
export interface AdminStock { branchSlug: string; branchName: string; quantity: number }
export interface AdminVariant { id: number; sku: string; label: string; priceToman: number | null; stock: AdminStock[] }
export interface SaveVariant { id: number | null; size: string | null; color: string | null; colorHex: string | null; flavor: string | null; priceToman: number | null }
export interface AdminProduct {
  id: number; slug: string; name: string; kind: string; category: string; imagePath: string; priceToman: number; isActive: boolean; variants: AdminVariant[]
  brandName: string; description: string | null; highlights: string[] | null; variantDetails: SaveVariant[] | null
}
export interface SaveProduct { name: string; brandName: string; kind: string; category: string; description: string | null; priceToman: number; imagePath: string; isActive: boolean; highlights: string[]; variants: SaveVariant[] }
export interface AdminShopOrder {
  id: number; number: string | null; status: string; fulfillment: 'pickup' | 'delivery'; branchName: string; customerName: string | null; customerPhone: string
  address: string | null; totalToman: number; createdAtUtc: string; items: { productName: string; variantLabel: string | null; imagePath: string; unitPriceToman: number; quantity: number }[]
}
export interface AdminCanteenItem { id: number; name: string; category: string; priceToman: number; isAvailable: boolean; imagePath: string; description: string | null; kcal: number | null; proteinG: number | null }
export interface SaveCanteenItem { name: string; description: string | null; category: string; priceToman: number; kcal: number | null; proteinG: number | null; imagePath: string; isAvailable: boolean }
export interface AdminCoach {
  id: number; slug: string; fullName: string; specialty: string; bio: string | null; yearsOfExperience: number; section: 'men' | 'women' | 'both'
  branchSlug: string; branchName: string; photoUrl: string | null; achievements: string[]; isActive: boolean; linkedPhone: string | null; linkedName: string | null; trainees: number
}
export interface SaveCoach { fullName: string; specialty: string; bio: string | null; yearsOfExperience: number; section: string; branchSlug: string; photoUrl: string | null; achievements: string[]; isActive: boolean; linkedPhone: string | null }
export interface ImageLibrary { canteen: string[]; shop: string[]; uploads: string[] }
export interface StaffRow { userId: number; fullName: string | null; phone: string; roles: string[]; branches: BranchRef[]; lastLoginAtUtc: string | null }
export interface SmsRow { id: number; phone: string; kind: string; preview: string; status: 'queued' | 'sent' | 'failed'; createdAtUtc: string; sentAtUtc: string | null; error: string | null }
export interface SmsStats { queued: number; sentToday: number; failed: number; recent: SmsRow[] }

const P = '/panel'
const A = '/panel/admin'
const q = (o: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams()
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.set(k, String(v)) })
  const t = s.toString()
  return t ? `?${t}` : ''
}
const get = <T>(p: string) => request<T>('GET', p, { auth: true })
const send = <T>(m: string, p: string, body?: unknown) => request<T>(m, p, { body, auth: true })

export const panelApi = {
  me: () => get<PanelMe>(`${P}/me`),
  dashboard: (branch?: string, days = 30) => get<Dashboard>(`${P}/dashboard${q({ branch, days })}`),
  exportDashboard: (branch?: string, days = 30) => request<Blob>('GET', `${P}/dashboard/export${q({ branch, days })}`, { auth: true, raw: true }),
  // پذیرش
  search: (text: string) => get<MemberRow[]>(`${P}/reception/members${q({ q: text })}`),
  member: (id: number) => get<MemberSummary>(`${P}/reception/members/${id}`),
  checkIn: (branchSlug: string, credential: string) => send<AccessResult>('POST', `${P}/reception/checkins`, { branchSlug, credential }),
  /** ورود دستی از پروندهٔ عضو؛ توکن کارت فقط سمت سرور خوانده می‌شود */
  checkInMember: (branchSlug: string, userId: number) => send<AccessResult>('POST', `${P}/reception/checkins`, { branchSlug, userId }),
  today: (branch: string) => get<CheckInRow[]>(`${P}/reception/checkins${q({ branch })}`),
  assignCredential: (userId: number, body: { type: string; value: string; label?: string }) => send<Credential>('POST', `/staff/members/${userId}/credentials`, body),
  revokeCredential: (userId: number, id: number) => send<null>('DELETE', `/staff/members/${userId}/credentials/${id}`),
  // مربی
  trainees: () => get<TraineeRow[]>(`${P}/coach/trainees`),
  addTrainee: (phone: string) => send<TraineeRow>('POST', `${P}/coach/trainees`, { phone }),
  trainee: (id: number) => get<TraineeDetail>(`${P}/coach/trainees/${id}`),
  savePlan: (id: number, body: { title: string; days: PlanDay[]; nutrition: string | null }) => send<TrainingPlan>('PUT', `${P}/coach/trainees/${id}/plan`, body),
  addMetric: (id: number, body: { weightKg: number; bodyFatPercent?: number | null; waistCm?: number | null }) => send<BodyMetric>('POST', `${P}/coach/trainees/${id}/metrics`, body),
  // مدیریت
  packages: () => get<AdminPackage[]>(`${A}/packages`),
  updatePackage: (id: number, body: { priceToman: number; isActive: boolean; isFeatured: boolean; tagline: string | null }) => send<AdminPackage>('PUT', `${A}/packages/${id}`, body),
  campaigns: () => get<AdminCampaign[]>(`${A}/campaigns`),
  saveCampaign: (id: number | null, body: SaveCampaign) => send<AdminCampaign>(id ? 'PUT' : 'POST', id ? `${A}/campaigns/${id}` : `${A}/campaigns`, body),
  audience: (id: number) => get<Audience>(`${A}/campaigns/${id}/audience`),
  sendCampaignSms: (id: number) => send<Audience>('POST', `${A}/campaigns/${id}/sms`),
  codes: () => get<AdminCode[]>(`${A}/discount-codes`),
  saveCode: (id: number | null, body: Omit<AdminCode, 'id' | 'usedCount'>) => send<AdminCode>(id ? 'PUT' : 'POST', id ? `${A}/discount-codes/${id}` : `${A}/discount-codes`, body),
  contracts: () => get<AdminContract[]>(`${A}/contracts`),
  publishContract: (body: { title: string; clauses: string[]; healthQuestions: string[] }) => send<AdminContract>('POST', `${A}/contracts`, body),
  products: () => get<AdminProduct[]>(`${A}/products`),
  updateProduct: (id: number, body: { priceToman: number; isActive: boolean }) => send<AdminProduct>('PUT', `${A}/products/${id}`, body),
  setStock: (variantId: number, branchSlug: string, quantity: number) => send<{ quantity: number }>('PUT', `${A}/variants/${variantId}/stock`, { branchSlug, quantity }),
  shopOrders: (status?: string) => get<AdminShopOrder[]>(`${A}/shop-orders${q({ status })}`),
  setShopOrderStatus: (id: number, status: string) => send<AdminShopOrder>('POST', `${A}/shop-orders/${id}/status`, { status }),
  canteenItems: () => get<AdminCanteenItem[]>(`${A}/canteen-items`),
  updateCanteenItem: (id: number, body: { priceToman: number; isAvailable: boolean }) => send<AdminCanteenItem>('PUT', `${A}/canteen-items/${id}`, body),
  createPackage: (body: SavePackage) => send<AdminPackage>('POST', `${A}/packages`, body),
  editPackage: (id: number, body: SavePackage) => send<AdminPackage>('PUT', `${A}/packages/${id}/details`, body),
  deletePackage: (id: number) => send<null>('DELETE', `${A}/packages/${id}`),
  createProduct: (body: SaveProduct) => send<AdminProduct>('POST', `${A}/products`, body),
  editProduct: (id: number, body: SaveProduct) => send<AdminProduct>('PUT', `${A}/products/${id}/details`, body),
  createCanteenItem: (body: SaveCanteenItem) => send<AdminCanteenItem>('POST', `${A}/canteen-items`, body),
  editCanteenItem: (id: number, body: SaveCanteenItem) => send<AdminCanteenItem>('PUT', `${A}/canteen-items/${id}/details`, body),
  deleteCanteenItem: (id: number) => send<null>('DELETE', `${A}/canteen-items/${id}`),
  coaches: () => get<AdminCoach[]>(`${A}/coaches`),
  saveCoach: (id: number | null, body: SaveCoach) => send<AdminCoach>(id ? 'PUT' : 'POST', id ? `${A}/coaches/${id}` : `${A}/coaches`, body),
  deleteCoach: (id: number) => send<null>('DELETE', `${A}/coaches/${id}`),
  images: () => get<ImageLibrary>(`${A}/images`),
  /** آپلود عکس (JPG/PNG/WebP تا ۲ مگابایت)؛ مسیر عکس را برمی‌گرداند */
  uploadImage: async (file: File): Promise<string> => {
    const send = () => {
      const fd = new FormData(); fd.append('file', file)
      const t = currentAccessToken()
      return fetch(`/api/v1${A}/images`, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-KG-Client': 'web', ...(t ? { Authorization: `Bearer ${t}` } : {}) } })
    }
    let res = await send()
    if (res.status === 401 && await refreshSession()) res = await send()
    const body = await res.json().catch(() => ({})) as { path?: string; title?: string }
    if (!res.ok || !body.path) throw new Error(body.title ?? 'آپلود عکس انجام نشد.')
    return body.path
  },
  staff: () => get<StaffRow[]>(`${A}/staff`),
  saveStaff: (body: { phone: string; fullName: string | null; roles: string[]; branchSlugs: string[] }) => send<StaffRow>('PUT', `${A}/staff`, body),
  sms: (kind?: string) => get<SmsStats>(`${A}/sms${q({ kind })}`),
  runSms: () => send<{ scheduled: number; sent: number }>('POST', `${A}/sms/run`),
}

export const myCoachingApi = {
  plan: () => request<TrainingPlan | null>('GET', '/me/plan', { auth: true }),
  metrics: () => request<BodyMetric[]>('GET', '/me/metrics', { auth: true }),
  addMetric: (weightKg: number) => request<BodyMetric>('POST', '/me/metrics', { body: { weightKg }, auth: true }),
  deleteMetric: (id: number) => request<null>('DELETE', `/me/metrics/${id}`, { auth: true }),
  preferences: () => request<Preferences>('GET', '/me/preferences', { auth: true }),
  savePreferences: (body: Preferences) => request<Preferences>('PUT', '/me/preferences', { body, auth: true }),
}

export const ROLE_LABEL: Record<string, string> = {
  SuperAdmin: 'مدیر کل', BranchManager: 'مدیر شعبه', Reception: 'پذیرش', Coach: 'مربی', CanteenStaff: 'بوفه', ShopStaff: 'فروشگاه',
}
export const STAFF_ROLES = Object.keys(ROLE_LABEL)
export const can = (me: PanelMe | null | undefined, ...roles: string[]) => !!me && (me.roles.includes('SuperAdmin') || roles.some((r) => me.roles.includes(r)))
