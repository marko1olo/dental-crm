@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: DENTE Dental CRM — Service Runner & Diagnostic Launcher
:: ============================================================================

cd /d "%~dp0.."
set "BASE=%CD%"

echo [DENTE Runner] Base directory: %BASE%
echo [DENTE Runner] Checking PostgreSQL and port configuration...

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%BASE%\scripts\db-preflight.ps1" -StartPostgres
if %ERRORLEVEL% NEQ 0 (
    echo [DENTE Runner] ERROR: Database preflight failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo [DENTE Runner] Starting Node.js Service Bootstrap...
"%BASE%\bin\node\node.exe" --max-old-space-size=2048 "%BASE%\scripts\service-bootstrap.mjs"
exit /b %ERRORLEVEL%
