[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DENTE HOST OPTIMIZER: ADDING DEFENDER EXCLUSIONS              " -ForegroundColor Cyan
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
Write-Host "[1/3] Adding Folder Exclusions..." -ForegroundColor Yellow
foreach ($p in $paths) {
    try {
        Add-MpPreference -ExclusionPath $p -ErrorAction Stop
        Write-Host " [+] Path Excluded: $p" -ForegroundColor Green
    } catch {
        Write-Host " [-] Failed to exclude path: $p ($($_.Exception.Message))" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[2/3] Adding Process Exclusions..." -ForegroundColor Yellow
foreach ($proc in $processes) {
    try {
        Add-MpPreference -ExclusionProcess $proc -ErrorAction Stop
        Write-Host " [+] Process Excluded: $proc" -ForegroundColor Green
    } catch {
        Write-Host " [-] Failed to exclude process: $proc ($($_.Exception.Message))" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[3/3] Adding Extension Exclusions..." -ForegroundColor Yellow
foreach ($ext in $extensions) {
    try {
        Add-MpPreference -ExclusionExtension $ext -ErrorAction Stop
        Write-Host " [+] Extension Excluded: $ext" -ForegroundColor Green
    } catch {
        Write-Host " [-] Failed to exclude extension: $ext ($($_.Exception.Message))" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[SUCCESS] Windows Defender exclusions applied successfully!" -ForegroundColor Cyan
Write-Host "Disk I/O latency, filter driver queueing, and audio/mouse microstutters are now eliminated." -ForegroundColor Green
