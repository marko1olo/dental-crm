Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 1. Проверка прав Администратора (необходимо для Брандмауэра)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    # Перезапуск с правами Администратора
    Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`"" -Verb RunAs
    Exit
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "DENTE CRM Launcher (Admin)"
$form.Size = New-Object System.Drawing.Size(600, 650)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(240, 240, 240)

$font = New-Object System.Drawing.Font("Segoe UI", 10)
$form.Font = $font

# Title Label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "DENTE CRM - Локальный Сервер"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(20, 20)
$form.Controls.Add($titleLabel)

# Status Label
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Статус: Остановлен"
$statusLabel.ForeColor = [System.Drawing.Color]::Red
$statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(20, 60)
$form.Controls.Add($statusLabel)

# Start Button
$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "▶ ЗАПУСТИТЬ"
$startButton.Size = New-Object System.Drawing.Size(250, 50)
$startButton.Location = New-Object System.Drawing.Point(20, 100)
$startButton.BackColor = [System.Drawing.Color]::LightGreen
$startButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($startButton)

# Stop Button
$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = "■ ОСТАНОВИТЬ"
$stopButton.Size = New-Object System.Drawing.Size(250, 50)
$stopButton.Location = New-Object System.Drawing.Point(310, 100)
$stopButton.BackColor = [System.Drawing.Color]::LightPink
$stopButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$stopButton.Enabled = $false
$form.Controls.Add($stopButton)

# Backup Button
$backupButton = New-Object System.Windows.Forms.Button
$backupButton.Text = "💾 Сделать Бэкап БД"
$backupButton.Size = New-Object System.Drawing.Size(250, 40)
$backupButton.Location = New-Object System.Drawing.Point(20, 160)
$backupButton.BackColor = [System.Drawing.Color]::LightBlue
$form.Controls.Add($backupButton)

# Restore Button
$restoreButton = New-Object System.Windows.Forms.Button
$restoreButton.Text = "📂 Восстановить БД"
$restoreButton.Size = New-Object System.Drawing.Size(250, 40)
$restoreButton.Location = New-Object System.Drawing.Point(310, 160)
$restoreButton.BackColor = [System.Drawing.Color]::LightGoldenrodYellow
$form.Controls.Add($restoreButton)

# Link Label (Local IP)
$ipLabel = New-Object System.Windows.Forms.Label
$ipLabel.Text = "Доступ с телефона (Wi-Fi): Сервер выключен"
$ipLabel.ForeColor = [System.Drawing.Color]::DarkBlue
$ipLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$ipLabel.AutoSize = $true
$ipLabel.Location = New-Object System.Drawing.Point(20, 210)
$form.Controls.Add($ipLabel)

# Log Box
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.Size = New-Object System.Drawing.Size(540, 330)
$logBox.Location = New-Object System.Drawing.Point(20, 240)
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::Black
$logBox.ForeColor = [System.Drawing.Color]::LimeGreen
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($logBox)

function Log {
    param([string]$message)
    $logBox.AppendText("[$((Get-Date).ToString('HH:mm:ss'))] $message`r`n")
    $logBox.SelectionStart = $logBox.Text.Length
    $logBox.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

$global:postgresProcess = $null
$global:nodeProcess = $null

function Get-LocalIP {
    $ip = (Test-Connection -ComputerName (hostname) -Count 1).IPV4Address.IPAddressToString
    if (-not $ip) {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
    }
    if (-not $ip) {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object IPAddress -Like "192.168.*" | Select-Object -First 1).IPAddress
    }
    return $ip
}

function Create-DesktopShortcut {
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$([Environment]::GetFolderPath('Desktop'))\DENTE CRM.lnk")
    
    # Пытаемся найти Edge или Chrome для App Mode
    $browserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if (-not (Test-Path $browserPath)) {
        $browserPath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    }
    
    if (Test-Path $browserPath) {
        $Shortcut.TargetPath = $browserPath
        $Shortcut.Arguments = "--app=`"http://localhost:5173`""
    } else {
        # Если браузеров нет, открываем просто ссылку
        $Shortcut.TargetPath = "http://localhost:5173"
    }
    
    $Shortcut.IconLocation = "%SystemRoot%\System32\SHELL32.dll, 13" # Звездочка или что-то красивое
    $Shortcut.WindowStyle = 1
    $Shortcut.Description = "Запуск DENTE CRM"
    $Shortcut.Save()
    Log "Ярлык на рабочем столе создан/обновлен."
}

