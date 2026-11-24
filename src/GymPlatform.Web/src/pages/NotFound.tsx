import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-start justify-center gap-6 px-4 pt-24">
      <p className="text-7xl font-black text-primary">404</p>
      <h1 className="text-3xl font-bold">Diese Seite existiert nicht.</h1>
      <p className="text-lg text-muted-foreground">Vielleicht ist die Adresse falsch. Starte auf der Startseite oder finde das nächste Studio.</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full"><Link to="/">Startseite</Link></Button>
        <Button asChild variant="outline" className="rounded-full"><Link to="/branches">Studio finden</Link></Button>
      </div>
    </section>
  )
}
