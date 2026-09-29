<#
.SYNOPSIS
    DENTE CRM - Automated Windows Defender Firewall Configuration for Clinic LAN Mesh
.DESCRIPTION
    Configures non-intrusive inbound firewall rules for DENTE CRM local network:
    - UDP 4101: Autonomous discovery beacons and cryptographic lease heartbeats
    - TCP 4100-4105: Local HTTP API for instant tablet pairing and mutation streaming
    - TCP 5432: PostgreSQL server port for clinic Master server
    
    SECURITY INVARIANT:
    Rules apply STRICTLY to 'Private' and 'Domain' network profiles.
    The 'Public' profile (untrusted / public Wi-Fi) is strictly blocked.
.PARAMETER Remove
    Removes DENTE CRM firewall rules.
.PARAMETER CheckOnly
    Checks current status of firewall rules without making modifications.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\lan-firewall-setup.ps1
    powershell -ExecutionPolicy Bypass -File .\scripts\lan-firewall-setup.ps1 -CheckOnly
    powershell -ExecutionPolicy Bypass -File .\scripts\lan-firewall-setup.ps1 -Remove
#>

[CmdletBinding()]
param(
    [switch]$Remove,
    [switch]$CheckOnly,
    [int]$UdpPort = 4101,
    [string[]]$TcpPorts = @("4100-4105", "5432"),
    [string]$RulePrefix = "DENTE-CRM-LAN-Mesh"
)

# Safe process-level execution policy bypass
try {
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue
} catch {
    # Ignore if restricted by Group Policy
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   DENTE CRM -- Clinic LAN Mesh Windows Firewall Configuration                 " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Administrator privilege check
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[!] NOTICE: Script is running without Administrator privileges." -ForegroundColor Yellow
    Write-Host "    Modifying Windows Defender Firewall rules requires elevation." -ForegroundColor Yellow
    Write-Host ""

    if ($CheckOnly) {
        Write-Host "[*] Proceeding in read-only audit mode (-CheckOnly)..." -ForegroundColor Gray
    } else {
        $choice = Read-Host "Relaunch with Administrator privileges (UAC prompt)? [Y/N]"
        if ($choice -match "^[Yy]") {
            Write-Host "[*] Relaunching with Administrator elevation..." -ForegroundColor Cyan
            $argList = "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`""
            if ($Remove) { $argList += " -Remove" }
            Start-Process powershell.exe -Verb RunAs -ArgumentList $argList
            exit 0
        } else {
            Write-Host "[-] Cancelled. To configure firewall, run PowerShell as Administrator." -ForegroundColor Red
            exit 1
        }
    }
}

$ruleUdpName = "$RulePrefix-UDP"
$ruleTcpName = "$RulePrefix-TCP"

# 2. CheckOnly mode
if ($CheckOnly) {
    Write-Host "[*] Auditing current Windows Firewall rules for DENTE CRM..." -ForegroundColor Cyan
    $existingUdp = Get-NetFirewallRule -Name $ruleUdpName -ErrorAction SilentlyContinue
    $existingTcp = Get-NetFirewallRule -Name $ruleTcpName -ErrorAction SilentlyContinue

    if ($existingUdp) {
        $portFilter = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $existingUdp -ErrorAction SilentlyContinue
        Write-Host "  [+] $ruleUdpName : CONFIGURED (Enabled: $($existingUdp.Enabled), Port: $($portFilter.LocalPort), Profiles: $($existingUdp.Profile -join ','))" -ForegroundColor Green
    } else {
        Write-Host "  [-] $ruleUdpName : NOT FOUND" -ForegroundColor Yellow
    }

    if ($existingTcp) {
        $portFilter = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $existingTcp -ErrorAction SilentlyContinue
        Write-Host "  [+] $ruleTcpName : CONFIGURED (Enabled: $($existingTcp.Enabled), Ports: $($portFilter.LocalPort -join ','), Profiles: $($existingTcp.Profile -join ','))" -ForegroundColor Green
    } else {
        Write-Host "  [-] $ruleTcpName : NOT FOUND" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "[*] Audit completed." -ForegroundColor Cyan
    exit 0
}

# 3. Remove mode
if ($Remove) {
    Write-Host "[*] Removing DENTE CRM Windows Firewall rules..." -ForegroundColor Yellow

    foreach ($name in @($ruleUdpName, $ruleTcpName)) {
        $rule = Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
        if ($rule) {
            Remove-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
            Write-Host "  [-] Removed firewall rule: $name" -ForegroundColor Yellow
        } else {
            Write-Host "  [.] Rule does not exist: $name" -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "[+] All DENTE CRM firewall rules successfully removed." -ForegroundColor Green
    exit 0
}

# 4. Idempotent rule configuration
Write-Host "[*] Configuring inbound firewall rules for clinic local network..." -ForegroundColor Cyan

# 4.1 Remove stale rules if present
foreach ($name in @($ruleUdpName, $ruleTcpName)) {
    if (Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue) {
        Remove-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
    }
}

# 4.2 Create UDP inbound rule (Beacons + Lease Heartbeats)
try {
    New-NetFirewallRule `
        -Name $ruleUdpName `
        -DisplayName "DENTE CRM - LAN Mesh Discovery and Heartbeat (UDP $UdpPort)" `
        -Description "Allows autonomous UDP peer discovery beacons and master lease heartbeats across clinic Wi-Fi and Ethernet." `
        -Direction Inbound `
        -Protocol UDP `
        -LocalPort $UdpPort `
        -Profile @("Private", "Domain") `
        -Action Allow `
        -Enabled True `
        -ErrorAction Stop | Out-Null

    Write-Host "  [+] UDP Rule Created: $ruleUdpName (Port $UdpPort, Profiles: Private, Domain)" -ForegroundColor Green
} catch {
    Write-Host "  [-] Error creating UDP rule: $_" -ForegroundColor Red
    exit 1
}

# 4.3 Create TCP inbound rule (HTTP Mesh Sync + PostgreSQL 5432)
try {
    New-NetFirewallRule `
        -Name $ruleTcpName `
        -DisplayName "DENTE CRM - LAN Mesh Sync and PostgreSQL (TCP $($TcpPorts -join ','))" `
        -Description "Allows doctor tablets and satellite workstations to sync mutations and access clinic database." `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $TcpPorts `
        -Profile @("Private", "Domain") `
        -Action Allow `
        -Enabled True `
        -ErrorAction Stop | Out-Null

    Write-Host "  [+] TCP Rule Created: $ruleTcpName (Ports $($TcpPorts -join ', '), Profiles: Private, Domain)" -ForegroundColor Green
} catch {
    Write-Host "  [-] Error creating TCP rule: $_" -ForegroundColor Red
    exit 1
}

# 5. Display local network interface summary
Write-Host ""
Write-Host "[*] Clinic Network Interface Summary:" -ForegroundColor Cyan
try {
    $adapters = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
        $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\.254\."
    }

    foreach ($ip in $adapters) {
        $alias = $ip.InterfaceAlias
        $addr = $ip.IPAddress
        $prefix = $ip.PrefixLength
        Write-Host "    - Interface: $alias -> IP: $addr/$prefix" -ForegroundColor White
    }
} catch {
    # Best-effort
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "   SUCCESS: Windows Firewall configured for DENTE CRM LAN Mesh.                 " -ForegroundColor Green
Write-Host "   Doctor tablets and workstations can now connect via clinic Wi-Fi / LAN.      " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
exit 0
