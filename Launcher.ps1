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

# Vacuum Button (NEW)
$vacuumButton = New-Object System.Windows.Forms.Button
$vacuumButton.Text = "🧹 ОПТИМИЗИРОВАТЬ ДИСК"
$vacuumButton.Size = New-Object System.Drawing.Size(540, 40)
$vacuumButton.Location = New-Object System.Drawing.Point(20, 210)
$vacuumButton.BackColor = [System.Drawing.Color]::Thistle
$form.Controls.Add($vacuumButton)

# Link Label (Local IP)
$ipLabel = New-Object System.Windows.Forms.Label
$ipLabel.Text = "Доступ с телефона (Wi-Fi): Сервер выключен"
$ipLabel.ForeColor = [System.Drawing.Color]::DarkBlue
$ipLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$ipLabel.AutoSize = $true
$ipLabel.Location = New-Object System.Drawing.Point(20, 260)
$form.Controls.Add($ipLabel)

# Log Box
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.Size = New-Object System.Drawing.Size(540, 300)
$logBox.Location = New-Object System.Drawing.Point(20, 290)
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
    $ShortcutPath = "$([Environment]::GetFolderPath('Desktop'))\DENTE CRM.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    
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

# =============================================================================
# СЕКРЕТЫ УСТАНОВКИ
#
# Раньше здесь стояло $global:BackupPassword = "DENTE_SECURE_BACKUP_KEY_2026" —
# ключ шифрования резервных копий медицинских данных лежал константой в файле,
# который PORTABILITY_GUIDE.md предписывает копировать на ту же флешку, что и
# сами копии. Обещание руководства «в случае утери флешки злоумышленники не
# смогут прочитать данные» было ложным: терялись шифротекст и ключ вместе.
#
# Константа сохранена ТОЛЬКО для расшифровки старых файлов .sql.aes. Новые копии
# ей не шифруются никогда.
# =============================================================================
$global:LegacyBackupPassword = "DENTE_SECURE_BACKUP_KEY_2026"

# Файлы окружения проекта в том же порядке, в каком их читает API
# (apps/api/src/env/loadServerEnv.ts, baseEnvFiles).
function Get-EnvFileCandidates {
    return @(
        (Join-Path $PWD "apps\api\.env"),
        (Join-Path $PWD ".env.local"),
        (Join-Path $PWD ".env")
    )
}

# Читает значение переменной из .env-файлов проекта. Совпадением считается только
# настоящее присваивание в начале строки, а не упоминание имени в комментарии.
function Get-ProjectEnvValue {
    param([Parameter(Mandatory = $true)][string]$Name)

    foreach ($path in (Get-EnvFileCandidates)) {
        if (-not (Test-Path $path)) { continue }
        try {
            $text = [System.IO.File]::ReadAllText($path)
        } catch {
            continue
        }
        $match = [regex]::Match($text, '(?m)^[ \t]*' + [regex]::Escape($Name) + '[ \t]*=[ \t]*(.*)$')
        if ($match.Success) {
            $value = $match.Groups[1].Value.Trim().Trim('"').Trim("'")
            if ($value) { return $value }
        }
    }
    return $null
}

# Дописывает переменную в apps\api\.env. Никогда не переписывает существующее
# присваивание: затирать строку в чужом .env — это как раз тот способ, которым
# теряются рабочие учётные данные клиники.
function Add-ProjectEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value,
        [string]$Comment
    )

    $target = Join-Path $PWD "apps\api\.env"
    $dir = Split-Path -Parent $target
    if (-not (Test-Path $dir)) {
        Log "ОШИБКА: папка apps\api не найдена, переменную $Name записать некуда."
        return $false
    }
    $block = ""
    if ($Comment) { $block += "`r`n# $Comment" }
    $block += "`r`n$Name=$Value`r`n"
    # UTF-8 без BOM: dotenv не понимает BOM в первой строке.
    [System.IO.File]::AppendAllText($target, $block, (New-Object System.Text.UTF8Encoding($false)))
    return $true
}

# Криптостойкая строка. Get-Random не годится: это PRNG, засеянный часами.
function New-RandomSecret {
    param([int]$Length = 32)

    $alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $chars = New-Object char[] $Length
    for ($i = 0; $i -lt $Length; $i++) {
        $chars[$i] = $alphabet[[int]$bytes[$i] % $alphabet.Length]
    }
    return -join $chars
}

