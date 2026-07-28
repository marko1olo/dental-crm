# -----------------------------------------------------------------------------
# apply-dev-env.ps1
#
# Appends local-development flags to the project .env files.
#
# WHY THIS FILE IS ASCII-ONLY NOW
# Windows PowerShell 5.1 is the only PowerShell on the target boxes (pwsh is not
# on PATH). It parses a .ps1 that has no UTF-8 BOM using the ANSI code page. This
# script used to carry Russian comments and em dashes, so 5.1 decoded them into
# stray quote characters and the script died with a ParserError before it touched
# a single file: it never applied a flag and it never generated a secret. Keeping
# it ASCII makes it work under both 5.1 and 7 without depending on a BOM that the
# repository tooling does not write. Russian operator documentation belongs in
# .agents/, not inside parser input.
#
# WHAT IT DOES
# The API used to carry convenience holes that were always on, production
# included: the demo login clinic@example.com / dente2026, tenant selection from
# the client-supplied x-organization-id header with no token, and the patient
# portal code "0000". They are all off by default now and turn on only through
# explicit flags, and only while NODE_ENV is not production.
#
# .env files cannot be written remotely, so this script applies them. Run it from
# the dental-crm folder:
#     powershell -ExecutionPolicy Bypass -File .\apply-dev-env.ps1
#
# Idempotent: a second run duplicates nothing.
#
# THE HEADER-ORG FLAG IS NO LONGER PART OF THE DEFAULT SET
# DENTE_DEV_ALLOW_HEADER_ORG=1 lets a caller name its own clinic in a header with
# no credential whatsoever. An ordinary run must not arm that across three env
# files, so it now sits behind an explicit switch:
#     powershell -ExecutionPolicy Bypass -File .\apply-dev-env.ps1 -AllowHeaderOrg
# and even then it lands in ONE file - the repo-root .env.local, which the API
# does load (apps/api/src/env/loadServerEnv.ts baseEnvFiles) - instead of three.
# The API additionally refuses every state-changing request that relies on that
# header while the HTTP server is listening on a port; see
# apps/api/src/security/identity.ts.
# -----------------------------------------------------------------------------

[CmdletBinding()]
param(
    [switch]$AllowHeaderOrg
)

$ErrorActionPreference = 'Stop'
$projectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

# Idempotency marker. It has to be a flag that EVERY ordinary run writes, or a
# second run appends the block again. DENTE_DEV_ALLOW_HEADER_ORG cannot serve as
# the marker any more precisely because ordinary runs no longer write it.
$idempotencyMarker = 'DENTE_ALLOW_DEMO_LOGIN'
$headerOrgFlagName = 'DENTE_DEV_ALLOW_HEADER_ORG'

$devFlags = @'

# -- Local development only ---------------------------------------------------
# With NODE_ENV=production the server refuses to start with any of these set.
# Enables the demo login clinic@example.com / dente2026 and doctor@clinic.com.
DENTE_ALLOW_DEMO_LOGIN=1
# Enables the EGISZ stubs with fictional patients.
DENTE_ALLOW_DEMO_FIXTURES=1
# Patient portal sign-in code (the code used to default to "0000").
PORTAL_MVP_OTP_CODE=0000
# Shared secret for inbound VK / telephony / MAX webhooks. Mandatory in production.
DENTE_WEBHOOK_SECRET=dev-local-webhook-secret-change-me
# Credential-less tenant selection is deliberately NOT enabled here. The flag
# name is not even mentioned as text, so that greps for it stay meaningful.
# Arm it on purpose with:  apply-dev-env.ps1 -AllowHeaderOrg
'@

$headerOrgFlag = @'

# -- Credential-less tenant selection, armed on purpose -----------------------
# Lets a request name its own clinic through the x-organization-id header with no
# token at all. Reads only: the API refuses every state-changing request that
# relies on it while the HTTP server is listening. Delete this line to disarm.
DENTE_DEV_ALLOW_HEADER_ORG=1
'@

function Read-EnvFileText {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path $Path)) { return $null }
    $text = Get-Content -Path $Path -Raw -Encoding UTF8
    if ($null -eq $text) { return '' }
    return $text
}

# Matches an actual assignment, not a mention. A comment that merely names a flag
# must never count as that flag being set, or the script reports its own prose back
# to the operator as a finding.
function Test-EnvAssignment {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ([string]::IsNullOrEmpty($Text)) { return $false }
    return [regex]::IsMatch($Text, '(?m)^[ \t]*' + [regex]::Escape($Name) + '[ \t]*=')
}

