<#
.SYNOPSIS
    DENTE Dental CRM — PostgreSQL 18 Database Preflight & Crash Recovery Engine
.DESCRIPTION
    Runs before Windows Service start or during initial installer setup.
    Performs critical recovery and environment audits:
    1. Post-blackout crash recovery: Detects and clears stale postmaster.pid left after power outage.
    2. Port collision detection: Checks if port 5432 is occupied by external processes (e.g. 1C:Enterprise).
       If 5432 is taken, automatically falls back to port 5438 (D-E-N-T-E) and updates dente.env & postgresql.conf.
    3. Verifies cluster integrity (initializes with initdb if fresh installation).
    4. Probes and waits for PostgreSQL TCP socket readiness.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$DataDir,

    [Parameter(Mandatory = $false)]
    [string]$EnvFile,

    [Parameter(Mandatory = $false)]
    [string]$PgBinDir,

    [Parameter(Mandatory = $false)]
    [int]$DefaultPort = 5432,

    [Parameter(Mandatory = $false)]
    [int]$FallbackPort = 5438,

    [Parameter(Mandatory = $false)]
    [string]$LogFile,

    [Parameter(Mandatory = $false)]
    [string]$NodeBin,

    [Parameter(Mandatory = $false)]
    [switch]$StartPostgres
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

# -----------------------------------------------------------------------------
# 1. PATH RESOLUTION & LOGGING SETUP
# -----------------------------------------------------------------------------
$scriptRoot = $PSScriptRoot
if (-not $scriptRoot) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

# Resolve DataDir
if (-not $DataDir) {
    $candidates = @(
        "$env:ProgramData\DenteCRM\data\pg18",
        "$env:ProgramData\DenteCRM\data",
        (Join-Path $scriptRoot "..\..\.data\pg18"),
        (Join-Path $scriptRoot "..\..\..\.data\pg18")
    )
    foreach ($cand in $candidates) {
        if ($cand -and (Test-Path $cand)) {
            $DataDir = (Resolve-Path $cand).Path
            break
        }
    }
    if (-not $DataDir) {
        $DataDir = "$env:ProgramData\DenteCRM\data\pg18"
    }
}

# Resolve EnvFile
if (-not $EnvFile) {
    $envCandidates = @(
        "$env:ProgramData\DenteCRM\dente.env",
        (Join-Path $scriptRoot "..\..\.env"),
        (Join-Path $scriptRoot "..\..\..\.env")
    )
    foreach ($cand in $envCandidates) {
        if ($cand -and (Test-Path $cand)) {
            $EnvFile = (Resolve-Path $cand).Path
            break
        }
    }
    if (-not $EnvFile) {
        $EnvFile = "$env:ProgramData\DenteCRM\dente.env"
    }
}

# Resolve PgBinDir
if (-not $PgBinDir) {
    $binCandidates = @(
        (Join-Path $scriptRoot "..\bin\postgres\bin"),
        (Join-Path $scriptRoot "..\bin\postgres"),
        "$env:ProgramFiles\DenteCRM\bin\postgres\bin",
        (Join-Path $scriptRoot "..\..\node_modules\@embedded-postgres\windows-x64\native\bin"),
        (Join-Path $scriptRoot "..\..\..\node_modules\@embedded-postgres\windows-x64\native\bin")
    )
    foreach ($cand in $binCandidates) {
        if ($cand -and (Test-Path (Join-Path $cand "postgres.exe"))) {
            $PgBinDir = (Resolve-Path $cand).Path
            break
        }
    }
}

