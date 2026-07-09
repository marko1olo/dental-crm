@echo off
cd /d "%~dp0"
echo Запуск DENTE CRM Launcher...
start "" powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "Launcher.ps1"
exit
