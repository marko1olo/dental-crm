<#
.SYNOPSIS
    DENTE Dental CRM — Windows Installer Build & Packaging Orchestrator
.DESCRIPTION
    Automates the packaging of DenteSetup.exe using Inno Setup 6:
    1. Verifies prerequisites: apps/api/dist, apps/web/dist, WinSW v3.0, portable Node.js and PostgreSQL.
    2. Stages portable binaries if not present.
    3. Locates Inno Setup 6 Compiler (ISCC.exe).
    4. Compiles DenteSetup.iss into dist\installer\DenteSetup.exe.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild
)

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
if (-not $scriptRoot) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$repoRoot = (Resolve-Path (Join-Path $scriptRoot "..\..")).Path

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "         DENTE Dental CRM - Packaging Windows Distribution (Inno Setup 6)      " -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan

# 1. Check or build API and Web packages
$apiDist = Join-Path $repoRoot "apps\api\dist"
$webDist = Join-Path $repoRoot "apps\web\dist"
$sharedDist = Join-Path $repoRoot "packages\shared\dist"

if (-not $SkipBuild) {
    Write-Host "[1/4] Checking compiled bundles..." -ForegroundColor Green
    if (-not (Test-Path (Join-Path $apiDist "server.js"))) {
        Write-Host "Compiling @dental/shared and @dental/api..." -ForegroundColor Yellow
        Push-Location $repoRoot
        try {
            npm run build -w @dental/shared
            npm run build -w @dental/api
        } finally {
            Pop-Location
        }
    }
    if (-not (Test-Path (Join-Path $webDist "index.html"))) {
        Write-Host "Compiling @dental/web SPA client..." -ForegroundColor Yellow
        Push-Location $repoRoot
        try {
            npm run build -w @dental/web
        } finally {
            Pop-Location
        }
    }
}

# 2. Check staging directory for portable runtimes
Write-Host "[2/4] Verifying portable runtime packages..." -ForegroundColor Green
$binDir = Join-Path $scriptRoot "bin"
$winswDir = Join-Path $binDir "winsw"
$nodeDir = Join-Path $binDir "node"
$pgDir = Join-Path $binDir "postgres"

if (-not (Test-Path $winswDir)) { New-Item -ItemType Directory -Path $winswDir -Force | Out-Null }
if (-not (Test-Path $nodeDir)) { New-Item -ItemType Directory -Path $nodeDir -Force | Out-Null }
if (-not (Test-Path $pgDir)) { New-Item -ItemType Directory -Path $pgDir -Force | Out-Null }

# Check Node.js
$nodeExe = Join-Path $nodeDir "node.exe"
if (-not (Test-Path $nodeExe)) {
    $sysNode = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if ($sysNode -and (Test-Path $sysNode)) {
        Write-Host "Staging local Node.js from $sysNode..." -ForegroundColor Gray
        Copy-Item -Path $sysNode -Destination $nodeExe -Force
    }
}

# Check WinSW
$winswExe = Join-Path $winswDir "WinSW-x64.exe"
if (-not (Test-Path $winswExe)) {
    Write-Host "Notice: Place WinSW-x64.exe (v3.0) into '$winswDir' for standalone packaging." -ForegroundColor Yellow
}

# Check PostgreSQL
$pgBin = Join-Path $pgDir "bin"
if (-not (Test-Path (Join-Path $pgBin "postgres.exe"))) {
    $embeddedPg = Join-Path $repoRoot "node_modules\@embedded-postgres\windows-x64\native"
    if (Test-Path (Join-Path $embeddedPg "bin\postgres.exe")) {
        Write-Host "Staging PostgreSQL 18 binaries from embedded package..." -ForegroundColor Gray
        Copy-Item -Path "$embeddedPg\*" -Destination $pgDir -Recurse -Force
    }
}

# 3. Locate ISCC.exe
Write-Host "[3/4] Locating Inno Setup 6 compiler (ISCC.exe)..." -ForegroundColor Green
$isccCandidates = @(
    "ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "C:\InnoSetup6\ISCC.exe"
)

$isccPath = $null
foreach ($cand in $isccCandidates) {
    if (Get-Command $cand -ErrorAction SilentlyContinue) {
        $isccPath = (Get-Command $cand).Source
        break
    } elseif (Test-Path $cand) {
        $isccPath = (Resolve-Path $cand).Path
        break
    }
}

if (-not $isccPath) {
    Write-Host "-------------------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "Inno Setup 6 compiler (ISCC.exe) was not found on this workstation." -ForegroundColor Yellow
    Write-Host "Install Inno Setup 6 from https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    Write-Host "Or install via winget: winget install JRSoftware.InnoSetup" -ForegroundColor Yellow
    Write-Host "Once installed, run this script again or execute: ISCC.exe DenteSetup.iss" -ForegroundColor Yellow
    Write-Host "-------------------------------------------------------------------------------" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found Inno Setup Compiler: $isccPath" -ForegroundColor Green

# 4. Compile installer
Write-Host "[4/4] Compiling DenteSetup.iss..." -ForegroundColor Green
$issFile = Join-Path $scriptRoot "DenteSetup.iss"

$distDir = Join-Path $repoRoot "dist\installer"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$proc = Start-Process -FilePath $isccPath -ArgumentList $issFile -NoNewWindow -Wait -PassThru

if ($proc.ExitCode -eq 0) {
    Write-Host "===============================================================================" -ForegroundColor Green
    Write-Host " SUCCESS: DENTE Dental CRM installer compiled!" -ForegroundColor Green
    Write-Host " Target: $distDir\DenteSetup.exe" -ForegroundColor Green
    Write-Host "===============================================================================" -ForegroundColor Green
    exit 0
} else {
    Write-Host "ISCC failed with exit code $($proc.ExitCode)" -ForegroundColor Red
    exit $proc.ExitCode
}
