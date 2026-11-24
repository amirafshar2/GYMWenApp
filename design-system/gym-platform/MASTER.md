# Designsystem der Seite (MASTER)

Quelle: die vom Auftraggeber gewählte Referenzseite (Vorlage „GYM Store — Sports Complex“); nachgebaut wurden nur Layout und Stil, nicht Code oder Inhalt.

## Farben (Tokens in `src/GymPlatform.Web/src/index.css`)
| Rolle | Wert | Token |
|---|---|---|
| Seitenhintergrund | `#FFFFFF` | `--color-iron` |
| Wechselbereich / Karte | `#F7F7F7` | `--color-steel` |
| Haarlinie | `#E5E5E5` | `--color-steel-2` |
| Haupttext und Überschriften | `#2C2C2C` | `--color-chalk` |
| Sekundärtext | `#6B6B6B` (5,3:1) | `--color-rubber` |
| Akzent und Hauptbutton (Logoblau) | `#0B5FB0` (weißer Text 6,3:1) | `--color-plate` |
| Nur Fehlermeldungen | `#D32F3C` | `--color-danger` |
| „Los geht’s“-Button | `#FFB400` mit dunklem Text | `--color-sun` |
| Footer | `#181818` | `--color-night` |

Für die Rückkehr zum Logoblau genügt es, `--color-plate` und `--color-plate-hi` zu ändern.

## Typografie
- Vazirmatn; Hero-Überschrift 900, Bereichsüberschriften 700, Label über Überschriften 13px fett
- Markenname im Header: 900 mit 8 Grad Neigung (entspricht dem kursiven Logo der Referenz)

## Layout
- „boxed“-Container mit maximal 1290px (`wrap` in `site/ui/SectionHead.tsx`)
- Weißer fixierter Header 78px; unter dem aktiven Link 2px Linie
- Rechteckige Buttons mit 3px-Ecken, Höhe 52px
- Bereiche abwechselnd weiß / `#F7F7F7`; Video und Footer dunkel

## Bewegung
- Einblenden der Bereiche: fade-in-up (40px, 800ms), einmalig
- Hero: Liquid Sculpture Hero (21st.dev) unter dem weißen Header; die Partikelhantel wird bei Mausbewegung flüssig und formt sich neu
- Bilder im Aktions- und „Warum wir“-Bereich haben Parallax beim Scrollen
- Das Video in der Seitenmitte sperrt den Scroll; beim Abspielen fährt der Header weg
- Mit `prefers-reduced-motion` wird all das abgeschaltet

## Checkliste
- [x] SVG-Icons (lucide), keine Emojis
- [x] Textkontrast ≥ 4,5:1
- [x] Mindestgröße für Touch 44px
- [x] Sichtbarer Fokus, Labels für alle Felder
- [x] Responsiv bei 375, 768, 1024, 1440
