# بهینه‌سازی ویدیوی باشگاه برای اسکرول فریم‌به‌فریم (نیاز به ffmpeg در PATH)
# ورودی پیش‌فرض: public\media\video\gym-source.mp4 — خروجی: gym.mp4 که صفحهٔ اصلی پخش می‌کند
param([string]$Video = (Join-Path $PSScriptRoot '..\src\KhashayarGym.Web\public\media\video\gym-source.mp4'))
$out = Join-Path (Split-Path $Video) 'gym.mp4'
ffmpeg -loglevel error -y -i $Video -an -vf "scale='min(1920,iw)':-2,fps=24" -c:v libx264 -preset slow -tune film -crf 18 -g 1 -pix_fmt yuv420p -movflags +faststart $out
Write-Host "✓ $out"
