$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "local-secrets\groq.env"

Write-Host "Dental CRM: Groq Whisper check" -ForegroundColor Cyan
Write-Host "Key file: $envFile"

if (-not (Test-Path -LiteralPath $envFile)) {
  Write-Host "groq.env was not found. Create it and add GROQ_API_KEY=gsk_..." -ForegroundColor Yellow
  exit 1
}

$content = Get-Content -LiteralPath $envFile -Encoding UTF8
$keyLine = $content | Where-Object { $_ -match "^\s*GROQ_API_KEY\s*=" } | Select-Object -Last 1
$keyValue = if ($keyLine) { ($keyLine -replace "^\s*GROQ_API_KEY\s*=", "").Trim() } else { "" }
$keyLooksPresent = $keyValue -and $keyValue -notmatch "your_key_here|your-key|^$"

if ($keyLooksPresent) {
  Write-Host "Key exists in file. The key value is not printed." -ForegroundColor Green
} else {
  Write-Host "Key is empty. Add a line like GROQ_API_KEY=gsk_..." -ForegroundColor Yellow
}

$urls = @(
  "http://127.0.0.1:4173/api/speech/status",
  "http://127.0.0.1:4100/api/speech/status"
)

$status = $null
$usedUrl = $null
foreach ($url in $urls) {
  try {
    $status = Invoke-RestMethod -Uri $url -TimeoutSec 5
    $usedUrl = $url
    break
  } catch {
    $status = $null
  }
}

if (-not $status) {
  Write-Host "The CRM server is not responding. Start CRM, then run this check again." -ForegroundColor Yellow
  exit 0
}

Write-Host "Server responds: $usedUrl" -ForegroundColor Green
Write-Host "Provider: $($status.providerLabel)"
Write-Host "Key visible to server: $($status.keyConfigured)"
Write-Host "Long server recording available: $($status.serverTranscriptionCurrentlyAvailable)"

if (-not $status.keyConfigured -and $keyLooksPresent) {
  Write-Host "The key is in groq.env, but the server does not see it. Restart API and run this check again." -ForegroundColor Yellow
  exit 1
}

if ($status.keyConfigured -and -not $status.serverTranscriptionCurrentlyAvailable) {
  Write-Host "The key is visible, but transcription is temporarily unavailable. Check key validity, limits, or provider cooldown." -ForegroundColor Yellow
  exit 1
}

if ($status.serverTranscriptionCurrentlyAvailable) {
  Write-Host "Groq Whisper is ready for long server recording." -ForegroundColor Green
}
