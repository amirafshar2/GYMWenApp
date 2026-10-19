#!/usr/bin/env bash
# نسخه‌های ویدیوی پیش‌فرض قالب، با همان تنظیمات بهینه‌سازی خودکار آپلودهای پنل (Video/VideoOptimizer.cs):
#   gym-scrub.mp4 (1080، اسکرولی)  gym-scrub-720.mp4  gym-scrub-540.mp4  gym.mp4 (پخش تکراری)  gym.jpg  gym-960.jpg
# استفاده: ./scripts/make-scrub-video.sh [ورودی] [crop]   پیش‌فرض: gym-source.mp4 و برش نوارهای سیاه 1344:1080:288:0
set -euo pipefail
DIR="$(dirname "$0")/../src/GymPlatform.Web/public/media/video"
IN="${1:-$DIR/gym-source.mp4}"
CROP="${2-1344:1080:288:0}"
PRE=""; [ -n "$CROP" ] && PRE="crop=$CROP,"
COMMON=(-threads 1 -filter_threads 1 -an -sn -dn -map_metadata -1 -pix_fmt yuv420p -movflags +faststart
        -x264-params threads=1:lookahead-threads=1:rc-lookahead=4:ref=1)
SCRUB=(-g 4 -keyint_min 4 -sc_threshold 0 -bf 0)
enc() { # out width crf profile [scrub]
  local extra=(-g 48); [ "${5:-}" = scrub ] && extra=("${SCRUB[@]}")
  ffmpeg -v error -y -threads 1 -i "$IN" "${COMMON[@]}" "${extra[@]}" -vf "${PRE}scale='min($2,iw)':-2:flags=lanczos" \
    -c:v libx264 -preset medium -crf "$3" -profile:v "$4" "$DIR/.$1" && mv "$DIR/.$1" "$DIR/$1"
}
enc gym-scrub.mp4 1920 24 high scrub
enc gym-scrub-720.mp4 1280 24 main scrub
enc gym-scrub-540.mp4 960 25 main scrub
enc gym.mp4 1920 21 high
ffmpeg -v error -y -threads 1 -i "$IN" -frames:v 1 -vf "${PRE}scale='min(1920,iw)':-2:flags=lanczos" -q:v 3 "$DIR/gym.jpg"
ffmpeg -v error -y -threads 1 -i "$IN" -frames:v 1 -vf "${PRE}scale='min(960,iw)':-2:flags=lanczos" -q:v 4 "$DIR/gym-960.jpg"
ls -la "$DIR"/gym*
echo "✓ در SiteVideo.tsx مقدار ?v= نسخهٔ پیش‌فرض را عوض کنید تا کش قدیمی مرورگرها دور زده شود."
