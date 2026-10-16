# Khashayar Fitness – Online-Plattform für eine Fitnessstudio-Kette in Shiraz

Eine vollständige Web-Plattform für die Fitnessstudio-Kette **Khashayar** mit 12 Standorten in Shiraz (Iran): öffentliche Website, Online-Mitgliedschaft mit Bezahlung, Shop, Kantine mit QR-Bestellung und ein Mitarbeiter-Panel für Empfang, Trainer und Geschäftsführung. Die Oberfläche ist vollständig auf Persisch (Rechts-nach-links).

## Mein erstes Projekt mit vollständigem Vibe-Coding

Dieses Projekt war meine erste Erfahrung mit **komplettem Vibe-Coding**: Ich habe die Anforderungen, die Architektur und jede Phase in natürlicher Sprache beschrieben, die Ergebnisse geprüft, getestet und Schritt für Schritt nachgesteuert – den Code selbst hat eine KI geschrieben. Für mich war das eine **sehr spannende und richtig gute Erfahrung**: In kurzer Zeit ist ein Projekt entstanden, das ich allein so nicht hätte bauen können – mit Drei-Schichten-Architektur, Sicherheits-Audit, automatisierten Tests und messbarer Performance. Gleichzeitig habe ich gelernt, wie wichtig klare Anforderungen, Planung vor jeder Phase und konsequentes Testen sind, damit am Ende etwas Belastbares herauskommt.

## Funktionen

- **Phase 1 – Öffentliche Website:** Scroll-Hero, Standortkarte mit „nächster Standort“, Pakete mit Aktionsrabatt, Trainer, Galerie, Beratungsformular.
- **Phase 2 – Mitgliedschaft:** Login per Handynummer und SMS-Code, mehrstufige Online-Anmeldung (Standort → Paket → Login → Vertrag → Zahlung), digitaler Vertrag und Gesundheitsfragebogen mit SMS-Signatur, Zahlung (Test-Gateway / ZarinPal), PDF-Rechnung, QR-Mitgliedskarte und Profil.
- **Phase 3 – Verkauf:** Shop (Supplements, Kleidung, Zubehör, Bestand pro Standort), Kantinen-Menü per QR-Code am Tisch mit Live-Bestelltafel (SignalR), Wallet, Aktionsseite, Anbindung an Drehkreuz/Armband.
- **Phase 4 – Mitarbeiter-Panel:** Dashboard für die Geschäftsführung (Umsatz der 12 Standorte nach Quelle, Verlängerungsrate, Stoßzeiten, auslaufende Mitgliedschaften, Aktionswirkung, Excel-Export), Empfang mit Scanner/Kamera/Armband, Trainer-Panel (Trainings- und Ernährungsplan, Gewichtsverlauf), Verwaltung von Preisen, Aktionen, Rabattcodes, Vertrag, Lager, Kantinen-Menü, Trainern und Mitarbeitern, automatische SMS, Präsentationsmodus.
- **Phase 5 – Qualität:** unabhängiges Sicherheits-Audit mit behobenen Befunden, Performance-Optimierung, Barrierefreiheit, Health-Checks, CI.

## Architektur (drei Schichten, .NET 10)

```
KhashayarGym.slnx
src/
  KhashayarGym.Domain       Entitäten und Enums
  KhashayarGym.DataAccess   EF Core, DbContext, Repositories, Migrationen, Beispieldaten (Seed/*.json)
  KhashayarGym.Business     Services, DTOs, Validierung (FluentValidation), Preisberechnung
  KhashayarGym.Api          Web-API, Sicherheit, Caching, liefert das Frontend aus wwwroot aus
  KhashayarGym.Web          React + Vite + TypeScript + Tailwind v4 (Build → Api/wwwroot)
tests/KhashayarGym.Tests    xUnit-Tests (Business) und Integrationstests (WebApplicationFactory)
src/KhashayarGym.Web/e2e    Playwright-Tests (Desktop und Mobil)
scripts/                    Hilfsskripte (Hero-Video, Bilder, Portfolio-Export, Komprimierung)
```

