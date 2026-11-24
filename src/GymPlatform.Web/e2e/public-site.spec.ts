import { test, expect } from '@playwright/test'

test('Hero zeigt den Markenslogan und die Seite ist LTR', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Trainiere')
})

test('Nächstes Studio wird über den Standort gefunden', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 48.7725, longitude: 9.1535 }) // neben der Filiale West (Demodaten)
  await page.goto('/branches')
  await page.getByRole('button', { name: 'Nächstes Studio finden' }).click()
  await expect(page.getByText('Am nächsten,').first()).toBeVisible()
  await expect(page.locator('#branch-sarv-women')).toContainText('Am nächsten')
})

test('Damenfilter zeigt nur Filialen mit Damenbereich', async ({ page }) => {
  await page.goto('/branches')
  await page.getByRole('radio', { name: 'Damen' }).click()
  await expect(page.locator('#branch-bahar-men')).toHaveCount(0)
  await expect(page.locator('#branch-bahar-women')).toBeVisible()
})

test('Pakete werden mit Aktionsrabatt angezeigt', async ({ page }) => {
  await page.goto('/packages')
  await expect(page.getByRole('heading', { name: /12 Monate/ })).toBeVisible()
  await expect(page.getByText('% Aktionsrabatt').first()).toBeVisible()
})

test('Beratungsformular zeigt Fehler bei ungültiger Nummer', async ({ page }) => {
  await page.goto('/#consult')
  await page.locator('#consult').getByLabel('Vor- und Nachname').fill('Sarah Becker')
  await page.locator('#consult').getByLabel('Handynummer').fill('12345')
  await page.getByRole('button', { name: 'Beratung anfragen' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Bitte die Handynummer im Format' })).toBeVisible()
})

test('Sicherheitsheader sind in den Antworten vorhanden', async ({ request }) => {
  const res = await request.get('/api/v1/branches')
  expect(res.headers()['content-security-policy']).toContain("default-src 'self'")
  expect(res.headers()['x-content-type-options']).toBe('nosniff')
})