# Ключ шифрования копий — ТОТ ЖЕ CLINIC_ENCRYPTION_KEY, что использует штатный
# демон apps/api/src/services/backupWorker.ts. Один ключ на установку, а не два
# механизма с разными секретами. Правило свёртки повторяет backupWorker дословно:
# ровно 32 байта — берём как есть, иначе SHA-256, чтобы не терять энтропию обрезкой.
function Get-BackupEncryptionKey {
    $raw = Get-ProjectEnvValue -Name "CLINIC_ENCRYPTION_KEY"
    if (-not $raw) { return $null }
    if ($raw -eq "DUMMY_SAMPLE_KEY_NOT_A_REAL_SECRET" -or $raw -like "*ЗАМЕНИТЕ*") { return $null }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    if ($bytes.Length -lt 32) { return $null }
    # Унарная запятая обязательна: без неё PowerShell разворачивает массив в
    # конвейер и вызывающий получает Object[] из 32 элементов вместо byte[].
    if ($bytes.Length -eq 32) { return ,$bytes }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ,$sha.ComputeHash($bytes) } finally { $sha.Dispose() }
}

# Шифрует ПОТОК в файл: AES-256-CBC, случайный IV в первых 16 байтах.
# Формат байт в байт совпадает с backupWorker.createEncryptedBackup, поэтому копия
# от кнопки и копия от демона читаются одним и тем же кодом и подпадают под одну
# и ту же ретенцию (backupWorker.pruneOldBackups, шаблон dente_crm_backup_*.sql.enc).
#
# ПОЧЕМУ ПОТОК, А НЕ ФАЙЛ. Прежняя схема писала открытый дамп в backups\*.sql,
# затем шифровала и удаляла. Открытая выгрузка медицинской базы существовала на
# диске всё время работы pg_dump, а при ошибке шифрования (catch только логировал)
# оставалась там навсегда. Требование к ИСПДн прямо противоположное: шифровать в
# потоке, не создавая промежуточного открытого файла.
function Protect-StreamToFile {
    param(
        [Parameter(Mandatory = $true)][System.IO.Stream]$InputStream,
        [Parameter(Mandatory = $true)][byte[]]$Key,
        [Parameter(Mandatory = $true)][string]$OutPath
    )

    $aes = [System.Security.Cryptography.Aes]::Create()
    try {
        $aes.KeySize = 256
        $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
        $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
        $aes.Key = $Key
        $aes.GenerateIV()

        $fsOut = New-Object System.IO.FileStream($OutPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
        try {
            $fsOut.Write($aes.IV, 0, $aes.IV.Length)
            $encryptor = $aes.CreateEncryptor()
            try {
                $cs = New-Object System.Security.Cryptography.CryptoStream($fsOut, $encryptor, [System.Security.Cryptography.CryptoStreamMode]::Write)
                try {
                    $InputStream.CopyTo($cs)
                    $cs.FlushFinalBlock()
                } finally {
                    $cs.Dispose()
                }
            } finally {
                $encryptor.Dispose()
            }
        } finally {
            $fsOut.Dispose()
        }
    } finally {
        $aes.Dispose()
    }
}

# Расшифровка нового формата (.sql.enc): первые 16 байт — IV.
function Unprotect-EncFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][byte[]]$Key,
        [Parameter(Mandatory = $true)][string]$OutPath
    )

    $aes = [System.Security.Cryptography.Aes]::Create()
    try {
        $aes.KeySize = 256
        $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
        $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
        $aes.Key = $Key

        $fsIn = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
        try {
            $iv = New-Object byte[] 16
            $read = $fsIn.Read($iv, 0, 16)
            if ($read -ne 16) { throw "Файл копии короче 16 байт: заголовок IV отсутствует." }
            $aes.IV = $iv

            $fsOut = New-Object System.IO.FileStream($OutPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
            try {
                $decryptor = $aes.CreateDecryptor()
                try {
                    $cs = New-Object System.Security.Cryptography.CryptoStream($fsIn, $decryptor, [System.Security.Cryptography.CryptoStreamMode]::Read)
                    try {
                        $cs.CopyTo($fsOut)
                    } finally {
                        $cs.Dispose()
                    }
                } finally {
                    $decryptor.Dispose()
                }
            } finally {
                $fsOut.Dispose()
            }
        } finally {
            $fsIn.Dispose()
        }
    } finally {
        $aes.Dispose()
    }
}

