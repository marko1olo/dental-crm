@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ЭЛЕКТРОПИТАНИЕ И ФАЙЛ ПОДКАЧКИ

net session >nul 2>&1
if %errorlevel% equ 0 goto :RUN_ADMIN

echo Запрос прав администратора...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -NoExit -File \"\"C:\Clinic_MVP\dental-crm\scripts\host_tune_power_pagefile.ps1\"\"'"
exit /b

:RUN_ADMIN
powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "C:\Clinic_MVP\dental-crm\scripts\host_tune_power_pagefile.ps1"
