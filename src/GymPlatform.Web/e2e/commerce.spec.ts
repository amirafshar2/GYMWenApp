import { test, expect, type Page } from '@playwright/test'

// Phase 3 mit Test-Gateway und Demo-Mitarbeiter (Demo:StaffPhone im Development-Modus)
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
const phone = () => '0917' + String(Math.floor(1_000_000 + Math.random() * 8_999_999))
async function login(page: Page, mobile: string) {
  await page.getByLabel('Handynummer').first().fill(mobile)
  await page.getByRole('button', { name: 'Login-Code anfordern' }).click()
  // Der Demo-Mitarbeiter meldet sich in mehreren Tests an und jede Nummer bekommt nur alle 60 Sekunden einen Code
  const code = page.locator('b[dir=ltr]').first()
  await code.or(page.getByText(/Sekunden warten/)).first().waitFor()
  if (!(await code.isVisible())) { await page.waitForTimeout(61_000); await page.getByRole('button', { name: 'Login-Code anfordern' }).click() }
  await page.locator('input[autocomplete=one-time-code]').fill(toLatin(await page.locator('b[dir=ltr]').first().innerText()))
}
async function paySandbox(page: Page) {
  await page.waitForURL(/payment-sandbox/)
  await page.getByRole('button', { name: /pay/i }).click()
}

test.describe.configure({ mode: 'serial' })

test('Shop-Kauf: Farbe und Größe wählen → Warenkorb → Zahlung → Bestellung abholbereit', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/shop?kind=merch')
  await page.getByRole('link', { name: /Dri-Fit-T-Shirt/ }).click()
  await page.getByRole('button', { name: 'Eisenwerk-Blau' }).click()
  await page.getByRole('button', { name: 'L', exact: true }).click()
  await page.locator('li:has(span.text-\\[\\#1f7a46\\]) button').first().click() // Filiale mit Bestand
  await page.getByRole('button', { name: 'In den Warenkorb' }).click()
  await page.goto('/cart')
  await page.getByRole('button', { name: 'Anmelden und bezahlen' }).click()
  await login(page, phone())
  await page.waitForURL(/\/cart/)
  await page.getByRole('button', { name: /^Bestellen und/ }).click()
  await paySandbox(page)
  await page.waitForURL(/\/shop\/orders\//, { timeout: 20_000 })
  await expect(page.getByText('Abholbereit im Studio')).toBeVisible()
  await expect(page.getByLabel(/Warenkorb/)).toHaveCount(0) // Warenkorb ist leer
})

test('Bistro: Bestellung per Tisch-QR, Live-Anzeige auf der Tafel und „Fertig“ auf dem Kundenhandy', async ({ browser }) => {
  test.setTimeout(180_000)
  const staff = await (await browser.newContext()).newPage()
  await staff.goto('/login?next=%2Fpanel%2Fcanteen%3Fbranch%3Dmarkazi')
  await login(staff, '01510000000')
  await expect(staff.getByText('● Live')).toBeVisible({ timeout: 15_000 })

  const member = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await member.goto('/login?next=' + encodeURIComponent('/canteen/markazi?table=Tisch 7'))
  await login(member, phone())
  await member.waitForURL(/\/canteen\/markazi/)
  await member.getByRole('button', { name: 'Hinzufügen' }).first().click()
  await member.getByRole('button', { name: /Ansehen und bezahlen/ }).click()
  await member.getByRole('button', { name: /Bank-Gateway/ }).click()
  await member.getByRole('button', { name: /^Bestellen und bezahlen/ }).click()
  await paySandbox(member)
  await member.waitForURL(/\/canteen\/orders\//, { timeout: 20_000 })
  await expect(member.getByText('● Live-Verbindung aktiv')).toBeVisible({ timeout: 15_000 })

  const card = staff.locator('li', { hasText: 'Tisch 7' }).first()
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.getByRole('button', { name: 'Zubereitung starten' }).click()
  await staff.locator('li', { hasText: 'Tisch 7' }).first().getByRole('button', { name: 'Fertig' }).click()
  await expect(member.getByText('Deine Bestellung ist fertig! Bitte am Bistro abholen')).toBeVisible({ timeout: 10_000 })
})

test('Guthaben: Aufladen und Anzeige in den Kontobewegungen', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/login?next=%2Fwallet')
  await login(page, phone())
  await page.waitForURL(/\/wallet/)
  await page.getByRole('button', { name: /30,00 €/ }).click()
  await page.getByRole('button', { name: /bezahlen/ }).click()
  await paySandbox(page)
  await page.waitForURL(/\/wallet\?payment=/, { timeout: 20_000 })
  await expect(page.getByText(/Dem Guthaben gutgeschrieben/)).toBeVisible()
  await expect(page.getByText('Guthaben aufladen').last()).toBeVisible()
})