**Technologien:** ASP.NET Core 10, EF Core (SQL Server / SQLite), ASP.NET Identity + JWT mit rotierenden Refresh-Tokens, Parbad (Zahlungen), SignalR, QuestPDF, ClosedXML, Serilog, React 19, Tailwind CSS v4, Playwright.

## Voraussetzungen

- .NET SDK 10
- Node.js 22 oder neuer
- SQL Server LocalDB (kommt mit Visual Studio) – oder ohne Datenbankserver mit SQLite (siehe unten)
- ffmpeg (nur zum Erzeugen der Hero-Video-Frames)

## Start in Visual Studio (ein Klick)

1. `KhashayarGym.slnx` in Visual Studio öffnen.
2. `KhashayarGym.Api` als Startprojekt festlegen.
3. Oben das Profil **Demo (SQLite)** wählen und ▶ drücken.

Der Browser öffnet http://localhost:5180. Die Demo-Datenbank (`khashayar-demo.db`) wird automatisch angelegt, ein SQL Server ist nicht nötig.

## Start über die Kommandozeile (SQLite-Demo)

```powershell
cd src\KhashayarGym.Web
npm install
npm run build            # Ausgabe nach src\KhashayarGym.Api\wwwroot

cd ..\KhashayarGym.Api
$env:Database__Provider = "Sqlite"
$env:ConnectionStrings__Default = "Data Source=khashayar-demo.db"
dotnet dev-certs https --trust     # nur beim ersten Mal
dotnet run --launch-profile https
```

Danach https://localhost:7180 öffnen. Datenbank und Beispieldaten werden automatisch erstellt.

## Start mit SQL Server (LocalDB)

```powershell
cd src\KhashayarGym.Api
dotnet run --launch-profile https   # Migrationen werden automatisch angewendet
```

Eine andere Verbindungszeichenfolge gehört in die User Secrets, nicht in `appsettings.json`:

```powershell
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Default" "Server=...;Database=KhashayarGym;..."
```

## Frontend-Entwicklung mit Hot Reload

```powershell
# Terminal 1
cd src\KhashayarGym.Api; dotnet run --launch-profile https
# Terminal 2
cd src\KhashayarGym.Web; npm run dev     # http://localhost:5173, /api wird an https://localhost:7180 weitergeleitet
```

## Demo-Zugänge

| Zugang | Telefonnummer | Rechte |
|---|---|---|
| Demo-Mitarbeiter | 09100000000 | alle Rollen inkl. Gesamtleitung |
| Demo-Standortleitung | 09100000001 | nur Standort „Ghoddousi Gharbi“ |
| Demo-Mitglieder | 09391000001 und folgende | Mitgliedskonto mit Karte, Bestellungen, Plan |

- Im Demo-Modus wird keine echte SMS verschickt – der **Code erscheint direkt auf der Seite**.
- Rabattcodes (nur Demo): `KHASHAYAR10`, `WELCOME5`, `MEMBER15` (nur für aktive Mitglieder).
- Das Test-Gateway (Parbad Virtual) bewegt kein echtes Geld: **Pay** = erfolgreich, **Cancel** = abgebrochen.
- In der Entwicklungsumgebung werden 200 fiktive Mitglieder mit 6 Monaten Historie erzeugt; in Production niemals.
- **Präsentationsmodus:** im Panel unten in der Seitenleiste „Präsentationsmodus“ anklicken oder `?present=1` an die Adresse hängen – eine schwebende Leiste wechselt zwischen Kunden-, Empfangs-, Kantinen-, Trainer- und Leitungsansicht.

### Demo-Abläufe

- **Anmeldung:** „Online-Anmeldung“ im Header → Standort (Button „nächster Standort“) → Paket und Rabattcode → Login → Vertrag und Gesundheitsfragebogen signieren → Zahlung → PDF-Rechnung und QR-Karte. Unter `/profile`: Resttage, Verlängerung mit einem Klick, Rechnungen, Vertrags-PDF, Trainingsplan und Gewichtsdiagramm.
- **Shop:** `/shop` – Kategorien, Standort für den Bestand wählen, Farbe und Größe, Warenkorb, Abholung oder Versand.
- **Wallet:** `/wallet` – Aufladen über das Gateway, Bezahlen in Shop und Kantine.
- **Kantine (Kunde):** `/canteen/ghoddousi-gharbi?table=Tisch 4` – dieselbe Adresse, die der QR-Code am Tisch öffnet.
- **Kantine (Personal):** als 09100000000 anmelden und `/panel/canteen?branch=ghoddousi-gharbi` öffnen; Bestellungen erscheinen live, bei „fertig“ piept das Handy des Kunden. Druckvorlage der Tisch-QR-Codes: `/panel/canteen/qr`.

