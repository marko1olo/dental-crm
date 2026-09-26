#!/usr/bin/env bash
# =============================================================================
# DENTE Dental CRM — PostgreSQL Database Preflight & Crash Recovery (macOS)
#
# Architected for macOS (Apple Silicon M1-M4 & Intel x86_64).
# Responsibilities:
# 1. Post-blackout crash recovery: Detects and purges dead postmaster.pid left
#    after sudden Mac shutdown, power cut, or kernel panic.
# 2. Port collision detection: Checks if port 5432 is taken by external software
#    (e.g., Postgres.app, system PostgreSQL, Docker). If occupied, automatically
#    shifts Dente to dedicated port 5438 (D-E-N-T-E) and syncs dente.env & postgresql.conf.
# 3. Cluster integrity verification & initdb if fresh installation.
# 4. Role & database bootstrap: Ensures role 'dental' and DB 'dental_crm' exist.
# =============================================================================

set -o pipefail

# -----------------------------------------------------------------------------
# 1. DEFAULT DIRECTORIES & CONFIGURATION
# -----------------------------------------------------------------------------
DENTE_APP_SUPPORT="${DENTE_APP_SUPPORT:-$HOME/Library/Application Support/DenteCRM}"
DENTE_DATA_DIR="${DENTE_DATA_DIR:-$DENTE_APP_SUPPORT/data}"
PG_DATA_DIR="${PG_DATA_DIR:-$DENTE_DATA_DIR/pg18}"
DENTE_LOG_DIR="${DENTE_LOG_DIR:-$HOME/Library/Logs/DenteCRM}"
DENTE_ENV_FILE="${DENTE_ENV_FILE:-$DENTE_APP_SUPPORT/dente.env}"

DEFAULT_PORT=5432
FALLBACK_PORT=5438
START_POSTGRES=false
CHECK_ONLY=false

# Parse CLI arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --data-dir)
            PG_DATA_DIR="$2"
            shift 2
            ;;
        --env-file)
            DENTE_ENV_FILE="$2"
            shift 2
            ;;
        --start|-s)
            START_POSTGRES=true
            shift
            ;;
        --check-only|-c)
            CHECK_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --data-dir <path>  Path to PostgreSQL cluster directory"
            echo "  --env-file <path>  Path to dente.env configuration file"
            echo "  --start, -s        Start PostgreSQL server after preflight"
            echo "  --check-only, -c   Run audits without altering files or starting DB"
            echo "  --help, -h         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown argument: $1"
            exit 1
            ;;
    esac
done

# Ensure logs directory exists
mkdir -p "$DENTE_LOG_DIR"
mkdir -p "$DENTE_DATA_DIR"
PREFLIGHT_LOG="$DENTE_LOG_DIR/db-preflight.log"

# -----------------------------------------------------------------------------
# 2. LOGGING HELPER
# -----------------------------------------------------------------------------
log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local color=""
    local reset=""

    if [[ -t 1 ]]; then
        case "$level" in
            INFO)  color="\033[0;32m" ;;
            WARN)  color="\033[0;33m" ;;
            ERROR) color="\033[0;31m" ;;
            DEBUG) color="\033[0;36m" ;;
        esac
        reset="\033[0m"
    fi

    local log_line="[$timestamp] [PREFLIGHT] [$level] $message"
    echo -e "${color}${log_line}${reset}"
    echo "$log_line" >> "$PREFLIGHT_LOG" 2>/dev/null || true
}

log "INFO" "=== Starting DENTE CRM Database Preflight Audit (macOS) ==="
log "INFO" "Data Directory : $PG_DATA_DIR"
log "INFO" "Env File       : $DENTE_ENV_FILE"
log "INFO" "Architecture   : $(uname -m)"

