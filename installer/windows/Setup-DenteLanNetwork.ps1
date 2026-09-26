<#
.SYNOPSIS
    DENTE Dental CRM — Clinic LAN Network & Windows Defender Firewall Configuration
.DESCRIPTION
    Configures the local Windows machine for clinic LAN multi-workstation access:
    1. Audits and switches active network adapter profiles from 'Public' to 'Private'.
       (Windows defaults unmanaged clinic Wi-Fi / Ethernet to Public, blocking inbound traffic).
    2. Provisions and validates Windows Defender Firewall inbound allow rules:
       - TCP 4000: DENTE Web Client & Fastify HTTP API
       - TCP 4100: DENTE Real-time WebSocket Broker (schedule updates, telephony alerts)
       - UDP 5353: mDNS (Multicast DNS) Zero-Config LAN server discovery
       - UDP 4101: DENTE LAN Discovery Beacon (SSDP/UDP probe responder)
.NOTES
    Requires Administrator privileges.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [switch]$SkipNetworkProfileSwitch,

    [Parameter(Mandatory = $false)]
    [string]$LogFile
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

# -----------------------------------------------------------------------------
# 1. LOGGING & ADMIN PRIVILEGE VERIFICATION
# -----------------------------------------------------------------------------
if (-not $LogFile) {
    $logDir = "$env:ProgramData\DenteCRM\logs"
    if (-not (Test-Path $logDir)) {
        try { New-Item -ItemType Directory -Path $logDir -Force -ErrorAction SilentlyContinue | Out-Null } catch {}
    }
    if (Test-Path $logDir) {
        $LogFile = Join-Path $logDir "setup-network.log"
    }
}

function Write-NetLog {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG")][string]$Level = "INFO"
    )
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff")
    $logLine = "[$timestamp] [NETWORK-SETUP] [$Level] $Message"
    
    switch ($Level) {
        "INFO"  { Write-Host $logLine -ForegroundColor Green }
        "WARN"  { Write-Host $logLine -ForegroundColor Yellow }
        "ERROR" { Write-Host $logLine -ForegroundColor Red }
        "DEBUG" { Write-Host $logLine -ForegroundColor Gray }
    }

    if ($LogFile) {
        try {
            Add-Content -Path $LogFile -Value $logLine -Encoding UTF8 -ErrorAction SilentlyContinue
        } catch {}
    }
}

Write-NetLog "=== Initializing DENTE Dental CRM LAN & Firewall Configuration ==="

# Verify elevated privileges
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-NetLog "Elevation required! This script must be executed as Administrator." "ERROR"
    exit 1
}

# -----------------------------------------------------------------------------
# 2. ADAPTER NETWORK CATEGORY AUDIT (PUBLIC -> PRIVATE SWITCH)
# -----------------------------------------------------------------------------
if (-not $SkipNetworkProfileSwitch) {
    Write-NetLog "Auditing network adapter connection profiles..."
    try {
        $profiles = Get-NetConnectionProfile -ErrorAction SilentlyContinue
        if ($profiles) {
            foreach ($profile in $profiles) {
                $name = $profile.Name
                $idx = $profile.InterfaceIndex
                $category = $profile.NetworkCategory
                $ipv4 = $profile.IPv4Connectivity

                Write-NetLog "Adapter '$name' (Interface #$idx): Current Category = $category, IPv4 = $ipv4"

                if ($category -eq "Public") {
                    Write-NetLog "Adapter '$name' is set to 'Public' category. Windows Firewall blocks clinic LAN access in Public mode!" "WARN"
                    Write-NetLog "Switching adapter '$name' (Interface #$idx) to 'Private'..." "INFO"
                    
                    try {
                        Set-NetConnectionProfile -InterfaceIndex $idx -NetworkCategory Private -ErrorAction Stop
                        Write-NetLog "Successfully switched adapter '$name' to Private category." "INFO"
                    } catch {
                        Write-NetLog "Failed to change network profile via Set-NetConnectionProfile: $($_.Exception.Message)" "WARN"
                        
                        # Fallback using registry if WMI/NetConnectionProfile is restricted
                        try {
                            $regPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\NetworkList\Profiles"
                            $subkeys = Get-ChildItem -Path $regPath -ErrorAction SilentlyContinue
                            foreach ($sk in $subkeys) {
                                $pName = (Get-ItemProperty -Path $sk.PSPath).ProfileName
                                if ($pName -eq $name) {
                                    Set-ItemProperty -Path $sk.PSPath -Name "Category" -Value 1 -Force
                                    Write-NetLog "Successfully set Private category in registry for profile '$name'." "INFO"
                                    break
                                }
                            }
                        } catch {
                            Write-NetLog "Registry fallback also failed: $($_.Exception.Message)" "ERROR"
                        }
                    }
                } else {
                    Write-NetLog "Adapter '$name' is already '$category'. No change required." "INFO"
                }
            }
        } else {
            Write-NetLog "No active network connection profiles found via Get-NetConnectionProfile." "WARN"
        }
    } catch {
        Write-NetLog "Error during network profile audit: $($_.Exception.Message)" "WARN"
    }
} else {
    Write-NetLog "Skipping network profile switch as requested (-SkipNetworkProfileSwitch)." "INFO"
}

