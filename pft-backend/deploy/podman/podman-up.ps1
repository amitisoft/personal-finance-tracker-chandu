param(
  [switch]$Build = $true,
  [switch]$ShowLogs,
  [switch]$Clean,
  [switch]$ResetDb
)

$ErrorActionPreference = 'Stop'
$compose = Join-Path $PSScriptRoot 'podman-compose.yml'

function Test-Podman {
  podman info | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "podman info failed" }
}

function Invoke-Compose {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  & podman compose -f $compose @Args
  return $LASTEXITCODE
}

try {
  Test-Podman
} catch {
  Write-Host "ERROR: Podman is not reachable from this shell." -ForegroundColor Red
  Write-Host "- Try: podman machine start" -ForegroundColor Yellow
  Write-Host "- Then: podman system connection list" -ForegroundColor Yellow
  throw
}

if ($Clean) {
  $downArgs = @('down','--remove-orphans')
  if ($ResetDb) { $downArgs += @('--volumes') }

  $code = Invoke-Compose @downArgs
  if ($code -ne 0) {
    Write-Host "WARN: compose down returned exit code $code (often fine if nothing was running)." -ForegroundColor Yellow
  }
}

if ($Build) {
  $code = Invoke-Compose up -d --build
} else {
  $code = Invoke-Compose up -d
}

if ($code -ne 0) {
  throw "compose up failed with exit code $code"
}

Invoke-Compose ps | Out-Null

if ($ShowLogs) {
  Invoke-Compose logs --tail 200 frontend | Out-Null
  Invoke-Compose logs --tail 200 backend | Out-Null
  Invoke-Compose logs --tail 200 postgres | Out-Null
}

Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend (health): http://localhost:8080/healthz" -ForegroundColor Green
Write-Host "Backend (Swagger): http://localhost:8080/swagger" -ForegroundColor Green