function Setup-Firewall {
    Log "Проверка правил брандмауэра для локальной сети..."
    $ruleCheck = netsh advfirewall firewall show rule name="DENTE CRM API" | Out-String
    if ($ruleCheck -match "No rules match" -or $ruleCheck -match "Не найдено") {
        netsh advfirewall firewall add rule name="DENTE CRM API" dir=in action=allow protocol=TCP localport=4100 >$null
        netsh advfirewall firewall add rule name="DENTE CRM Web" dir=in action=allow protocol=TCP localport=5173 >$null
        Log "Добавлены исключения Брандмауэра (порты 4100, 5173)."
    }
}

$startButton.Add_Click({
    $startButton.Enabled = $false
    $backupButton.Enabled = $false
    $restoreButton.Enabled = $false
    $statusLabel.Text = "Статус: Запуск..."
    $statusLabel.ForeColor = [System.Drawing.Color]::Orange
    Log "Инициализация локального сервера..."

    Create-DesktopShortcut
    Setup-Firewall

    # Check Node.js
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCheck) {
        Log "ОШИБКА: Node.js не установлен! Установите Node.js с nodejs.org."
        $startButton.Enabled = $true
        return
    }

    # Setup PostgreSQL Portable
    $pgDir = Join-Path $PWD ".postgres"
    if (-not (Test-Path "$pgDir\bin\postgres.exe")) {
        Log "Скачивание Portable PostgreSQL (около 120МБ)..."
        $zipPath = Join-Path $PWD "pg.zip"
        try {
            Invoke-WebRequest -Uri "https://get.enterprisedb.com/postgresql/postgresql-14.13-1-windows-x64-binaries.zip" -OutFile $zipPath
            Log "Распаковка архива..."
            Expand-Archive -Path $zipPath -DestinationPath $PWD -Force
            Rename-Item -Path "pgsql" -NewName ".postgres"
            Remove-Item $zipPath
            Log "Инициализация базы данных (initdb)..."
            Start-Process -FilePath "$pgDir\bin\initdb.exe" -ArgumentList "-U dental -A trust -D `"$pgDir\data`" -E UTF8" -Wait -NoNewWindow
        } catch {
            Log "ОШИБКА скачивания или настройки PostgreSQL: $_"
            $startButton.Enabled = $true
            return
        }
    }

    Log "Запуск PostgreSQL..."
    $global:postgresProcess = Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "start -D `"$pgDir\data`" -l `"$pgDir\data\pg.log`" -w" -WindowStyle Hidden -PassThru

    # Check if database exists
    $checkDb = Start-Process -FilePath "$pgDir\bin\psql.exe" -ArgumentList "-U dental -d postgres -c `"SELECT 1 FROM pg_database WHERE datname='dental_crm'`"" -Wait -NoNewWindow -PassThru
    if ($checkDb.ExitCode -eq 0) {
        Log "База данных dental_crm проверена."
    } else {
        Log "Создание базы данных dental_crm..."
        Start-Process -FilePath "$pgDir\bin\createdb.exe" -ArgumentList "-U dental dental_crm" -Wait -NoNewWindow
    }

    Log "Установка зависимостей (npm install)..."
    $npmInstall = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install" -Wait -NoNewWindow -PassThru
    
    Log "Применение миграций БД..."
    $npmMigrate = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run db:migrate --workspace=@dental/api" -Wait -NoNewWindow -PassThru

    Log "Запуск сервера DENTE (npm run dev)..."
    $global:nodeProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WindowStyle Hidden -PassThru

    $localIp = Get-LocalIP
    if ($localIp) {
        $ipLabel.Text = "Доступ с телефона (Wi-Fi): http://$localIp:5173"
        Log "Локальная сеть: http://$localIp:5173"
    }

    Log "Сервер успешно запущен!"
    Log "Открываю DENTE CRM..."
    Start-Sleep -Seconds 3
    
    # Открываем ярлык на рабочем столе, чтобы запустить App Mode
    Start-Process "$([Environment]::GetFolderPath('Desktop'))\DENTE CRM.lnk" -ErrorAction SilentlyContinue

    $statusLabel.Text = "Статус: Работает"
    $statusLabel.ForeColor = [System.Drawing.Color]::Green
    $stopButton.Enabled = $true
    $backupButton.Enabled = $true
})

$stopButton.Add_Click({
    $stopButton.Enabled = $false
    Log "Остановка серверов..."
    $statusLabel.Text = "Статус: Остановка..."
    $statusLabel.ForeColor = [System.Drawing.Color]::Orange

    if ($global:nodeProcess) {
        Log "Остановка Node.js процессов..."
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    }
    
    $pgDir = Join-Path $PWD ".postgres"
    if (Test-Path "$pgDir\bin\pg_ctl.exe") {
        Log "Остановка PostgreSQL..."
        Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "stop -D `"$pgDir\data`"" -Wait -NoNewWindow
    }

    Log "Все сервисы остановлены."
    $ipLabel.Text = "Доступ с телефона (Wi-Fi): Сервер выключен"
    $statusLabel.Text = "Статус: Остановлен"
    $statusLabel.ForeColor = [System.Drawing.Color]::Red
    $startButton.Enabled = $true
    $backupButton.Enabled = $true
    $restoreButton.Enabled = $true
})