# -----------------------------------------------------------------------------
# 3. LOCATE POSTGRESQL BINARIES ON MACOS
# -----------------------------------------------------------------------------
locate_binary() {
    local bin_name="$1"
    local candidate

    # 1. Check explicit PG_BIN_DIR if provided
    if [[ -n "$PG_BIN_DIR" && -x "$PG_BIN_DIR/$bin_name" ]]; then
        echo "$PG_BIN_DIR/$bin_name"
        return 0
    fi

    # 2. Standard Homebrew locations (Apple Silicon /opt/homebrew & Intel /usr/local)
    local search_paths=(
        "/opt/homebrew/opt/postgresql@18/bin"
        "/opt/homebrew/opt/postgresql@17/bin"
        "/opt/homebrew/opt/postgresql@16/bin"
        "/opt/homebrew/opt/postgresql@15/bin"
        "/opt/homebrew/opt/postgresql@14/bin"
        "/opt/homebrew/bin"
        "/usr/local/opt/postgresql@18/bin"
        "/usr/local/opt/postgresql@17/bin"
        "/usr/local/opt/postgresql@16/bin"
        "/usr/local/opt/postgresql@15/bin"
        "/usr/local/opt/postgresql@14/bin"
        "/usr/local/bin"
        "/Applications/Postgres.app/Contents/Versions/latest/bin"
    )

    for path in "${search_paths[@]}"; do
        candidate="$path/$bin_name"
        if [[ -x "$candidate" ]]; then
            echo "$candidate"
            return 0
        fi
    done

    # 3. Fallback to current PATH
    if command -v "$bin_name" >/dev/null 2>&1; then
        command -v "$bin_name"
        return 0
    fi

    return 1
}

PG_CTL_BIN=$(locate_binary "pg_ctl" || true)
POSTGRES_BIN=$(locate_binary "postgres" || true)
INITDB_BIN=$(locate_binary "initdb" || true)
PSQL_BIN=$(locate_binary "psql" || true)
PG_ISREADY_BIN=$(locate_binary "pg_isready" || true)

if [[ -z "$PG_CTL_BIN" || -z "$POSTGRES_BIN" || -z "$INITDB_BIN" ]]; then
    log "ERROR" "PostgreSQL binaries (initdb, pg_ctl, postgres) were not found on this Mac."
    log "ERROR" "Please install PostgreSQL via Homebrew: brew install postgresql@17"
    exit 1
fi

log "INFO" "PostgreSQL bin : $(dirname "$PG_CTL_BIN")"

# -----------------------------------------------------------------------------
# 4. BLACKOUT CRASH RECOVERY: AUDIT postmaster.pid
# -----------------------------------------------------------------------------
PID_FILE="$PG_DATA_DIR/postmaster.pid"

if [[ -f "$PID_FILE" ]]; then
    log "WARN" "Found existing postmaster.pid at '$PID_FILE'. Auditing lock status..."
    IS_STALE=false
    RECORDED_PID=$(head -n 1 "$PID_FILE" | tr -d '[:space:]')

    if [[ "$RECORDED_PID" =~ ^[0-9]+$ ]] && [[ "$RECORDED_PID" -gt 0 ]]; then
        log "INFO" "postmaster.pid recorded PID: $RECORDED_PID. Verifying process status..."
        
        # Check if process is alive in macOS process table
        if ! ps -p "$RECORDED_PID" >/dev/null 2>&1; then
            log "WARN" "Process PID $RECORDED_PID does NOT exist in macOS process table. Lock is STALE!"
            IS_STALE=true
        else
            # Process exists, check if it's really postgres or a recycled PID
            PROC_COMM=$(ps -p "$RECORDED_PID" -o comm= 2>/dev/null || true)
            log "INFO" "Active process with PID $RECORDED_PID: '$PROC_COMM'"
            if [[ "$PROC_COMM" != *"postgres"* ]]; then
                log "WARN" "PID $RECORDED_PID belongs to unrelated process '$PROC_COMM' (recycled PID). Lock is STALE!"
                IS_STALE=true
            else
                log "INFO" "Process is an active postgres server (PID $RECORDED_PID)."
            fi
        fi
    else
        log "WARN" "postmaster.pid is empty or corrupt. Lock is STALE!"
        IS_STALE=true
    fi

    if [[ "$IS_STALE" == "true" ]]; then
        if [[ "$CHECK_ONLY" == "true" ]]; then
            log "WARN" "[Check-only] Stale postmaster.pid detected, removal skipped."
        else
            log "WARN" "Safely purging stale postmaster.pid to prevent startup failure..."
            rm -f "$PID_FILE"
            log "INFO" "Stale postmaster.pid successfully removed."
        fi
    fi