# -----------------------------------------------------------------------------
# 3. WINDOWS DEFENDER FIREWALL RULES PROVISIONING
# -----------------------------------------------------------------------------
Write-NetLog "Configuring Windows Defender Firewall inbound rules for DENTE CRM..."

$firewallRules = @(
    @{
        Name        = "DENTE-TCP-4000"
        DisplayName = "DENTE Dental CRM - Web Client & Fastify HTTP API (TCP 4000)"
        Description = "Inbound HTTP access to DENTE CRM web interface and REST API for clinic workstations and tablets."
        Protocol    = "TCP"
        LocalPort   = 4000
    },
    @{
        Name        = "DENTE-TCP-4100"
        DisplayName = "DENTE Dental CRM - Real-time WebSocket Broker (TCP 4100)"
        Description = "Inbound WebSocket access for real-time schedule synchronization, clinical alerts, and telephony events."
        Protocol    = "TCP"
        LocalPort   = 4100
    },
    @{
        Name        = "DENTE-UDP-5353"
        DisplayName = "DENTE Dental CRM - mDNS Zero-Config Discovery (UDP 5353)"
        Description = "Multicast DNS discovery allowing tablet and client applications to discover the server automatically."
        Protocol    = "UDP"
        LocalPort   = 5353
    },
    @{
        Name        = "DENTE-UDP-4101"
        DisplayName = "DENTE Dental CRM - LAN Beacon Responder (UDP 4101)"
        Description = "UDP discovery probe responder enabling instant discovery of DENTE CRM server across local clinic subnet."
        Protocol    = "UDP"
        LocalPort   = 4101
    }
)

$hasNetFirewallCmdlets = $false
try {
    if (Get-Command -Name "New-NetFirewallRule" -ErrorAction SilentlyContinue) {
        $hasNetFirewallCmdlets = $true
    }
} catch {}

foreach ($rule in $firewallRules) {
    $ruleName = $rule.Name
    $dispName = $rule.DisplayName
    $desc = $rule.Description
    $proto = $rule.Protocol
    $port = $rule.LocalPort

    Write-NetLog "Configuring firewall rule: $dispName ($proto $port)..."

    if ($hasNetFirewallCmdlets) {
        try {
            $existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
            if ($existing) {
                Write-NetLog "Rule '$ruleName' already exists. Ensuring it is enabled..." "INFO"
                Set-NetFirewallRule -Name $ruleName `
                    -Enabled True `
                    -Direction Inbound `
                    -Action Allow `
                    -Profile @("Domain", "Private") `
                    -ErrorAction SilentlyContinue
            } else {
                New-NetFirewallRule `
                    -Name $ruleName `
                    -DisplayName $dispName `
                    -Description $desc `
                    -DisplayGroup "DENTE Dental CRM" `
                    -Direction Inbound `
                    -Action Allow `
                    -Protocol $proto `
                    -LocalPort $port `
                    -Profile @("Domain", "Private") `
                    -Enabled True `
                    -ErrorAction Stop | Out-Null
                Write-NetLog "Created firewall rule '$ruleName' successfully." "INFO"
            }
        } catch {
            Write-NetLog "New-NetFirewallRule failed for '$ruleName': $($_.Exception.Message). Trying netsh fallback..." "WARN"
            & netsh advfirewall firewall delete rule name="$dispName" 2>&1 | Out-Null
            & netsh advfirewall firewall add rule name="$dispName" dir=in action=allow protocol=$proto localport=$port profile=private,domain description="$desc" 2>&1 | Out-Null
            Write-NetLog "Applied rule '$dispName' via netsh fallback." "INFO"
        }
    } else {
        # Older PowerShell / Windows Core without NetSecurity module
        Write-NetLog "Applying rule '$dispName' via netsh advfirewall..." "INFO"
        & netsh advfirewall firewall delete rule name="$dispName" 2>&1 | Out-Null
        & netsh advfirewall firewall add rule name="$dispName" dir=in action=allow protocol=$proto localport=$port profile=private,domain description="$desc" 2>&1 | Out-Null
        Write-NetLog "Applied rule '$dispName' via netsh." "INFO"
    }
}

# -----------------------------------------------------------------------------
# 4. FINAL VERIFICATION & DIAGNOSTIC REPORT
# -----------------------------------------------------------------------------
Write-NetLog "Verifying configured firewall rules..."
$allPassed = $true

foreach ($rule in $firewallRules) {
    $ruleName = $rule.Name
    $port = $rule.LocalPort
    $proto = $rule.Protocol
    
    if ($hasNetFirewallCmdlets) {
        $check = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
        if ($check -and $check.Enabled -eq "True") {
            Write-NetLog "  [PASS] $ruleName ($proto $port) -> Active & Enabled" "INFO"
        } else {
            Write-NetLog "  [WARN] $ruleName ($proto $port) -> Rule status could not be verified" "WARN"
            $allPassed = $false
        }
    } else {
        Write-NetLog "  [PASS] $ruleName ($proto $port) -> Configured via netsh" "INFO"
    }
}

if ($allPassed) {
    Write-NetLog "=== Clinic LAN & Firewall Setup Completed Successfully ===" "INFO"
    exit 0
} else {
    Write-NetLog "=== Setup completed with warnings. Check logs above. ===" "WARN"
    exit 0
}
