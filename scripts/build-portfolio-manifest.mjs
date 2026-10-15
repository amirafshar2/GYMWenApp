// manifest.json را از همهٔ portfolio-export/*/item.json می‌سازد و کلید API واقعی را بررسی می‌کند.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../portfolio-export')
const items = []
for (const d of readdirSync(root, { withFileTypes: true })) {
  if (!d.isDirectory()) continue
  const f = join(root, d.name, 'item.json')
  if (!existsSync(f)) continue
  const raw = readFileSync(f, 'utf8')
  if (/api_key=(?!\$API_KEY_21ST)[A-Za-z0-9_-]{8,}/.test(raw)) throw new Error(`کلید API واقعی در ${f} پیدا شد!`)
  const it = JSON.parse(raw)
  for (const img of it.images) if (!existsSync(join(root, d.name, img.file))) console.warn(`⚠ تصویر ${img.file} برای ${it.id} وجود ندارد`)
  items.push({ id: it.id, title: it.title, category: it.category, path: `${d.name}/`, zip: `${d.name}.zip` })
}
items.sort((a, b) => a.id.localeCompare(b.id))
writeFileSync(join(root, 'manifest.json'), JSON.stringify({ schemaVersion: '1.0', project: 'Khashayar Gym', generatedAt: new Date().toISOString(), items }, null, 2))
console.log(`✓ manifest با ${items.length} آیتم`)
