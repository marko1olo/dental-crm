#!/usr/bin/env bash
# =============================================================================
# DENTE Dental CRM — Service Management Console (macOS)
#
# Commands:
#   ./manage-macos.sh status   - Check health of Web, API, Database, and LaunchAgent
#   ./manage-macos.sh start    - Start PostgreSQL & DENTE background service
#   ./manage-macos.sh stop     - Stop DENTE background service & PostgreSQL
#   ./manage-macos.sh restart  - Restart entire CRM stack
#   ./manage-macos.sh logs     - Stream real-time logs from ~/Library/Logs/DenteCRM
#   ./manage-macos.sh doctor   - Run deep clinical diagnostic of the Mac setup
# =============================================================================

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH:/usr/bin:/bin:/usr/sbin:/sbin"

DENTE_APP_SUPPORT="${DENTE_APP_SUPPORT:-$HOME/Library/Application Support/DenteCRM}"
DENTE_DATA_DIR="${DENTE_DATA_DIR:-$DENTE_APP_SUPPORT/data}"
PG_DATA_DIR="${PG_DATA_DIR:-$DENTE_DATA_DIR/pg18}"
DENTE_LOG_DIR="${DENTE_LOG_DIR:-$HOME/Library/Logs/DenteCRM}"
DENTE_ENV_FILE="${DENTE_ENV_FILE:-$DENTE_APP_SUPPORT/dente.env}"
PLIST_FILE="$HOME/Library/LaunchAgents/com.dente.crm.plist"
SERVICE_NAME="com.dente.crm"

# Styling & Colors
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

print_header() {
    echo -e "${CYAN}${BOLD}"
    echo "================================================================="
    echo "           DENTE Dental CRM — macOS Service Manager              "
    echo "=================================================================${RESET}"
}

get_active_pg_port() {
    if [[ -f "$DENTE_ENV_FILE" ]]; then
        local port_from_env
        port_from_env=$(grep "^PGPORT=" "$DENTE_ENV_FILE" | cut -d'=' -f2 | tr -d '[:space:]')
        if [[ -n "$port_from_env" ]]; then
            echo "$port_from_env"
            return 0
        fi
        local url_port
        url_port=$(grep "^DATABASE_URL=" "$DENTE_ENV_FILE" | sed -E 's/.*:([0-9]+)\/.*/\1/' | tr -d '[:space:]')
        if [[ -n "$url_port" ]]; then
            echo "$url_port"
            return 0
        fi
    fi
    echo "5432"
}

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

# -----------------------------------------------------------------------------
# COMMAND: STATUS
# -----------------------------------------------------------------------------
cmd_status() {
    print_header
    echo -e "${BOLD}Current System & Service Status:${RESET}\n"

    # 1. LaunchAgent Status
    local launchd_status="${RED}Not Registered${RESET}"
    local launchd_pid=""
    if launchctl list | grep -q "$SERVICE_NAME"; then
        launchd_pid=$(launchctl list | grep "$SERVICE_NAME" | awk '{print $1}')
        if [[ "$launchd_pid" =~ ^[0-9]+$ ]]; then
            launchd_status="${GREEN}Active & Running (PID: $launchd_pid)${RESET}"
        else
            launchd_status="${YELLOW}Registered (Idle / Restarting)${RESET}"
        fi
    elif [[ -f "$PLIST_FILE" ]]; then
        launchd_status="${YELLOW}Plist installed but unloaded${RESET}"
    fi
    echo -e " • LaunchAgent ($SERVICE_NAME) : $launchd_status"

    # 2. Database Status
    local pg_port
    pg_port=$(get_active_pg_port)
    local pg_status="${RED}Offline${RESET}"
    if is_port_listening "$pg_port"; then
        if command -v pg_isready >/dev/null 2>&1; then
            if pg_isready -h 127.0.0.1 -p "$pg_port" >/dev/null 2>&1; then
                pg_status="${GREEN}Online (Port $pg_port, Ready)${RESET}"
            else
                pg_status="${YELLOW}Listening on $pg_port but not accepting connections${RESET}"
            fi
        else
            pg_status="${GREEN}Online (Listening on port $pg_port)${RESET}"
        fi
    fi
    echo -e " • PostgreSQL Database          : $pg_status"

    # 3. Web & API Server Status (Port 4000)
    local web_status="${RED}Offline${RESET}"
    if is_port_listening 4000; then
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://127.0.0.1:4000/ || true)
        if [[ "$http_code" == "200" || "$http_code" == "304" ]]; then
            web_status="${GREEN}Online (HTTP $http_code at http://localhost:4000)${RESET}"
        else
            web_status="${YELLOW}Listening (Port 4000, HTTP $http_code)${RESET}"
        fi
    fi
    echo -e " • DENTE Web & API Server       : $web_status"

    echo ""
    echo -e "${CYAN}Access Links:${RESET}"
    echo " • Local Station  : http://localhost:4000"
    echo " • Clinic Network : http://$(hostname):4000 (or http://dente-clinic.local:4000)"
    echo " • Log Files      : $DENTE_LOG_DIR/"
    echo ""
}

