[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ОЧИСТКА ЗОМБИ-ПРОЦЕССОВ И СИСТЕМНОГО МУСОРА (DENTE CLEANUP)   " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Защита активных портов
$ports = @(4100, 5173, 5432)
$protectedPids = @($PID)

foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $protectedPids += [int]$conn.OwningProcess
        Write-Host " [OK] Порт $p активен (PID $($conn.OwningProcess) - защищен)" -ForegroundColor Green
    } else {
        Write-Host " [i] Порт $p свободен" -ForegroundColor DarkGray
    }
}

# Защита Antigravity, language_server, postgres
$systemProcs = Get-Process -Name "Antigravity", "language_server", "postgres" -ErrorAction SilentlyContinue
foreach ($sp in $systemProcs) {
    $protectedPids += $sp.Id
}

$killedCount = 0
$freedRamBytes = 0

$allProcs = Get-CimInstance Win32_Process

# 2. Поиск дублей dev-серверов
Write-Host ""
Write-Host "[1/3] Поиск дублей dev-серверов и фоновых вотчеров..." -ForegroundColor Yellow
$devNodes = $allProcs | Where-Object {
    ($_.Name -match "^(node|cmd|powershell)\.exe$") -and
    ($_.CommandLine -match "(@dental/api|@dental/web|tsx/dist/cli\.mjs watch|vite\.js)")
}

foreach ($dn in $devNodes) {
    if ($protectedPids -notcontains $dn.ProcessId) {
        Write-Host " [!] Завершение зависшего dev-процесса PID $($dn.ProcessId)..." -ForegroundColor Red
        $freedRamBytes += $dn.WorkingSetSize
        Stop-Process -Id $dn.ProcessId -Force -ErrorAction SilentlyContinue
        $killedCount++
    }
}

# 3. Поиск headless Chrome
Write-Host ""
Write-Host "[2/3] Поиск зомби-процессов Headless Chrome / Puppeteer..." -ForegroundColor Yellow
$chromeZombies = $allProcs | Where-Object {
    ($_.Name -eq "chrome.exe") -and
    ($_.CommandLine -match "(--headless|playwright_chromiumdev_profile|--remote-debugging-pipe|--type=crashpad-handler)")
}

foreach ($cz in $chromeZombies) {
    if ($protectedPids -notcontains $cz.ProcessId) {
        Write-Host " [!] Завершение зависшего Chrome PID $($cz.ProcessId)..." -ForegroundColor Red
        $freedRamBytes += $cz.WorkingSetSize
        Stop-Process -Id $cz.ProcessId -Force -ErrorAction SilentlyContinue
        $killedCount++
    }
}

# 4. Поиск зависших тестов
Write-Host ""
Write-Host "[3/3] Поиск зависших раннеров тестов..." -ForegroundColor Yellow
$testZombies = $allProcs | Where-Object {
    ($_.Name -eq "node.exe") -and
    ($_.CommandLine -match "(vitest/suppress-warnings|vitest run|test_direct_cbct)")
}

foreach ($tz in $testZombies) {
    if ($protectedPids -notcontains $tz.ProcessId) {
        Write-Host " [!] Завершение зависшего воркера тестов PID $($tz.ProcessId)..." -ForegroundColor Red
        $freedRamBytes += $tz.WorkingSetSize
        Stop-Process -Id $tz.ProcessId -Force -ErrorAction SilentlyContinue
        $killedCount++
    }
}

# 5. Очистка SQLite WAL
Write-Host ""
Write-Host "--- Очистка дискового мусора и сжатие WAL-файлов Antigravity ---" -ForegroundColor Yellow
$pyScript = "C:\Clinic_MVP\dental-crm\scripts\antigravity_maintenance.py"
if (Test-Path $pyScript) {
    & python $pyScript
}

$freedMB = [math]::Round($freedRamBytes / 1MB, 1)
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  [ГОТОВО] Завершено $killedCount зомби-процессов. Освобождено ~$freedMB МБ RAM." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