# УСТАРЕВШИЙ ФОРМАТ, ТОЛЬКО ЧТЕНИЕ. Копии .sql.aes, сделанные до этой правки,
# зашифрованы паролем-константой с постоянной солью (1..8) и 1000 итерациями
# PBKDF2-SHA1. Соль и пароль постоянны, значит постоянны и ключ, и IV: одинаковые
# начала дампов давали одинаковые начала шифротекста во всех копиях сразу.
# Шифровать этим больше нельзя, но расшифровать уже сделанное клиника обязана
# уметь — иначе правка безопасности уничтожает её архив.
function Unprotect-LegacyAesFile {
    param([string]$Path, [string]$Password, [string]$OutPath)
    $salt = [byte[]](1,2,3,4,5,6,7,8)
    $rfc2898 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($Password, $salt, 1000)
    $aes = New-Object System.Security.Cryptography.AesManaged
    $aes.Key = $rfc2898.GetBytes($aes.KeySize / 8)
    $aes.IV = $rfc2898.GetBytes($aes.BlockSize / 8)

    $fsIn = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::Open)
    $fsOut = New-Object System.IO.FileStream($OutPath, [System.IO.FileMode]::Create)
    $cs = New-Object System.Security.Cryptography.CryptoStream($fsIn, $aes.CreateDecryptor(), [System.Security.Cryptography.CryptoStreamMode]::Read)
    $cs.CopyTo($fsOut)
    $cs.Close(); $fsOut.Close(); $fsIn.Close()
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

# =============================================================================
# АУТЕНТИФИКАЦИЯ БАЗЫ ДАННЫХ
# =============================================================================

# Пароль базы, который УЖЕ настроен у приложения. Единственный источник истины —
# DATABASE_URL, потому что именно её читает API (apps/api/src/db/client.ts:27).
# Придумывать пароль в обход неё значит оставить клинику без доступа к базе.
function Get-ConfiguredDbPassword {
    $url = Get-ProjectEnvValue -Name "DATABASE_URL"
    if (-not $url) { return $null }
    $match = [regex]::Match($url, '^[a-zA-Z0-9+.-]+://([^:/@]+):([^@]*)@')
    if (-not $match.Success) { return $null }
    $password = [System.Uri]::UnescapeDataString($match.Groups[2].Value)
    if (-not $password) { return $null }
    return $password
}

# Есть ли в живом кластере строки trust. Читаем pg_hba.conf, ничего не меняем.
function Test-ClusterUsesTrust {
    param([Parameter(Mandatory = $true)][string]$DataDir)

    $hba = Join-Path $DataDir "pg_hba.conf"
    if (-not (Test-Path $hba)) { return $false }
    try {
        $lines = [System.IO.File]::ReadAllLines($hba)
    } catch {
        return $false
    }
    foreach ($line in $lines) {
        # Комментарий отрезаем, а не только пропускаем строки, начинающиеся с #:
        # запись "local all all trust # временно" — это действующее правило trust.
        $trimmed = ($line -split '#', 2)[0].Trim()
        if (-not $trimmed) { continue }
        if ($trimmed -match '\btrust\s*$') { return $true }
    }
    return $false
}

# ПОЧЕМУ ЗДЕСЬ ПРЕДУПРЕЖДЕНИЕ, А НЕ АВТОМАТИЧЕСКАЯ ПРАВКА pg_hba.conf.
# Переход trust -> scram-sha-256 не имеет обратной совместимости: trust не
# выполняет обмена аутентификацией вовсе, поэтому автосогласования, как при
# md5 -> scram, здесь нет. Роль dental создана initdb БЕЗ пароля. Если поменять
# метод раньше, чем задан пароль, клиника теряет доступ к базе немедленно и
# необратимо в рамках рабочего дня. Порядок операций (ALTER USER под trust,
# затем смена метода, затем reload) требует, чтобы новый пароль совпал с тем,
# что стоит в DATABASE_URL во ВСЕХ .env-файлах установки, а их до трёх и они
# могут расходиться. Молча выполнять это на работающей базе клиники нельзя.
function Warn-AboutTrustAuthentication {
    param([Parameter(Mandatory = $true)][string]$DataDir)

    Log "==================================================================="
    Log "ВНИМАНИЕ: база данных принимает подключения БЕЗ ПАРОЛЯ (метод trust)."
    Log "Любая программа, запущенная на этом компьютере, читает медицинскую"
    Log "базу целиком. По сети база недоступна: она слушает только 127.0.0.1."
    Log "Файл: $DataDir\pg_hba.conf"
    Log "-------------------------------------------------------------------"
    Log "РУЧНАЯ ПРОЦЕДУРА ПЕРЕХОДА (выполняет технический специалист):"
    Log " 1. Остановить систему кнопкой ОСТАНОВИТЬ."
    Log " 2. Запустить только базу:"
    Log "    .postgres\bin\pg_ctl.exe start -D `"$DataDir`" -w"
    Log ' 3. Пока действует trust, задать пароль роли dental (одной строкой):'
    Log '    .postgres\bin\psql.exe -U dental -d postgres -c "ALTER USER dental PASSWORD ''НОВЫЙ_ПАРОЛЬ'';"'
    Log " 4. Проверить, что пароль записан как SCRAM:"
    Log "    SELECT rolname, rolpassword LIKE 'SCRAM-SHA-256%' FROM pg_authid"
    Log "    WHERE rolcanlogin;"
    Log " 5. Прописать ТОТ ЖЕ пароль в DATABASE_URL во всех файлах:"
    Log "    apps\api\.env, .env.local, .env"
    Log " 6. Сохранить копию pg_hba.conf как pg_hba.conf.bak, затем заменить"
    Log "    в нём слово trust на scram-sha-256 во всех непустых строках."
    Log " 7. Перечитать конфигурацию:"
    Log "    .postgres\bin\pg_ctl.exe reload -D `"$DataDir`""
    Log " 8. Проверить вход: psql -U dental -d dental_crm должен спросить пароль."
    Log "    Если что-то пошло не так, вернуть pg_hba.conf.bak и снова reload:"
    Log "    метод отката занимает секунды, пароль при этом не теряется."
    Log "==================================================================="
}

