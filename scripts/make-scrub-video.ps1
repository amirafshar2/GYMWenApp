# Versionen des Standardvideos der Vorlage, mit denselben Optimierungseinstellungen wie Panel-Uploads (Video/VideoOptimizer.cs) — benötigt ffmpeg in PATH
# Ausgabe: gym-scrub.mp4 (1080 Scroll), gym-scrub-720.mp4, gym-scrub-540.mp4, gym.mp4 (Schleife), gym.jpg, gym-960.jpg
# -Crop: schneidet schwarze Seitenbalken ab (Standard für das aktuelle Video). Leer = kein Zuschnitt
param(
  [string]$Video = (Join-Path $PSScriptRoot '..\src\GymPlatform.Web\public\media\video\gym-source.mp4'),
  [string]$Crop = ''
)
$dir = Split-Path $Video
$pre = if ($Crop) { "crop=$Crop," } else { '' }
$common = @('-threads','1','-filter_threads','1','-an','-sn','-dn','-map_metadata','-1','-pix_fmt','yuv420p','-movflags','+faststart',
            '-x264-params','threads=1:lookahead-threads=1:rc-lookahead=4:ref=1')
function Enc($name, $width, $crf, $profile, [switch]$Scrub) {
  $gop = if ($Scrub) { @('-g','4','-keyint_min','4','-sc_threshold','0','-bf','0') } else { @('-g','48') }
  $tmp = Join-Path $dir ".$name"
  ffmpeg -v error -y -threads 1 -i $Video @common @gop -vf "${pre}scale='min($width,iw)':-2:flags=lanczos" -c:v libx264 -preset medium -crf $crf -profile:v $profile $tmp
  Move-Item -Force $tmp (Join-Path $dir $name)
}
Enc 'gym-scrub.mp4' 1920 24 'high' -Scrub
Enc 'gym-scrub-720.mp4' 1280 24 'main' -Scrub
Enc 'gym-scrub-540.mp4' 960 25 'main' -Scrub
Enc 'gym.mp4' 1920 21 'high'
ffmpeg -v error -y -threads 1 -i $Video -frames:v 1 -vf "${pre}scale='min(1920,iw)':-2:flags=lanczos" -q:v 3 (Join-Path $dir 'gym.jpg')
ffmpeg -v error -y -threads 1 -i $Video -frames:v 1 -vf "${pre}scale='min(960,iw)':-2:flags=lanczos" -q:v 4 (Join-Path $dir 'gym-960.jpg')
Write-Host "✓ Versionen erzeugt. In SiteVideo.tsx den ?v=-Wert der Standardversion ändern, damit alte Caches umgangen werden."
