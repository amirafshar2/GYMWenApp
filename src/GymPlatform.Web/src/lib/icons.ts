import { Bike, CalendarCheck, Clock, Dumbbell, Flame, Heart, Mountain, Salad, Scale, ShieldCheck, ShoppingBag, Trophy, UserRound, Users, Waves, type LucideIcon } from 'lucide-react'

/** آیکن‌هایی که مالک در «تنظیمات سایت» برای کارت‌ها انتخاب می‌کند (همین فهرست در سرور هم بررسی می‌شود) */
export const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  dumbbell: { icon: Dumbbell, label: 'دمبل' },
  scale: { icon: Scale, label: 'ترازو' },
  salad: { icon: Salad, label: 'تغذیه' },
  calendar: { icon: CalendarCheck, label: 'تقویم' },
  user: { icon: UserRound, label: 'مربی' },
  users: { icon: Users, label: 'گروه' },
  mountain: { icon: Mountain, label: 'کوه' },
  bag: { icon: ShoppingBag, label: 'فروشگاه' },
  heart: { icon: Heart, label: 'قلب' },
  trophy: { icon: Trophy, label: 'جام' },
  clock: { icon: Clock, label: 'ساعت' },
  shield: { icon: ShieldCheck, label: 'ایمنی' },
  flame: { icon: Flame, label: 'چربی‌سوزی' },
  bike: { icon: Bike, label: 'دوچرخه' },
  waves: { icon: Waves, label: 'استخر' },
}
export const iconOf = (k?: string | null) => ICONS[k ?? '']?.icon ?? Dumbbell
