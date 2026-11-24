import { test, expect } from '@playwright/test'

test('Beratungsformular wird mit CSRF gesendet', async ({ page }) => {
  await page.goto('/#consult')
  await page.locator('#consult').getByLabel('Vor- und Nachname').fill('Sarah Becker')
  await page.locator('#consult').getByLabel('Handynummer').fill(`0917${Math.floor(1000000 + Math.random() * 8999999)}`)
  await page.getByRole('button', { name: 'Beratung anfragen' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Gesendet' })).toBeVisible()
})

test('Anfrage ohne CSRF-Token wird abgelehnt', async ({ request }) => {
  const res = await request.post('/api/v1/consultations', { data: { fullName: 'Sarah Becker', mobile: '09171234567' } })
  expect(res.status()).toBe(400)
})
