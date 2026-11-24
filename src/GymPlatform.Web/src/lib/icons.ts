import { Bike, CalendarCheck, Clock, Dumbbell, Flame, Heart, Mountain, Salad, Scale, ShieldCheck, ShoppingBag, Trophy, UserRound, Users, Waves, type LucideIcon } from 'lucide-react'

/** Icons, die der Inhaber in den „Website-Einstellungen“ für Karten wählt (dieselbe Liste prüft auch der Server) */
export const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  dumbbell: { icon: Dumbbell, label: 'Hantel' },
  scale: { icon: Scale, label: 'Waage' },
  salad: { icon: Salad, label: 'Ernährung' },
  calendar: { icon: CalendarCheck, label: 'Kalender' },
  user: { icon: UserRound, label: 'Trainer' },
  users: { icon: Users, label: 'Gruppe' },
  mountain: { icon: Mountain, label: 'Berg' },
  bag: { icon: ShoppingBag, label: 'Shop' },
  heart: { icon: Heart, label: 'Herz' },
  trophy: { icon: Trophy, label: 'Pokal' },
  clock: { icon: Clock, label: 'Uhr' },
  shield: { icon: ShieldCheck, label: 'Sicherheit' },
  flame: { icon: Flame, label: 'Fettverbrennung' },
  bike: { icon: Bike, label: 'Fahrrad' },
  waves: { icon: Waves, label: 'Schwimmbad' },
}
export const iconOf = (k?: string | null) => ICONS[k ?? '']?.icon ?? Dumbbell