## Rollen und Rechte im Panel

| Rolle | Bereiche | Umfang |
|---|---|---|
| Gesamtleitung (SuperAdmin) | alle Bereiche, inkl. Pakete, Aktionen, Vertrag, Trainer, Mitarbeiter, SMS | alle 12 Standorte |
| Standortleitung | Dashboard, Empfang, Kantinentafel, Shop & Lager, Kantinen-Menü (nur verfügbar/nicht verfügbar) | eigene Standorte |
| Empfang | Empfang und Check-in | eigene Standorte |
| Trainer | „Meine Schüler“ | eigene Schüler |
| Kantine | Kantinentafel, Kantinen-Menü | eigene Standorte |
| Shop | Shop und Lager | eigene Standorte |

- Rolle und Standort werden bei jeder Anfrage aus der Datenbank gelesen; Änderungen unter „Mitarbeiter und Rechte“ gelten sofort.
- **Trainer:** unter „Trainer“ wird ein Trainerprofil angelegt (Name, Fachgebiet, Standort, Bereich Herren/Damen, Erfahrung, Erfolge, Foto, Sichtbarkeit auf der Website). Das Feld „Handynummer des Trainers“ legt das Login-Konto an und vergibt automatisch die Trainer-Rolle. Trainer mit Schülern oder Plänen können nicht gelöscht, nur ausgeblendet werden.
- **Inhalte mit Bildern:** Kantinen-Menü, Produkte (mit Größen/Farben und eigenem Preis) und Pakete werden von der Gesamtleitung angelegt, bearbeitet und gelöscht. Bilder können hochgeladen (jpg/png/webp, max. 2 MB, Prüfung der Dateisignatur, kein SVG, Speicherung außerhalb von wwwroot) oder aus den vorhandenen Website-Bildern gewählt werden.

## Automatische SMS

Willkommen/Verlängerungsbestätigung (sofort), Erinnerung 7 und 1 Tag vor Ablauf, Geburtstag (persischer Kalender, mit Einmal-Rabattcode für den Shop) und Aktionen (nur abgelaufene Mitglieder mit Werbe-Einwilligung). Erinnerungen und Werbung nur zwischen 9 und 21 Uhr; jede SMS per eindeutigem Schlüssel nur einmal. Kavenegar-Vorlagen: `khashayar-welcome`, `khashayar-renew`, `khashayar-birthday`, `khashayar-campaign` (je 3 Tokens). Website-Adresse im SMS-Text: `Sms:SiteUrl`.

## Drehkreuz- und Armband-Anbindung

Technische Doku für den Hersteller: [`docs/access-control-api.md`](docs/access-control-api.md). In der Entwicklungsumgebung wird ein Demo-Gerät mit dem Schlüssel `demo-gate-key-khashayar-0001` angelegt.

## Inbetriebnahme beim Kunden

`docs/راهنمای-راه‌اندازی-سایت-خشایار.docx` – Schritt-für-Schritt-Anleitung (auf Persisch) für das Studio und das Technik-Team: Domain, eNamad, Steuer, Zahlungsgateway, SMS, Server, Drehkreuz. Neu erzeugen mit `node scripts/make-launch-guide.js <Ausgabe>`.

Für den Live-Betrieb: `Otp:ExposeCodeInResponse=false`, `Sms:Provider=Kavenegar` mit Schlüssel in den User Secrets und `Payment:UseVirtualGateway=false`, sobald ein Gateway auf den Namen des Studios vorliegt (Parbad unterstützt ZarinPal, IDPay, Saman, Mellat u. a.).

## Docker

```bash
cp .env.example .env      # DB_PASSWORD, JWT_SIGNING_KEY und OTP_PEPPER mit Zufallswerten füllen
docker compose up --build # http://localhost:8080
```

