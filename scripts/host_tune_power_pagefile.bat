@echo off
setlocal
cd /d "%~dp0"
title DENTE HOST OPTIMIZER - POWER & PAGEFILE

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [i] Zapros prav administratora (UAC)...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k ""%~f0" elevated"' -Verb RunAs"
    exit /b
)

echo ==================================================================
echo   DENTE HOST OPTIMIZER: POWER PLAN & PAGEFILE TUNING
echo ==================================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0host_tune_power_pagefile.ps1"

echo.
echo ==================================================================
echo   Nastrojka zavershena. Nazhmite lyubuyu klavishu dlya vyhoda.
echo ==================================================================
pause
