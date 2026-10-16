#!/usr/bin/env bash
# بهینه‌سازی ویدیوی باشگاه برای اسکرول فریم‌به‌فریم (هر فریم یک keyframe تا seek روان باشد)
# استفاده: ./scripts/make-scrub-video.sh [ورودی]   (پیش‌فرض: public/media/video/gym-source.mp4)
# خروجی: public/media/video/gym.mp4 — همان فایلی که صفحهٔ اصلی پخش می‌کند
set -euo pipefail
DIR="$(dirname "$0")/../src/KhashayarGym.Web/public/media/video"
IN="${1:-$DIR/gym-source.mp4}"
ffmpeg -loglevel error -y -i "$IN" -an -vf "scale='min(1920,iw)':-2,fps=24" \
  -c:v libx264 -preset slow -tune film -crf 18 -g 1 -pix_fmt yuv420p -movflags +faststart "$DIR/gym.mp4"
echo "✓ $DIR/gym.mp4 ($(du -h "$DIR/gym.mp4" | cut -f1))"