Mehrstufiges Image (Node → .NET SDK → aspnet), läuft als Nicht-Root-Benutzer mit schreibgeschütztem Dateisystem. Vertrags-PDFs und Data-Protection-Schlüssel liegen im Volume `private`, hochgeladene Bilder im Volume `uploads`. Davor gehört ein Reverse-Proxy mit TLS (Cookies sind `Secure`).

## Demo-Deployment auf Render

Das Repository enthält eine fertige **Render-Blueprint-Datei** (`render.yaml`). Damit wird die öffentliche Demo (z. B. für die Präsentation beim Kunden) mit wenigen Klicks erstellt:

1. In Render **New → Blueprint** wählen.
2. GitHub verbinden und **nur dieses Repository** freigeben (es ist privat – „Public Git Repository“ findet es nicht).
3. Repository auswählen, Name bestätigen und **Apply** klicken. Render baut das Docker-Image (Frontend + Backend) und startet den Dienst; der erste Build dauert etwa 10 Minuten.
4. Die Adresse `https://<name>.onrender.com` öffnen und mit `09100000000` anmelden – der Code erscheint auf der Seite.

Was die Blueprint einstellt: Docker, Free-Tarif, Region Frankfurt, Health-Check `/health/ready`, automatisches Deployment bei jedem Push auf `master` und diese Umgebungsvariablen:

