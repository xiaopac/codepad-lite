# CodePad Lite release packaging script (run on your local Windows machine)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\package.ps1
# Output: ..\codepad-lite-release.tar.gz (node_modules/dist/data/.env excluded)
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot        # ...\codepad-lite
$workDir = Split-Path -Parent $projectRoot             # parent dir
$out = Join-Path $workDir 'codepad-lite-release.tar.gz'

Set-Location $workDir
if (Test-Path $out) { Remove-Item $out -Force }

tar -czf $out `
  --exclude='codepad-lite/*/node_modules' `
  --exclude='codepad-lite/*/dist' `
  --exclude='codepad-lite/backend/data/*' `
  --exclude='codepad-lite/backend/storage/*' `
  --exclude='codepad-lite/.env' `
  --exclude='codepad-lite/.git' `
  --exclude='codepad-lite/*.log' `
  codepad-lite

if (-not (Test-Path $out)) { throw 'Packaging failed' }
$size = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host ""
Write-Host "Package created: $out ($size KB)"
Write-Host ""
Write-Host "Upload to your server (replace YOUR_SERVER_IP):"
Write-Host "  scp $out root@YOUR_SERVER_IP:/root/"
