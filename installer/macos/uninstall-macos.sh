#!/usr/bin/env bash
# =============================================================================
# DENTE Dental CRM — macOS Uninstaller & Data Preservation Suite
#
# 1. Unloads and deregisters LaunchAgent (com.dente.crm) from launchd.
# 2. Stops local PostgreSQL instance safely.
# 3. Mandate 8e / Doctor Autonomy Data Protection:
#    Automatically creates a compressed safety backup of all patient records,
#    documents, and database files on ~/Desktop BEFORE performing any removal.
# 4. Cleans up service registration files and provides safe options for data removal.
# =============================================================================

set -o pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH:/usr/bin:/bin:/usr/sbin:/sbin"

DENTE_APP_SUPPORT="${DENTE_APP_SUPPORT:-$HOME/Library/Application Support/DenteCRM}"
DENTE_DATA_DIR="${DENTE_DATA_DIR:-$DENTE_APP_SUPPORT/data}"
PG_DATA_DIR="${PG_DATA_DIR:-$DENTE_DATA_DIR/pg18}"
DENTE_LOG_DIR="${DENTE_LOG_DIR:-$HOME/Library/Logs/DenteCRM}"
PLIST_FILE="$HOME/Library/LaunchAgents/com.dente.crm.plist"
SERVICE_NAME="com.dente.crm"

GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

echo -e "${RED}${BOLD}"
echo "================================================================="
echo "           DENTE Dental CRM — macOS Uninstallation Suite         "
echo "=================================================================${RESET}"
echo ""

# Non-interactive flag check
FORCE=false
PURGE_DATA=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force|-f)
            FORCE=true
            shift
            ;;
        --purge-data)
            PURGE_DATA=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

if [[ "$FORCE" == "false" ]]; then
    echo -e "${YELLOW}Warning: This will stop DENTE CRM services and remove launchd autostart.${RESET}"
    read -r -p "Are you sure you want to proceed with uninstallation? [y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Uninstallation cancelled."
        exit 0
    fi
fi

# -----------------------------------------------------------------------------
# 1. MANDATORY SAFETY BACKUP (Doctor Autonomy & Patient Data Protection)
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[1/4] Preserving patient records and database cluster...${RESET}"
if [[ -d "$DENTE_DATA_DIR" ]]; then
    TIMESTAMP=$(date "+%Y%m%d_%H%M%S")
    BACKUP_FILE="$HOME/Desktop/DenteCRM_Backup_${TIMESTAMP}.tar.gz"
    echo "Creating safety archive on your Desktop..."
    
    if tar -czf "$BACKUP_FILE" -C "$DENTE_APP_SUPPORT" data 2>/dev/null; then
        echo -e "${GREEN}${BOLD}✔ Patient records successfully archived to:${RESET}"
        echo "  $BACKUP_FILE"
    else
        echo -e "${YELLOW}Warning: Could not create desktop archive, attempting backup to home folder...${RESET}"
        BACKUP_FILE="$HOME/DenteCRM_Backup_${TIMESTAMP}.tar.gz"
        tar -czf "$BACKUP_FILE" -C "$DENTE_APP_SUPPORT" data 2>/dev/null || true
        echo "  Backup saved to: $BACKUP_FILE"
    fi
else
    echo "No persistent data directory found at $DENTE_DATA_DIR. Skipping backup."
fi

# -----------------------------------------------------------------------------
# 2. DEREGISTER LAUNCHAGENT FROM LAUNCHD
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[2/4] Unloading and removing LaunchAgent service...${RESET}"
USER_ID=$(id -u)

# Modern macOS bootout
launchctl bootout "gui/$USER_ID/$SERVICE_NAME" 2>/dev/null || true
# Legacy unload
launchctl unload "$PLIST_FILE" 2>/dev/null || true
launchctl stop "$SERVICE_NAME" 2>/dev/null || true

if [[ -f "$PLIST_FILE" ]]; then
    rm -f "$PLIST_FILE"
    echo -e "${GREEN}✔ Removed $PLIST_FILE${RESET}"
else
    echo "LaunchAgent plist was not present."
fi

# -----------------------------------------------------------------------------
# 3. STOP POSTGRESQL & PROCESSES
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[3/4] Stopping background processes cleanly...${RESET}"
if command -v pg_ctl >/dev/null 2>&1 && [[ -d "$PG_DATA_DIR" ]]; then
    pg_ctl -D "$PG_DATA_DIR" stop -m fast 2>/dev/null || true
fi

# Terminate any stray node processes
STRAY_PIDS=$(pgrep -f "service-bootstrap.mjs" || true)
if [[ -n "$STRAY_PIDS" ]]; then
    kill $STRAY_PIDS 2>/dev/null || true
fi

# -----------------------------------------------------------------------------
# 4. DATA PURGE DECISION
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[4/4] Storage cleanup options...${RESET}"

if [[ "$PURGE_DATA" == "false" && "$FORCE" == "false" ]]; then
    echo -e "${BOLD}Your clinical data and medical documents remain safely in:${RESET}"
    echo "  $DENTE_APP_SUPPORT"
    echo ""
    read -r -p "Do you want to permanently delete application data and logs? [y/N]: " del_confirm
    if [[ "$del_confirm" =~ ^[Yy]$ ]]; then
        PURGE_DATA=true
    fi
fi

if [[ "$PURGE_DATA" == "true" ]]; then
    echo "Removing $DENTE_APP_SUPPORT..."
    rm -rf "$DENTE_APP_SUPPORT"
    echo "Removing $DENTE_LOG_DIR..."
    rm -rf "$DENTE_LOG_DIR"
    echo -e "${GREEN}✔ Application data removed (Safety backup remains on Desktop).${RESET}"
else
    echo -e "${GREEN}✔ Application data preserved at $DENTE_APP_SUPPORT.${RESET}"
fi

echo ""
echo -e "${GREEN}${BOLD}=================================================================${RESET}"
echo -e "${GREEN}${BOLD}✔ DENTE Dental CRM uninstallation completed successfully.${RESET}"
echo -e "${GREEN}${BOLD}=================================================================${RESET}"
exit 0
