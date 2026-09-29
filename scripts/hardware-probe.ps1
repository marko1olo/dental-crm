<#
.SYNOPSIS
    DENTE CRM - Windows Hardware & Peripheral Discovery Probe (PowerShell)
.DESCRIPTION
    Discovers connected clinic hardware:
    1. System Printers (Win32_Printer) classified as thermal receipt, label, or A4 document printers.
    2. COM Serial Ports (Win32_PnPEntity / [System.IO.Ports.SerialPort]) for 54-FZ KKT (ATOL, Shtrih-M) and virtual COM 2D scanners.
    3. Plug-and-Play USB Barcode Scanners (HID POS / Keyboard Wedge).
    4. Optional active TCP port 9100 network scan for ESC/POS receipt & TSPL label printers.
    Outputs normalized JSON strictly compliant with HardwareDiscoveryResult.
#>

[CmdletBinding()]
param(
    [switch]$ProbeNetwork = $false,
    [string[]]$Subnets = @(),
    [int[]]$Ports = @(9100),
    [int]$TimeoutMs = 300
)

# Enforce UTF-8 console output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$devices = [System.Collections.Generic.List[PSObject]]::new()

# ============================================================================
# 1. WIN32_PRINTER DISCOVERY
# ============================================================================
try {
    $printers = Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue
    if (-not $printers) {
        $printers = Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue
    }

    if ($printers) {
        foreach ($p in $printers) {
            $name = [string]$p.Name
            $driver = [string]$p.DriverName
            $port = [string]$p.PortName
            $isDefault = [bool]$p.Default
            $isOffline = [bool]$p.WorkOffline
            $statusInt = [int]$p.PrinterStatus
            $stateInt = [int]$p.PrinterState

            # Device Type Classification Heuristics
            $combinedText = "$name $driver $port".ToLowerInvariant()
            $devType = "document_printer"
            $emulation = $null
            $paperWidth = $null

            if ($combinedText -match "xprinter|rongta|pos-?58|pos-?80|thermal|receipt|esc/?pos|sam4s|bixolon|citizen|star\b|evotor") {
                $devType = "thermal_receipt"
                $emulation = "escpos"
                if ($combinedText -match "80|80mm|3inch") {
                    $paperWidth = 80
                } else {
                    $paperWidth = 58
                }
            } elseif ($combinedText -match "tsc|zebra|godex|gprinter|argox|hprt|datamax|label|zd\d+|xp-3") {
                $devType = "label_printer"
                if ($combinedText -match "zebra|zd|gk4|gx4") {
                    $emulation = "zpl"
                } else {
                    $emulation = "tspl"
                }
            } elseif ($combinedText -match "atol|shtrih|viki|pirit|mercury|kkt|kkm|fiscal") {
                $devType = "fiscal_kkt"
            }

            # Status Mapping
            $status = "online"
            if ($isOffline -or $statusInt -eq 7) {
                $status = "offline"
            } elseif (($stateInt -band 0x00000010) -ne 0) {
                $status = "paper_out"
            } elseif (($stateInt -band 0x00000040) -ne 0) {
                $status = "cover_open"
            } elseif ($statusInt -eq 1 -or $statusInt -eq 2) {
                $status = "error"
            }

            # Interface
            $interface = "system_spooler"
            if ($port -match "^USB") {
                $interface = "usb"
            } elseif ($port -match "^COM\d+") {
                $interface = "serial_com"
            } elseif ($port -match "^(\d{1,3}\.){3}\d{1,3}") {
                $interface = "tcp_raw"
            }

            $id = "printer:win32:" + ($name -replace "[^a-zA-Z0-9_\-]", "_").ToLowerInvariant()

            $deviceObj = [PSCustomObject]@{
                id = $id
                name = $name
                type = $devType
                interface = $interface
                status = $status
                isDefault = $isDefault
                manufacturer = if ($p.Manufacturer) { [string]$p.Manufacturer } else { $null }
                model = $driver
                port = $port
                emulation = $emulation
                paperWidthMm = $paperWidth
                details = [PSCustomObject]@{
                    driverName = $driver
                    spoolerStatus = $statusInt
                    workOffline = $isOffline
                }
            }
            $devices.Add($deviceObj)
        }
    }
} catch {
    # Continue if WMI is restricted
}

# ============================================================================
# 2. SERIAL COM PORTS (WIN32_PNPENTITY) FOR KKT & SCANNERS
# ============================================================================
try {
    $pnpPorts = Get-CimInstance -ClassName Win32_PnPEntity -Filter "PNPClass = 'Ports'" -ErrorAction SilentlyContinue
    if (-not $pnpPorts) {
        $pnpPorts = Get-WmiObject -Class Win32_PnPEntity -Filter "PNPClass = 'Ports'" -ErrorAction SilentlyContinue
    }

    if ($pnpPorts) {
        foreach ($pnp in $pnpPorts) {
            $pnpName = [string]$pnp.Name
            $pnpId = [string]$pnp.DeviceID
            $statusStr = [string]$pnp.Status

            # Extract COMx from name, e.g. "USB-SERIAL CH340 (COM3)" -> "COM3"
            if ($pnpName -match "\((COM\d+)\)") {
                $comPort = $Matches[1]
            } else {
                $comPort = $pnpName
            }

            $lowerPnp = "$pnpName $pnpId".ToLowerInvariant()
            $devType = "fiscal_kkt"
            if ($lowerPnp -match "scanner|barcode|honeywell|datalogic|newland|symbol|mertech") {
                $devType = "barcode_scanner"
            } elseif ($lowerPnp -match "atol|shtrih|evotor|kkt") {
                $devType = "fiscal_kkt"
            }

            $id = "com:" + $comPort.ToLowerInvariant()
            $isOnline = ($statusStr -eq "OK")

            $deviceObj = [PSCustomObject]@{
                id = $id
                name = $pnpName
                type = $devType
                interface = "serial_com"
                status = if ($isOnline) { "online" } else { "offline" }
                isDefault = $false
                manufacturer = if ($pnp.Manufacturer) { [string]$pnp.Manufacturer } else { $null }
                model = $pnpName
                port = $comPort
                details = [PSCustomObject]@{
                    hardwareId = $pnpId
                    pnpStatus = $statusStr
                }
            }
            $devices.Add($deviceObj)
        }
    }
} catch {
    # Continue gracefully
}

