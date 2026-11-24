import { expect, test, type Page } from '@playwright/test'

/** Mitarbeiterpanel (Phase 4) mit Demo-Mitarbeiter 015100000000 (Gesamtadmin + alle Rollen) und Demo-Filialleitung 015100000001 */
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
async function login(page: Page, mobile: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel('Handynummer').first().fill(mobile)
  await page.getByRole('button', { name: 'Login-Code anfordern' }).click()
  // Hat ein anderer Test diese Nummer gerade benutzt, verlangt der Server 60 Sekunden Wartezeit
  const code = page.locator('b[dir=ltr]').first()
  await code.or(page.getByText(/Sekunden warten/)).first().waitFor()
  if (!(await code.isVisible())) { await page.waitForTimeout(61_000); await page.getByRole('button', { name: 'Login-Code anfordern' }).click() }
  await page.locator('input[autocomplete=one-time-code]').fill(toLatin(await page.locator('b[dir=ltr]').first().innerText()))
  await page.waitForURL((u) => u.pathname.startsWith(next.split('?')[0]))
}

test.describe.configure({ mode: 'serial' })

let page: Page
test.beforeAll(async ({ browser }, info) => {
  // Jede Nummer bekommt nur alle 60 Sekunden einen Code; das Panel läuft nur im Desktop-Projekt
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fa-IR' })).newPage()
  await login(page, '01510000000', '/panel')
})

test('Admin-Dashboard: Zahlen, Diagramm und Excel-Export', async () => {
  await page.goto('/panel/dashboard')
  await expect(page.getByRole('heading', { name: 'Admin-Dashboard' })).toBeVisible()
  await expect(page.getByText('Aktive Mitglieder')).toBeVisible()
  await expect(page.getByRole('img', { name: /Tagesumsatz der/ })).toBeVisible()
  await expect(page.getByText('Mitgliedschaften, die in den nächsten 7 Tagen enden')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Excel-Export' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/)
})

test('Empfang: Mitglied suchen und manuell einchecken', async () => {
  await page.goto('/panel/reception')
  await page.getByPlaceholder('Name oder 4 Ziffern der Handynummer…').fill('01521000')
  // Mitglied mit Zeitpaket (kein Einheitenpaket, dessen Einheiten vielleicht aufgebraucht sind)
  await page.locator('button', { hasText: /Tage$/ }).filter({ hasNotText: /Einheiten/ }).first().click()
  await expect(page.getByLabel('Mitgliederakte')).toBeVisible()
  // Das fiktive Mitglied kann in einer anderen Filiale sein; die Empfangsfiliale wird an die des Mitglieds angeglichen
  const branchName = (await page.getByLabel('Mitgliederakte').locator('p', { hasText: ' – ' }).first().innerText()).split(' – ')[0]
  await page.getByLabel('Filiale').selectOption({ label: branchName })
  await page.getByRole('button', { name: 'Manuellen Check-in für dieses Mitglied erfassen' }).click()
  await expect(page.getByText('Zutritt erlaubt')).toBeVisible()
})

test('Trainer: Plan für einen Schüler schreiben', async () => {
  await page.goto('/panel/coach')
  await page.locator('tbody tr').first().click()
  await page.getByLabel('Tagesfokus').first().fill('Brust und Schultern')
  await page.getByRole('button', { name: 'Speichern und an Schüler senden' }).click()
  await expect(page.getByText('Plan gespeichert')).toBeVisible()
})

test('Präsentationsmodus: Wechsel zwischen Kunden- und Adminansicht', async () => {
  await page.goto('/panel/dashboard')
  await page.getByRole('button', { name: /Präsentationsmodus/ }).click()
  const bar = page.getByRole('navigation', { name: 'Präsentationsmodus' })
  await bar.getByRole('link', { name: 'Kunde' }).click()
  await page.waitForURL(/\/profile/)
  await bar.getByRole('link', { name: 'Empfang' }).click()
  await expect(page.getByRole('heading', { name: 'Empfang und Check-in' })).toBeVisible()
  await bar.getByRole('button', { name: 'Präsentationsmodus beenden' }).click()
  await expect(bar).toHaveCount(0)
})

test('Filialleitung sieht nur ihre eigene Filiale und hat keinen Zugriff auf Preise', async ({ browser }) => {
  test.setTimeout(120_000)
  const m = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fa-IR' })).newPage()
  await login(m, '01510000001', '/panel/dashboard')
  await expect(m.getByRole('heading', { name: 'Admin-Dashboard' })).toBeVisible()
  await expect(m.getByText('Nur Ihre Filialen')).toBeVisible()
  await expect(m.getByLabel('Filiale').locator('option')).toHaveCount(1)
  await expect(m.getByRole('link', { name: 'Pakete und Preise' })).toHaveCount(0)
  await m.goto('/panel/packages')
  await expect(m.getByText('Kein Zugriff auf diesen Bereich.')).toBeVisible()
})
