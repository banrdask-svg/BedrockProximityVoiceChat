$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$behaviorPack = Join-Path $root "behavior_pack"
$dist = Join-Path $root "dist"
$temp = Join-Path $root ".build"
$packName = "ProximityVoiceBridgeBP"
$mcpack = Join-Path $dist "$packName.mcpack"
$mcaddon = Join-Path $dist "ProximityVoiceBridge.mcaddon"
$worldBehaviorPacks = Join-Path $root "world_behavior_packs.json"
$bdsInstall = Join-Path $root "BDS_INSTALL.txt"
$commandsHelp = Join-Path $root "COMMANDS.txt"

if (!(Test-Path (Join-Path $behaviorPack "manifest.json"))) {
  throw "behavior_pack/manifest.json was not found."
}

Remove-Item -LiteralPath $dist -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $dist, $temp | Out-Null

$stagePack = Join-Path $temp $packName
$stageAddon = Join-Path $temp "mcaddon"
$stageAddonPack = Join-Path $stageAddon $packName
New-Item -ItemType Directory -Force -Path $stagePack, $stageAddonPack | Out-Null

Copy-Item -Path (Join-Path $behaviorPack "*") -Destination $stagePack -Recurse -Force
Copy-Item -Path (Join-Path $behaviorPack "*") -Destination $stageAddonPack -Recurse -Force

$zipPath = Join-Path $dist "$packName.zip"
Compress-Archive -Path (Join-Path $stagePack "*") -DestinationPath $zipPath -Force
Move-Item -LiteralPath $zipPath -Destination $mcpack -Force

$addonZip = Join-Path $dist "ProximityVoiceBridge.zip"
Compress-Archive -Path $stageAddonPack -DestinationPath $addonZip -Force
Move-Item -LiteralPath $addonZip -Destination $mcaddon -Force

Copy-Item -LiteralPath $worldBehaviorPacks -Destination (Join-Path $dist "world_behavior_packs.json") -Force
Copy-Item -LiteralPath $bdsInstall -Destination (Join-Path $dist "BDS_INSTALL.txt") -Force
Copy-Item -LiteralPath $commandsHelp -Destination (Join-Path $dist "COMMANDS.txt") -Force

Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Created:"
Write-Host " - $mcpack"
Write-Host " - $mcaddon"
Write-Host " - $(Join-Path $dist "world_behavior_packs.json")"
Write-Host " - $(Join-Path $dist "BDS_INSTALL.txt")"
Write-Host " - $(Join-Path $dist "COMMANDS.txt")"
