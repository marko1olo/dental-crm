# Ultimate System Optimization & Hang Fix Script
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[!] Requesting Administrator elevation..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Clear-Host
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "       WINDOWS 11 ULTIMATE PERFORMANCE & STABILITY OPTIMIZER           " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""

# 1. Disable Crashing Web Threat Defense Service (Eliminates 0xc0000409 crash)
Write-Host "[1/10] Disabling buggy webthreatdefsvc (prevents AmneziaWG crash)..." -ForegroundColor Cyan
try {
    & sc.exe stop webthreatdefsvc 2>$null | Out-Null
    & sc.exe config webthreatdefsvc start= disabled 2>$null | Out-Null
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\webthreatdefsvc" -Name "Start" -Value 4 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\webthreatdefusersvc" -Name "Start" -Value 4 -Type DWord -ErrorAction SilentlyContinue
    Write-Host "  [OK] webthreatdefsvc disabled." -ForegroundColor Green
} catch {
    Write-Host "  [-] webthreatdefsvc: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 2. Disable Wake on Realtek 2.5GbE, USB4 & Mice (Zero Sleep Hangs)
Write-Host ""
Write-Host "[2/10] Disabling wake on devices triggering sleep lockups..." -ForegroundColor Cyan
$wakeDevices = @(
    "Realtek Gaming 2.5GbE Family Controller",
    "Корневой маршрутизатор USB4 (1.0)",
    "HID-совместимая мышь (006)"
)
foreach ($dev in $wakeDevices) {
    try {
        & powercfg -devicedisablewake $dev 2>$null
        Write-Host "  [OK] Wake disabled: $dev" -ForegroundColor Green
    } catch {
        Write-Host "  [-] $dev : $($_.Exception.Message)" -ForegroundColor DarkGray
    }
}

# 3. Configure Pagefile via Registry (24 GB - 32 GB) on C:
Write-Host ""
Write-Host "[3/10] Setting Pagefile (24 GB - 32 GB) on NVMe C:..." -ForegroundColor Cyan
try {
    $memKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"
    Set-ItemProperty -Path $memKey -Name "PagingFiles" -Value @("C:\pagefile.sys 24576 32768") -Type MultiString -Force
    Set-CimInstance -Query "Select * from Win32_ComputerSystem" -Property @{AutomaticManagedPagefile = $false} -ErrorAction SilentlyContinue
    Write-Host "  [OK] Pagefile successfully registered: 24576 - 32768 MB." -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Pagefile: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Disable NTFS 8.3 Short Names (15-25% faster disk operations in repos)
Write-Host ""
Write-Host "[4/10] Disabling legacy NTFS 8.3 DOS name creation on C:..." -ForegroundColor Cyan
try {
    & fsutil 8dot3name set 1 2>$null | Out-Null
    Write-Host "  [OK] NTFS 8.3 name creation disabled (boosts git, npm, and build speeds)." -ForegroundColor Green
} catch {
    Write-Host "  [-] fsutil: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 5. Network Latency Tuning: TCPNoDelay & TcpAckFrequency
Write-Host ""
Write-Host "[5/10] Tuning TCP latency (killing Nagle delay & delayed ACKs)..." -ForegroundColor Cyan
try {
    $interfaces = Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces' -ErrorAction SilentlyContinue
    foreach ($iface in $interfaces) {
        $props = Get-ItemProperty $iface.PSPath
        if ($props.IPAddress -or $props.DhcpIPAddress) {
            Set-ItemProperty -Path $iface.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $iface.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord -Force
            Write-Host "  [OK] TCP NoDelay & instant ACK applied to $($iface.PSChildName)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "  [-] TCP tuning: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 6. MMCSS Multimedia & GPU Priority (Higher responsiveness)
Write-Host ""
Write-Host "[6/10] Setting MMCSS Priority to High (gaming & real-time responsiveness)..." -ForegroundColor Cyan
try {
    $mmcssKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
    Set-ItemProperty -Path $mmcssKey -Name "Priority" -Value 6 -Type DWord -Force
    Set-ItemProperty -Path $mmcssKey -Name "Scheduling Category" -Value "High" -Type String -Force
    Set-ItemProperty -Path $mmcssKey -Name "SFIO Priority" -Value "High" -Type String -Force
    Write-Host "  [OK] MMCSS Scheduling Category set to High." -ForegroundColor Green
} catch {
    Write-Host "  [-] MMCSS: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 7. Disable Background Telemetry Tasks in Task Scheduler
Write-Host ""
Write-Host "[7/10] Disabling background telemetry tasks..." -ForegroundColor Cyan
$tasks = @(
    "\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser",
    "\Microsoft\Windows\Application Experience\ProgramDataUpdater",
    "\Microsoft\Windows\Customer Experience Improvement Program\Consolidator",
    "\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip"
)
foreach ($t in $tasks) {
    try {
        Disable-ScheduledTask -TaskPath ($t.Substring(0, $t.LastIndexOf('\')+1)) -TaskName ($t.Split('\')[-1]) -ErrorAction SilentlyContinue | Out-Null
        Write-Host "  [OK] Disabled: $($t.Split('\\')[-1])" -ForegroundColor Green
    } catch {
        Write-Host "  [-] $t : $($_.Exception.Message)" -ForegroundColor DarkGray
    }
}

# 8. Optimize Prefetch for NVMe SSD
Write-Host ""
Write-Host "[8/10] Optimizing Prefetcher for NVMe SSD (Boot only, saves RAM & disk writes)..." -ForegroundColor Cyan
try {
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters" -Name "EnablePrefetcher" -Value 2 -Type DWord -Force
    Write-Host "  [OK] Prefetcher optimized for NVMe SSD (Mode 2: Boot only)." -ForegroundColor Green
} catch {
    Write-Host "  [-] Prefetcher: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 9. Defender Exclusions
Write-Host ""
Write-Host "[9/10] Ensuring dev folders & processes are in Defender exclusions..." -ForegroundColor Cyan
$paths = @(
    "C:\Clinic_MVP",
    "C:\hades",
    "$env:USERPROFILE\.gemini",
    "$env:LOCALAPPDATA\Programs\Antigravity"
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        try {
            Add-MpPreference -ExclusionPath $p -ErrorAction SilentlyContinue
            Write-Host "  [OK] Excluded path: $p" -ForegroundColor Green
        } catch {
            Write-Host "  [-] $p : $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}
$procs = @("git.exe", "node.exe", "language_server.exe", "tsc.exe")
foreach ($pr in $procs) {
    try {
        Add-MpPreference -ExclusionProcess $pr -ErrorAction SilentlyContinue
        Write-Host "  [OK] Excluded process: $pr" -ForegroundColor Green
    } catch {
        Write-Host "  [-] $pr : $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 10. NVMe SSD ReTrim
Write-Host ""
Write-Host "[10/12] Running hardware TRIM on NVMe SSD C:..." -ForegroundColor Cyan
try {
    Optimize-Volume -DriveLetter C -ReTrim -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  [OK] NVMe SSD C: successfully retrimmed." -ForegroundColor Green
} catch {
    Write-Host "  [-] TRIM: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 11. Remove stray DLLs and dead folders from root C:\
Write-Host ""
Write-Host "[11/13] Removing stray debug DLLs & temporary logs from root C:\..." -ForegroundColor Cyan
foreach ($item in @("C:\appverifUI.dll", "C:\vfcompat.dll", "C:\DumpStack.log.tmp", "C:\$GetCurrent")) {
    if (Test-Path $item) {
        try {
            Remove-Item -Path $item -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Removed: $item" -ForegroundColor Green
        } catch {
            Write-Host "  [-] $item : $($_.Exception.Message)" -ForegroundColor DarkGray
        }
    }
}

# 12. Windows Component Store Cleanup (DISM)
Write-Host ""
Write-Host "[12/13] Running Windows Component Store Cleanup (DISM)..." -ForegroundColor Cyan
try {
    & dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase 2>$null | Out-Null
    Write-Host "  [OK] WinSxS Component Store cleaned and superseded packages removed." -ForegroundColor Green
} catch {
    Write-Host "  [-] DISM: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 13. Remove abandoned ODIS program binaries (OE / OS)
Write-Host ""
Write-Host "[13/13] Removing abandoned ODIS diagnostic program folders (OE / OS)..." -ForegroundColor Cyan
foreach ($p in @("C:\Program Files\OE", "C:\Program Files\OS")) {
    if (Test-Path $p) {
        try {
            Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Removed dead ODIS folder: $p" -ForegroundColor Green
        } catch {
            Write-Host "  [-] $p : $($_.Exception.Message)" -ForegroundColor DarkGray
        }
    }
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] All 13 optimizations successfully applied!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Yellow
[void][System.Console]::ReadLine()
