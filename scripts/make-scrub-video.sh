#!/usr/bin/env bash
# Versionen des Standardvideos der Vorlage, mit denselben Optimierungseinstellungen wie Panel-Uploads (Video/VideoOptimizer.cs):
#   gym-scrub.mp4 (1080, Scroll)  gym-scrub-720.mp4  gym-scrub-540.mp4  gym.mp4 (Schleife)  gym.jpg  gym-960.jpg
# Nutzung: ./scripts/make-scrub-video.sh [Eingabe] [crop]   Standard: gym-source.mp4 ohne Zuschnitt (für schwarze Balken: 1344:1080:288:0)
set -euo pipefail
DIR="$(dirname "$0")/../src/GymPlatform.Web/public/media/video"
IN="${1:-$DIR/gym-source.mp4}"
CROP="${2-}"
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
echo "✓ In SiteVideo.tsx den ?v=-Wert der Standardversion ändern, damit alte Browser-Caches umgangen werden."