| Name | Wert |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Staging` |
| `PORT` | `8080` |
| `Database__Provider` / `ConnectionStrings__Default` | `Sqlite` / `Data Source=/data/private/kg.db` |
| `Jwt__SigningKey`, `Otp__Pepper` | von Render zufällig erzeugt |
| `Otp__ExposeCodeInResponse` | `true` (Code auf der Seite) |
| `Payment__UseVirtualGateway` | `true` (Test-Gateway) |
| `Demo__StaffPhone` / `Demo__SeedMembers` | `09100000000` / `true` |
| `ReverseProxy__Enabled` | `true` (HTTPS hinter dem Render-Proxy) |
| `DOTNET_gcServer` | `0` (weniger Arbeitsspeicher) |

Die Zahlungs-Rücksprungadresse wird automatisch aus der aufgerufenen Adresse gebildet. `Staging` statt `Production`, weil die Demo bewusst unsichere Einstellungen nutzt – der ProductionGuard würde den Start in Production verhindern.

**Grenzen des Free-Tarifs:** Der Dienst schläft nach 15 Minuten ohne Zugriff ein (der erste Aufruf danach dauert etwa eine Minute), und ohne persistente Festplatte werden die Daten bei jedem Neustart zurückgesetzt und die Demo-Daten neu erzeugt. Für den echten Betrieb ist ein Server im Iran mit SQL Server vorgesehen.

## Tests

```powershell
dotnet test                                   # xUnit + API-Integrationstests (Login, Token-Rotation, Zahlung, Idempotenz)
cd src\KhashayarGym.Web
npx playwright install chromium               # einmalig
$env:BASE_URL = "http://localhost:5180"; npx playwright test   # inkl. kompletter Anmeldung mit Zahlung
```

Für komplette Playwright-Läufe das Rate-Limit in der Entwicklung anheben (alle Anfragen kommen von derselben IP):

```powershell
$env:RateLimiting__PermitMultiplier = "20"   # nur Development/Testing; in Production ignoriert
```

Aktuell über 100 automatisierte Tests (Server und Browser, Desktop und Mobil).

## Daten bearbeiten

- **Standorte:** `src/KhashayarGym.DataAccess/Seed/branches.json` – Einträge mit `addressConfirmed: false` haben ungefähre Koordinaten.
- Pakete, Trainer und FAQ: weitere Dateien im selben Ordner (oder später direkt im Panel).
- Seed-Daten werden nur in eine leere Datenbank geschrieben; nach Änderungen die Demo-Datenbank (`khashayar-demo.db`) löschen bzw. die LocalDB-Datenbank droppen.
- **Logo:** `src/KhashayarGym.Web/public/brand/logo.svg` durch das Original ersetzen.
- **Farben:** nur im `@theme`-Block von `src/KhashayarGym.Web/src/index.css`.

## Frontend

Layout und Stil orientieren sich an einer vom Kunden gewählten Referenzseite (Vorlage „GYM Store – Sports Complex“); Code, Texte und Bilder dieser Vorlage wurden nicht kopiert, alles ist neu mit React/Tailwind gebaut. Tokens und Regeln: `design-system/khashayar-gym/MASTER.md`.

| Bereich | Datei | Quelle |
|---|---|---|
| Weißer Sticky-Header + Seitenpanel | `site/SiteHeader.tsx` | Layout der Referenzseite |
| Hero: Partikel-Hantel, die auf die Maus reagiert | `site/SiteHero.tsx` | Liquid Sculpture Hero (21st.dev, guglielmogiannattasio); Hantelbild mit Canva AI erstellt |
| Was wir machen (4 Bildkarten) | `site/SiteWhatWeDo.tsx` | Bilder aus Videos des Studios |
| Warum Khashayar + Zahlen | `site/SiteWhy.tsx` | Count Up (21st.dev) |
| Scroll-Video | `site/SiteVideo.tsx` | Sunset Skyline Hero (21st.dev) – Video: `public/media/video/gym.mp4` |
| Angebot (Icon-Karussell) | `site/SiteOffer.tsx` | Layout der Referenzseite |
| Standorte und Karte | `site/SiteBranches.tsx`, `components/ui/shiraz-branch-picker.tsx` | Struktur von Nepal Address Picker (21st.dev) in Theme-Farben; schematische Karte von Shiraz |
| Pakete | `site/SitePricing.tsx` | Pricing Section (21st.dev, animierter Umschalter) |
| Aktion (zwei Parallax-Bilder) | `site/SiteEvents.tsx` | Layout der Referenzseite |
| Trainer | `site/SiteCoaches.tsx` | Container Scroll Animation (21st.dev) |
| FAQ | `site/SiteFaq.tsx` | FAQ Accordion (21st.dev) |
| Beratungsformular | `site/SiteContact.tsx` | eigenes Design im Stil der Seite |
| Aktionsleiste | `site/SiteBanner.tsx` | Promo Banner (21st.dev) |
| Galerie | `site/SiteGallery.tsx` | Shared Element Gallery (21st.dev) |
| Dunkler Footer + Newsletter | `site/SiteFooter.tsx` | Layout der Referenzseite |

Änderungen an den Originalkomponenten: feste englische Texte wurden zu persischen Props, dazu RTL-Anpassungen (kein letter-spacing bei Persisch, Pfeilrichtungen). Jede Datei beschreibt oben ihre Änderungen. Die Lizenz dieser Komponenten ist auf 21st.dev „unknown“ – vor kommerzieller Übergabe prüfen. Originaldemos im Entwicklungsmodus: `npm run dev`, dann `http://localhost:5173/lab`.

### Scroll-Video austauschen

Neues Rohvideo als `gym-source.mp4` in `src/KhashayarGym.Web/public/media/video/` legen und ausführen:

```powershell
.\scripts\make-scrub-video.ps1
cd src\KhashayarGym.Web; npm run build
```

Das Skript macht jeden Frame zum Keyframe, damit Vor- und Zurückspulen beim Scrollen flüssig ist.

### Demo-Marke für das Portfolio

Mit `?brand=demo` werden Name, Logo, Slogan und Kontaktdaten durch eine fiktive Marke ersetzt (für Portfolio-Screenshots); `?brand=khashayar` stellt das Original wieder her.

## Sicherheit

**Grundlagen**
- Header: CSP, HSTS (außer Development), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- Rate-Limiting pro IP: Formulare 5/min, OTP 5/min, Login 15/min, Zahlung 10/min, global 300.
- CSRF-Schutz per Cookie + Header `X-XSRF-TOKEN` für Gast-Anfragen.
- Validierung aller Eingaben in der Business-Schicht, Normalisierung persischer Ziffern und Handynummern.
- EF Core parametrisiert, kein Roh-SQL; Begrenzung der Request-Größe.
- Der Standort des Nutzers wird nur im Browser verwendet und nicht an den Server gesendet.

