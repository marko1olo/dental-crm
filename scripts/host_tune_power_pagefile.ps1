[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  НАСТРОЙКА ЭЛЕКТРОПИТАНИЯ И ФАЙЛА ПОДКАЧКИ (HOST OPTIMIZER)   " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Схема электропитания: Максимальная производительность (Ultimate Performance)
Write-Host ""
Write-Host "[1/2] Настройка схемы электропитания..." -ForegroundColor Yellow

$schemes = powercfg /list
$ultimateGuid = $null

if ($schemes -match "([0-9a-f-]{36})\s+\(Ultimate Performance\)") {
    $ultimateGuid = $matches[1]
}

if (-not $ultimateGuid) {
    Write-Host " [*] Создание схемы 'Максимальная производительность'..." -ForegroundColor Gray
    $out = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>&1
    if ($out -match "([0-9a-f-]{36})") {
        $ultimateGuid = $matches[1]
    }
}

if ($ultimateGuid) {
    powercfg /setactive $ultimateGuid
    Write-Host " [+] Схема электропитания: Максимальная производительность ($ultimateGuid)" -ForegroundColor Green
    
    # 100% min и max процессорного состояния от сети (отключение троттлинга и парковки ядер)
    powercfg /setacvalueindex $ultimateGuid SUB_PROCESSOR PROCTHROTTLEMIN 100
    powercfg /setacvalueindex $ultimateGuid SUB_PROCESSOR PROCTHROTTLEMAX 100
    powercfg /setactive $ultimateGuid
    Write-Host " [+] Минимальное/Максимальное состояние процессора: 100% (парковка ядер отключена)" -ForegroundColor Green
} else {
    Write-Host " [-] Не удалось получить GUID схемы электропитания" -ForegroundColor Red
}

# 2. Настройка файла подкачки (Pagefile)
Write-Host ""
Write-Host "[2/2] Фиксация размера файла подкачки (16 ГБ - 32 ГБ)..." -ForegroundColor Yellow
try {
    # Отключение автоматического управления размером файла подкачки
    $computerSystem = Get-CimInstance Win32_ComputerSystem
    $computerSystem.AutomaticManagedPagefile = $false
    Set-CimInstance -CimInstance $computerSystem -ErrorAction Stop

    # Фиксированный размер 16 ГБ (исходный) и 32 ГБ (максимальный) на диске C:
    $pageSetting = Get-CimInstance Win32_PageFileSetting -Filter "Name like 'C:%'" -ErrorAction SilentlyContinue
    if ($pageSetting) {
        $pageSetting.InitialSize = 16384
        $pageSetting.MaximumSize = 32768
        Set-CimInstance -CimInstance $pageSetting -ErrorAction Stop
    } else {
        New-CimInstance -ClassName Win32_PageFileSetting -Property @{
            Name = "C:\pagefile.sys"
            InitialSize = 16384
            MaximumSize = 32768
        } -ErrorAction Stop | Out-Null
    }
    Write-Host " [+] Файл подкачки зафиксирован: 16 ГБ - 32 ГБ на диске C:" -ForegroundColor Green
    Write-Host "     (Предотвращает раздувание до 100+ ГБ и зависание диска NVMe)" -ForegroundColor DarkGray
} catch {
    Write-Host " [-] Ошибка обновления через CIM: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "     Применение через реестр..." -ForegroundColor Gray
    try {
        Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -Name "PagingFiles" -Value "C:\pagefile.sys 16384 32768" -ErrorAction Stop
        Write-Host " [+] Реестр обновлен: C:\pagefile.sys 16384 32768 (вступит в силу после перезагрузки)" -ForegroundColor Green
    } catch {
        Write-Host " [-] Ошибка записи в реестр: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  [УСПЕХ] Настройки электропитания и памяти применены!         " -ForegroundColor Green
Write-Host "  Файл подкачки зафиксирован (активируется после перезагрузки).  " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Нажмите Enter для завершения..." -ForegroundColor Yellow
$null = Read-Host
