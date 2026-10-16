import { defineConfig, devices } from '@playwright/test'

// پیش از اجرا: بک‌اند را با `dotnet run` بالا بیاورید (فرانت بیلدشده از wwwroot سرو می‌شود)
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5180',
    locale: 'fa-IR',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