# -----------------------------------------------------------------------------
# COMMAND: START
# -----------------------------------------------------------------------------
cmd_start() {
    print_header
    echo -e "${BOLD}Starting DENTE Dental CRM...${RESET}\n"

    # 1. Run Preflight
    echo -e "${CYAN}[1/3] Running database preflight & recovery...${RESET}"
    if [[ -f "$SCRIPT_DIR/db-preflight.sh" ]]; then
        bash "$SCRIPT_DIR/db-preflight.sh" --start --env-file "$DENTE_ENV_FILE"
        if [[ $? -ne 0 ]]; then
            echo -e "${RED}Preflight failed. Aborting start.${RESET}"
            exit 1
        fi
    fi

    # 2. Check LaunchAgent
    echo -e "${CYAN}[2/3] Checking LaunchAgent configuration...${RESET}"
    if [[ ! -f "$PLIST_FILE" ]]; then
        echo -e "${YELLOW}Notice: $PLIST_FILE not found.${RESET}"
        echo "Installing service plist via install-macos.sh is recommended."
        if [[ -f "$SCRIPT_DIR/install-macos.sh" ]]; then
            echo "Running installer..."
            bash "$SCRIPT_DIR/install-macos.sh"
            return $?
        fi
    fi

    # 3. Load or Kickstart via launchctl
    echo -e "${CYAN}[3/3] Activating LaunchAgent service...${RESET}"
    local user_id
    user_id=$(id -u)

    if launchctl list | grep -q "$SERVICE_NAME"; then
        # Service is loaded, kickstart it
        launchctl kickstart -k "gui/$user_id/$SERVICE_NAME" 2>/dev/null || \
            launchctl stop "$SERVICE_NAME" && launchctl start "$SERVICE_NAME"
    else
        # Try modern bootout/bootstrap or fallback load
        launchctl bootstrap "gui/$user_id" "$PLIST_FILE" 2>/dev/null || \
            launchctl load -w "$PLIST_FILE" 2>/dev/null || true
    fi

    # Wait for web server to become ready
    echo -n "Waiting for CRM server to respond"
    local count=0
    local is_ready=false
    while [[ $count -lt 15 ]]; do
        if is_port_listening 4000; then
            is_ready=true
            break
        fi
        echo -n "."
        sleep 1
        ((count++))
    done
    echo ""

    if [[ "$is_ready" == "true" ]]; then
        echo -e "${GREEN}${BOLD}✔ DENTE Dental CRM is up and running!${RESET}"
        echo -e "Open browser: ${BOLD}http://localhost:4000${RESET}"
    else
        echo -e "${YELLOW}Service was activated, but port 4000 has not responded yet.${RESET}"
        echo "Check logs: $DENTE_LOG_DIR/service.log"
    fi
}

# -----------------------------------------------------------------------------
# COMMAND: STOP
# -----------------------------------------------------------------------------
cmd_stop() {
    print_header
    echo -e "${BOLD}Stopping DENTE Dental CRM...${RESET}\n"

    local user_id
    user_id=$(id -u)

    echo -e "${CYAN}[1/2] Stopping LaunchAgent service...${RESET}"
    launchctl bootout "gui/$user_id/$SERVICE_NAME" 2>/dev/null || \
        launchctl stop "$SERVICE_NAME" 2>/dev/null || \
        launchctl unload "$PLIST_FILE" 2>/dev/null || true

    # Terminate any stray node processes for service-bootstrap
    local stray_pids
    stray_pids=$(pgrep -f "service-bootstrap.mjs" || true)
    if [[ -n "$stray_pids" ]]; then
        echo "Terminating stray service processes: $stray_pids"
        kill $stray_pids 2>/dev/null || true
    fi

    echo -e "${CYAN}[2/2] Stopping PostgreSQL gracefully...${RESET}"
    if command -v pg_ctl >/dev/null 2>&1 && [[ -d "$PG_DATA_DIR" ]]; then
        pg_ctl -D "$PG_DATA_DIR" stop -m fast 2>/dev/null || true
    fi

    echo -e "${GREEN}${BOLD}✔ DENTE CRM services stopped cleanly.${RESET}"
}

