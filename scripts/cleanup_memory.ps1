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

# 4. Kill zombie node processes (CPU=0, RAM > 200MB — завершились но не освободили память)
$zombieNodes = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.CPU -lt 1 -and $_.WorkingSet -gt 200MB
}
Write-Host "Found $($zombieNodes.Count) zombie node processes (CPU~0, RAM>200MB)."
foreach ($z in $zombieNodes) {
    $ramMB = [math]::Round($z.WorkingSet / 1MB, 0)
    Write-Host "  Killing zombie node PID $($z.Id) ($ramMB MB)..."
    Stop-Process -Id $z.Id -Force -ErrorAction SilentlyContinue
}

# 5. Clean Antigravity brain — удалить субагентский мусор (NO_TRANSCRIPT)
#    Безопасно: удаляются ТОЛЬКО папки без единого USER_INPUT в transcript.jsonl
$brainDir = "C:\Users\Admin\.gemini\antigravity\brain"
$currentConvFile = "$brainDir\.current_conv_id.txt"

# Пробуем получить текущий активный диалог из запущенного процесса (не удалять его)
$activeConvIds = @()
try {
    $lsLog = Get-Content "C:\Users\Admin\AppData\Roaming\Antigravity\logs\language_server.log" -Tail 50 -ErrorAction SilentlyContinue
    $cascadeIds = $lsLog | Select-String 'cascade_id:([0-9a-f-]{36})' | ForEach-Object {
        $_.Matches[0].Groups[1].Value
    }
    $trajectoryIds = $lsLog | Select-String 'trajectory_id:([0-9a-f-]{36})' | ForEach-Object {
        $_.Matches[0].Groups[1].Value
    }
    $activeConvIds = ($cascadeIds + $trajectoryIds) | Sort-Object -Unique
} catch {}

Write-Host ""
Write-Host "--- Antigravity Brain Cleanup ---"
Write-Host "Brain dir: $brainDir"
Write-Host "Active conversation IDs to protect: $($activeConvIds.Count)"

if (Test-Path $brainDir) {
    $allDirs = Get-ChildItem $brainDir -Directory
    $deleted = 0
    $skipped = 0
    $freedBytes = 0

    foreach ($dir in $allDirs) {
        # Защищаем активные диалоги
        if ($activeConvIds -contains $dir.Name) {
            $skipped++
            continue
        }

        $transcript = "$($dir.FullName)\.system_generated\logs\transcript.jsonl"

        $hasUserMessages = $false
        if (Test-Path $transcript) {
            # Быстрая проверка: есть ли USER_INPUT хоть где-нибудь в файле
            $hasUserMessages = (Select-String -Path $transcript -Pattern '"type"\s*:\s*"USER_INPUT"' -Quiet -ErrorAction SilentlyContinue)
        }

        if (-not $hasUserMessages) {
            $size = (Get-ChildItem $dir.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
            $freedBytes += $size
            Remove-Item -Path $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
            $deleted++
        } else {
            $skipped++
        }
    }

    $freedMB = [math]::Round($freedBytes / 1MB, 0)
    Write-Host "Brain cleanup: removed $deleted subagent dirs, kept $skipped user conversations (+$freedMB MB freed)"
} else {
    Write-Host "Brain dir not found, skipping."
}

Start-Sleep -Seconds 1

# 6. Report new memory state
$os = Get-CimInstance Win32_OperatingSystem
$totalRamGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$freeRamGB  = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$usedRamGB  = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 2)
$usedPercent = [math]::Round(($usedRamGB / $totalRamGB) * 100, 1)

Write-Host "================== MEMORY AFTER CLEANUP =================="
Write-Host "Physical RAM: Total = $totalRamGB GB | Used = $usedRamGB GB ($usedPercent%) | Free = $freeRamGB GB"

$remainingChromes = (Get-Process -Name chrome -ErrorAction SilentlyContinue).Count
$remainingNodes   = (Get-Process -Name node   -ErrorAction SilentlyContinue).Count
Write-Host "Remaining Chrome processes: $remainingChromes"
Write-Host "Remaining Node processes:   $remainingNodes"