**Login, Zahlung, Verträge**
- 5-stelliger SMS-Code, gespeichert nur als HMAC-SHA256 mit Pepper; 2 Minuten gültig, 5 Versuche, 60 Sekunden Abstand, max. 5 Codes pro Stunde und Nummer.
- Kurzlebiges JWT nur im Arbeitsspeicher des Browsers; rotierendes Refresh-Token im Cookie `HttpOnly; Secure; SameSite=Strict`. Nur der Hash liegt in der Datenbank; Wiederverwendung eines alten Tokens beendet alle Sitzungen.
- Beträge werden nur serverseitig berechnet; nach der Rückkehr von der Bank: Abruf, Betragsabgleich, Verify und idempotenter Abschluss in einer Transaktion.
- Signierte Verträge mit SHA-256-Hash des Inhalts, IP, Browser und Zeitstempel; PDFs außerhalb von wwwroot.
- Geheimnisse (JWT-Schlüssel, Pepper, SMS-Schlüssel) nur in User Secrets / Umgebungsvariablen; fehlen sie außerhalb von Development, startet der Server nicht.
- Fehler als ProblemDetails mit `traceId`, ohne interne Details; Audit-Log für Kontoerstellung, Signatur und Zahlung.

**Unabhängiges Audit (Phase 5)**
- **ProductionGuard:** In Production startet der Server nicht, wenn noch Test-Gateway, sichtbarer Login-Code, SMS-Provider „Log“, SQLite, `AllowedHosts=*`, Demo-Geräteschlüssel oder Demo-Einstellungen aktiv sind.
- **Gateway:** ZarinPal (`Payment:ZarinPal:MerchantId`); Rücksprungadresse aus `Payment:CallbackBaseUrl` statt Host-Header; Gateway-Status in SQL Server (Tabelle `ParbadCache`).
- **Nebenläufigkeit:** atomare bedingte Updates beim Zahlungsabschluss (zwei gleichzeitige Callbacks buchen nur einmal), eindeutiger Index im Wallet-Journal, bedingte Statuswechsel in der Kantine, atomarer Zähler für Login-Versuche.
- **Rabatte:** offene Zahlungen zählen zur Kapazität; limitierte Codes einmal pro Person.
- **Zugriff:** Empfang und Standortleitung sehen nur Mitglieder ihrer Standorte; das QR-Token der Karte wird nie an Mitarbeiter ausgeliefert; Trainer können nur aktive Mitglieder ihres Standorts und Bereichs als Schüler hinzufügen.
- **Netzwerk:** App-Port in docker-compose nur auf `127.0.0.1`; erlaubte Proxys über `ReverseProxy:KnownNetworks`.
- **CI:** `.github/workflows/ci.yml` – Build, Tests, `dotnet list package --vulnerable` und `npm audit`.
- **Bewusst akzeptierte Restrisiken (gering):** zwei exakt gleichzeitige Refresh-Anfragen erzeugen zwei gültige Sitzungen; die CSP erlaubt `unsafe-inline` für Styles (Inline-Skripte nur per Hash).

## Datenmenge und Datenbank

- **SQLite nur für Demo und Entwicklung.** In Production ist nur SQL Server erlaubt: SQLite erlaubt nur einen gleichzeitigen Schreibvorgang, während Drehkreuze, Website, Kantine und Panels parallel schreiben; außerdem fehlen Online-Backup und Monitoring.
- **SQL Server Express (kostenlos)** reicht bis 10 GB pro Datenbank. Ein Test mit 6.000 Mitgliedern und einem Jahr Historie (336.000 Check-ins, 85.000 Kantinenbestellungen) ergab rund 100 MB.
- **Geschwindigkeit beim selben Test:** Dashboard aller Standorte über 30 Tage ≈ 0,3 s, über 180 Tage ≈ 0,7 s; ein Standort ≈ 0,05 s; Empfangssuche und Drehkreuz-Whitelist < 0,05 s. Summen werden in der Datenbank berechnet, die nötigen Indizes sind angelegt (Migration Phase5Scale).
- Große Listen in Abfragen werden als ein JSON-Parameter übergeben (Grenze von 2.100 Parametern bei SQL Server; ab SQL Server 2016).
- **Tägliche Bereinigung:** alte Login-Codes, abgelaufene Sitzungen, bereits übertragene Drehkreuz-Ereignisse. Geschäftsdaten und Audit-Log werden nie gelöscht.
- **Lasttest:** `Demo__SeedMemberCount=6000` und `Demo__SeedDays=365` (nur Development).
- **Migrationen:** standardmäßig automatisch; für geprüfte Ausführung `Database:AutoMigrate=false` und das idempotente Skript `docs/database/migrate.sql`.
- **Health-Checks:** `/health/live` und `/health/ready` (inkl. Datenbank).

