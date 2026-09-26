<#
.SYNOPSIS
    DENTE Dental CRM — System Tray Health Monitor
.DESCRIPTION
    Lightweight background system tray indicator for doctor / administrator workstations.
    Periodically checks DENTE service responsiveness and provides 1-click access to
    web client, logs, and service restart.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptRoot = $PSScriptRoot
if (-not $scriptRoot) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

# Resolve port from dente.env
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

# Create System Tray NotifyIcon
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Visible = $true
$notifyIcon.Text = "DENTE Dental CRM (Порт $port)"

# Drawing tray icon
$bmp = New-Object System.Drawing.Bitmap 16, 16
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(13, 148, 136)) # Teal
$g.FillEllipse($brush, 1, 1, 14, 14)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Bold)
$g.DrawString("D", $font, $whiteBrush, 2, 1)
$iconHandle = $bmp.GetHicon()
$notifyIcon.Icon = [System.Drawing.Icon]::FromHandle($iconHandle)

# Context Menu
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$menuOpen = $contextMenu.Items.Add("Открыть DENTE CRM")
$menuOpen.Font = New-Object System.Drawing.Font($menuOpen.Font, [System.Drawing.FontStyle]::Bold)
$menuOpen.Add_Click({
    Start-Process "http://localhost:$port"
})

$contextMenu.Items.Add("-") | Out-Null

$menuStatus = $contextMenu.Items.Add("Проверить состояние службы")
$menuStatus.Add_Click({
    $svc = Get-Service -Name "DenteCRMService" -ErrorAction SilentlyContinue
    $statusText = if ($svc) { $svc.Status.ToString() } else { "Не установлена" }
    $notifyIcon.ShowBalloonTip(3000, "DENTE CRM Статус", "Служба: $statusText`nВеб-порт: $port", [System.Windows.Forms.ToolTipIcon]::Info)
})

$menuRestart = $contextMenu.Items.Add("Перезапустить службу DENTE")
$menuRestart.Add_Click({
    try {
        Start-Process powershell -ArgumentList "-NoProfile -Command Restart-Service DenteCRMService" -Verb RunAs -WindowStyle Hidden
        $notifyIcon.ShowBalloonTip(3000, "DENTE CRM", "Команда перезапуска службы отправлена.", [System.Windows.Forms.ToolTipIcon]::Info)
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Не удалось перезапустить службу: $($_.Exception.Message)", "Ошибка", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
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

# Background Health Check Timer
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 10000 # 10 seconds
$timer.Add_Tick({
    $isAlive = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $ar = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        if ($ar.AsyncWaitHandle.WaitOne(800, $false)) {
            $tcp.EndConnect($ar)
            $tcp.Close()
            $isAlive = $true
        }
    } catch {}

    if ($isAlive) {
        $notifyIcon.Text = "DENTE Dental CRM: Активна (порт $port)"
    } else {
        $notifyIcon.Text = "DENTE Dental CRM: Служба не отвечает (порт $port)"
    }
})
$timer.Start()

# Run Windows message loop
[System.Windows.Forms.Application]::Run()
