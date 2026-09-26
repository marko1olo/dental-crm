@echo off
setlocal
:: ============================================================================
:: DENTE Dental CRM — Service Management Console
:: ============================================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [DENTE Service Manager] Administrative privileges required.
    echo Right-click this script and select "Run as administrator".
    pause
    exit /b 1
)

:MENU
cls
echo ===============================================================================
echo                 DENTE Dental CRM — Управление службой Windows
echo ===============================================================================
echo.
echo [1] Проверить статус службы (DenteCRMService)
echo [2] Запустить службу (Start)
echo [3] Остановить службу (Stop)
echo [4] Перезапустить службу (Restart)
echo [5] Открыть журналы (Logs)
echo [6] Открыть DENTE CRM в браузере
echo [7] Выход
echo.
set /p "CHOICE=Выберите действие (1-7): "

if "%CHOICE%"=="1" (
    sc query DenteCRMService
    pause
    goto MENU
)
if "%CHOICE%"=="2" (
    net start DenteCRMService
    pause
    goto MENU
)
if "%CHOICE%"=="3" (
    net stop DenteCRMService
    pause
    goto MENU
)
if "%CHOICE%"=="4" (
    net stop DenteCRMService
    timeout /t 2 /nobreak >nul
    net start DenteCRMService
    pause
    goto MENU
)
if "%CHOICE%"=="5" (
    explorer "%ProgramData%\DenteCRM\logs"
    goto MENU
)
if "%CHOICE%"=="6" (
    call "%~dp0open-dente.cmd"
    goto MENU
)
if "%CHOICE%"=="7" (
    exit /b 0
)

goto MENU
