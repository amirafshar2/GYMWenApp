# بهینه‌سازی ویدیوی باشگاه برای اسکرول (نیاز به ffmpeg در PATH)
# ورودی پیش‌فرض: public\media\video\gym-source.mp4 — خروجی: gym.mp4 + gym-poster.webp + gym-poster-mobile.webp
# کیفیت تقریباً همان نسخهٔ قبلی (SSIM ≈ ۰٫۹۸)، حجم حدود یک‌چهارم: CRF 24 و هر ۱۲ فریم یک keyframe (نیم ثانیه)
# -Crop: نوارهای سیاه کناری را می‌بُرد (مثلاً "1344:1080:288:0" برای ویدیوی فعلی). خالی = بدون برش
param(
  [string]$Video = (Join-Path $PSScriptRoot '..\src\GymPlatform.Web\public\media\video\gym-source.mp4'),
  [string]$Crop = '1344:1080:288:0',
  [double]$PosterAt = 4,
  # پوستر فعلی یک عکس جدا از سالن است؛ فقط با -MakePoster از فریم ویدیو ساخته می‌شود
  [switch]$MakePoster
)
$dir = Split-Path $Video
$out = Join-Path $dir 'gym.mp4'
$vf = if ($Crop) { "crop=$Crop,fps=24" } else { "scale='min(1920,iw)':-2,fps=24" }
ffmpeg -loglevel error -y -i $Video -an -vf $vf -c:v libx264 -preset veryslow -tune film -crf 24 -g 12 -bf 0 -pix_fmt yuv420p -movflags +faststart $out
if ($MakePoster) {
  ffmpeg -loglevel error -y -ss $PosterAt -i $out -frames:v 1 -c:v libwebp -quality 78 (Join-Path $dir 'gym-poster.webp')
  ffmpeg -loglevel error -y -ss $PosterAt -i $out -frames:v 1 -vf "scale=720:-2" -c:v libwebp -quality 76 (Join-Path $dir 'gym-poster-mobile.webp')
}
Write-Host "✓ $out (+ پوستر). در SiteVideo.tsx مقدار ?v= را عوض کنید تا کش قدیمی دور زده شود."
