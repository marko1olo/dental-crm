#!/usr/bin/env bash
# =============================================================================
# DENTE Dental CRM — macOS Launchd Service Runner
#
# Executed by launchd via com.dente.crm.plist.
# Sets up environment, verifies database health via db-preflight.sh,
# and boots Fastify & Web SPA via service-bootstrap.mjs.
# =============================================================================

set -o pipefail

# 1. Standardize PATH across Apple Silicon (/opt/homebrew) and Intel (/usr/local)
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH:/usr/bin:/bin:/usr/sbin:/sbin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DENTE_APP_SUPPORT="${DENTE_APP_SUPPORT:-$HOME/Library/Application Support/DenteCRM}"
DENTE_LOG_DIR="${DENTE_LOG_DIR:-$HOME/Library/Logs/DenteCRM}"
DENTE_ENV_FILE="${DENTE_ENV_FILE:-$DENTE_APP_SUPPORT/dente.env}"

mkdir -p "$DENTE_LOG_DIR"
mkdir -p "$DENTE_APP_SUPPORT"

RUNNER_LOG="$DENTE_LOG_DIR/service.log"

log() {
    local timestamp
    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] [RUNNER] $1" | tee -a "$RUNNER_LOG"
}

log "Starting DENTE CRM service runner..."
log "Script directory: $SCRIPT_DIR"

# 2. Locate Node.js runtime (>= 20)
NODE_BIN=""
if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
elif [[ -x "/opt/homebrew/bin/node" ]]; then
    NODE_BIN="/opt/homebrew/bin/node"
elif [[ -x "/usr/local/bin/node" ]]; then
    NODE_BIN="/usr/local/bin/node"
fi

if [[ -z "$NODE_BIN" ]]; then
    log "FATAL: Node.js binary not found. Please install Node.js LTS via Homebrew (brew install node)."
    exit 1
fi

log "Using Node.js: $NODE_BIN ($("$NODE_BIN" -v))"

# 3. Execute PostgreSQL Preflight & Blackout Recovery
PREFLIGHT_SCRIPT="$SCRIPT_DIR/db-preflight.sh"
if [[ -f "$PREFLIGHT_SCRIPT" ]]; then
    log "Running database preflight..."
    bash "$PREFLIGHT_SCRIPT" --start --env-file "$DENTE_ENV_FILE" 2>&1 | tee -a "$RUNNER_LOG"
    PREFLIGHT_STATUS=${PIPESTATUS[0]}
    if [[ $PREFLIGHT_STATUS -ne 0 ]]; then
        log "ERROR: Database preflight failed with exit code $PREFLIGHT_STATUS."
        exit $PREFLIGHT_STATUS
    fi
fi

# 4. Launch Service Bootstrap
BOOTSTRAP_SCRIPT="$SCRIPT_DIR/service-bootstrap.mjs"
if [[ ! -f "$BOOTSTRAP_SCRIPT" ]]; then
    log "FATAL: Bootstrap engine not found at $BOOTSTRAP_SCRIPT"
    exit 1
fi

log "Launching DENTE Bootstrap Engine..."
exec "$NODE_BIN" "$BOOTSTRAP_SCRIPT"
