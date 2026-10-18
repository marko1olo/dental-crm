[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DENTE HOST PROCESS INQUISITOR: ORPHAN & ZOMBIE CLEANER        " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Identify active listening ports and protect legitimate servers
$ports = @(4100, 5173, 5432)
$protectedPids = [System.Collections.Generic.HashSet[int]]::new()

# Always protect current script process and its parent
[void]$protectedPids.Add($PID)

$allProcs = Get-CimInstance Win32_Process

foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $ownerPid = [int]$conn.OwningProcess
        if ($ownerPid -gt 0) {
            [void]$protectedPids.Add($ownerPid)
            
            # Add ancestors of the listening process to protected list
            $curr = $allProcs | Where-Object { $_.ProcessId -eq $ownerPid }
            while ($curr -and $curr.ParentProcessId -gt 0) {
                [void]$protectedPids.Add($curr.ParentProcessId)
                $curr = $allProcs | Where-Object { $_.ProcessId -eq $curr.ParentProcessId }
            }
            
            # Also protect direct children
            $children = $allProcs | Where-Object { $_.ParentProcessId -eq $ownerPid }
            foreach ($ch in $children) {
                [void]$protectedPids.Add($ch.ProcessId)
            }
            
            Write-Host " [OK] Port $port is actively served by PID $ownerPid (Protected)" -ForegroundColor Green
        }
    } else {
        Write-Host " [i] Port $port is currently free" -ForegroundColor DarkGray
    }
}

# Always protect Antigravity and language_server
$coreProcs = Get-Process -Name "Antigravity", "language_server" -ErrorAction SilentlyContinue
foreach ($cp in $coreProcs) {
    [void]$protectedPids.Add($cp.Id)
}

$killedCount = 0
$freedRamBytes = 0

# Refresh process list
$allProcs = Get-CimInstance Win32_Process

# 2. Kill duplicate API / Web / tsx watcher instances NOT in protected list
Write-Host ""
Write-Host "--- Scanning for duplicate dev servers and orphaned watchers ---" -ForegroundColor Yellow
$devNodes = $allProcs | Where-Object {
    ($_.Name -match "^(node|cmd|powershell).exe$") -and
    ($_.CommandLine -match "(@dental/api|@dental/web|tsx/dist/cli\.mjs watch|vite\.js)")
}

foreach ($dn in $devNodes) {
    if (-not $protectedPids.Contains($dn.ProcessId)) {
        Write-Host " [!] Terminating duplicate/orphaned dev process PID $($dn.ProcessId) ($($dn.Name))..." -ForegroundColor Red
        $freedRamBytes += $dn.WorkingSetSize
        taskkill.exe /F /T /PID $dn.ProcessId 2>&1 | Out-Null
        $killedCount++
    }
}

# 3. Kill abandoned headless Chrome / Playwright instances
Write-Host ""
Write-Host "--- Scanning for abandoned headless Chrome / Puppeteer instances ---" -ForegroundColor Yellow
$chromeZombies = $allProcs | Where-Object {
    ($_.Name -eq "chrome.exe") -and
    ($_.CommandLine -match "(--headless|playwright_chromiumdev_profile|--remote-debugging-pipe|--type=crashpad-handler)")
}

foreach ($cz in $chromeZombies) {
    if (-not $protectedPids.Contains($cz.ProcessId)) {
        Write-Host " [!] Terminating abandoned Chrome PID $($cz.ProcessId)..." -ForegroundColor Red
        $freedRamBytes += $cz.WorkingSetSize
        taskkill.exe /F /T /PID $cz.ProcessId 2>&1 | Out-Null
        $killedCount++
    }
}

# 4. Kill dead test runners and dangling Vitest forks
Write-Host ""
Write-Host "--- Scanning for hanging test runners ---" -ForegroundColor Yellow
$testZombies = $allProcs | Where-Object {
    ($_.Name -eq "node.exe") -and
    ($_.CommandLine -match "(vitest/suppress-warnings|vitest run|test_direct_cbct)")
}

foreach ($tz in $testZombies) {
    if (-not $protectedPids.Contains($tz.ProcessId)) {
        Write-Host " [!] Terminating lingering test worker PID $($tz.ProcessId)..." -ForegroundColor Red
        $freedRamBytes += $tz.WorkingSetSize
        taskkill.exe /F /T /PID $tz.ProcessId 2>&1 | Out-Null
        $killedCount++
    }
}

$freedMB = [math]::Round($freedRamBytes / 1MB, 1)
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  CLEANUP COMPLETE: Terminated $killedCount processes. Freed ~$freedMB MB RAM. " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