function Add-EnvBlock {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Block,
        [Parameter(Mandatory = $true)][string]$Marker,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $content = Read-EnvFileText -Path $Path
    if ($null -eq $content) {
        Write-Host "  skipped, no such file: $Path" -ForegroundColor DarkGray
        return
    }

    if (Test-EnvAssignment -Text $content -Name $Marker) {
        Write-Host "  already set, $Label : $Path" -ForegroundColor DarkGray
        return
    }

    # Backup before touching an operator file.
    Copy-Item -Path $Path -Destination "$Path.bak" -Force

    $updated = $content.TrimEnd("`r", "`n") + "`r`n" + $Block
    # UTF-8 without BOM: dotenv does not understand a BOM on the first line.
    [System.IO.File]::WriteAllText($Path, $updated, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "  updated, $Label : $Path  (backup: $Path.bak)" -ForegroundColor Green
}

$targets = @(
    (Join-Path $projectRoot '.env'),
    (Join-Path $projectRoot '.env.local'),
    (Join-Path $projectRoot 'apps\api\.env')
)

Write-Host 'Applying local development flags.' -ForegroundColor Cyan
foreach ($path in $targets) {
    Add-EnvBlock -Path $path -Block $devFlags -Marker $idempotencyMarker -Label 'dev flags'
}

# The header-org flag is reported, never silently re-armed and never silently
# removed: rewriting an operator .env line by line is how developer credentials
# get destroyed. The script names the file and leaves the decision to the human.
$alreadyArmed = @()
foreach ($path in $targets) {
    $content = Read-EnvFileText -Path $path
    if ($null -ne $content -and (Test-EnvAssignment -Text $content -Name $headerOrgFlagName)) {
        $alreadyArmed += $path
    }
}

$headerOrgTarget = Join-Path $projectRoot '.env.local'

Write-Host ''
if ($AllowHeaderOrg) {
    Write-Host '===============================================================' -ForegroundColor Red
    Write-Host " ARMING $headerOrgFlagName" -ForegroundColor Red
    Write-Host ' CREDENTIAL-LESS TENANT SELECTION' -ForegroundColor Red
    Write-Host '===============================================================' -ForegroundColor Red
    Write-Host ' Anyone who reaches the API port may name any clinic in the' -ForegroundColor Yellow
    Write-Host ' x-organization-id header with no token. Reads only: the API' -ForegroundColor Yellow
    Write-Host ' refuses such writes while the HTTP server is listening.' -ForegroundColor Yellow
    Write-Host ' Never do this on a shared or reachable host.' -ForegroundColor Yellow
    Write-Host " One file only: $headerOrgTarget" -ForegroundColor Yellow
    Write-Host ''
    Add-EnvBlock -Path $headerOrgTarget -Block $headerOrgFlag -Marker $headerOrgFlagName -Label 'header-org flag'
} else {
    Write-Host "  $headerOrgFlagName was NOT armed. That is the safe default." -ForegroundColor Cyan
    Write-Host '  It lets a caller pick a clinic with no credential at all. Arm it' -ForegroundColor DarkGray
    Write-Host '  for local work only, and on purpose:' -ForegroundColor DarkGray
    Write-Host '      ... -File .\apply-dev-env.ps1 -AllowHeaderOrg' -ForegroundColor DarkGray

    if ($alreadyArmed.Count -gt 0) {
        Write-Host ''
        Write-Host " WARNING: $headerOrgFlagName is already present in:" -ForegroundColor Red
        foreach ($path in $alreadyArmed) {
            Write-Host "   $path" -ForegroundColor Red
        }
        Write-Host ' An earlier version of this script wrote it into every env file.' -ForegroundColor Red
        Write-Host ' Delete that line unless you know you need it.' -ForegroundColor Red
    }
}

# Token signing secret: without it the server refuses to start in production.
$apiEnvPath = Join-Path $projectRoot 'apps\api\.env'
$apiEnv = Read-EnvFileText -Path $apiEnvPath
if ($null -ne $apiEnv) {
    if ($apiEnv -notmatch 'AUTH_TOKEN_SECRET\s*=\s*\S') {
        # Cryptographic RNG, not Get-Random: Get-Random is a clock-seeded PRNG, and a
        # guessable AUTH_TOKEN_SECRET lets anyone forge a clinic token, which is
        # exactly the trust this secret is supposed to establish.
        $bytes = New-Object byte[] 48
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try {
            $rng.GetBytes($bytes)
        } finally {
            $rng.Dispose()
        }
        $generated = [Convert]::ToBase64String($bytes).TrimEnd('=')
        [System.IO.File]::AppendAllText($apiEnvPath, "`r`nAUTH_TOKEN_SECRET=$generated`r`n", (New-Object System.Text.UTF8Encoding($false)))
        # The value itself is never printed.
        Write-Host ''
        Write-Host "  generated AUTH_TOKEN_SECRET in $apiEnvPath" -ForegroundColor Green
    }
}

Write-Host ''
Write-Host 'Done. Restart the API server so the flags take effect.' -ForegroundColor Cyan
Write-Host 'Production deployments need none of these: the server rejects them.' -ForegroundColor Yellow
