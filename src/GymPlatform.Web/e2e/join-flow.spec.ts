import { test, expect, type Page } from '@playwright/test'

// Vollständiges Szenario aus Phase 2 mit Test-Gateway: benötigt Payment:UseVirtualGateway=true und Otp:ExposeCodeInResponse=true (Development)
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
const phone = () => '0917' + String(Math.floor(1_000_000 + Math.random() * 8_999_999))

async function demoCode(page: Page) {
  return toLatin(await page.locator('b[dir=ltr]').innerText())
}

test.describe.configure({ mode: 'serial' })

test('Vollständige Anmeldung: Paket → Login → Vertrag → Zahlung → Mitgliedskarte', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/join?package=quarter')

  await page.locator('label', { hasText: /^Damenbereich$/ }).click()
  await page.locator('input[name=branch]').first().check()
  await page.getByRole('button', { name: /Weiter: Paket wählen/ }).click()

  await page.getByPlaceholder('START10').fill('start10')
  await page.getByRole('button', { name: 'Anwenden' }).click()
  await expect(page.getByText(/angewendet/)).toBeVisible()
  await page.getByRole('button', { name: /^Weiter/ }).click()

  await page.getByLabel('Handynummer').fill(phone())
  await page.getByRole('button', { name: 'Login-Code anfordern' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(await demoCode(page))

  await expect(page.getByRole('heading', { name: /Mitgliedsvertrag/ })).toBeVisible()
  await page.getByLabel(/Vor- und Nachname/).fill('Julia Fischer')
  for (const g of await page.locator('[role=radiogroup]').all()) await g.getByText('Nein').click()
  await page.getByText('Ich habe den Vertragstext gelesen').click()
  await page.getByRole('button', { name: 'Unterschriftscode anfordern' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(await demoCode(page))

  await expect(page.getByRole('heading', { name: 'Online bezahlen' })).toBeVisible()
  await page.getByRole('button', { name: /bezahlen/ }).click()
  await page.waitForURL(/payment-sandbox/)
  await page.getByRole('button', { name: /pay/i }).click()

  await page.waitForURL(/\/join\/result/, { timeout: 20_000 })
  await expect(page.getByText('Zahlung erfolgreich')).toBeVisible()
  await expect(page.getByRole('img', { name: 'QR-Code für den Studiozutritt' })).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Rechnung als PDF herunterladen' }).click()
  expect((await download).suggestedFilename()).toMatch(/^invoice-KG-/)

  // Die Sitzung kommt nach dem Neuladen per HttpOnly-Cookie zurück
  await page.goto('/profile')
  await page.reload()
  await expect(page.getByText('Verlängern mit einem Klick')).toBeVisible()
  await expect(page.getByText('Erfolgreich')).toBeVisible()
})

test('Abbruch im Gateway aktiviert keine Mitgliedschaft', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/login?next=/join%3Fpackage%3Dquarter%26section%3Dmen')
  await page.getByLabel('Handynummer').fill(phone())
  await page.getByRole('button', { name: 'Login-Code anfordern' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(await demoCode(page))
  await page.waitForURL(/\/join/)
  await page.locator('input[name=branch]').first().check()
  await page.getByRole('button', { name: /Weiter: Paket wählen/ }).click()
  await page.getByRole('button', { name: /^Weiter/ }).click()
  await page.getByLabel(/Vor- und Nachname/).fill('Finn Schmidt')
  for (const g of await page.locator('[role=radiogroup]').all()) await g.getByText('Nein').click()
  await page.getByText('Ich habe den Vertragstext gelesen').click()
  await page.getByRole('button', { name: 'Unterschriftscode anfordern' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(await demoCode(page))
  await page.getByRole('button', { name: /bezahlen/ }).click()
  await page.waitForURL(/payment-sandbox/)
  await page.getByRole('button', { name: /cancel/i }).click()
  await page.waitForURL(/\/join\/result/, { timeout: 20_000 })
  await expect(page.getByText('Zahlung abgebrochen oder fehlgeschlagen')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Erneut versuchen' })).toBeVisible()
})

test('Profilseite ohne Login leitet auf /login um', async ({ page }) => {
  await page.goto('/profile')
  await page.waitForURL(/\/login\?next=%2Fprofile/)
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible()
})
