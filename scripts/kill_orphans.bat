@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ОЧИСТКА ЗОМБИ И ДИСКОВОГО МУСОРА

powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "C:\Clinic_MVP\dental-crm\scripts\kill_orphans.ps1"