## Performance

Lighthouse auf der Startseite (mobil, gedrosseltes Netz): Performance von 34 auf etwa 75, CLS von 0,2 auf 0,005; Desktop 99.
- Die Partikel-Engine des Heros startet erst bei der ersten Maus-/Touch-Bewegung (gleiches Aussehen im Ruhezustand).
- Das Video lädt erst in der Nähe seines Abschnitts; Abschnitte unter dem Hero liegen in einem eigenen Chunk.
- Vorladen von Schrift und Hero-Bild, reservierter Platz für die Aktionsleiste.
- Build-Dateien werden vorab mit Brotli (Stufe 11) komprimiert (`scripts/precompress.mjs`) und direkt ausgeliefert.

## API v1 (`/api/v1`)

OpenAPI in der Entwicklung: `/openapi/v1.json` (mit Bearer-Schema).

| Pfad | Beschreibung |
|---|---|
| `GET /branches?section=men\|women`, `GET /branches/{slug}` | Standorte |
| `GET /packages`, `GET /coaches`, `GET /faq`, `GET /stats` | öffentliche Daten |
| `GET /campaigns/active` | aktive Aktion (204, wenn keine) |
| `POST /consultations` | Beratungsformular (CSRF + Rate-Limit) |
| `POST /auth/otp`, `POST /auth/verify` | Login per SMS-Code |
| `POST /auth/refresh`, `POST /auth/logout` | Sitzung per HttpOnly-Cookie |
| `GET/PUT /me`, `GET /me/profile` | Konto und Profil |
| `GET /contracts/active`, `POST /contracts/sign/otp`, `POST /contracts/sign` | Vertrag und Signatur |
| `POST /checkout/quote`, `POST /checkout` | Angebot und Start der Zahlung |
| `GET\|POST /payments/callback` | Rückkehr vom Gateway |
| `GET /me/payments/{id}`, `…/invoice.pdf`, `GET /me/contracts/{id}/pdf`, `GET /me/card.svg` | Ergebnis, Rechnung, Vertrag, QR-Karte |
| `GET /shop/products`, `GET /shop/products/{slug}`, `POST /shop/quote`, `POST /shop/orders` | Shop |
| `GET /canteen/{branch}/menu`, `POST /canteen/orders` | Kantine (Kunde) |
| `GET /canteen/staff/{branch}/orders`, `POST /canteen/staff/orders/{id}/status`, Hub `/hubs/canteen` | Kantine (Personal, live) |
| `GET /me/wallet`, `POST /me/wallet/topups`, `GET /me/orders` | Wallet und Bestellungen |
| `POST /access/check`, `GET /access/whitelist`, `POST /access/events` | Drehkreuz/Armband (Geräteschlüssel) |
| `GET /panel/me`, `GET /panel/dashboard`, `GET /panel/dashboard/export` | Panel: aktueller Mitarbeiter, Dashboard, Excel |
| `/panel/reception/*`, `/staff/members/{id}/credentials` | Empfang: Suche, Akte, Check-in, Armband |
| `/panel/coach/*`, `GET /me/plan`, `GET/POST/DELETE /me/metrics`, `GET/PUT /me/preferences` | Trainer und Mitgliedsseite |
| `/panel/admin/*` | Pakete, Aktionen und deren SMS, Rabattcodes, Vertrag, Produkte und Bestand, Shop-Bestellungen, Kantinen-Menü, Trainer, Mitarbeiter, SMS, Bild-Upload |

## Autor

**Amir Reza Afshar**
