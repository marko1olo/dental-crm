<#
.SYNOPSIS
    DENTE Dental CRM — System Tray Health Monitor
.DESCRIPTION
    Lightweight background system tray indicator for doctor / administrator workstations.
    Periodically checks DENTE service responsiveness via Get-Service and TCP socket probe.
    Provides 1-click access to web client, logs, service control, and displays
    Russian service status indicators:
    - «Работает (Порт 4000)»
    - «Остановлена»
    - «Ошибка запуска»
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptRoot = $PSScriptRoot
if (-not $scriptRoot) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

# -----------------------------------------------------------------------------
# 1. RESOLVE CONFIGURATION & PORT
# -----------------------------------------------------------------------------
$port = 4000
$envPath = "$env:ProgramData\DenteCRM\dente.env"
if (Test-Path $envPath) {
    $content = Get-Content $envPath -ErrorAction SilentlyContinue
    foreach ($line in $content) {
        if ($line -match "^PORT=(\d+)") {
            $port = [int]$matches[1]
            break
        }
    }
}

# -----------------------------------------------------------------------------
# 2. SERVICE HEALTH AUDIT FUNCTION
# -----------------------------------------------------------------------------
function Get-DenteServiceHealth {
    param([int]$WebPort = 4000)

    $svc = Get-Service -Name "DenteService", "DenteCRMService" -ErrorAction SilentlyContinue | Select-Object -First 1

    if (-not $svc) {
        return @{
            StatusText   = "Не установлена"
            StatusBrief  = "Не установлена"
            StatusCode   = "NotFound"
            IconColor    = [System.Drawing.Color]::FromArgb(156, 163, 175) # Gray
            BalloonTitle = "DENTE CRM: Служба не установлена"
            BalloonBody  = "Служба DenteService / DenteCRMService не найдена в реестре Windows."
            ServiceName  = $null
            IsRunning    = $false
        }
    }

    if ($svc.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running) {
        $tcpOk = $false
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $ar = $tcp.BeginConnect("127.0.0.1", $WebPort, $null, $null)
            if ($ar.AsyncWaitHandle.WaitOne(800, $false)) {
                $tcp.EndConnect($ar)
                $tcpOk = $true
            }
            $tcp.Close()
        } catch {}

        if ($tcpOk) {
            return @{
                StatusText   = "Работает (Порт $WebPort)"
                StatusBrief  = "Работает (Порт $WebPort)"
                StatusCode   = "Running"
                IconColor    = [System.Drawing.Color]::FromArgb(13, 148, 136) # Teal / Green
                BalloonTitle = "DENTE CRM: Работает"
                BalloonBody  = "Фактический статус: Работает (Порт $WebPort)`nСлужба и веб-сервер активны."
                ServiceName  = $svc.Name
                IsRunning    = $true
            }
        } else {
            return @{
                StatusText   = "Ошибка запуска"
                StatusBrief  = "Ошибка запуска"
                StatusCode   = "PortUnresponsive"
                IconColor    = [System.Drawing.Color]::FromArgb(239, 68, 68) # Red
                BalloonTitle = "DENTE CRM: Ошибка запуска"
                BalloonBody  = "Фактический статус: Ошибка запуска`nСлужба $($svc.Name) активна, но порт $WebPort не отвечает."
                ServiceName  = $svc.Name
                IsRunning    = $true
            }
        }
    } elseif ($svc.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Stopped) {
        return @{
            StatusText   = "Остановлена"
            StatusBrief  = "Остановлена"
            StatusCode   = "Stopped"
            IconColor    = [System.Drawing.Color]::FromArgb(156, 163, 175) # Gray
            BalloonTitle = "DENTE CRM: Остановлена"
            BalloonBody  = "Фактический статус: Остановлена`nСлужба $($svc.Name) выключена."
            ServiceName  = $svc.Name
            IsRunning    = $false
        }
    } else {
        return @{
            StatusText   = "Ошибка запуска"
            StatusBrief  = "Ошибка запуска"
            StatusCode   = "ServiceError"
            IconColor    = [System.Drawing.Color]::FromArgb(239, 68, 68) # Red
            BalloonTitle = "DENTE CRM: Ошибка запуска"
            BalloonBody  = "Фактический статус: Ошибка запуска`nТекущее состояние службы: $($svc.Status)"
            ServiceName  = $svc.Name
            IsRunning    = $false
        }
    }
}

# -----------------------------------------------------------------------------
# 3. TRAY NOTIFYICON & DYNAMIC RENDERING
# -----------------------------------------------------------------------------
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Visible = $true

