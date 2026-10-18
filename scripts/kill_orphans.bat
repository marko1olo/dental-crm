@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title DENTE HOST CLEANER: ОЧИСТКА ЗОМБИ И МУСОРА

echo ==================================================================
echo   DENTE HOST CLEANER: ОЧИСТКА ЗОМБИ И ДИСКОВОГО МУСОРА
echo ==================================================================
echo.

set SCRIPT_FILE=C:\Clinic_MVP\dental-crm\scripts\kill_orphans.ps1

if exist "%SCRIPT_FILE%" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_FILE%"
) else (
    echo [!] Ошибка: Файл %SCRIPT_FILE% не найден.
)

echo.
echo ==================================================================
echo   Очистка завершена. Нажмите любую клавишу для закрытия...
echo ==================================================================
pause >nul
