#!/usr/bin/env bash
# =============================================================================
# DENTE Dental CRM — 1-Click macOS Deployment & LaunchAgent Installer
#
# Supports:
# - Apple Silicon M1/M2/M3/M4 (arm64) & Intel (x86_64)
# - macOS 12+ (Monterey, Ventura, Sonoma, Sequoia)
#
# Responsibilities:
# 1. Hardware & architecture inspection (Apple Silicon / Intel).
# 2. Dependency audit: Homebrew, Node.js LTS (>= 20), PostgreSQL (16-18).
#    Offers automated 1-click installation of missing runtimes via Homebrew.
# 3. Sets up ~/Library/Application Support/DenteCRM directory structure.
# 4. Executes db-preflight.sh: crash recovery, port collision resolution, initdb.
# 5. Generates and registers LaunchAgent com.dente.crm.plist in ~/Library/LaunchAgents/.
# 6. Sets permissions and creates 1-click Desktop launcher (Dente.command).
# =============================================================================

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH:/usr/bin:/bin:/usr/sbin:/sbin"

# Colors & Typography
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

clear
echo -e "${CYAN}${BOLD}"
echo "================================================================="
echo "        🦷 DENTE DENTAL CRM — 1-CLICK MACOS INSTALLER            "
echo "=================================================================${RESET}"
echo ""

# -----------------------------------------------------------------------------
# 1. ARCHITECTURE & OS AUDIT
# -----------------------------------------------------------------------------
ARCH=$(uname -m)
OS_VER=$(sw_vers -productVersion 2>/dev/null || echo "Unknown")
USER_ID=$(id -u)

echo -e "${BOLD}Target Environment:${RESET}"
echo -e " • Operating System : macOS $OS_VER"
if [[ "$ARCH" == "arm64" ]]; then
    echo -e " • Architecture     : ${GREEN}Apple Silicon (arm64, M1-M4)${RESET}"
    BREW_PREFIX="/opt/homebrew"
else
    echo -e " • Architecture     : ${CYAN}Intel (x86_64)${RESET}"
    BREW_PREFIX="/usr/local"
fi
echo -e " • User Account     : $USER (UID: $USER_ID)"
echo ""

# -----------------------------------------------------------------------------
# 2. HOMEBREW DETECTION & OPTIONAL PROMPT
# -----------------------------------------------------------------------------
echo -e "${CYAN}[1/6] Checking Homebrew package manager...${RESET}"
BREW_BIN=""
if command -v brew >/dev/null 2>&1; then
    BREW_BIN="$(command -v brew)"
elif [[ -x "$BREW_PREFIX/bin/brew" ]]; then
    BREW_BIN="$BREW_PREFIX/bin/brew"
fi

if [[ -n "$BREW_BIN" ]]; then
    echo -e " • Homebrew found   : ${GREEN}$BREW_BIN${RESET} ($("$BREW_BIN" --version | head -n 1))"
else
    echo -e " • Homebrew status  : ${YELLOW}Not installed${RESET}"
    echo "Homebrew is recommended to install Node.js LTS and PostgreSQL automatically."
    read -r -p "Install Homebrew now? [Y/n]: " brew_ans
    if [[ ! "$brew_ans" =~ ^[Nn]$ ]]; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [[ -x "$BREW_PREFIX/bin/brew" ]]; then
            BREW_BIN="$BREW_PREFIX/bin/brew"
            eval "$("$BREW_BIN" shellenv)"
        fi
    fi
fi

# -----------------------------------------------------------------------------
# 3. NODE.JS LTS DETECTION (>= 20)
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[2/6] Checking Node.js LTS runtime...${RESET}"
NODE_READY=false

check_node() {
    if command -v node >/dev/null 2>&1; then
        local raw_ver
        raw_ver=$(node -v | tr -d 'v')
        local major_ver
        major_ver="${raw_ver%%.*}"
        if [[ "$major_ver" -ge 20 ]]; then
            echo -e " • Node.js runtime  : ${GREEN}v$raw_ver (LTS compatible, >= 20)${RESET}"
            NODE_READY=true
            return 0
        else
            echo -e " • Node.js runtime  : ${YELLOW}v$raw_ver detected (Requires Node.js >= 20)${RESET}"
        fi
    else
        echo -e " • Node.js runtime  : ${RED}Not found${RESET}"
    fi
    return 1
}

check_node || true

