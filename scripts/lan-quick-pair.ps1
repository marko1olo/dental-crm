<#
.SYNOPSIS
    DENTE CRM - Quick LAN Pairing and 6-Digit PIN Utility
.DESCRIPTION
    Retrieves or generates the rotating 6-digit clinic join PIN and QR pairing payload:
    - Displays active PIN, remaining expiration seconds, and pairing URIs
    - Allows secondary workstations/tablets to test-pair against the clinic master server
    - Supports rotating PIN on demand
.PARAMETER ServerHost
    Host or IP of the DENTE CRM server (default: localhost).
.PARAMETER Port
    API port of the DENTE CRM server (default: 4100).
.PARAMETER Pin
    Optional 6-digit PIN to test-join against the target server.
.PARAMETER Role
    Role to request when pairing (default: doctor).
.PARAMETER Rotate
    Forces immediate rotation of the 6-digit PIN.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\lan-quick-pair.ps1
    powershell -ExecutionPolicy Bypass -File .\scripts\lan-quick-pair.ps1 -Rotate
    powershell -ExecutionPolicy Bypass -File .\scripts\lan-quick-pair.ps1 -ServerHost 192.168.1.10 -Pin 849201
#>

[CmdletBinding()]
param(
    [string]$ServerHost = "localhost",
    [int]$Port = 4100,
    [string]$Pin,
    [string]$Role = "doctor",
    [switch]$Rotate
)

# Safe process execution policy
try {
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue
} catch {}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   DENTE CRM -- LAN Quick Pairing and Zero-Admin PIN Utility                    " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://${ServerHost}:${Port}"

# 1. Test-Join mode if -Pin is passed
if ($Pin) {
    if ($Pin -notmatch "^\d{6}$") {
        Write-Host "[-] ERROR: PIN must be exactly 6 digits." -ForegroundColor Red
        exit 1
    }

    Write-Host "[*] Attempting mutual auth pairing with Master at $baseUrl..." -ForegroundColor Cyan
    $joinPayload = @{
        pin = $Pin
        role = $Role
        clientName = "Workstation ($env:COMPUTERNAME)"
        nodeId = "node-$([guid]::NewGuid().ToString().Substring(0,8))"
    } | ConvertTo-Json

    try {
        $startTime = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-RestMethod -Uri "$baseUrl/api/network/mesh/auto-join/verify" `
            -Method Post `
            -ContentType "application/json" `
            -Body $joinPayload `
            -TimeoutSec 5 `
            -ErrorAction Stop
        $startTime.Stop()

        if ($response.ok -and $response.join.success) {
            Write-Host ""
            Write-Host "================================================================================" -ForegroundColor Green
            Write-Host "   PAIRING SUCCESSFUL! Node joined clinic LAN mesh.                            " -ForegroundColor Green
            Write-Host "================================================================================" -ForegroundColor Green
            Write-Host "  - Clinic ID       : $($response.join.clinicId)" -ForegroundColor White
            Write-Host "  - Master Node ID  : $($response.join.masterNodeId)" -ForegroundColor White
            Write-Host "  - Assigned Node ID: $($response.join.assignedNodeId)" -ForegroundColor White
            Write-Host "  - Assigned Role   : $($response.join.assignedRole)" -ForegroundColor White
            Write-Host "  - Handshake RTT   : $($startTime.ElapsedMilliseconds) ms" -ForegroundColor White
            Write-Host "  - Mesh Auth Token : $($response.join.meshToken.Substring(0, 24))..." -ForegroundColor Gray
            Write-Host ""
            exit 0
        } else {
            Write-Host "[-] Pairing rejected by server." -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "[-] Pairing failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# 2. Force Rotation mode if -Rotate is passed
if ($Rotate) {
    Write-Host "[*] Requesting immediate 6-digit PIN rotation on server..." -ForegroundColor Cyan
    try {
        $rotateRes = Invoke-RestMethod -Uri "$baseUrl/api/network/mesh/auto-join/rotate" `
            -Method Post `
            -TimeoutSec 5 `
            -ErrorAction Stop

        if ($rotateRes.ok) {
            Write-Host "[+] PIN rotated successfully!" -ForegroundColor Green
            Write-Host "  - New PIN: $($rotateRes.pinInfo.pin)" -ForegroundColor Yellow
            Write-Host "  - Expires in: $($rotateRes.pinInfo.remainingSeconds) seconds" -ForegroundColor Gray
        }
    } catch {
        Write-Host "[!] Note: Rotation via API returned: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "    (Requires active clinic session if authenticated)" -ForegroundColor Gray
    }
}

# 3. Query current active pairing status
Write-Host "[*] Querying clinic pairing status from $baseUrl..." -ForegroundColor Cyan

try {
    $statusRes = Invoke-RestMethod -Uri "$baseUrl/api/network/mesh/auto-join/status" `
        -Method Get `
        -TimeoutSec 5 `
        -ErrorAction Stop

    if ($statusRes.ok) {
        $st = $statusRes.status
        Write-Host ""
        Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "  CLINIC NAME   : $($st.masterName) (Clinic ID: $($st.clinicId))" -ForegroundColor White
        Write-Host "  PRIMARY LAN IP: $($st.primaryIp):$($st.apiPort)" -ForegroundColor White
        Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "     >>> ACTIVE 6-DIGIT CLINIC JOIN PIN: [ $($st.currentPin) ] <<<" -ForegroundColor Green
        Write-Host ""
        Write-Host "  - Expires In       : $($st.remainingSeconds) seconds ($($st.expiresAt))" -ForegroundColor Yellow
        Write-Host "  - Joined Mesh Peers: $($st.joinedPeersCount)" -ForegroundColor White
        Write-Host "  - Active Subnets   : $($st.activeSubnetsCount)" -ForegroundColor White
        Write-Host ""
        Write-Host "  MOBILE QR PAIRING PROTOCOL URI:" -ForegroundColor Cyan
        Write-Host "  $($st.qrPayload)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  DIRECT BROWSER TABLET URL:" -ForegroundColor Cyan
        Write-Host "  $($st.httpPairUrl)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "  Enter PIN '$($st.currentPin)' on any tablet or computer in the clinic network." -ForegroundColor Green
        Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host ""
        exit 0
    }
} catch {
    Write-Host "[!] Could not connect to running DENTE API at $baseUrl ($($_.Exception.Message))" -ForegroundColor Yellow
    Write-Host "[*] Displaying local network configuration..." -ForegroundColor Cyan

    try {
        $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
            $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\.254\."
        }
        foreach ($ip in $ips) {
            Write-Host "    - $($ip.InterfaceAlias): $($ip.IPAddress)" -ForegroundColor White
        }
    } catch {}
    Write-Host ""
    Write-Host "[*] Start DENTE CRM API (npm --prefix apps/api run dev) to enable live pairing." -ForegroundColor Gray
    exit 0
}
