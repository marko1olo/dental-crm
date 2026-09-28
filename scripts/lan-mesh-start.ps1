#Requires -Version 5.1
<#
.SYNOPSIS
    DENTE CRM — Clinic LAN Zero-Conf Network Mesh Launcher (Windows PowerShell)

.DESCRIPTION
    Launches an autonomous Clinic LAN Zero-Conf Mesh node on Windows workstations
    (Doctor 1, Doctor 2, Reception, Server/Master) without requiring Internet access.
    Supports foreground execution and non-blocking background process daemonization.

.PARAMETER Role
    Node role: 'master' (Server/PostgreSQL), 'doctor', 'reception', or 'admin'. Default: 'doctor'.

.PARAMETER Port
    HTTP API port for mesh communications. Default: 4100.

.PARAMETER UdpPort
    UDP multicast/broadcast discovery port. Default: 4101.

.PARAMETER ClinicId
    Unique clinic practice tenant identifier. Default: 'clinic-default'.

.PARAMETER NodeId
    Unique identifier for this computer. Default: auto-generated.

.PARAMETER ProbeSubnet
    Triggers an immediate LAN subnet HTTP probe across ports 4100-4105.

.PARAMETER Background
    Launches the node in non-blocking background mode.

.EXAMPLE
    .\scripts\lan-mesh-start.ps1 -Role master -Port 4100
    .\scripts\lan-mesh-start.ps1 -Role doctor -Port 4102 -Background
    .\scripts\lan-mesh-start.ps1 -Role reception -Port 4103
#>

[CmdletBinding()]
param(
    [ValidateSet("master", "doctor", "reception", "admin")]
    [string]$Role = "doctor",

    [int]$Port = 4100,

    [int]$UdpPort = 4101,

    [string]$ClinicId = "clinic-default",

    [string]$NodeId = "",

    [switch]$ProbeSubnet,

    [switch]$Background
)

# 1. Enforce strict UTF-8 console output encoding without BOM
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$CliRunner = Join-Path $RepoRoot "bin\clinic-lan-node.mjs"

if (-not (Test-Path $CliRunner)) {
    Write-Error "DENTE LAN Node CLI runner not found at: $CliRunner"
    exit 1
}

# 2. Build argument list
$NodeArgs = @(
    $CliRunner,
    "--role=$Role",
    "--port=$Port",
    "--udp-port=$UdpPort",
    "--clinic-id=$ClinicId"
)

if (-not [string]::IsNullOrWhiteSpace($NodeId)) {
    $NodeArgs += "--node-id=$NodeId"
}

if ($ProbeSubnet) {
    $NodeArgs += "--probe"
}

# 3. Execution: Background daemon vs Foreground
if ($Background) {
    Write-Host "[DENTE LAN] Starting background mesh node (Role: $Role, Port: $Port)..." -ForegroundColor Cyan
    $LogDir = Join-Path $RepoRoot ".data\logs"
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    $LogFile = Join-Path $LogDir "lan-mesh-$Role-$Port.log"

    $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
    $ProcessInfo.FileName = "node"
    $ProcessInfo.Arguments = ($NodeArgs -join " ")
    $ProcessInfo.WorkingDirectory = $RepoRoot
    $ProcessInfo.RedirectStandardOutput = $true
    $ProcessInfo.RedirectStandardError = $true
    $ProcessInfo.UseShellExecute = $false
    $ProcessInfo.CreateNoWindow = $true

    $Process = New-Object System.Diagnostics.Process
    $Process.StartInfo = $ProcessInfo
    $Started = $Process.Start()

    if ($Started) {
        Write-Host "[DENTE LAN] Background node running! PID: $($Process.Id)" -ForegroundColor Green
        Write-Host "[DENTE LAN] Logs redirected to: $LogFile" -ForegroundColor DarkGray
    } else {
        Write-Error "Failed to start background mesh process."
        exit 1
    }
} else {
    Write-Host "[DENTE LAN] Starting interactive clinic mesh node..." -ForegroundColor Cyan
    & node $NodeArgs
}