# Все клиенты PostgreSQL, которые вызывает лаунчер, читают пароль из PGPASSWORD.
# При trust переменная просто игнорируется, поэтому вызов безопасен в обоих
# состояниях кластера. Переменная живёт только в окружении процесса лаунчера и
# наследуется дочерними процессами; на диск она не попадает.
function Set-PgPasswordFromEnv {
    $password = Get-ConfiguredDbPassword
    if ($password) {
        $env:PGPASSWORD = $password
        return $true
    }
    return $false
}

# =============================================================================
# ГОТОВНОСТЬ СЕКРЕТОВ
#
# Лаунчер НЕ переключает NODE_ENV. Замерено на этой установке: при
# NODE_ENV=production сервер падает на старте дважды (AUTH_TOKEN_SECRET короче
# 32 символов; три флага DENTE_*_ALLOW_UNGUARDED_* равны 1), а если это починить,
# расписание начинает отвечать 503 без DENTE_SCHEDULE_ADMIN_SECRET. Тихо уронить
# запуск клиники нельзя, поэтому лаунчер делает ровно две вещи: создаёт
# недостающие секреты, которые можно создать безопасно, и печатает точный список
# того, что мешает переключению. Само переключение — отдельное решение человека.
# =============================================================================
function Ensure-InstallationSecrets {
    Log "Проверка секретов установки..."

    # 1. Ключ шифрования резервных копий. Его отсутствие означает, что штатный
    #    демон копий (apps/api/src/services/backupWorker.ts) ОТКЛЮЧЁН и не создал
    #    ни одной копии, а кнопка бэкапа шифровала бы копию публичной константой.
    if (-not (Get-ProjectEnvValue -Name "CLINIC_ENCRYPTION_KEY")) {
        $key = New-RandomSecret -Length 32
        if (Add-ProjectEnvValue -Name "CLINIC_ENCRYPTION_KEY" -Value $key -Comment "Ключ шифрования резервных копий. Сгенерирован лаунчером. Без него копии не создаются.") {
            Log "Сгенерирован CLINIC_ENCRYPTION_KEY (значение не печатается)."
            Log "ВАЖНО: сохраните apps\api\.env отдельно от папки backups."
            Log "Ключ и копии на одном носителе означают отсутствие защиты."
        }
    }

    # 2. Секрет подписи токенов. СУЩЕСТВУЮЩЕЕ значение не трогаем никогда:
    #    его замена разлогинит весь персонал клиники посреди рабочего дня.
    $authSecret = Get-ProjectEnvValue -Name "AUTH_TOKEN_SECRET"
    if (-not $authSecret) {
        $generated = New-RandomSecret -Length 48
        if (Add-ProjectEnvValue -Name "AUTH_TOKEN_SECRET" -Value $generated -Comment "Секрет подписи сессионных токенов. Сгенерирован лаунчером.") {
            Log "Сгенерирован AUTH_TOKEN_SECRET (значение не печатается)."
        }
    } elseif ($authSecret.Length -lt 32) {
        Log "ПРЕДУПРЕЖДЕНИЕ: AUTH_TOKEN_SECRET короче 32 символов ($($authSecret.Length))."
        Log "Для рабочего режима он не годится; менять его на ходу нельзя —"
        Log "все сотрудники будут разлогинены. Замена планируется отдельно."
    }

    # 3. Отчёт о готовности к рабочему режиму. Только чтение и печать.
    $blockers = @()
    if (-not $authSecret -or $authSecret.Length -lt 32) { $blockers += "AUTH_TOKEN_SECRET короче 32 символов" }
    foreach ($flag in @(
        "DENTE_CLINICAL_ALLOW_UNGUARDED_READS",
        "DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS",
        "DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS",
        "DENTE_DEV_ALLOW_HEADER_ORG",
        "DENTE_ALLOW_DEMO_LOGIN",
        "DENTE_ALLOW_DEMO_FIXTURES")) {
        if ((Get-ProjectEnvValue -Name $flag) -eq "1") { $blockers += "$flag=1 (сервер откажется стартовать)" }
    }
    foreach ($required in @(
        "WEB_ORIGIN",
        "DENTE_SCHEDULE_ADMIN_SECRET",
        "DENTE_CLINICAL_ADMIN_SECRET")) {
        if (-not (Get-ProjectEnvValue -Name $required)) { $blockers += "$required не задан" }
    }

    if ($blockers.Count -eq 0) {
        Log "Секреты в порядке. Переключение в рабочий режим возможно."
    } else {
        Log "Система работает в режиме РАЗРАБОТКИ (NODE_ENV=development)."
        Log "Мешает переходу в рабочий режим:"
        foreach ($item in $blockers) { Log "  - $item" }
        Log "Без DENTE_SCHEDULE_ADMIN_SECRET запись на приём отвечает 503."
        Log "Переключение выполняется отдельно, не этим лаунчером."
    }
}