# ============================================================================
# 3. USB HID BARCODE SCANNERS
# ============================================================================
try {
    $hidDevices = Get-CimInstance -ClassName Win32_PnPEntity -Filter "PNPClass = 'HIDClass'" -ErrorAction SilentlyContinue
    if ($hidDevices) {
        foreach ($hid in $hidDevices) {
            $hidName = [string]$hid.Name
            $hidDesc = [string]$hid.Description
            $hidId = [string]$hid.DeviceID
            $combinedHid = "$hidName $hidDesc $hidId".ToLowerInvariant()

            if ($combinedHid -match "barcode|scanner|honeywell|datalogic|newland|symbol|mertech|poscenter|zebra|opticon|cipherlab") {
                $devId = "scanner:usb:" + ($hid.Caption -replace "[^a-zA-Z0-9_\-]", "_").ToLowerInvariant()
                $deviceObj = [PSCustomObject]@{
                    id = $devId
                    name = if ($hid.Caption) { [string]$hid.Caption } else { "USB Barcode Scanner" }
                    type = "barcode_scanner"
                    interface = "usb"
                    status = "online"
                    isDefault = $false
                    manufacturer = if ($hid.Manufacturer) { [string]$hid.Manufacturer } else { $null }
                    model = $hidName
                    details = [PSCustomObject]@{
                        pnpDeviceID = $hidId
                        mode = "keyboard_wedge"
                    }
                }
                $devices.Add($deviceObj)
            }
        }
    }
} catch {
    # Continue gracefully
}

# ============================================================================
# 4. OPTIONAL TCP PORT 9100 NETWORK SCAN FOR ESC/POS & TSPL PRINTERS
# ============================================================================
if ($ProbeNetwork) {
    if (-not $Subnets -or $Subnets.Count -eq 0) {
        try {
            $ipConfigs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                Where-Object { $_.IPAddress -notmatch "^127\.|^169\.254\." }
            foreach ($cfg in $ipConfigs) {
                $octets = $cfg.IPAddress.Split('.')
                if ($octets.Length -eq 4) {
                    $detectedSubnet = "$($octets[0]).$($octets[1]).$($octets[2])"
                    if (-not ($Subnets -contains $detectedSubnet)) {
                        $Subnets += $detectedSubnet
                    }
                }
            }
        } catch {
            $Subnets = @("192.168.1", "192.168.0")
        }
    }

    foreach ($subnet in $Subnets) {
        $targetIps = 20..220 | ForEach-Object { "$subnet.$_" }
        foreach ($ip in $targetIps) {
            foreach ($port in $Ports) {
                $client = New-Object System.Net.Sockets.TcpClient
                try {
                    $asyncResult = $client.BeginConnect($ip, $port, $null, $null)
                    $success = $asyncResult.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
                    if ($success -and $client.Connected) {
                        $client.EndConnect($asyncResult)
                        $netId = "net:tcp:$ip`:$port"
                        $netDevice = [PSCustomObject]@{
                            id = $netId
                            name = "Network Thermal Printer ($ip`:$port)"
                            type = "thermal_receipt"
                            interface = "tcp_raw"
                            status = "online"
                            isDefault = $false
                            ipAddress = $ip
                            rawTcpPort = $port
                            emulation = "escpos"
                            paperWidthMm = 80
                            details = [PSCustomObject]@{
                                protocol = "RAW TCP 9100"
                            }
                        }
                        $devices.Add($netDevice)
                    }
                } catch {
                    # Not reachable
                } finally {
                    $client.Close()
                }
            }
        }
    }
}

# ============================================================================
# 5. SUMMARY & NORMALIZED OUTPUT
# ============================================================================
$total = $devices.Count
$onlineCount = ($devices | Where-Object { $_.status -eq "online" }).Count
$printerCount = ($devices | Where-Object { $_.type -match "printer|thermal" }).Count
$scannerCount = ($devices | Where-Object { $_.type -eq "barcode_scanner" }).Count
$kktCount = ($devices | Where-Object { $_.type -eq "fiscal_kkt" }).Count

$result = [PSCustomObject]@{
    timestamp = [System.DateTime]::UtcNow.ToString("o")
    hostPlatform = "win32"
    devices = $devices
    summary = [PSCustomObject]@{
        total = $total
        online = $onlineCount
        printers = $printerCount
        scanners = $scannerCount
        kkt = $kktCount
    }
}

$jsonOutput = $result | ConvertTo-Json -Depth 6 -Compress
[System.Console]::WriteLine($jsonOutput)