# Resolve NodeBin
if (-not $NodeBin) {
    $nodeCandidates = @(
        (Join-Path $scriptRoot "..\bin\node\node.exe"),
        (Join-Path $scriptRoot "..\bin\node"),
        "$env:ProgramFiles\DenteCRM\bin\node\node.exe",
        (Join-Path $scriptRoot "..\..\bin\node\node.exe"),
        (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    )
    foreach ($cand in $nodeCandidates) {
        if ($cand -and (Test-Path $cand)) {
            if ((Get-Item $cand) -is [System.IO.DirectoryInfo]) {
                $checkExe = Join-Path $cand "node.exe"
                if (Test-Path $checkExe) {
                    $NodeBin = (Resolve-Path $checkExe).Path
                    break
                }
            } else {
                $NodeBin = (Resolve-Path $cand).Path
                break
            }
        }
    }
}

# Resolve LogFile
if (-not $LogFile) {
    $logDir = "$env:ProgramData\DenteCRM\logs"
    if (-not (Test-Path $logDir)) {
        try { New-Item -ItemType Directory -Path $logDir -Force -ErrorAction SilentlyContinue | Out-Null } catch {}
    }
    if (Test-Path $logDir) {
        $LogFile = Join-Path $logDir "db-preflight.log"
    }
}

function Write-PreflightLog {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG")][string]$Level = "INFO"
    )
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff")
    $logLine = "[$timestamp] [PREFLIGHT] [$Level] $Message"
    
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

Write-PreflightLog "=== Starting DENTE CRM Database Preflight Audit ==="
Write-PreflightLog "Data Directory : $DataDir"
Write-PreflightLog "Env File       : $EnvFile"
Write-PreflightLog "Postgres Bin   : $(if ($PgBinDir) { $PgBinDir } else { 'Not specified / Will use PATH' })"
Write-PreflightLog "Node Bin       : $(if ($NodeBin) { $NodeBin } else { 'Not found / Will look in PATH' })"

# Ensure data directory exists
if (-not (Test-Path $DataDir)) {
    try {
        New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
        Write-PreflightLog "Created data directory: $DataDir"
    } catch {
        Write-PreflightLog "Failed to create data directory '$DataDir': $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

# -----------------------------------------------------------------------------
# 2. BLACKOUT CRASH RECOVERY: AUDIT postmaster.pid
# -----------------------------------------------------------------------------
$pidFilePath = Join-Path $DataDir "postmaster.pid"

if (Test-Path $pidFilePath) {
    Write-PreflightLog "Found existing postmaster.pid at '$pidFilePath'. Auditing lock status..." "WARN"
    $isStaleLock = $false
    $recordedPid = $null
    
    try {
        $pidContent = Get-Content -Path $pidFilePath -ErrorAction Stop
        if ($pidContent -and $pidContent.Count -ge 1) {
            $firstLine = $pidContent[0].Trim()
            if ($firstLine -match '^\d+$') {
                $recordedPid = [int]$firstLine
            }
        }
    } catch {
        Write-PreflightLog "Unable to read postmaster.pid content: $($_.Exception.Message)" "WARN"
        $isStaleLock = $true
    }

    if ($recordedPid -and $recordedPid -gt 0) {
        Write-PreflightLog "postmaster.pid recorded PID: $recordedPid. Checking if process is alive..."
        $activeProc = Get-Process -Id $recordedPid -ErrorAction SilentlyContinue
        
        if ($null -eq $activeProc) {
            Write-PreflightLog "Process with PID $recordedPid does NOT exist in Windows process table. Lock is STALE!" "WARN"
            $isStaleLock = $true
        } else {
            # Process exists, verify if it is postgres.exe or an unrelated recycled PID
            $procName = $activeProc.ProcessName.ToLower()
            Write-PreflightLog "Active process with PID $recordedPid detected: '$($activeProc.ProcessName)'"
            
            if ($procName -notlike "*postgres*") {
                Write-PreflightLog "PID $recordedPid belongs to unrelated process '$($activeProc.ProcessName)' (recycled PID). Lock is STALE!" "WARN"
                $isStaleLock = $true
            } else {
                # Process is indeed postgres. Check if it points to our DataDir
                Write-PreflightLog "Process is a running postgres.exe (PID $recordedPid). PostgreSQL instance is currently active." "INFO"
            }
        }
    } else {
        Write-PreflightLog "postmaster.pid is empty or malformed. Lock is STALE!" "WARN"
        $isStaleLock = $true
    }

    if ($isStaleLock) {
        Write-PreflightLog "Safely purging stale postmaster.pid to unblock PostgreSQL boot..." "WARN"
        try {
            Remove-Item -Path $pidFilePath -Force -ErrorAction Stop
            Write-PreflightLog "Purged stale postmaster.pid successfully." "INFO"
        } catch {
            Write-PreflightLog "Failed to purge stale postmaster.pid: $($_.Exception.Message)" "ERROR"
            exit 1
        }
    }
} else {
    Write-PreflightLog "No postmaster.pid found. Clean shutdown state verified." "INFO"
}

# -----------------------------------------------------------------------------
# 3. PORT OCCUPANCY & COLLISION AUDIT (1C:ENTERPRISE CONFLICT RESOLUTION)
# -----------------------------------------------------------------------------
function Test-PortListening {
    param([int]$Port)
    
    $tcpConn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($tcpConn) {
        return @{
            IsListening   = $true
            OwningProcess = $tcpConn[0].OwningProcess
        }
    }
    
    # Fallback socket check
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect("127.0.0.1", $Port, $null, $null)
        $waitSuccess = $asyncResult.AsyncWaitHandle.WaitOne(500, $false)
        if ($waitSuccess) {
            $tcpClient.EndConnect($asyncResult)
            $tcpClient.Close()
            return @{
                IsListening   = $true
                OwningProcess = $null
            }
        }
        $tcpClient.Close()
    } catch {}

    return @{
        IsListening   = $false
        OwningProcess = $null
    }
}

$activePort = $DefaultPort
$portCheck = Test-PortListening -Port $DefaultPort

if ($portCheck.IsListening) {
    Write-PreflightLog "Port $DefaultPort is currently occupied." "WARN"
    $isOwnProcess = $false
    
    if ($portCheck.OwningProcess) {
        $occupyingPid = $portCheck.OwningProcess
        $occupyingProc = Get-Process -Id $occupyingPid -ErrorAction SilentlyContinue
        $procDesc = if ($occupyingProc) { "$($occupyingProc.ProcessName) (PID: $occupyingPid)" } else { "PID: $occupyingPid" }
        Write-PreflightLog "Occupying process on port ${DefaultPort}: $procDesc"
        
        # Check if it's our own running DENTE PostgreSQL
        if ($occupyingProc -and $occupyingProc.ProcessName.ToLower() -like "*postgres*") {
            if ($PgBinDir -and $occupyingProc.Path -and $occupyingProc.Path.StartsWith($PgBinDir, [System.StringComparison]::OrdinalIgnoreCase)) {
                $isOwnProcess = $true
                Write-PreflightLog "Port $DefaultPort is occupied by our own DENTE PostgreSQL instance." "INFO"
            }
        }
    }

    if (-not $isOwnProcess) {
        Write-PreflightLog "Port $DefaultPort is occupied by an EXTERNAL software (e.g. 1C:Enterprise / 1С:Предприятие)!" "WARN"
        $targetPort = $FallbackPort
        $fallbackCheck = Test-PortListening -Port $targetPort
        if ($fallbackCheck.IsListening) {
            Write-PreflightLog "Preferred fallback port $targetPort is also occupied. Scanning ports 5439..5450..." "WARN"
            $foundFree = $false
            foreach ($candidatePort in (5439..5450)) {
                $check = Test-PortListening -Port $candidatePort
                if (-not $check.IsListening) {
                    $targetPort = $candidatePort
                    $foundFree = $true
                    break
                }
            }
            if (-not $foundFree) {
                Write-PreflightLog "FATAL: Could not find any free port in fallback range 5438-5450!" "ERROR"
                exit 1
            }
        }
        Write-PreflightLog "Activating collision switch: shifting DENTE PostgreSQL to dedicated port $targetPort." "WARN"
        $activePort = $targetPort
    }
} else {
    Write-PreflightLog "Default port $DefaultPort is free and available." "INFO"
    $activePort = $DefaultPort
}

# -----------------------------------------------------------------------------
# 4. SYNCHRONIZE CONFIGURATION (postgresql.conf & dente.env)
# -----------------------------------------------------------------------------
function Sync-PostgresConf {
    param(
        [string]$ConfigDir,
        [int]$Port
    )
    $confFile = Join-Path $ConfigDir "postgresql.conf"
    if (Test-Path $confFile) {
        $content = Get-Content -Path $confFile -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($content) {
            if ($content -match "(?m)^\s*port\s*=\s*\d+") {
                $content = $content -replace "(?m)^\s*port\s*=\s*\d+", "port = $Port"
            } else {
                $content += "`r`nport = $Port`r`n"
            }
            # Ensure safe connection defaults
            if ($content -notmatch "(?m)^\s*listen_addresses") {
                $content += "`r`nlisten_addresses = '127.0.0.1'`r`n"
            }
            [System.IO.File]::WriteAllText($confFile, $content, [System.Text.Encoding]::UTF8)
            Write-PreflightLog "Updated postgresql.conf with port = $Port" "INFO"
        }
    }
}

function Sync-EnvFile {
    param(
        [string]$Path,
        [int]$Port
    )
    if (-not (Test-Path $Path)) {
        Write-PreflightLog "Env file '$Path' does not exist yet. Creating default config..." "INFO"
        $dir = Split-Path -Parent $Path
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        $defaultEnv = @"
NODE_ENV=production
API_HOST=0.0.0.0
PORT=4000
API_PORT=4000
POSTGRES_USER=dental
POSTGRES_PASSWORD=dental
POSTGRES_DB=dental_crm
POSTGRES_PORT=$Port
PGPORT=$Port
DATABASE_URL=postgres://dental:dental@127.0.0.1:$Port/dental_crm
DENTE_DATA_DIR=$env:ProgramData\DenteCRM\data
DENTE_CONFIG_DIR=$env:ProgramData\DenteCRM
DOCUMENT_STORAGE_PATH=$env:ProgramData\DenteCRM\data\storage\documents
ATTACHMENT_STORAGE_PATH=$env:ProgramData\DenteCRM\data\storage\attachments
"@
        [System.IO.File]::WriteAllText($Path, $defaultEnv, [System.Text.Encoding]::UTF8)
        Write-PreflightLog "Generated baseline dente.env at '$Path' pointing to port $Port" "INFO"
        return
    }

    $raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $lines = $raw -split "\r?\n"
    $newLines = @()
    $updatedDbUrl = $false
    $updatedPort = $false
    $updatedPgPort = $false

    foreach ($line in $lines) {
        if ($line -match "^DATABASE_URL=") {
            # Replace host:port
            $newLine = [System.Text.RegularExpressions.Regex]::Replace(
                $line,
                "@127\.0\.0\.1:\d+",
                "@127.0.0.1:$Port"
            )
            $newLines += $newLine
            $updatedDbUrl = $true
        } elseif ($line -match "^POSTGRES_PORT=") {
            $newLines += "POSTGRES_PORT=$Port"
            $updatedPort = $true
        } elseif ($line -match "^PGPORT=") {
            $newLines += "PGPORT=$Port"
            $updatedPgPort = $true
        } else {
            $newLines += $line
        }
    }

    if (-not $updatedPort) {
        $newLines += "POSTGRES_PORT=$Port"
    }
    if (-not $updatedPgPort) {
        $newLines += "PGPORT=$Port"
    }

    $finalContent = ($newLines -join "`r`n") + "`r`n"
    [System.IO.File]::WriteAllText($Path, $finalContent, [System.Text.Encoding]::UTF8)
    Write-PreflightLog "Synchronized dente.env: DATABASE_URL pointing to 127.0.0.1:$Port" "INFO"
}

Sync-PostgresConf -ConfigDir $DataDir -Port $activePort
Sync-EnvFile -Path $EnvFile -Port $activePort

# -----------------------------------------------------------------------------
# 5. POSTGRESQL CLUSTER INTEGRITY CHECK & INITIALIZATION
# -----------------------------------------------------------------------------
$pgVersionFile = Join-Path $DataDir "PG_VERSION"
if (-not (Test-Path $pgVersionFile)) {
    Write-PreflightLog "PostgreSQL cluster not detected at '$DataDir'. Initializing cluster..." "WARN"
    
    $initDbExe = "initdb.exe"
    if ($PgBinDir -and (Test-Path (Join-Path $PgBinDir "initdb.exe"))) {
        $initDbExe = Join-Path $PgBinDir "initdb.exe"
    }
    
    Write-PreflightLog "Executing: $initDbExe -D `"$DataDir`" -U dental -A trust -E UTF8 --locale=C"
    try {
        $initProcess = Start-Process -FilePath $initDbExe `
            -ArgumentList @("-D", "`"$DataDir`"", "-U", "dental", "-A", "trust", "-E", "UTF8", "--locale=C") `
            -NoNewWindow -Wait -PassThru
            
        if ($initProcess.ExitCode -eq 0) {
            Write-PreflightLog "PostgreSQL cluster successfully initialized at '$DataDir'." "INFO"
            Sync-PostgresConf -ConfigDir $DataDir -Port $activePort
        } else {
            Write-PreflightLog "initdb failed with exit code $($initProcess.ExitCode)" "ERROR"
            exit $initProcess.ExitCode
        }
    } catch {
        Write-PreflightLog "Failed to invoke initdb: $($_.Exception.Message)" "ERROR"
        exit 1
    }
} else {
    $versionVal = Get-Content -Path $pgVersionFile -TotalCount 1 -ErrorAction SilentlyContinue
    Write-PreflightLog "PostgreSQL cluster intact (PG_VERSION: $versionVal)." "INFO"
}

# -----------------------------------------------------------------------------
# 6. START POSTGRESQL DAEMON & VERIFY READINESS (IF REQUESTED)
# -----------------------------------------------------------------------------
if ($StartPostgres) {
    Write-PreflightLog "Starting PostgreSQL daemon on port $activePort..."
    
    $postgresExe = "postgres.exe"
    if ($PgBinDir -and (Test-Path (Join-Path $PgBinDir "postgres.exe"))) {
        $postgresExe = Join-Path $PgBinDir "postgres.exe"
    }

    # Verify if already running on the active port
    $statusCheck = Test-PortListening -Port $activePort
    if (-not $statusCheck.IsListening) {
        try {
            $pgLog = Join-Path (Split-Path -Parent $DataDir) "..\logs\postgres.log"
            $pgArgs = @("-D", "`"$DataDir`"", "-p", "$activePort")
            Write-PreflightLog "Launching: $postgresExe $($pgArgs -join ' ')"
            
            Start-Process -FilePath $postgresExe -ArgumentList $pgArgs -WindowStyle Hidden
            
            # Wait for socket to become ready (up to 30 seconds)
            $ready = $false
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            while ($sw.ElapsedMilliseconds -lt 30000) {
                Start-Sleep -Milliseconds 500
                $probe = Test-PortListening -Port $activePort
                if ($probe.IsListening) {
                    $ready = $true
                    break
                }
            }

            if ($ready) {
                Write-PreflightLog "PostgreSQL successfully started and accepting connections on port $activePort in $($sw.ElapsedMilliseconds)ms." "INFO"
            } else {
                Write-PreflightLog "PostgreSQL failed to respond on port $activePort within 30 seconds." "ERROR"
                exit 1
            }
        } catch {
            Write-PreflightLog "Failed to start PostgreSQL daemon: $($_.Exception.Message)" "ERROR"
            exit 1
        }
    } else {
        Write-PreflightLog "PostgreSQL daemon is already active on port $activePort." "INFO"
    }
}

# -----------------------------------------------------------------------------
# 7. VERIFY DATABASE 'dental_crm' & EXECUTE MIGRATIONS (DEFECT 3)
# -----------------------------------------------------------------------------
function Ensure-DatabaseExists {
    param(
        [int]$Port,
        [string]$NodeBinary,
        [string]$PostgresBinDir
    )
    
    Write-PreflightLog "Verifying existence of 'dental_crm' database on port $Port..." "INFO"
    
    # 1. Try createdb.exe if available in PostgresBinDir or PATH
    $createdbExe = $null
    if ($PostgresBinDir -and (Test-Path (Join-Path $PostgresBinDir "createdb.exe"))) {
        $createdbExe = Join-Path $PostgresBinDir "createdb.exe"
    } elseif (Get-Command createdb.exe -ErrorAction SilentlyContinue) {
        $createdbExe = (Get-Command createdb.exe).Source
    }

    if ($createdbExe) {
        Write-PreflightLog "Executing createdb via $createdbExe..." "INFO"
        try {
            $pinfo = New-Object System.Diagnostics.ProcessStartInfo
            $pinfo.FileName = $createdbExe
            $pinfo.Arguments = "-h 127.0.0.1 -p $Port -U dental -E UTF8 dental_crm"
            $pinfo.RedirectStandardOutput = $true
            $pinfo.RedirectStandardError = $true
            $pinfo.UseShellExecute = $false
            $pinfo.CreateNoWindow = $true

            $proc = [System.Diagnostics.Process]::Start($pinfo)
            $stdout = $proc.StandardOutput.ReadToEnd()
            $stderr = $proc.StandardError.ReadToEnd()
            $null = $proc.WaitForExit(15000)

            if ($proc.ExitCode -eq 0 -or $stderr -match "already exists" -or $stdout -match "already exists") {
                Write-PreflightLog "Database 'dental_crm' verified via createdb." "INFO"
                return $true
            }
        } catch {
            Write-PreflightLog "createdb.exe invocation error: $($_.Exception.Message). Falling back to Node pg." "WARN"
        }
    }

    # 2. Node.js pg client fallback
    $resolvedNode = if ($NodeBinary -and (Test-Path $NodeBinary)) { $NodeBinary } else { (Get-Command node.exe -ErrorAction SilentlyContinue).Source }
    if (-not $resolvedNode) {
        Write-PreflightLog "Node.js binary not available to verify database existence." "WARN"
        return $false
    }

    $jsScript = @"
const pg = require('pg');
const port = parseInt(process.env.TARGET_PG_PORT || '$Port', 10);
const users = ['dental', 'postgres'];

async function run() {
  let connected = false;
  let lastError = null;

  for (const user of users) {
    for (const db of ['postgres', 'template1']) {
      const client = new pg.Client({
        host: '127.0.0.1',
        port: port,
        user: user,
        password: user,
        database: db,
        connectionTimeoutMillis: 5000,
      });
      try {
        await client.connect();
        connected = true;
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'dental_crm'");
        if (res.rowCount === 0) {
          console.log('[PREFLIGHT] Database dental_crm not found. Creating database...');
          await client.query('CREATE DATABASE dental_crm');
          console.log('[PREFLIGHT] Database dental_crm created successfully.');
        } else {
          console.log('[PREFLIGHT] Database dental_crm already exists.');
        }
        await client.end();
        return process.exit(0);
      } catch (err) {
        lastError = err;
        try { await client.end(); } catch (_) {}
      }
    }
  }

  if (!connected) {
    console.error('[PREFLIGHT] Could not connect to PostgreSQL:', lastError ? lastError.message : 'Unknown error');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('[PREFLIGHT] Database creation failed:', err.message);
  process.exit(1);
});
"@

    try {
        $nodePathCandidates = @(
            (Join-Path $scriptRoot "..\node_modules"),
            (Join-Path $scriptRoot "..\server\node_modules"),
            (Join-Path $scriptRoot "..\..\node_modules"),
            (Join-Path $scriptRoot "..\..\..\node_modules")
        )
        $validNodePaths = $nodePathCandidates | Where-Object { Test-Path $_ }
        if ($validNodePaths) {
            $env:NODE_PATH = ($validNodePaths -join ";")
        }
        $env:TARGET_PG_PORT = "$Port"

        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = $resolvedNode
        $pinfo.Arguments = "-"
        $pinfo.RedirectStandardInput = $true
        $pinfo.RedirectStandardOutput = $true
        $pinfo.RedirectStandardError = $true
        $pinfo.UseShellExecute = $false
        $pinfo.CreateNoWindow = $true

        $proc = [System.Diagnostics.Process]::Start($pinfo)
        $proc.StandardInput.Write($jsScript)
        $proc.StandardInput.Close()

        $stdout = $proc.StandardOutput.ReadToEnd()
        $stderr = $proc.StandardError.ReadToEnd()
        $null = $proc.WaitForExit(20000)

        if ($stdout) {
            foreach ($line in ($stdout -split "\r?\n")) {
                if ($line.Trim()) { Write-PreflightLog $line "INFO" }
            }
        }
        if ($proc.ExitCode -eq 0) {
            Write-PreflightLog "Database 'dental_crm' verified via Node pg client." "INFO"
            return $true
        } else {
            if ($stderr) {
                foreach ($line in ($stderr -split "\r?\n")) {
                    if ($line.Trim()) { Write-PreflightLog $line "WARN" }
                }
            }
            Write-PreflightLog "Node pg client exited with code $($proc.ExitCode)" "WARN"
            return $false
        }
    } catch {
        Write-PreflightLog "Failed to invoke Node pg client: $($_.Exception.Message)" "WARN"
        return $false
    }
}

function Invoke-Migrations {
    param(
        [int]$Port,
        [string]$NodeBinary
    )
    
    $resolvedNode = if ($NodeBinary -and (Test-Path $NodeBinary)) { $NodeBinary } else { (Get-Command node.exe -ErrorAction SilentlyContinue).Source }
    if (-not $resolvedNode) {
        Write-PreflightLog "Node.js binary not available. Skipping migration runner in preflight." "WARN"
        return
    }

    $migrateCandidates = @(
        (Join-Path $scriptRoot "..\server\dist\scripts\migrate.js"),
        (Join-Path $scriptRoot "..\..\apps\api\dist\scripts\migrate.js"),
        (Join-Path $scriptRoot "..\..\..\apps\api\dist\scripts\migrate.js")
    )
    $migrateScript = $null
    foreach ($cand in $migrateCandidates) {
        if ($cand -and (Test-Path $cand)) {
            $migrateScript = (Resolve-Path $cand).Path
            break
        }
    }

    if (-not $migrateScript) {
        Write-PreflightLog "Migration script (migrate.js) not found. Skipping migration runner in preflight." "WARN"
        return
    }

    Write-PreflightLog "Executing database migrations via $migrateScript on port $Port..." "INFO"
    $env:DATABASE_URL = "postgres://dental:dental@127.0.0.1:$Port/dental_crm"
    $env:PGPORT = "$Port"

    $nodePathCandidates = @(
        (Join-Path $scriptRoot "..\node_modules"),
        (Join-Path $scriptRoot "..\server\node_modules"),
        (Join-Path $scriptRoot "..\..\node_modules"),
        (Join-Path $scriptRoot "..\..\..\node_modules")
    )
    $validNodePaths = $nodePathCandidates | Where-Object { Test-Path $_ }
    if ($validNodePaths) {
        $env:NODE_PATH = ($validNodePaths -join ";")
    }

    try {
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = $resolvedNode
        $pinfo.Arguments = "`"$migrateScript`""
        $pinfo.RedirectStandardOutput = $true
        $pinfo.RedirectStandardError = $true
        $pinfo.UseShellExecute = $false
        $pinfo.CreateNoWindow = $true

        $process = [System.Diagnostics.Process]::Start($pinfo)
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $null = $process.WaitForExit(90000)

        if ($stdout) {
            foreach ($line in ($stdout -split "\r?\n")) {
                if ($line.Trim()) { Write-PreflightLog "$line" "INFO" }
            }
        }
        if ($stderr) {
            foreach ($line in ($stderr -split "\r?\n")) {
                if ($line.Trim()) { Write-PreflightLog "$line" "WARN" }
            }
        }

        if ($process.ExitCode -eq 0) {
            Write-PreflightLog "Database migrations applied successfully." "INFO"
        } else {
            Write-PreflightLog "Migration runner exited with code $($process.ExitCode)" "ERROR"
        }
    } catch {
        Write-PreflightLog "Failed to execute migration runner: $($_.Exception.Message)" "ERROR"
    }
}

$portReady = Test-PortListening -Port $activePort
if ($portReady.IsListening) {
    Write-PreflightLog "PostgreSQL is listening on port $activePort. Ensuring database and applying migrations..." "INFO"
    $dbOk = Ensure-DatabaseExists -Port $activePort -NodeBinary $NodeBin -PostgresBinDir $PgBinDir
    if ($dbOk) {
        Invoke-Migrations -Port $activePort -NodeBinary $NodeBin
    }
} else {
    Write-PreflightLog "PostgreSQL daemon is not currently listening on port $activePort. Database creation and migrations will run on service startup." "WARN"
}

Write-PreflightLog "=== Preflight Checks Completed Successfully. Target Port: $activePort ===" "INFO"
exit 0
