/**
 * سرعت: نسخهٔ فشردهٔ Brotli (حداکثر کیفیت) و gzip از فایل‌های بیلد، یک بار هنگام بیلد.
 * سرور (PrecompressedStaticFilesMiddleware) اگر مرورگر پشتیبانی کند همین فایل‌ها را می‌فرستد
 * به‌جای فشرده‌سازی سریع و ضعیف‌تر هنگام هر درخواست.
 */
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../../GymPlatform.Api/wwwroot/assets/', import.meta.url)) // روی ویندوز هم درست
let saved = 0, n = 0
for (const f of readdirSync(dir)) {
  if (!/\.(js|css|svg|json)$/.test(f)) continue
  const p = join(dir, f)
  const buf = readFileSync(p)
  if (buf.length < 1024) continue
  const br = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } })
  writeFileSync(p + '.br', br)
  writeFileSync(p + '.gz', gzipSync(buf, { level: 9 }))
  saved += statSync(p).size - br.length; n++
}
console.log(`precompressed ${n} files (brotli saves ${(saved / 1024).toFixed(0)} KB)`)