if [[ "$NODE_READY" == "false" ]]; then
    if [[ -n "$BREW_BIN" ]]; then
        echo "Installing Node.js via Homebrew..."
        "$BREW_BIN" install node
        eval "$("$BREW_BIN" shellenv)" 2>/dev/null || true
        check_node || true
    fi
fi

if [[ "$NODE_READY" == "false" ]]; then
    echo -e "${RED}Error: Node.js 20 or newer is required to run DENTE CRM.${RESET}"
    echo "Install via Homebrew: brew install node"
    echo "Or download installer: https://nodejs.org/"
    exit 1
fi

# -----------------------------------------------------------------------------
# 4. POSTGRESQL DETECTION (16-18)
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[3/6] Checking PostgreSQL database engine...${RESET}"
PG_READY=false

locate_pg_binary() {
    local bin="$1"
    local paths=(
        "$BREW_PREFIX/opt/postgresql@18/bin"
        "$BREW_PREFIX/opt/postgresql@17/bin"
        "$BREW_PREFIX/opt/postgresql@16/bin"
        "$BREW_PREFIX/bin"
        "/Applications/Postgres.app/Contents/Versions/latest/bin"
    )
    for p in "${paths[@]}"; do
        if [[ -x "$p/$bin" ]]; then
            echo "$p/$bin"
            return 0
        fi
    done
    if command -v "$bin" >/dev/null 2>&1; then
        command -v "$bin"
        return 0
    fi
    return 1
}

if locate_pg_binary "initdb" >/dev/null && locate_pg_binary "pg_ctl" >/dev/null; then
    PG_BIN_PATH=$(dirname "$(locate_pg_binary "pg_ctl")")
    echo -e " • PostgreSQL found : ${GREEN}$PG_BIN_PATH${RESET}"
    PG_READY=true
else
    echo -e " • PostgreSQL status: ${YELLOW}Not found in standard paths${RESET}"
    if [[ -n "$BREW_BIN" ]]; then
        echo "Installing PostgreSQL via Homebrew..."
        "$BREW_BIN" install postgresql@17
        PG_READY=true
    fi
fi

if [[ "$PG_READY" == "false" ]]; then
    echo -e "${RED}Error: PostgreSQL (16, 17, or 18) is required for DENTE CRM.${RESET}"
    echo "Install via Homebrew: brew install postgresql@17"
    exit 1
fi

# -----------------------------------------------------------------------------
# 5. DIRECTORY INITIALIZATION & DATA DIRECTORIES
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[4/6] Initializing application data directories...${RESET}"
DENTE_APP_SUPPORT="$HOME/Library/Application Support/DenteCRM"
DENTE_DATA_DIR="$DENTE_APP_SUPPORT/data"
PG_DATA_DIR="$DENTE_DATA_DIR/pg18"
DENTE_LOG_DIR="$HOME/Library/Logs/DenteCRM"
DENTE_BACKUP_DIR="$DENTE_APP_SUPPORT/backups"
DENTE_DOCS_DIR="$DENTE_DATA_DIR/storage/documents"
DENTE_ATTACHMENTS_DIR="$DENTE_DATA_DIR/storage/attachments"
DENTE_ENV_FILE="$DENTE_APP_SUPPORT/dente.env"

mkdir -p "$DENTE_APP_SUPPORT"
mkdir -p "$DENTE_DATA_DIR"
mkdir -p "$DENTE_LOG_DIR"
mkdir -p "$DENTE_BACKUP_DIR"
mkdir -p "$DENTE_DOCS_DIR"
mkdir -p "$DENTE_ATTACHMENTS_DIR"

chmod 755 "$DENTE_APP_SUPPORT"
chmod 755 "$DENTE_LOG_DIR"

echo -e " • App Support Path : ${GREEN}$DENTE_APP_SUPPORT${RESET}"
echo -e " • Persistent Data  : ${GREEN}$DENTE_DATA_DIR${RESET}"
echo -e " • Logs Directory   : ${GREEN}$DENTE_LOG_DIR${RESET}"

# -----------------------------------------------------------------------------
# 6. DATABASE PREFLIGHT & BOOTSTRAP (db-preflight.sh)
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[5/6] Executing database preflight & crash recovery...${RESET}"
PREFLIGHT_SCRIPT="$SCRIPT_DIR/db-preflight.sh"
chmod +x "$PREFLIGHT_SCRIPT"
bash "$PREFLIGHT_SCRIPT" --start --env-file "$DENTE_ENV_FILE" --data-dir "$PG_DATA_DIR"