# -----------------------------------------------------------------------------
# COMMAND: RESTART
# -----------------------------------------------------------------------------
cmd_restart() {
    cmd_stop
    sleep 2
    cmd_start
}

# -----------------------------------------------------------------------------
# COMMAND: LOGS
# -----------------------------------------------------------------------------
cmd_logs() {
    print_header
    echo -e "${BOLD}Streaming logs from ${DENTE_LOG_DIR}... (Press Ctrl+C to exit)${RESET}\n"
    
    local log_files=()
    [[ -f "$DENTE_LOG_DIR/service.log" ]] && log_files+=("$DENTE_LOG_DIR/service.log")
    [[ -f "$DENTE_LOG_DIR/service-error.log" ]] && log_files+=("$DENTE_LOG_DIR/service-error.log")
    [[ -f "$DENTE_LOG_DIR/db-preflight.log" ]] && log_files+=("$DENTE_LOG_DIR/db-preflight.log")
    [[ -f "$DENTE_LOG_DIR/postgres.log" ]] && log_files+=("$DENTE_LOG_DIR/postgres.log")

    if [[ ${#log_files[@]} -eq 0 ]]; then
        echo "No log files found yet in $DENTE_LOG_DIR."
        exit 0
    fi

    tail -f -n 50 "${log_files[@]}"
}

# -----------------------------------------------------------------------------
# COMMAND: DOCTOR (Diagnostic)
# -----------------------------------------------------------------------------
cmd_doctor() {
    print_header
    echo -e "${BOLD}=== DENTE CRM Mac Doctor Diagnostic ===${RESET}\n"

    # OS & Architecture
    echo "1. System Information:"
    echo "   • macOS Version : $(sw_vers -productVersion 2>/dev/null || echo 'Unknown')"
    echo "   • Architecture  : $(uname -m)"
    echo "   • User          : $USER (UID: $(id -u))"

    # Homebrew
    echo "2. Homebrew Package Manager:"
    if command -v brew >/dev/null 2>&1; then
        echo -e "   • brew          : ${GREEN}Installed${RESET} ($(brew --prefix))"
    else
        echo -e "   • brew          : ${RED}Not found${RESET}"
    fi

    # Node.js
    echo "3. Node.js Runtime:"
    if command -v node >/dev/null 2>&1; then
        local node_v
        node_v=$(node -v)
        echo -e "   • node          : ${GREEN}Installed${RESET} ($node_v at $(which node))"
    else
        echo -e "   • node          : ${RED}Not found${RESET}"
    fi

    # PostgreSQL
    echo "4. PostgreSQL Database:"
    local pg_port
    pg_port=$(get_active_pg_port)
    echo "   • Target Port   : $pg_port"
    if command -v psql >/dev/null 2>&1; then
        echo -e "   • psql          : ${GREEN}Installed${RESET} ($(which psql))"
    else
        echo -e "   • psql          : ${YELLOW}Not in PATH (may be in Homebrew opt)${RESET}"
    fi

    # Directory permissions
    echo "5. File Permissions & Storage:"
    echo "   • Data Directory: $DENTE_DATA_DIR $([[ -w "$DENTE_DATA_DIR" ]] && echo -e "${GREEN}(Writable)${RESET}" || echo -e "${RED}(Not writable)${RESET}")"
    echo "   • Logs Directory: $DENTE_LOG_DIR $([[ -w "$DENTE_LOG_DIR" ]] && echo -e "${GREEN}(Writable)${RESET}" || echo -e "${RED}(Not writable)${RESET}")"

    echo ""
    echo -e "${BOLD}Diagnostic complete.${RESET}"
}

# -----------------------------------------------------------------------------
# CLI ROUTER
# -----------------------------------------------------------------------------
case "${1:-status}" in
    status)
        cmd_status
        ;;
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    logs)
        cmd_logs
        ;;
    doctor)
        cmd_doctor
        ;;
    help|--help|-h)
        print_header
        echo "Usage: ./manage-macos.sh [command]"
        echo ""
        echo "Commands:"
        echo "  status   Show live status of database, web, and LaunchAgent (default)"
        echo "  start    Perform preflight and start all services"
        echo "  stop     Gracefully stop CRM service and database"
        echo "  restart  Restart services cleanly"
        echo "  logs     Follow unified service and database logs"
        echo "  doctor   Run complete environment diagnostic for macOS"
        echo ""
        ;;
    *)
        echo -e "${RED}Unknown command: $1${RESET}"
        echo "Run './manage-macos.sh help' for usage instructions."
        exit 1
        ;;
esac
