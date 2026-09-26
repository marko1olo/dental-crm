@echo off
@chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: DENTE Dental CRM — Консоль управления службой Windows
:: ============================================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [DENTE Service Manager] ОШИБКА: Требуются права Администратора!
    echo Запустите данный командный файл от имени администратора.
    echo (Щелкните правой кнопкой мыши и выберите "Запуск от имени администратора").
    echo.
    pause
    exit /b 1
)

:MENU
cls
echo ===============================================================================
echo                 DENTE Dental CRM — Управление службой Windows
echo ===============================================================================
echo.
echo Проверка фактического состояния службы...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$port = 4000; " ^
    "$envFile = Join-Path $env:ProgramData 'DenteCRM\dente.env'; " ^
    "if (Test-Path $envFile) { " ^
    "    $m = Select-String -Path $envFile -Pattern '^PORT=(\d+)' | Select-Object -First 1; " ^
    "    if ($m) { $port = [int]$m.Matches.Groups[1].Value } " ^
    "}; " ^
    "$svc = Get-Service -Name 'DenteService', 'DenteCRMService' -ErrorAction SilentlyContinue | Select-Object -First 1; " ^
    "if (-not $svc) { " ^
    "    Write-Host '  Состояние: Служба не установлена' -ForegroundColor Yellow; " ^
    "} elseif ($svc.Status -eq 'Running') { " ^
    "    $tcpOk = $false; " ^
    "    try { " ^
    "        $client = New-Object System.Net.Sockets.TcpClient; " ^
    "        $iar = $client.BeginConnect('127.0.0.1', $port, $null, $null); " ^
    "        if ($iar.AsyncWaitHandle.WaitOne(600, $false)) { " ^
    "            $client.EndConnect($iar); " ^
    "            $tcpOk = $true; " ^
    "        }; " ^
    "        $client.Close(); " ^
    "    } catch {}; " ^
    "    if ($tcpOk) { " ^
    "        Write-Host '  Состояние: Работает (Порт ' -NoNewline -ForegroundColor White; " ^
    "        Write-Host $port -NoNewline -ForegroundColor Green; " ^
    "        Write-Host ')' -ForegroundColor White; " ^
    "    } else { " ^
    "        Write-Host '  Состояние: Ошибка запуска' -ForegroundColor Red; " ^
    "    }; " ^
    "} elseif ($svc.Status -eq 'Stopped') { " ^
    "    Write-Host '  Состояние: Остановлена' -ForegroundColor Gray; " ^
    "} else { " ^
    "    Write-Host '  Состояние: Ошибка запуска' -ForegroundColor Red; " ^
    "}; " ^
    "if ($svc) { Write-Host ('  Служба:    ' + $svc.Name + ' (' + $svc.DisplayName + ')') -ForegroundColor DarkGray }"
echo.
echo -------------------------------------------------------------------------------
echo [1] Проверить фактический статус службы (Get-Service)
echo [2] Запустить службу (Start)
echo [3] Остановить службу (Stop)
echo [4] Перезапустить службу (Restart)
echo [5] Открыть папку журналов (Logs)
echo [6] Открыть DENTE CRM в веб-браузере
echo [7] Выход
echo -------------------------------------------------------------------------------
echo.
set /p "CHOICE=Выберите действие (1-7): "

if "%CHOICE%"=="1" (
    echo.
    echo --- Подробная диагностика службы ---
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$port = 4000; " ^
        "$envFile = Join-Path $env:ProgramData 'DenteCRM\dente.env'; " ^
        "if (Test-Path $envFile) { " ^
        "    $m = Select-String -Path $envFile -Pattern '^PORT=(\d+)' | Select-Object -First 1; " ^
        "    if ($m) { $port = [int]$m.Matches.Groups[1].Value } " ^
        "}; " ^
        "$svc = Get-Service -Name 'DenteService', 'DenteCRMService' -ErrorAction SilentlyContinue | Select-Object -First 1; " ^
        "if (-not $svc) { " ^
        "    Write-Host 'Статус: Служба DenteService / DenteCRMService не найдена в реестре Windows.' -ForegroundColor Yellow; " ^
        "} else { " ^
        "    Write-Host ('Служба:      ' + $svc.Name) -ForegroundColor White; " ^
        "    Write-Host ('Отображение: ' + $svc.DisplayName) -ForegroundColor White; " ^
        "    Write-Host ('Тип запуска: ' + $svc.StartType) -ForegroundColor White; " ^
        "    if ($svc.Status -eq 'Running') { " ^
        "        $tcpOk = $false; " ^
        "        try { " ^
        "            $client = New-Object System.Net.Sockets.TcpClient; " ^
        "            $iar = $client.BeginConnect('127.0.0.1', $port, $null, $null); " ^
        "            if ($iar.AsyncWaitHandle.WaitOne(800, $false)) { " ^
        "                $client.EndConnect($iar); " ^
        "                $tcpOk = $true; " ^
        "            }; " ^
        "            $client.Close(); " ^
        "        } catch {}; " ^
        "        if ($tcpOk) { " ^
        "            Write-Host 'Фактический статус: Работает (Порт ' -NoNewline -ForegroundColor White; " ^
        "            Write-Host $port -NoNewline -ForegroundColor Green; " ^
        "            Write-Host ')' -ForegroundColor White; " ^
        "        } else { " ^
        "            Write-Host 'Фактический статус: Ошибка запуска (Служба в диспетчере активна, но порт не отвечает)' -ForegroundColor Red; " ^
        "        }; " ^
        "    } elseif ($svc.Status -eq 'Stopped') { " ^
        "        Write-Host 'Фактический статус: Остановлена' -ForegroundColor Yellow; " ^
        "    } else { " ^
        "        Write-Host ('Фактический статус: Ошибка запуска (' + $svc.Status + ')') -ForegroundColor Red; " ^
        "    }; " ^
        "}"
    echo.
    pause
    goto MENU
)
if "%CHOICE%"=="2" (
    echo.
    echo Запуск службы DENTE CRM...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$svc = Get-Service -Name 'DenteService', 'DenteCRMService' -ErrorAction SilentlyContinue | Select-Object -First 1; " ^
        "if ($svc) { Start-Service -Name $svc.Name; Write-Host ('Служба ' + $svc.Name + ' успешно запущена.') -ForegroundColor Green } " ^
        "else { Write-Host 'Служба не найдена!' -ForegroundColor Red }"
    pause
    goto MENU
)
if "%CHOICE%"=="3" (
    echo.
    echo Остановка службы DENTE CRM...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$svc = Get-Service -Name 'DenteService', 'DenteCRMService' -ErrorAction SilentlyContinue | Select-Object -First 1; " ^
        "if ($svc) { Stop-Service -Name $svc.Name -Force; Write-Host ('Служба ' + $svc.Name + ' остановлена.') -ForegroundColor Yellow } " ^
        "else { Write-Host 'Служба не найдена!' -ForegroundColor Red }"
    pause
    goto MENU
)
if "%CHOICE%"=="4" (
    echo.
    echo Перезапуск службы DENTE CRM...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$svc = Get-Service -Name 'DenteService', 'DenteCRMService' -ErrorAction SilentlyContinue | Select-Object -First 1; " ^
        "if ($svc) { Restart-Service -Name $svc.Name -Force; Write-Host ('Служба ' + $svc.Name + ' успешно перезапущена.') -ForegroundColor Green } " ^
        "else { Write-Host 'Служба не найдена!' -ForegroundColor Red }"
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
