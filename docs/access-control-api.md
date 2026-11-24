# Anbindung eines Gate-/Armbandsystems an die Studioseite (API Version 1)

Dieses Dokument richtet sich an die **Firma, die das Gate-/Drehkreuzsystem des Studios betreut**. Die Seite ist unabhängig von der Gate-Marke und bietet drei Anbindungswege; die Gate-Firma wählt den, den ihr System unterstützt.

| Weg | Wann geeignet | Pfad |
|---|---|---|
| 1. Online-Abfrage | Das Gate fragt beim Scannen des Armbands den Server | `POST /api/v1/access/check` |
| 2. Whitelist | Das Gate entscheidet offline und holt die Liste alle paar Minuten | `GET /api/v1/access/whitelist` |
| 3. Offline-Ereignisse | Das Gate speichert Check-ins bei Internetausfall und sendet sie später | `POST /api/v1/access/events` |
| 4. Webhook (umgekehrt) | Die Gate-Software will über Änderungen an Mitgliedschaften informiert werden | Die Seite sendet POST an Ihre Adresse |

## Authentifizierung des Geräts
Jedes Gate hat einen eigenen Schlüssel, den der Seitenadmin erzeugt (nur der Hash wird gespeichert). In allen Anfragen:
```
X-Device-Key: <Gate-Schlüssel>
```
Falscher Schlüssel → `401`. Jeder Schlüssel gehört zu einer **Filiale** und einem **Bereich** (Herren, Damen oder gemeinsam). Limit: 600 Anfragen pro Minute und Gate. Nur HTTPS.

## 1) Online-Abfrage
```http
POST /api/v1/access/check
Content-Type: application/json
X-Device-Key: ...

{ "credential": "04A1B2C3", "eventId": "gate1-000123", "occurredAtUtc": "2026-10-16T08:30:00Z" }
```
- `credential`: UID des Armbands/der Karte (mit oder ohne `:` und Leerzeichen, Klein- oder Großbuchstaben) **oder** der QR-Text der digitalen Mitgliedskarte, der mit `KG1:` beginnt.
- `eventId` (optional, aber empfohlen): eindeutige ID dieses Scans. Wird dasselbe Ereignis erneut gesendet, wird es nicht doppelt erfasst und keine Einheit doppelt abgezogen.
- `occurredAtUtc` (optional): für Offline-Ereignisse; leer = jetzt.

Antwort:
```json
{ "allowed": true, "reason": "ok", "message": "Willkommen, Kai", "memberFirstName": "Kai",
  "daysLeft": 63, "sessionsLeft": null, "sessionCounted": false }
```
`reason` Einer von: `ok`, `unknown_credential`, `credential_revoked`, `no_active_membership`, `wrong_branch`, `wrong_section`, `no_sessions_left`. Der Text `message` ist auf Deutsch und bereit zur Anzeige am Gate-Display.

Entscheidungsregeln: aktive Mitgliedschaft in **derselben Filiale** (änderbar mit `Access:AllowAllBranches`) und **demselben Bereich**. Bei Einheitenpaketen zieht der erste Eintritt pro Tag (Berliner Zeit) eine Einheit ab; ein erneuter Eintritt am selben Tag ist frei.

## 2) Whitelist
```http
GET /api/v1/access/whitelist
```
```json
{ "generatedAtUtc": "...", "branch": "ghoddousi-gharbi", "section": "both",
  "entries": [ { "credential": "KG1:4D9F...", "type": "qr", "memberId": 15, "validUntilUtc": "...", "sessionsLeft": null },
               { "credential": "04A1B2C3", "type": "wristband", "memberId": 15, "validUntilUtc": "...", "sessionsLeft": null } ] }
```
Alle 5 Minuten abrufen. Was nicht in der Liste steht, ist nicht erlaubt.

## 3) Offline-Ereignisse
`POST /api/v1/access/events` mit einem Array aus demselben Body wie `check` (höchstens 500 Einträge). Alle Check-ins werden im Anwesenheitsbericht erfasst.

## 4) Webhook (Seite → Gate-Software)
Wenn `Integrations:Webhook:Url` und `Secret` gesetzt ist, sendet die Seite diese Ereignisse:

| Ereignis | Zeitpunkt |
|---|---|
| `membership.activated` | Erfolgreiche Zahlung (inkl. `memberId`, `branchId`, `section`, `startsAtUtc`, `endsAtUtc`, `qr`) |
| `credential.assigned` / `credential.revoked` | Empfang gibt Armband aus/nimmt zurück (inkl. `credential` und `externalRef`) |

Header: `X-KG-Event`, `X-KG-Delivery` (eindeutige ID; verhindert doppelte Verarbeitung), `X-KG-Timestamp`, `X-KG-Signature: sha256=<hex>`.
Signatur = `HMAC-SHA256(secret, timestamp + "." + body)`; der Empfänger muss die Signatur prüfen und Ereignisse älter als 5 Minuten ablehnen.
Antwort ungleich 2xx = erneuter Versuch mit wachsendem Abstand (bis zu 20 Mal).

## Empfang: Armband an ein Mitglied ausgeben
(Rolle Empfang oder Admin nötig; Oberfläche im Empfangspanel)
```
GET    /api/v1/staff/members/{userId}/credentials
POST   /api/v1/staff/members/{userId}/credentials   { "type": "wristband|card|external", "value": "04A1B2C3", "label": "...", "externalRef": "ID des Mitglieds in der Gate-Software" }
DELETE /api/v1/staff/members/{userId}/credentials/{id}
```

## Schnelltest in der Demo-Version
Im Development-Modus wird für die erste Filiale ein Demo-Gate mit dem Schlüssel `demo-gate-key-0001` angelegt:
```bash
curl -X POST http://localhost:5180/api/v1/access/check \
  -H "X-Device-Key: demo-gate-key-0001" -H "Content-Type: application/json" \
  -d '{"credential":"KG1:<Karten-Token aus dem Profil>"}'
```

## Falls das Gate-System keinen dieser Wege unterstützt
Ein kleiner „Adapter“ (`IIntegrationSink` in `src/GymPlatform.Api/Integrations`) wird für die API dieses Systems geschrieben; der Rest der Seite bleibt unverändert. Dafür braucht es von der Gate-Firma: API-Dokumentation oder SDK, Authentifizierungsweg und ein Testgerät oder eine Testumgebung.
