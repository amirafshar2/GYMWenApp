# بهینه‌سازی ویدیوی باشگاه برای اسکرول فریم‌به‌فریم (نیاز به ffmpeg در PATH)
param([string]$Video = (Join-Path $PSScriptRoot '..\src\KhashayarGym.Web\public\media\video\gym.mp4'))
$out = Join-Path (Split-Path $Video) 'gym-scrub.mp4'
ffmpeg -loglevel error -y -i $Video -an -vf "scale='min(1600,iw)':-2,fps=30" -c:v libx264 -preset slow -crf 24 -g 1 -pix_fmt yuv420p -movflags +faststart $out
Write-Host "✓ $out"