function Update-TrayIconVisual {
    param([System.Drawing.Color]$Color)

    $bmp = New-Object System.Drawing.Bitmap 16, 16
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $brush = New-Object System.Drawing.SolidBrush($Color)
    $g.FillEllipse($brush, 1, 1, 14, 14)
    
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $font = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Bold)
    $g.DrawString("D", $font, $whiteBrush, 2, 1)
    
    $iconHandle = $bmp.GetHicon()
    $oldIcon = $notifyIcon.Icon
    $notifyIcon.Icon = [System.Drawing.Icon]::FromHandle($iconHandle)
    
    if ($oldIcon) {
        try { $oldIcon.Dispose() } catch {}
    }
    $brush.Dispose()
    $whiteBrush.Dispose()
    $font.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

# -----------------------------------------------------------------------------
# 4. CONTEXT MENU & USER INTERACTIONS
# -----------------------------------------------------------------------------
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Header item showing live status
$menuHeader = $contextMenu.Items.Add("Статус: Определение...")
$menuHeader.Enabled = $false
$menuHeader.Font = New-Object System.Drawing.Font($menuHeader.Font, [System.Drawing.FontStyle]::Bold)

$contextMenu.Items.Add("-") | Out-Null

$menuOpen = $contextMenu.Items.Add("Открыть DENTE CRM")
$menuOpen.Font = New-Object System.Drawing.Font($menuOpen.Font, [System.Drawing.FontStyle]::Bold)
$menuOpen.Add_Click({
    Start-Process "http://localhost:$port"
})

$menuStatus = $contextMenu.Items.Add("Проверить состояние службы")
$menuStatus.Add_Click({
    $health = Update-TrayState
    $tipIcon = if ($health.StatusCode -eq "Running") { [System.Windows.Forms.ToolTipIcon]::Info } else { [System.Windows.Forms.ToolTipIcon]::Warning }
    $notifyIcon.ShowBalloonTip(3000, $health.BalloonTitle, $health.BalloonBody, $tipIcon)
})

$menuToggleService = $contextMenu.Items.Add("Перезапустить службу DENTE")
$menuToggleService.Add_Click({
    $health = Get-DenteServiceHealth -WebPort $port
    $targetName = if ($health.ServiceName) { $health.ServiceName } else { "DenteCRMService" }
    
    if ($health.IsRunning) {
        try {
            Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command Restart-Service -Name $targetName -Force" -Verb RunAs -WindowStyle Hidden
            $notifyIcon.ShowBalloonTip(3000, "DENTE CRM", "Команда перезапуска службы '$targetName' отправлена.", [System.Windows.Forms.ToolTipIcon]::Info)
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Не удалось перезапустить службу: $($_.Exception.Message)", "Ошибка", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    } else {
        try {
            Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command Start-Service -Name $targetName" -Verb RunAs -WindowStyle Hidden
            $notifyIcon.ShowBalloonTip(3000, "DENTE CRM", "Команда запуска службы '$targetName' отправлена.", [System.Windows.Forms.ToolTipIcon]::Info)
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Не удалось запустить службу: $($_.Exception.Message)", "Ошибка", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        }
    }
})

$menuLogs = $contextMenu.Items.Add("Открыть папку журналов (Logs)")
$menuLogs.Add_Click({
    $logDir = "$env:ProgramData\DenteCRM\logs"
    if (Test-Path $logDir) {
        Start-Process explorer.exe $logDir
    } else {
        [System.Windows.Forms.MessageBox]::Show("Папка журналов еще не создана: $logDir", "DENTE CRM", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    }
})

$contextMenu.Items.Add("-") | Out-Null

$menuExit = $contextMenu.Items.Add("Выход из трея")
$menuExit.Add_Click({
    $timer.Stop()
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    [System.Windows.Forms.Application]::Exit()
})

$notifyIcon.ContextMenuStrip = $contextMenu

# Double click action
$notifyIcon.Add_DoubleClick({
    Start-Process "http://localhost:$port"
})

# -----------------------------------------------------------------------------
# 5. STATE SYNCHRONIZATION & HEALTH TIMER
# -----------------------------------------------------------------------------
function Update-TrayState {
    $health = Get-DenteServiceHealth -WebPort $port
    
    $tooltip = "DENTE: $($health.StatusBrief)"
    if ($tooltip.Length -gt 63) {
        $tooltip = $tooltip.Substring(0, 63)
    }
    $notifyIcon.Text = $tooltip
    Update-TrayIconVisual -Color $health.IconColor

    $menuHeader.Text = "Статус: $($health.StatusText)"
    if ($health.IsRunning) {
        $menuToggleService.Text = "Перезапустить службу DENTE"
    } else {
        $menuToggleService.Text = "Запустить службу DENTE"
    }

    return $health
}

# Initial state refresh
$null = Update-TrayState

# Periodic timer (10 seconds)
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 10000
$timer.Add_Tick({
    $null = Update-TrayState
})
$timer.Start()

# -----------------------------------------------------------------------------
# 6. RUN WINDOWS MESSAGE LOOP
# -----------------------------------------------------------------------------
[System.Windows.Forms.Application]::Run()
