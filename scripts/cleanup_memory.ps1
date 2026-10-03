[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================== RECLAIMING SYSTEM MEMORY =================="

# 1. Terminate hanging / orphaned test_direct_cbct scripts
$hangingNodes = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
    $cmd -match 'test_direct_cbct\.cjs'
}
Write-Host "Found $($hangingNodes.Count) hanging node test scripts."
foreach ($n in $hangingNodes) {
    Write-Host "Killing Node PID $($n.Id)..."
    Stop-Process -Id $n.Id -Force -ErrorAction SilentlyContinue
}

# 2. Terminate all headless Playwright Chrome instances
$pwChromes = Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object {
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
    $cmd -match 'playwright_chromiumdev_profile|--remote-debugging-pipe'
}
Write-Host "Found $($pwChromes.Count) headless Playwright Chrome processes."
foreach ($c in $pwChromes) {
    Write-Host "Killing Playwright Chrome PID $($c.Id)..."
    Stop-Process -Id $c.Id -Force -ErrorAction SilentlyContinue
}

# 3. Clean up unlocked temp playwright directories
$tempDir = [System.IO.Path]::GetTempPath()
$pwProfiles = Get-ChildItem -Path $tempDir -Filter "playwright_chromiumdev_profile-*" -Directory -ErrorAction SilentlyContinue
Write-Host "Found $($pwProfiles.Count) stale Playwright profile directories in Temp."
$deletedCount = 0
foreach ($dir in $pwProfiles) {
    try {
        Remove-Item -Path $dir.FullName -Recurse -Force -ErrorAction Stop
        $deletedCount++
    } catch {
        # Directory might be locked by another active process
    }
}
Write-Host "Deleted $deletedCount stale profile directories."

Start-Sleep -Seconds 1

# 4. Report new memory state
$os = Get-CimInstance Win32_OperatingSystem
$totalRamGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$freeRamGB  = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$usedRamGB  = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 2)
$usedPercent = [math]::Round(($usedRamGB / $totalRamGB) * 100, 1)

Write-Host "================== MEMORY AFTER CLEANUP =================="
Write-Host "Physical RAM: Total = $totalRamGB GB | Used = $usedRamGB GB ($usedPercent%) | Free = $freeRamGB GB"

$remainingChromes = (Get-Process -Name chrome -ErrorAction SilentlyContinue).Count
Write-Host "Remaining Chrome processes on system: $remainingChromes"