else
    log "INFO" "No postmaster.pid found. Clean shutdown verified."
fi

# -----------------------------------------------------------------------------
# 5. PORT OCCUPANCY & COLLISION RESOLUTION (Postgres.app / Docker / External DB)
# -----------------------------------------------------------------------------
is_port_listening() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
        return $?
    elif command -v nc >/dev/null 2>&1; then
        nc -z -w 1 127.0.0.1 "$port" >/dev/null 2>&1
        return $?
    fi
    return 1
}

get_port_owner_info() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        local pid
        pid=$(lsof -iTCP:"$port" -sTCP:LISTEN -n -P -t 2>/dev/null | head -n 1)
        if [[ -n "$pid" ]]; then
            local cmd
            cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
            echo "$pid|$cmd"
            return 0
        fi
    fi
    echo ""
}

ACTIVE_PORT=$DEFAULT_PORT

if is_port_listening "$DEFAULT_PORT"; then
    log "WARN" "Port $DEFAULT_PORT is currently occupied on 127.0.0.1."
    OWNER_INFO=$(get_port_owner_info "$DEFAULT_PORT")
    IS_OUR_PG=false

    if [[ -n "$OWNER_INFO" ]]; then
        OWNER_PID="${OWNER_INFO%%|*}"
        OWNER_CMD="${OWNER_INFO#*|}"
        log "INFO" "Port $DEFAULT_PORT owner: PID $OWNER_PID ($OWNER_CMD)"

        # Check if it is our own Dente PostgreSQL instance running this PG_DATA_DIR
        if [[ "$OWNER_CMD" == *"postgres"* && "$OWNER_CMD" == *"$PG_DATA_DIR"* ]]; then
            IS_OUR_PG=true
            log "INFO" "Port $DEFAULT_PORT is occupied by our running DENTE PostgreSQL instance."
        fi
    fi

    if [[ "$IS_OUR_PG" == "false" ]]; then
        log "WARN" "Port $DEFAULT_PORT is occupied by EXTERNAL software (Postgres.app, Docker, or 1C)!"
        log "WARN" "Activating collision switch: shifting DENTE PostgreSQL to fallback port $FALLBACK_PORT (D-E-N-T-E)..."

        TARGET_PORT=$FALLBACK_PORT
        if is_port_listening "$TARGET_PORT"; then
            log "WARN" "Preferred fallback port $TARGET_PORT is also occupied. Scanning 5439..5450..."
            FOUND_FREE=false
            for candidate in {5439..5450}; do
                if ! is_port_listening "$candidate"; then
                    TARGET_PORT=$candidate
                    FOUND_FREE=true
                    break
                fi
            done
            if [[ "$FOUND_FREE" == "false" ]]; then
                log "ERROR" "Fatal: Could not find any free port in range 5438-5450!"
                exit 1
            fi
        fi
        ACTIVE_PORT=$TARGET_PORT
        log "INFO" "Selected free dedicated port: $ACTIVE_PORT"
    fi
else
    log "INFO" "Default port $DEFAULT_PORT is free and ready."
    ACTIVE_PORT=$DEFAULT_PORT
fi

