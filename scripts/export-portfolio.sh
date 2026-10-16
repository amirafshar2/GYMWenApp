#!/usr/bin/env bash
# بازتولید آرشیو پرتفولیو: PNG→WebP (کیفیت ۸۵، حداکثر ۴۰۰KB)، manifest.json و zip هر آیتم.
# برای گرفتن اسکرین‌شات‌های تازه اول بک‌اند را اجرا کنید و بعد:
#   (cd src/GymPlatform.Web && node scripts/capture-portfolio.mjs http://localhost:5180)
set -euo pipefail
cd "$(dirname "$0")/../portfolio-export"
for png in */images/*.png; do
  [ -e "$png" ] || continue
  webp="${png%.png}.webp"
  q=85
  ffmpeg -loglevel error -y -i "$png" -c:v libwebp -quality $q "$webp"
  while [ "$(stat -c%s "$webp")" -gt 409600 ] && [ $q -gt 40 ]; do
    q=$((q-10)); ffmpeg -loglevel error -y -i "$png" -vf "scale='min(iw,1440)':-2" -c:v libwebp -quality $q "$webp"
  done
  rm "$png"
done
node ../scripts/build-portfolio-manifest.mjs
for d in */; do
  d="${d%/}"; [ -f "$d/item.json" ] || continue
  rm -f "$d.zip"; zip -qr "$d.zip" "$d"
done
echo "✓ zipها ساخته شد"
