# بازتولید آرشیو پرتفولیو (ویندوز): PNG→WebP با ffmpeg، manifest.json و zip هر آیتم.
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..\portfolio-export'
Get-ChildItem $root -Recurse -Filter *.png | ForEach-Object {
  $webp = [IO.Path]::ChangeExtension($_.FullName, '.webp'); $q = 85
  ffmpeg -loglevel error -y -i $_.FullName -c:v libwebp -quality $q $webp
  while ((Get-Item $webp).Length -gt 409600 -and $q -gt 40) {
    $q -= 10; ffmpeg -loglevel error -y -i $_.FullName -vf "scale='min(iw,1440)':-2" -c:v libwebp -quality $q $webp
  }
  Remove-Item $_.FullName
}
node (Join-Path $PSScriptRoot 'build-portfolio-manifest.mjs')
Get-ChildItem $root -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'item.json') } | ForEach-Object {
  $zip = "$($_.FullName).zip"; if (Test-Path $zip) { Remove-Item $zip }
  Compress-Archive -Path $_.FullName -DestinationPath $zip
}
Write-Host '✓ zipها ساخته شد'