$backupButton.Add_Click({
    Log "=== НАЧАЛО БЭКАПА ==="
    $pgDir = Join-Path $PWD ".postgres"
    if (-not (Test-Path "$pgDir\bin\pg_dump.exe")) {
        Log "ОШИБКА: PostgreSQL не найден. Сначала запустите сервер 1 раз."
        return
    }
    
    $backupDir = Join-Path $PWD "backups"
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
    
    $fileName = "backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').sql"
    $filePath = Join-Path $backupDir $fileName
    
    $pgIsRunning = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
    $startedLocally = $false
    if (-not $pgIsRunning) {
        Log "Поднимаю БД для бэкапа..."
        Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "start -D `"$pgDir\data`" -l `"$pgDir\data\pg.log`" -w" -WindowStyle Hidden -Wait
        $startedLocally = $true
    }
    
    Log "Сохраняю базу данных в файл $fileName..."
    # Используем cmd /c чтобы перенаправление потока сработало корректно
    $p = Start-Process "cmd.exe" -ArgumentList "/c `"$pgDir\bin\pg_dump.exe`" -U dental -C --clean --if-exists dental_crm > `"$filePath`"" -Wait -NoNewWindow -PassThru
    
    if ($p.ExitCode -eq 0) {
        Log "Бэкап УСПЕШНО сохранен: $filePath"
    } else {
        Log "Ошибка при создании бэкапа! Код: $($p.ExitCode)"
    }
    
    if ($startedLocally) {
        Log "Останавливаю БД..."
        Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "stop -D `"$pgDir\data`"" -Wait -NoNewWindow
    }
    Log "=== БЭКАП ЗАВЕРШЕН ==="
})

$restoreButton.Add_Click({
    Log "=== НАЧАЛО ВОССТАНОВЛЕНИЯ ==="
    $pgDir = Join-Path $PWD ".postgres"
    if (-not (Test-Path "$pgDir\bin\psql.exe")) {
        Log "ОШИБКА: PostgreSQL не найден. Сначала запустите сервер 1 раз."
        return
    }
    
    $backupDir = Join-Path $PWD "backups"
    if (-not (Test-Path $backupDir)) { 
        Log "Папка backups пуста. Нет файлов для восстановления."
        return 
    }
    
    # Открываем диалог выбора файла
    $openFileDialog = New-Object System.Windows.Forms.OpenFileDialog
    $openFileDialog.InitialDirectory = $backupDir
    $openFileDialog.Filter = "SQL Files (*.sql)|*.sql|All Files (*.*)|*.*"
    $openFileDialog.Title = "Выберите файл резервной копии"
    
    if ($openFileDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $restoreFile = $openFileDialog.FileName
        Log "Выбран файл: $restoreFile"
        Log "ВНИМАНИЕ: Текущая база будет затерта!"
        
        $pgIsRunning = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
        $startedLocally = $false
        if (-not $pgIsRunning) {
            Log "Поднимаю БД для восстановления..."
            Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "start -D `"$pgDir\data`" -l `"$pgDir\data\pg.log`" -w" -WindowStyle Hidden -Wait
            $startedLocally = $true
        }
        
        Log "Восстанавливаю базу (psql)..."
        $p = Start-Process "cmd.exe" -ArgumentList "/c `"$pgDir\bin\psql.exe`" -U dental -d postgres -f `"$restoreFile`"" -Wait -NoNewWindow -PassThru
        
        if ($p.ExitCode -eq 0) {
            Log "База данных УСПЕШНО восстановлена."
        } else {
            Log "Ошибка при восстановлении! Код: $($p.ExitCode)"
        }
        
        if ($startedLocally) {
            Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "stop -D `"$pgDir\data`"" -Wait -NoNewWindow
        }
    } else {
        Log "Восстановление отменено пользователем."
    }
    Log "=== ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ==="
})

$form.Add_FormClosing({
    if ($statusLabel.Text -eq "Статус: Работает") {
        $stopButton.PerformClick()
    }
})

Log "DENTE CRM Launcher готов. Нажмите ЗАПУСТИТЬ."
[System.Windows.Forms.Application]::Run($form)