if [[ $? -ne 0 ]]; then
    echo -e "${RED}Database preflight failed. Please check logs in $DENTE_LOG_DIR/db-preflight.log${RESET}"
    exit 1
fi

# -----------------------------------------------------------------------------
# 7. LAUNCHAGENT INSTALLATION (com.dente.crm.plist)
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[6/6] Installing macOS LaunchAgent service...${RESET}"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
mkdir -p "$LAUNCH_AGENTS_DIR"
TARGET_PLIST="$LAUNCH_AGENTS_DIR/com.dente.crm.plist"
SERVICE_NAME="com.dente.crm"
RUNNER_SCRIPT="$SCRIPT_DIR/service-runner.sh"
chmod +x "$RUNNER_SCRIPT"

# Generate tailored plist with absolute paths
cat <<EOF > "$TARGET_PLIST"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${RUNNER_SCRIPT}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>5</integer>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}/../..</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${BREW_PREFIX}/bin:${BREW_PREFIX}/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>4000</string>
        <key>API_PORT</key>
        <string>4000</string>
        <key>API_HOST</key>
        <string>0.0.0.0</string>
        <key>DENTE_APP_SUPPORT</key>
        <string>${DENTE_APP_SUPPORT}</string>
        <key>DENTE_DATA_DIR</key>
        <string>${DENTE_DATA_DIR}</string>
        <key>DENTE_ENV_FILE</key>
        <string>${DENTE_ENV_FILE}</string>
        <key>DENTE_LOG_DIR</key>
        <string>${DENTE_LOG_DIR}</string>
    </dict>
    <key>StandardOutPath</key>
    <string>${DENTE_LOG_DIR}/service.log</string>
    <key>StandardErrorPath</key>
    <string>${DENTE_LOG_DIR}/service-error.log</string>
    <key>ProcessType</key>
    <string>Interactive</string>
</dict>
</plist>
EOF

chmod 644 "$TARGET_PLIST"
echo -e " • Generated Plist  : ${GREEN}$TARGET_PLIST${RESET}"

# Register service in launchd
echo "Registering service in launchd..."
launchctl bootout "gui/$USER_ID/$SERVICE_NAME" 2>/dev/null || true
launchctl unload "$TARGET_PLIST" 2>/dev/null || true

if launchctl bootstrap "gui/$USER_ID" "$TARGET_PLIST" 2>/dev/null; then
    echo -e " • launchctl state  : ${GREEN}Registered via bootstrap${RESET}"
elif launchctl load -w "$TARGET_PLIST" 2>/dev/null; then
    echo -e " • launchctl state  : ${GREEN}Registered via load${RESET}"
else
    echo -e " • launchctl state  : ${YELLOW}Notice: Plist placed. Will activate on next login or via manage-macos.sh${RESET}"
fi

# -----------------------------------------------------------------------------
# 8. PERMISSIONS & DESKTOP LAUNCHER
# -----------------------------------------------------------------------------
chmod +x "$SCRIPT_DIR/Dente.command"
chmod +x "$SCRIPT_DIR/manage-macos.sh"
chmod +x "$SCRIPT_DIR/uninstall-macos.sh"

# Create Desktop Shortcut for easy Doctor access
if [[ -d "$HOME/Desktop" ]]; then
    ln -sf "$SCRIPT_DIR/Dente.command" "$HOME/Desktop/Dente CRM.command"
    echo -e " • Desktop Shortcut : ${GREEN}$HOME/Desktop/Dente CRM.command${RESET}"
fi

# -----------------------------------------------------------------------------
# 9. COMPLETION & VERIFICATION
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}=================================================================${RESET}"
echo -e "${GREEN}${BOLD}✔ DENTE Dental CRM installed successfully on macOS!${RESET}"
echo -e "${GREEN}${BOLD}=================================================================${RESET}"
echo ""
echo -e "${BOLD}Quick Access:${RESET}"
echo -e " 1. Web Interface  : ${CYAN}http://localhost:4000${RESET}"
echo -e " 2. Clinic LAN     : ${CYAN}http://$(hostname):4000${RESET}"
echo -e " 3. Desktop Icon   : Double-click 'Dente CRM.command' on your Desktop"
echo -e " 4. Service Control: ./installer/macos/manage-macos.sh (status|start|stop|logs)"
echo ""
echo "Installation complete."
exit 0
