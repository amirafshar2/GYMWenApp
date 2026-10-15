# تبدیل ویدیوی هیرو به توالی فریم WebP (ویندوز). نیاز به ffmpeg در PATH.
# استفاده: .\scripts\make-hero-frames.ps1 -Video C:\path\video.mp4
param([Parameter(Mandatory)] [string]$Video, [int]$Fps = 15)
$ErrorActionPreference = 'Stop'
$out = Join-Path $PSScriptRoot '..\src\KhashayarGym.Web\public\media\hero\frames'
Remove-Item "$out\desktop", "$out\mobile" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$out\desktop", "$out\mobile" | Out-Null
ffmpeg -loglevel error -i $Video -vf "fps=$Fps,scale=1920:-2" -c:v libwebp -quality 72 "$out\desktop\frame_%04d.webp"
ffmpeg -loglevel error -i $Video -vf "fps=$Fps,scale=828:-2"  -c:v libwebp -quality 65 "$out\mobile\frame_%04d.webp"
$n = [Math]::Min((Get-ChildItem "$out\desktop").Count, (Get-ChildItem "$out\mobile").Count)
@"
{ "count": $n, "desktop": "/media/hero/frames/desktop/frame_{n}.webp", "mobile": "/media/hero/frames/mobile/frame_{n}.webp" }
"@ | Set-Content -Encoding utf8 "$out\manifest.json"
Write-Host "✓ $n فریم ساخته شد"
