#!/usr/bin/env bash
# تبدیل ویدیوی هیرو به توالی فریم WebP برای اسکرول روی canvas.
# استفاده: ./scripts/make-hero-frames.sh path/to/video.mp4
# خروجی: src/KhashayarGym.Web/public/media/hero/frames/{desktop,mobile}/frame_0001.webp + manifest.json
set -euo pipefail
IN="${1:?مسیر ویدیو را بدهید}"
OUT="$(dirname "$0")/../src/KhashayarGym.Web/public/media/hero/frames"
FPS_DESKTOP=${FPS_DESKTOP:-24}
FPS_MOBILE=${FPS_MOBILE:-12}
rm -rf "$OUT/desktop" "$OUT/mobile"; mkdir -p "$OUT/desktop" "$OUT/mobile"
ffmpeg -loglevel error -i "$IN" -vf "fps=$FPS_DESKTOP,scale=1920:-2" -c:v libwebp -quality 72 "$OUT/desktop/frame_%04d.webp"
ffmpeg -loglevel error -i "$IN" -vf "fps=$FPS_MOBILE,scale=828:-2"  -c:v libwebp -quality 65 "$OUT/mobile/frame_%04d.webp"
D=$(ls "$OUT/desktop" | wc -l); M=$(ls "$OUT/mobile" | wc -l)
# اپ از هر دو پوشه به تعداد کمتر استفاده می‌کند تا ایندکس‌ها هم‌خوان بمانند
N=$(( D < M ? D : M ))
if [ "$D" -ne "$N" ]; then
  # فریم‌های دسکتاپ را به تعداد موبایل نمونه‌برداری می‌کنیم
  i=1; for f in $(ls "$OUT/desktop" | awk -v d="$D" -v n="$N" 'NR==1||int((NR-1)*n/d)!=int((NR-2)*n/d)'); do
    mv "$OUT/desktop/$f" "$OUT/desktop/k_$(printf %04d $i).webp"; i=$((i+1)); done
  rm -f "$OUT"/desktop/frame_*.webp
  for f in "$OUT"/desktop/k_*.webp; do mv "$f" "${f/k_/frame_}"; done
fi
cat > "$OUT/manifest.json" <<JSON
{ "count": $N, "desktop": "/media/hero/frames/desktop/frame_{n}.webp", "mobile": "/media/hero/frames/mobile/frame_{n}.webp" }
JSON
echo "✓ $N فریم ساخته شد → $OUT"