$startButton.Add_Click({
    $startButton.Enabled = $false
    $backupButton.Enabled = $false
    $restoreButton.Enabled = $false
    $vacuumButton.Enabled = $false
    $statusLabel.Text = "Статус: Запуск..."
    $statusLabel.ForeColor = [System.Drawing.Color]::Orange
    Log "Инициализация локального сервера..."

    Create-DesktopShortcut
    Setup-Firewall
    Ensure-InstallationSecrets

    # Check Node.js
    $nodeDir = Join-Path $PWD ".node"
    if (-not (Test-Path "$nodeDir\node.exe")) {
        $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
        if (-not $nodeCheck) {
            Log "Поиск Node.js... Не найден! Устанавливаю портативную версию..."
            $nodeZipPath = Join-Path $PWD "node.zip"
            try {
                Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.15.0/node-v20.15.0-win-x64.zip" -OutFile $nodeZipPath -UseBasicParsing
                Log "Распаковка Node.js (v20.15.0)..."
                Expand-Archive -Path $nodeZipPath -DestinationPath $PWD -Force
                Rename-Item -Path "node-v20.15.0-win-x64" -NewName ".node"
                Remove-Item $nodeZipPath
            } catch {
                Log "ОШИБКА скачивания Node.js: $_"
                $startButton.Enabled = $true
                return
            }
        }
    }
    
    if (Test-Path "$nodeDir\node.exe") {
        $env:Path = "$nodeDir;" + $env:Path
        Log "Используется портативный Node.js из .node/"
    }

    # Setup PostgreSQL Portable
    $pgDir = Join-Path $PWD ".postgres"
    if (-not (Test-Path "$pgDir\bin\postgres.exe")) {
        Log "Скачивание Portable PostgreSQL (около 120МБ)..."
        $zipPath = Join-Path $PWD "pg.zip"
        $pwFile = Join-Path $env:TEMP "dente_initdb_pw.txt"
        try {
            Invoke-WebRequest -Uri "https://get.enterprisedb.com/postgresql/postgresql-14.13-1-windows-x64-binaries.zip" -OutFile $zipPath
            Log "Распаковка архива..."
            Expand-Archive -Path $zipPath -DestinationPath $PWD -Force
            Rename-Item -Path "pgsql" -NewName ".postgres"
            Remove-Item $zipPath

            # НОВАЯ УСТАНОВКА: пароль обязателен, метод scram-sha-256.
            # БЫЛО: "-U dental -A trust" — база медицинских данных без пароля.
            #
            # Пароль берём из уже настроенной DATABASE_URL, а не придумываем свой:
            # приложение читает строку подключения только оттуда
            # (apps/api/src/db/client.ts:27), и пароль, которого нет в DATABASE_URL,
            # означает базу, к которой не может подключиться сама система.
            # Если DATABASE_URL не настроена — генерируем пароль и дописываем её.
            $dbPassword = Get-ConfiguredDbPassword
            if (-not $dbPassword) {
                $dbPassword = New-RandomSecret -Length 32
                Add-ProjectEnvValue -Name "DATABASE_URL" -Value "postgres://dental:$dbPassword@127.0.0.1:5432/dental_crm" -Comment "Строка подключения. Пароль сгенерирован лаунчером при создании базы." | Out-Null
                Log "DATABASE_URL не была настроена: создана с новым паролем."
            } else {
                Log "Пароль базы взят из настроенной DATABASE_URL."
            }

            # initdb читает пароль только из файла или с терминала; терминала у
            # скрытого окна нет. Файл кладём во временную папку пользователя,
            # снимаем наследование прав и удаляем сразу после initdb.
            [System.IO.File]::WriteAllText($pwFile, $dbPassword, (New-Object System.Text.UTF8Encoding($false)))
            $acl = Get-Acl $pwFile
            $acl.SetAccessRuleProtection($true, $false)
            $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
                [System.Security.Principal.WindowsIdentity]::GetCurrent().Name, "FullControl", "Allow")
            $acl.SetAccessRule($rule)
            Set-Acl -Path $pwFile -AclObject $acl

            Log "Инициализация базы данных (initdb, метод scram-sha-256)..."
            Start-Process -FilePath "$pgDir\bin\initdb.exe" -ArgumentList "-U dental -A scram-sha-256 --pwfile=`"$pwFile`" -D `"$pgDir\data`" -E UTF8" -Wait -NoNewWindow
        } catch {
            Log "ОШИБКА скачивания или настройки PostgreSQL: $_"
            $startButton.Enabled = $true
            return
        } finally {
            if (Test-Path $pwFile) { Remove-Item $pwFile -Force -ErrorAction SilentlyContinue }
        }
    }

    # Пароль для psql/createdb/pg_dump этого же процесса. При trust игнорируется.
    if (-not (Set-PgPasswordFromEnv)) {
        Log "ПРЕДУПРЕЖДЕНИЕ: пароль базы не найден в DATABASE_URL."
    }

    # СУЩЕСТВУЮЩАЯ УСТАНОВКА: метод аутентификации НЕ меняем.
    # Переход trust -> scram-sha-256 без обмена аутентификацией не имеет отката
    # в пределах одной операции: роль dental создана без пароля, и смена метода
    # раньше выдачи пароля отрезает клинику от базы. Здесь только предупреждение
    # и ручная процедура, выполнить которую должен человек.
    if (Test-ClusterUsesTrust -DataDir "$pgDir\data") {
        Warn-AboutTrustAuthentication -DataDir "$pgDir\data"
    }

    Log "Запуск PostgreSQL (с оптимизацией памяти: 128MB buffers, 4MB work_mem)..."
    $global:postgresProcess = Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "start -D `"$pgDir\data`" -l `"$pgDir\data\pg.log`" -w -o `"-c shared_buffers=128MB -c work_mem=4MB`"" -WindowStyle Hidden -PassThru

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
    $vacuumButton.Enabled = $true
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
    $vacuumButton.Enabled = $true
})

