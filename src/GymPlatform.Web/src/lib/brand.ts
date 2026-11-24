/**
 * Name, Logo und Kontakt des Studios. Die Werte kommen aus den „Website-Einstellungen“ im Panel (lib/site.ts füllt sie vor dem ersten Rendern);
 * im Code steht kein Markenname.
 */
export interface Brand {
  name: string
  shortName: string
  latinName: string
  logo: string
  /** Vollständiges Logo (mit Schriftzug) für den Footer */
  logoFull: string
  slogan: string
  nearSlogan: string
  whySlogan: string
  phone: string
  instagram?: string
  city: string
  /** Code eines Vertrauenssiegels (optional) */
  enamad?: { id: string; code: string }
}

export const brand: Brand = {
  name: 'Studio',
  shortName: 'Studio',
  latinName: '',
  logo: '/brand/placeholder-logo.svg',
  logoFull: '/brand/placeholder-logo.svg',
  slogan: '',
  nearSlogan: '',
  whySlogan: '',
  phone: '',
  city: '',
}
