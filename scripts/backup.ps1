# CodePad Lite backup script (Windows) - backs up db + storage volumes
# Usage: powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $projectRoot "backup-$stamp"
New-Item -ItemType Directory -Path $out -Force | Out-Null

Write-Host "Backing up volumes to $out ..."
docker run --rm -v codepad-lite_db_data:/data -v "${out}:/backup" alpine tar czf /backup/db.tar.gz /data
docker run --rm -v codepad-lite_storage_data:/data -v "${out}:/backup" alpine tar czf /backup/storage.tar.gz /data

Write-Host ""
Write-Host "Done:"
Get-ChildItem $out | Select-Object Name, Length
Write-Host ""
Write-Host "Restore (on target machine):"
Write-Host "  docker volume create codepad-lite_db_data codepad-lite_storage_data"
Write-Host "  docker run --rm -v codepad-lite_db_data:/data -v ${out}:/backup alpine sh -c 'rm -rf /data/* && tar xzf /backup/db.tar.gz -C /'"
Write-Host "  docker run --rm -v codepad-lite_storage_data:/data -v ${out}:/backup alpine sh -c 'rm -rf /data/* && tar xzf /backup/storage.tar.gz -C /'"