$backupButton.Add_Click({
    Log "=== НАЧАЛО БЭКАПА ==="
    $pgDir = Join-Path $PWD ".postgres"
    if (-not (Test-Path "$pgDir\bin\pg_dump.exe")) {
        Log "ОШИБКА: PostgreSQL не найден. Сначала запустите сервер 1 раз."
        return
    }

    # Ключ обязателен. Без него копия либо не шифруется вовсе, либо шифруется
    # публичной константой — оба варианта недопустимы для медицинских данных.
    $backupKey = Get-BackupEncryptionKey
    if (-not $backupKey) {
        Log "ОШИБКА: CLINIC_ENCRYPTION_KEY не задан или короче 32 байт."
        Log "Копия НЕ создана: незашифрованная выгрузка медицинской базы"
        Log "недопустима. Нажмите ЗАПУСТИТЬ — лаунчер создаст ключ сам."
        return
    }

    $backupDir = Join-Path $PWD "backups"
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }

    # Имя по образцу backupWorker.ts: под него подпадает штатная очистка старых
    # копий (pruneOldBackups, DENTE_BACKUP_RETENTION_DAYS). Прежние backup_*.sql.aes
    # под неё не подпадали и копились на диске клиники без ограничения.
    $fileName = "dente_crm_backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').sql.enc"
    $filePath = Join-Path $backupDir $fileName

    $pgIsRunning = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
    $startedLocally = $false
    if (-not $pgIsRunning) {
        Log "Поднимаю БД для бэкапа..."
        Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "start -D `"$pgDir\data`" -l `"$pgDir\data\pg.log`" -w -o `"-c shared_buffers=128MB -c work_mem=4MB`"" -WindowStyle Hidden -Wait
        $startedLocally = $true
    }

    Set-PgPasswordFromEnv | Out-Null

    Log "Сохраняю базу данных в файл $fileName..."
    # БЫЛО: cmd /c pg_dump ... > file, затем шифрование, затем удаление открытого
    # файла. Открытая выгрузка медицинской базы лежала на диске всё время работы
    # pg_dump, а при ошибке шифрования (catch только писал в лог) оставалась там
    # навсегда. Теперь stdout процесса шифруется на лету, открытого файла нет.
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "$pgDir\bin\pg_dump.exe"
    $psi.Arguments = "-U dental -C --clean --if-exists dental_crm"
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    if ($env:PGPASSWORD) { $psi.EnvironmentVariables["PGPASSWORD"] = $env:PGPASSWORD }

    $ok = $false
    $stderrText = ""
    try {
        $proc = [System.Diagnostics.Process]::Start($psi)
        # stderr читаем асинхронно: полный буфер трубы иначе останавливает pg_dump.
        $stderrTask = $proc.StandardError.ReadToEndAsync()
        Protect-StreamToFile -InputStream $proc.StandardOutput.BaseStream -Key $backupKey -OutPath $filePath
        $proc.WaitForExit()
        $stderrText = $stderrTask.Result
        $ok = ($proc.ExitCode -eq 0)
        if (-not $ok) { Log "Ошибка при создании бэкапа! Код: $($proc.ExitCode)" }
    } catch {
        Log "ОШИБКА при создании бэкапа: $_"
        $ok = $false
    }

    if ($ok) {
        # Файл из одного IV означает пустой дамп: такую копию хранить нельзя,
        # она выглядит рабочей и не восстанавливается.
        $size = (Get-Item $filePath -ErrorAction SilentlyContinue).Length
        if ($size -gt 80) {
            Log "Бэкап УСПЕШНО сохранен и зашифрован: $filePath"
            Log "Размер: $([math]::Round($size / 1024)) КБ"
        } else {
            Log "ОШИБКА: дамп пустой, копия удалена."
            Remove-Item $filePath -Force -ErrorAction SilentlyContinue
        }
    } else {
        if ($stderrText) { Log "pg_dump: $($stderrText.Trim())" }
        # Недописанный шифротекст удаляем: иначе в папке копятся файлы
        # правильного вида и ненулевого размера, которые не расшифровать.
        Remove-Item $filePath -Force -ErrorAction SilentlyContinue
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
    $openFileDialog.Filter = "Зашифрованные копии (*.sql.enc;*.sql.aes)|*.sql.enc;*.sql.aes|SQL Files (*.sql)|*.sql|All Files (*.*)|*.*"
    $openFileDialog.Title = "Выберите файл резервной копии"

    if ($openFileDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $restoreFile = $openFileDialog.FileName
        Log "Выбран файл: $restoreFile"
        Log "ВНИМАНИЕ: Текущая база будет затерта!"

        $targetSqlFile = $restoreFile
        $isEncrypted = $false

        # Открытый дамп кладём во временную папку пользователя, а не рядом с
        # копией: папка backups может лежать на флешке, и открытая медицинская
        # выгрузка оставалась бы на съёмном носителе после сбоя восстановления.
        $plainTempFile = Join-Path $env:TEMP ("dente_restore_" + [System.Guid]::NewGuid().ToString("N") + ".sql")

        if ($restoreFile.EndsWith(".sql.enc")) {
            # Текущий формат: AES-256-CBC, случайный IV в первых 16 байтах,
            # ключ CLINIC_ENCRYPTION_KEY. Тот же формат пишет штатный демон копий.
            $isEncrypted = $true
            $backupKey = Get-BackupEncryptionKey
            if (-not $backupKey) {
                Log "ОШИБКА: CLINIC_ENCRYPTION_KEY не задан — расшифровать нечем."
                Log "Ключ хранится в apps\api\.env той установки, что делала копию."
                return
            }
            Log "Расшифровка файла (AES-256-CBC)..."
            $targetSqlFile = $plainTempFile
            try {
                Unprotect-EncFile -Path $restoreFile -Key $backupKey -OutPath $targetSqlFile
            } catch {
                Log "ОШИБКА расшифровки (неверный ключ или поврежден файл): $_"
                Remove-Item $targetSqlFile -Force -ErrorAction SilentlyContinue
                return
            }
        } elseif ($restoreFile.EndsWith(".aes")) {
            # УСТАРЕВШИЙ ФОРМАТ. Копии, сделанные до перехода на CLINIC_ENCRYPTION_KEY,
            # зашифрованы паролем-константой из исходников. Читать их клиника обязана
            # уметь и дальше: иначе правка безопасности уничтожает существующий архив.
            $isEncrypted = $true
            Log "Файл в устаревшем формате (.aes), ключ-константа из исходников."
            Log "Расшифровка..."
            $targetSqlFile = $plainTempFile
            try {
                Unprotect-LegacyAesFile -Path $restoreFile -Password $global:LegacyBackupPassword -OutPath $targetSqlFile
                Log "Рекомендация: после восстановления сделайте новую копию —"
                Log "она будет зашифрована ключом этой установки, а не общей константой."
            } catch {
                Log "ОШИБКА расшифровки (неверный ключ или поврежден файл): $_"
                Remove-Item $targetSqlFile -Force -ErrorAction SilentlyContinue
                return
            }
        }

        $pgIsRunning = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
        $startedLocally = $false
        if (-not $pgIsRunning) {
            Log "Поднимаю БД для восстановления..."
            Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "start -D `"$pgDir\data`" -l `"$pgDir\data\pg.log`" -w -o `"-c shared_buffers=128MB -c work_mem=4MB`"" -WindowStyle Hidden -Wait
            $startedLocally = $true
        }

        Set-PgPasswordFromEnv | Out-Null

        Log "Восстанавливаю базу (psql)..."
        $p = Start-Process "cmd.exe" -ArgumentList "/c `"$pgDir\bin\psql.exe`" -U dental -d postgres -f `"$targetSqlFile`"" -Wait -NoNewWindow -PassThru

        if ($p.ExitCode -eq 0) {
            Log "База данных УСПЕШНО восстановлена."
        } else {
            Log "Ошибка при восстановлении! Код: $($p.ExitCode)"
        }

        if ($isEncrypted -and (Test-Path $targetSqlFile)) {
            Log "Удаление временного расшифрованного файла..."
            Remove-Item $targetSqlFile -Force
        }
        
        if ($startedLocally) {
            Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "stop -D `"$pgDir\data`"" -Wait -NoNewWindow
        }
    } else {
        Log "Восстановление отменено пользователем."
    }
    Log "=== ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ==="
})

$vacuumButton.Add_Click({
    Log "=== ОПТИМИЗАЦИЯ БД (VACUUM ANALYZE) ==="
    $pgDir = Join-Path $PWD ".postgres"
    if (-not (Test-Path "$pgDir\bin\psql.exe")) {
        Log "ОШИБКА: PostgreSQL не найден."
        return
    }
    
    $pgIsRunning = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
    $startedLocally = $false
    if (-not $pgIsRunning) {
        Log "Поднимаю БД для оптимизации..."
        Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "start -D `"$pgDir\data`" -l `"$pgDir\data\pg.log`" -w -o `"-c shared_buffers=128MB -c work_mem=4MB`"" -WindowStyle Hidden -Wait
        $startedLocally = $true
    }
    
    Log "Запуск VACUUM ANALYZE (освобождение диска и обновление индексов)..."
    Set-PgPasswordFromEnv | Out-Null
    $p = Start-Process "cmd.exe" -ArgumentList "/c `"$pgDir\bin\psql.exe`" -U dental -d dental_crm -c `"VACUUM ANALYZE;`"" -Wait -NoNewWindow -PassThru
    
    if ($p.ExitCode -eq 0) {
        Log "Оптимизация базы данных УСПЕШНО завершена."
    } else {
        Log "Ошибка при оптимизации! Код: $($p.ExitCode)"
    }
    
    if ($startedLocally) {
        Log "Останавливаю БД..."
        Start-Process -FilePath "$pgDir\bin\pg_ctl.exe" -ArgumentList "stop -D `"$pgDir\data`"" -Wait -NoNewWindow
    }
})

$form.Add_FormClosing({
    if ($statusLabel.Text -eq "Статус: Работает") {
        $stopButton.PerformClick()
    }
})

Log "DENTE CRM Launcher готов. Нажмите ЗАПУСТИТЬ."
[System.Windows.Forms.Application]::Run($form)
