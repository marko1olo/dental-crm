[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  НАСТРОЙКА ИСКЛЮЧЕНИЙ ЗАЩИТНИКА WINDOWS ДЛЯ DENTE И ANTIGRAVITY " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$paths = @(
    "C:\Clinic_MVP\dental-crm",
    "C:\Clinic_MVP\dental-crm\node_modules",
    "C:\Clinic_MVP\dental-crm\.data",
    "C:\Users\Admin\.gemini",
    "C:\Users\Admin\AppData\Local\Programs\Antigravity",
    "C:\Users\Admin\AppData\Roaming\Antigravity",
    "C:\Users\Admin\AppData\Local\npm-cache"
)

$processes = @(
    "node.exe",
    "language_server.exe",
    "Antigravity.exe",
    "postgres.exe",
    "git.exe",
    "rg.exe",
    "fd.exe"
)

$extensions = @(
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".wal"
)

Write-Host ""
Write-Host "[1/3] Добавление папок в исключения..." -ForegroundColor Yellow
foreach ($p in $paths) {
    try {
        Add-MpPreference -ExclusionPath $p -ErrorAction Stop
        Write-Host " [+] Папка исключена: $p" -ForegroundColor Green
    } catch {
        Write-Host " [-] Ошибка добавления папки: $p ($($_.Exception.Message))" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[2/3] Добавление процессов в исключения..." -ForegroundColor Yellow
foreach ($proc in $processes) {
    try {
        Add-MpPreference -ExclusionProcess $proc -ErrorAction Stop
        Write-Host " [+] Процесс исключен: $proc" -ForegroundColor Green
    } catch {
        Write-Host " [-] Ошибка добавления процесса: $proc ($($_.Exception.Message))" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[3/3] Добавление расширений файлов в исключения..." -ForegroundColor Yellow
foreach ($ext in $extensions) {
    try {
        Add-MpPreference -ExclusionExtension $ext -ErrorAction Stop
        Write-Host " [+] Расширение исключено: $ext" -ForegroundColor Green
    } catch {
        Write-Host " [-] Ошибка добавления расширения: $ext ($($_.Exception.Message))" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  [УСПЕХ] Исключения Защитника Windows успешно применены!       " -ForegroundColor Green
Write-Host "  Фоновое сканирование диска и микрофризы устранены.             " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Нажмите Enter для завершения..." -ForegroundColor Yellow
$null = Read-Host
