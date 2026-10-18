[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DENTE HOST PROCESS INQUISITOR: PRIORITY & AFFINITY TUNER      " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Elevate / Protect Antigravity IDE UI
$agProcs = Get-Process -Name "Antigravity" -ErrorAction SilentlyContinue
foreach ($p in $agProcs) {
    try {
        if ($p.PriorityClass -eq [System.Diagnostics.ProcessPriorityClass]::Idle) {
            $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Normal
            Write-Host " [+] Rescued Antigravity PID $($p.Id) from Idle -> Normal priority" -ForegroundColor Green
        }
    } catch {}
}

# 2. Lower priority of background compilers and test runners to BelowNormal
$heavyWorkers = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
    $cmd -match "(tsc|vitest|playwright|puppeteer|biome|drizzle|capture_)"
}

foreach ($hw in $heavyWorkers) {
    try {
        if ($hw.PriorityClass -ne [System.Diagnostics.ProcessPriorityClass]::BelowNormal) {
            $hw.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal
            Write-Host " [+] Tuned compiler worker PID $($hw.Id) to BelowNormal priority (Anti-Stutter Active)" -ForegroundColor Yellow
        }
    } catch {}
}

Write-Host ""
Write-Host "Priority balancing complete. System UI is protected against heavy compilation lockouts." -ForegroundColor Cyan
