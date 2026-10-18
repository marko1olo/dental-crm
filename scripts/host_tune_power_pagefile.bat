@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title ОПТИМИЗАЦИЯ СИСТЕМЫ: ЭЛЕКТРОПИТАНИЕ И ФАЙЛ ПОДКАЧКИ

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [i] Запрос прав администратора (UAC)...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k chcp 65001 >nul & ""%~f0"" elevated' -Verb RunAs"
    exit /b
)

echo ==================================================================
echo   DENTE HOST OPTIMIZER: ЭЛЕКТРОПИТАНИЕ И ФАЙЛ ПОДКАЧКИ
echo ==================================================================
echo.

set SCRIPT_FILE=C:\Clinic_MVP\dental-crm\scripts\host_tune_power_pagefile.ps1

if exist "%SCRIPT_FILE%" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_FILE%"
) else (
    echo [!] Ошибка: Файл %SCRIPT_FILE% не найден.
)

echo.
echo ==================================================================
echo   Настройка завершена. Нажмите любую клавишу для закрытия...
echo ==================================================================
pause >nul
