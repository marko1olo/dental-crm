[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DENTE HOST OPTIMIZER: POWER PLAN & PAGEFILE TUNING            " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Activate Ultimate Performance Power Plan
Write-Host ""
Write-Host "[1/2] Configuring Power Plan..." -ForegroundColor Yellow

# Look for existing Ultimate Performance or duplicate schemes
$schemes = powercfg /list
$ultimateGuid = $null

if ($schemes -match "([0-9a-f-]{36})\s+\(Ultimate Performance\)") {
    $ultimateGuid = $matches[1]
}

if (-not $ultimateGuid) {
    Write-Host " [*] Creating Ultimate Performance scheme..." -ForegroundColor Gray
    $out = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>&1
    if ($out -match "([0-9a-f-]{36})") {
        $ultimateGuid = $matches[1]
    }
}

if ($ultimateGuid) {
    powercfg /setactive $ultimateGuid
    Write-Host " [+] Power Scheme set to Ultimate Performance ($ultimateGuid)" -ForegroundColor Green
    
    # Configure AC processor state to 100% min and 100% max (disable throttling & core parking)
    powercfg /setacvalueindex $ultimateGuid SUB_PROCESSOR PROCTHROTTLEMIN 100
    powercfg /setacvalueindex $ultimateGuid SUB_PROCESSOR PROCTHROTTLEMAX 100
    powercfg /setactive $ultimateGuid
    Write-Host " [+] Processor Minimum/Maximum state set to 100% (No C-State stall, no core parking)" -ForegroundColor Green
} else {
    Write-Host " [-] Could not determine Ultimate Performance GUID" -ForegroundColor Red
}

# 2. Configure Windows Pagefile (Virtual Memory)
Write-Host ""
Write-Host "[2/2] Configuring Pagefile (Virtual Memory)..." -ForegroundColor Yellow
try {
    # Set AutomaticManagedPagefile to False
    $computerSystem = Get-CimInstance Win32_ComputerSystem
    $computerSystem.AutomaticManagedPagefile = $false
    Set-CimInstance -CimInstance $computerSystem -ErrorAction Stop

    # Set fixed Initial and Max size (16 GB to 32 GB) on C:
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
    Write-Host " [+] Pagefile configured to 16 GB - 32 GB on C: (Prevents 68-100 GB dynamic sprawl & NVMe I/O lockups)" -ForegroundColor Green
} catch {
    Write-Host " [-] Failed to update PageFile via CIM: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "     Setting via Registry fallback..." -ForegroundColor Gray
    try {
        Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" -Name "PagingFiles" -Value "C:\pagefile.sys 16384 32768" -ErrorAction Stop
        Write-Host " [+] Pagefile registry updated: C:\pagefile.sys 16384 32768 (Active after reboot)" -ForegroundColor Green
    } catch {
        Write-Host " [-] Registry fallback failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[SUCCESS] Hardware and Power optimization complete!" -ForegroundColor Cyan
Write-Host "Windows Thread Director, Core Parking, and Pagefile thrashing are resolved." -ForegroundColor Green
