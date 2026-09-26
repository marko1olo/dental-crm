#!/usr/bin/env bash
# =============================================================================
# DENTE Dental CRM — 1-Click macOS Launcher (Dente.command)
#
# Double-clickable from Finder or Desktop.
# 1. Checks if the background CRM service is active.
# 2. If stopped, starts the service via manage-macos.sh.
# 3. Automatically opens the default browser (Safari/Chrome) to http://localhost:4000.
# =============================================================================

# Set macOS Terminal window title
printf '\e]2;DENTE Dental CRM\a'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH:/usr/bin:/bin:/usr/sbin:/sbin"

# Styling
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[0;33m"
BOLD="\033[1m"
RESET="\033[0m"

clear
echo -e "${CYAN}${BOLD}"
echo "================================================================="
echo "                🦷 DENTE DENTAL CRM — MACOS LAUNCHER             "
echo "=================================================================${RESET}"
echo ""

is_crm_running() {
    if command -v lsof >/dev/null 2>&1; then
        lsof -iTCP:4000 -sTCP:LISTEN -n -P >/dev/null 2>&1
        return $?
    elif command -v nc >/dev/null 2>&1; then
        nc -z -w 1 127.0.0.1 4000 >/dev/null 2>&1
        return $?
    fi
    return 1
}

if is_crm_running; then
    echo -e "${GREEN}${BOLD}✔ DENTE Dental CRM is already active and running.${RESET}"
else
    echo -e "${YELLOW}DENTE Dental CRM service is currently inactive.${RESET}"
    echo -e "${CYAN}Starting local services (PostgreSQL & Fastify API)...${RESET}"
    echo ""

    if [[ -f "$SCRIPT_DIR/manage-macos.sh" ]]; then
        bash "$SCRIPT_DIR/manage-macos.sh" start
    else
        echo "Error: manage-macos.sh not found at $SCRIPT_DIR."
        read -n 1 -s -r -p "Press any key to exit..."
        exit 1
    fi
fi

# Open browser to local CRM address
TARGET_URL="http://localhost:4000"
echo ""
echo -e "${CYAN}Opening DENTE CRM in your default browser...${RESET}"
echo -e "URL: ${BOLD}${TARGET_URL}${RESET}"
open "$TARGET_URL"

echo ""
echo -e "${GREEN}${BOLD}=================================================================${RESET}"
echo -e "${BOLD}DENTE Dental CRM is running in the background.${RESET}"
echo "You can safely close this terminal window at any time."
echo "To manage services later, use ./manage-macos.sh (status/start/stop/logs)."
echo -e "${GREEN}${BOLD}=================================================================${RESET}"
echo ""
echo "Press [Enter] to close this window..."
read -r
exit 0
