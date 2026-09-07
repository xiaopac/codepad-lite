# CodePad Lite update (Windows Server + Git + Docker Desktop)
# Run inside the project folder:
#   powershell -ExecutionPolicy Bypass -File scripts\git-update.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "[ERROR] git not found. Install Git for Windows first."
  exit 1
}

Write-Host "[OK] git pull ..."
git pull --ff-only

Write-Host "[OK] Rebuilding and restarting ..."
docker compose up -d --build

Write-Host "[OK] Cleaning old images ..."
docker image prune -f | Out-Null

Write-Host ""
Write-Host "[DONE] Update finished. Watch logs: docker compose logs -f backend"