# -----------------------------------------------------------------------------
# 6. CONFIGURATION SYNCHRONIZATION (postgresql.conf & dente.env)
# -----------------------------------------------------------------------------
sync_postgresql_conf() {
    local conf_file="$PG_DATA_DIR/postgresql.conf"
    if [[ -f "$conf_file" && "$CHECK_ONLY" == "false" ]]; then
        # Update or append port setting
        if grep -q "^[[:space:]]*port[[:space:]]*=" "$conf_file"; then
            sed -i '' -E "s/^[[:space:]]*port[[:space:]]*=.*/port = $ACTIVE_PORT/" "$conf_file"
        else
            echo "port = $ACTIVE_PORT" >> "$conf_file"
        fi

        # Ensure localhost listening only (security invariant)
        if grep -q "^[[:space:]]*listen_addresses[[:space:]]*=" "$conf_file"; then
            sed -i '' -E "s/^[[:space:]]*listen_addresses[[:space:]]*=.*/listen_addresses = '127.0.0.1'/" "$conf_file"
        else
            echo "listen_addresses = '127.0.0.1'" >> "$conf_file"
        fi

        # Performance tuning for Mac Mini / MacBook
        if ! grep -q "shared_buffers" "$conf_file"; then
            cat <<EOF >> "$conf_file"
shared_buffers = 128MB
work_mem = 16MB
maintenance_work_mem = 64MB
max_connections = 50
EOF
        fi
        log "INFO" "Updated postgresql.conf: port = $ACTIVE_PORT, listen_addresses = '127.0.0.1'"
    fi
}

sync_dente_env() {
    if [[ "$CHECK_ONLY" == "true" ]]; then
        return 0
    fi

    local db_url="postgres://dental:dental@127.0.0.1:$ACTIVE_PORT/dental_crm"
    mkdir -p "$(dirname "$DENTE_ENV_FILE")"

    if [[ -f "$DENTE_ENV_FILE" ]]; then
        # Update DATABASE_URL
        if grep -q "^DATABASE_URL=" "$DENTE_ENV_FILE"; then
            sed -i '' -E "s|^DATABASE_URL=.*|DATABASE_URL=$db_url|" "$DENTE_ENV_FILE"
        else
            echo "DATABASE_URL=$db_url" >> "$DENTE_ENV_FILE"
        fi

        # Update PGPORT
        if grep -q "^PGPORT=" "$DENTE_ENV_FILE"; then
            sed -i '' -E "s|^PGPORT=.*|PGPORT=$ACTIVE_PORT|" "$DENTE_ENV_FILE"
        else
            echo "PGPORT=$ACTIVE_PORT" >> "$DENTE_ENV_FILE"
        fi
    else
        log "INFO" "Creating initial dente.env configuration at '$DENTE_ENV_FILE'..."
        cat <<EOF > "$DENTE_ENV_FILE"
# DENTE Dental CRM — Environment Configuration (macOS)
NODE_ENV=production
PORT=4000
API_PORT=4000
API_HOST=0.0.0.0
DATABASE_URL=$db_url
PGPORT=$ACTIVE_PORT
DENTE_DATA_DIR=$DENTE_DATA_DIR
DENTE_LOG_DIR=$DENTE_LOG_DIR
WEB_ORIGIN=http://localhost:4000,http://127.0.0.1:4000,http://dente-clinic.local:4000
EOF
    fi
    log "INFO" "Synchronized dente.env: DATABASE_URL points to port $ACTIVE_PORT"
}

# -----------------------------------------------------------------------------
# 7. CLUSTER INITIALIZATION (initdb if fresh)
# -----------------------------------------------------------------------------
if [[ ! -f "$PG_DATA_DIR/PG_VERSION" ]]; then
    if [[ "$CHECK_ONLY" == "true" ]]; then
        log "WARN" "[Check-only] PostgreSQL cluster is not initialized at '$PG_DATA_DIR'."
    else
        log "INFO" "Initializing fresh PostgreSQL cluster at '$PG_DATA_DIR'..."
        mkdir -p "$PG_DATA_DIR"
        chmod 700 "$PG_DATA_DIR"
        
        "$INITDB_BIN" -D "$PG_DATA_DIR" --encoding=UTF8 --locale=C -U postgres >/dev/null 2>&1
        log "INFO" "PostgreSQL cluster successfully initialized."
        sync_postgresql_conf
        sync_dente_env
    fi
