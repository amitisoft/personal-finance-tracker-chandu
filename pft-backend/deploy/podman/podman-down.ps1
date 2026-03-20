$ErrorActionPreference = 'Stop'
$compose = Join-Path $PSScriptRoot 'podman-compose.yml'

try {
  podman compose -f $compose down
} catch {
  Write-Host "ERROR: Failed to talk to Podman." -ForegroundColor Red
  Write-Host "Try: podman machine start" -ForegroundColor Yellow
  throw
}
