# CodePad Lite one-time server setup (Windows Server + Docker Desktop)
# Run inside the project folder:
#   powershell -ExecutionPolicy Bypass -File scripts\server-setup.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

# ── 1. Prerequisites ──
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "[ERROR] docker not found. Install Docker Desktop, start it, then re-run this script."
  exit 1
}
docker compose version > $null 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "[ERROR] docker compose plugin missing."
  exit 1
}

# ── 2. Generate .env with random secrets (only on first run) ──
if (-not (Test-Path .env)) {
  $jwt = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
  $adminPw = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object { [char]$_ })
  @"
JWT_SECRET=$jwt
ADMIN_PASSWORD=$adminPw
"@ | Set-Content -Path .env -Encoding ASCII
  Write-Host ""
  Write-Host "[OK] Generated .env with random secrets."
  Write-Host "     Admin account: xiaopac"
  Write-Host "     Admin password: $adminPw   <- SAVE THIS NOW!"
  Write-Host ""
} else {
  Write-Host "[OK] .env already exists, skipped."
}

# ── 3. Build and start (first run pulls images + installs runtimes) ──
Write-Host "[OK] Building and starting services ..."
docker compose up -d --build

Write-Host ""
# 网页端口：与 docker-compose 的 WEB_PORT 保持一致（.env 里可覆盖）
$webPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { '8081' }
Write-Host "[DONE] Open http://<SERVER_IP>:$webPort and login with xiaopac"
Write-Host "       Watch logs: docker compose logs -f backend"
Write-Host ""
Write-Host "       Firewall (run in an ADMIN PowerShell if port $webPort is blocked):"
Write-Host "       netsh advfirewall firewall add rule name=CodePad-$webPort dir=in action=allow protocol=TCP localport=$webPort"