else
    log "INFO" "Verified existing PostgreSQL cluster (PG_VERSION: $(cat "$PG_DATA_DIR/PG_VERSION"))."
    sync_postgresql_conf
    sync_dente_env
fi

# -----------------------------------------------------------------------------
# 8. START POSTGRESQL & VERIFY CONNECTION
# -----------------------------------------------------------------------------
if [[ "$START_POSTGRES" == "true" && "$CHECK_ONLY" == "false" ]]; then
    log "INFO" "Verifying PostgreSQL server running state..."

    if ! is_port_listening "$ACTIVE_PORT"; then
        log "INFO" "Starting PostgreSQL on port $ACTIVE_PORT..."
        "$PG_CTL_BIN" -D "$PG_DATA_DIR" -o "-p $ACTIVE_PORT -k '$PG_DATA_DIR'" -l "$DENTE_LOG_DIR/postgres.log" start
        
        # Wait up to 15 seconds for socket readiness
        WAIT_SECONDS=0
        READY=false
        while [[ $WAIT_SECONDS -lt 15 ]]; do
            if "$PG_ISREADY_BIN" -h 127.0.0.1 -p "$ACTIVE_PORT" >/dev/null 2>&1; then
                READY=true
                break
            fi
            sleep 1
            ((WAIT_SECONDS++))
        done

        if [[ "$READY" == "true" ]]; then
            log "INFO" "PostgreSQL is online and ready on port $ACTIVE_PORT."
        else
            log "ERROR" "Timed out waiting for PostgreSQL to start. Check $DENTE_LOG_DIR/postgres.log."
            exit 1
        fi
    else
        log "INFO" "PostgreSQL is already active on port $ACTIVE_PORT."
    fi

    # -------------------------------------------------------------------------
    # 9. ROLE & DATABASE INITIALIZATION (dental / dental_crm)
    # -------------------------------------------------------------------------
    if [[ -n "$PSQL_BIN" ]]; then
        log "INFO" "Verifying role 'dental' and database 'dental_crm'..."

        # Check role 'dental'
        ROLE_EXISTS=$("$PSQL_BIN" -h 127.0.0.1 -p "$ACTIVE_PORT" -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='dental'" 2>/dev/null || true)
        if [[ "$ROLE_EXISTS" != "1" ]]; then
            log "INFO" "Creating database role 'dental' (NOSUPERUSER, NOBYPASSRLS)..."
            "$PSQL_BIN" -h 127.0.0.1 -p "$ACTIVE_PORT" -U postgres -c \
                "CREATE ROLE dental WITH LOGIN PASSWORD 'dental' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;" >/dev/null 2>&1 || true
        fi

        # Check database 'dental_crm'
        DB_EXISTS=$("$PSQL_BIN" -h 127.0.0.1 -p "$ACTIVE_PORT" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='dental_crm'" 2>/dev/null || true)
        if [[ "$DB_EXISTS" != "1" ]]; then
            log "INFO" "Creating database 'dental_crm' owned by 'dental'..."
            "$PSQL_BIN" -h 127.0.0.1 -p "$ACTIVE_PORT" -U postgres -c \
                "CREATE DATABASE dental_crm OWNER dental;" >/dev/null 2>&1 || true
            "$PSQL_BIN" -h 127.0.0.1 -p "$ACTIVE_PORT" -U postgres -c \
                "GRANT ALL PRIVILEGES ON DATABASE dental_crm TO dental;" >/dev/null 2>&1 || true
        fi

        # Grant schema public privileges
        "$PSQL_BIN" -h 127.0.0.1 -p "$ACTIVE_PORT" -U postgres -d dental_crm -c \
            "GRANT ALL ON SCHEMA public TO dental; ALTER SCHEMA public OWNER TO dental;" >/dev/null 2>&1 || true
        log "INFO" "Database 'dental_crm' permissions verified."
    fi
fi

log "INFO" "=== DENTE CRM Database Preflight Completed Successfully ==="
exit 0
