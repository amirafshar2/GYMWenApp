#!/usr/bin/env bash
# بهینه‌سازی ویدیوی باشگاه برای اسکرول فریم‌به‌فریم (هر فریم یک keyframe تا seek روان باشد)
# استفاده: ./scripts/make-scrub-video.sh [ورودی]   (پیش‌فرض: public/media/video/gym.mp4)
set -euo pipefail
DIR="$(dirname "$0")/../src/KhashayarGym.Web/public/media/video"
IN="${1:-$DIR/gym.mp4}"
ffmpeg -loglevel error -y -i "$IN" -an -vf "scale='min(1280,iw)':-2,fps=24" \
  -c:v libx264 -preset slow -crf 27 -g 1 -pix_fmt yuv420p -movflags +faststart "$DIR/gym-scrub.mp4"
echo "✓ $DIR/gym-scrub.mp4 ($(du -h "$DIR/gym-scrub.mp4" | cut -f1))"
