#!/usr/bin/env bash
# =============================================================================
# DENTE Dental CRM — macOS Clinic LAN Network & Application Firewall Setup
# =============================================================================
# This script configures and validates network accessibility for DENTE CRM on macOS:
# 1. Audits availability of required clinic LAN ports:
#    - TCP 4000: DENTE Web Client & Fastify REST API
#    - TCP 4100: DENTE Real-time WebSocket Broker
#    - UDP 5353: mDNS / Bonjour Zero-Config LAN discovery
#    - UDP 4101: DENTE LAN Discovery Beacon (SSDP/UDP responder)
# 2. Inspects macOS Application Firewall status (/usr/libexec/ApplicationFirewall/socketfilterfw)
# 3. Detects physical network interfaces (en0/en1) and displays tablet pairing URLs
# 4. Provides automated socketfilterfw rules (with sudo) or step-by-step GUI guidance
# =============================================================================

set -euo pipefail

# Color palette for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

log_pass() {
    printf "${GREEN}[PASS]${NC} %s\n" "$1"
}

log_warn() {
    printf "${YELLOW}[WARN]${NC} %s\n" "$1"
}

log_fail() {
    printf "${RED}[FAIL]${NC} %s\n" "$1"
}

log_diag() {
    printf "${CYAN}[DIAG]${NC} %s\n" "$1"
}

print_header() {
    printf "\n${BOLD}====================================================================${NC}\n"
    printf "${BOLD}   DENTE Dental CRM — macOS LAN Network & Firewall Diagnostics     ${NC}\n"
    printf "${BOLD}====================================================================${NC}\n\n"
}

# -----------------------------------------------------------------------------
# 1. PLATFORM CHECK
# -----------------------------------------------------------------------------
check_platform() {
    log_info "Verifying host operating system..."
    local os_name
    os_name="$(uname -s)"
    if [[ "$os_name" != "Darwin" ]]; then
        log_fail "This script is designed specifically for macOS (Darwin). Current OS: $os_name"
        exit 1
    fi
    local macos_version
    macos_version="$(sw_vers -productVersion 2>/dev/null || echo "Unknown")"
    log_pass "macOS host verified (macOS $macos_version, architecture: $(uname -m))"
}

# -----------------------------------------------------------------------------
# 2. AUDIT PORT ACCESSIBILITY
# -----------------------------------------------------------------------------
check_ports() {
    log_info "Auditing clinical network service ports..."

    # Array of ports: protocol, port, description
    local ports=(
        "TCP:4000:DENTE Web Client & Fastify REST API"
        "TCP:4100:DENTE Real-time WebSocket Broker"
        "UDP:5353:mDNS / Bonjour Zero-Config LAN Discovery"
        "UDP:4101:DENTE LAN Discovery Beacon"
    )

    for entry in "${ports[@]}"; do
        IFS=":" read -r proto port desc <<< "$entry"
        log_diag "Checking $proto port $port ($desc)..."

        local listener=""
        if command -v lsof >/dev/null 2>&1; then
            if [[ "$proto" == "TCP" ]]; then
                listener="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | tail -n +2 || true)"
            else
                listener="$(lsof -nP -iUDP:"$port" 2>/dev/null | tail -n +2 || true)"
            fi
        fi

        if [[ -n "$listener" ]]; then
            local proc_name
            proc_name="$(echo "$listener" | awk '{print $1}' | head -n 1)"
            local proc_pid
            proc_pid="$(echo "$listener" | awk '{print $2}' | head -n 1)"
            if [[ "$proc_name" =~ (node|dente|electron) ]]; then
                log_pass "$proto $port is currently active and bound by $proc_name (PID: $proc_pid) [DENTE active]"
            else
                log_warn "$proto $port is occupied by another process: $proc_name (PID: $proc_pid)"
            fi
        else
            log_pass "$proto $port is free and available for DENTE CRM"
        fi
    done
}

# -----------------------------------------------------------------------------
# 3. MACOS APPLICATION FIREWALL (socketfilterfw) AUDIT
# -----------------------------------------------------------------------------
check_firewall() {
    log_info "Checking macOS Application Firewall status..."
    local fw_bin="/usr/libexec/ApplicationFirewall/socketfilterfw"

    if [[ ! -x "$fw_bin" ]]; then
        log_warn "Application Firewall binary not found at $fw_bin. Skipping firewall inspection."
        return
    fi

    local fw_state
    fw_state="$("$fw_bin" --getglobalstate 2>&1 || true)"
    log_diag "Firewall global state: $fw_state"

    if echo "$fw_state" | grep -qi "disabled"; then
        log_pass "macOS Application Firewall is DISABLED. Inbound connections on ports 4000, 4100, 5353 are permitted."
        return
    fi

    log_warn "macOS Application Firewall is ENABLED. Inspecting filtering rules..."

    # Check stealth mode
    local stealth_state
    stealth_state="$("$fw_bin" --getstealthmode 2>&1 || true)"
    log_diag "Stealth mode: $stealth_state"

    # Check block-all mode
    local blockall_state
    blockall_state="$("$fw_bin" --getblockall 2>&1 || true)"
    log_diag "Block all incoming connections: $blockall_state"

    if echo "$blockall_state" | grep -qi "enabled"; then
        log_fail "CRITICAL: 'Block all incoming connections' is ENABLED in macOS Firewall!"
        log_fail "Doctor and assistant tablets will NOT be able to connect to this server."
        print_firewall_instructions
        return
    fi

    # Check whether node or dente is authorized
    local node_path
    node_path="$(command -v node 2>/dev/null || echo "")"
    local app_list
    app_list="$("$fw_bin" --listapps 2>&1 || true)"

    local node_authorized=false
    if [[ -n "$node_path" ]] && echo "$app_list" | grep -Fq "$node_path"; then
        node_authorized=true
        log_pass "Node.js runtime ($node_path) is authorized in Application Firewall rules."
    else
        log_warn "Node.js ($node_path) was not found in the Application Firewall whitelist."
    fi

    if [[ "$node_authorized" == false ]]; then
        # Try automatic rule configuration if running as root
        if [[ "$(id -u)" -eq 0 ]] && [[ -n "$node_path" ]]; then
            log_info "Running with superuser privileges. Automatically authorizing Node.js in socketfilterfw..."
            "$fw_bin" --add "$node_path" >/dev/null 2>&1 || true
            "$fw_bin" --unblockapp "$node_path" >/dev/null 2>&1 || true
            log_pass "Successfully authorized Node.js ($node_path) in macOS Application Firewall."
        else
            print_firewall_instructions
        fi
    fi
}

# -----------------------------------------------------------------------------
# 4. STEP-BY-STEP FIREWALL REMEDIATION INSTRUCTIONS
# -----------------------------------------------------------------------------
print_firewall_instructions() {
    printf "\n${YELLOW}====================================================================${NC}\n"
    printf "${BOLD}   ИНСТРУКЦИЯ ПО НАСТРОЙКЕ БРАНДМАУЭРА macOS ДЛЯ DENTE CRM          ${NC}\n"
    printf "${YELLOW}====================================================================${NC}\n"
    printf "Для бесперебойного подключения планшетов врача и ассистента:\n\n"
    printf "1. Откройте ${BOLD}«Системные настройки»${NC} (System Settings).\n"
    printf "2. Перейдите в раздел ${BOLD}«Сеть»${NC} (Network) -> ${BOLD}«Брандмауэр»${NC} (Firewall).\n"
    printf "3. Нажмите кнопку ${BOLD}«Параметры...»${NC} (Options...).\n"
    printf "4. Убедитесь, что переключатель ${BOLD}«Блокировать все входящие подключения»${NC} ВЫКЛЮЧЕН.\n"
    printf "5. Нажмите кнопку ${BOLD}«+»${NC}, добавьте бинарный файл Node.js или приложение DENTE CRM\n"
    printf "   и установите статус ${GREEN}«Разрешать входящие подключения»${NC}.\n\n"
    printf "Либо выполните команду в Терминале от имени суперпользователя:\n"
    printf "   ${CYAN}sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add \$(which node)${NC}\n"
    printf "   ${CYAN}sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp \$(which node)${NC}\n"
    printf "${YELLOW}====================================================================${NC}\n\n"
}

# -----------------------------------------------------------------------------
# 5. PHYSICAL NETWORK INTERFACES & LAN IP TOPOLOGY
# -----------------------------------------------------------------------------
audit_lan_topology() {
    log_info "Detecting physical LAN network interfaces on macOS..."

    local found_ip=false
    local primary_ip=""

    if command -v networksetup >/dev/null 2>&1; then
        local hw_ports
        hw_ports="$(networksetup -listallhardwareports 2>/dev/null || true)"

        local current_port=""
        local current_device=""

        while IFS= read -r line; do
            if [[ "$line" =~ Hardware\ Port:\ (.*) ]]; then
                current_port="${BASH_REMATCH[1]}"
            elif [[ "$line" =~ Device:\ (.*) ]]; then
                current_device="${BASH_REMATCH[1]}"
                if [[ -n "$current_port" && -n "$current_device" ]]; then
                    local ip=""
                    if command -v ipconfig >/dev/null 2>&1; then
                        ip="$(ipconfig getifaddr "$current_device" 2>/dev/null || true)"
                    fi

                    # Filter out empty, loopback, and link-local (169.254.x.x)
                    if [[ -n "$ip" && ! "$ip" =~ ^127\. && ! "$ip" =~ ^169\.254\. ]]; then
                        log_pass "Found physical adapter '$current_port' ($current_device) -> IP: $ip"
                        if [[ -z "$primary_ip" ]]; then
                            primary_ip="$ip"
                            found_ip=true
                        fi
                    else
                        log_diag "Adapter '$current_port' ($current_device): No active RFC 1918 private IPv4"
                    fi
                fi
                current_port=""
                current_device=""
            fi
        done <<< "$hw_ports"
    fi

    # Fallback to ifconfig for en0 / en1 if networksetup returned no IP
    if [[ "$found_ip" == false ]]; then
        for iface in en0 en1 en2; do
            local iface_ip
            iface_ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
            if [[ -n "$iface_ip" && ! "$iface_ip" =~ ^169\.254\. ]]; then
                log_pass "Discovered physical interface $iface -> IP: $iface_ip"
                primary_ip="$iface_ip"
                found_ip=true
                break
            fi
        done
    fi

    printf "\n${BOLD}====================================================================${NC}\n"
    printf "${BOLD}   DENTE CLINIC LAN ACCESS URLS FOR DOCTOR / ASSISTANT TABLETS     ${NC}\n"
    printf "${BOLD}====================================================================${NC}\n"
    if [[ "$found_ip" == true && -n "$primary_ip" ]]; then
        printf "  Primary Web Portal & Doctor UI:  ${GREEN}${BOLD}http://%s:4000${NC}\n" "$primary_ip"
        printf "  Fastify REST API & Diagnostics:   ${GREEN}${BOLD}http://%s:4100/api/health/lan${NC}\n" "$primary_ip"
        printf "  Real-time WebSocket Endpoint:    ${GREEN}${BOLD}ws://%s:4100/ws${NC}\n" "$primary_ip"
        printf "  Local Workstation Access:        ${CYAN}http://localhost:4000${NC}\n"
    else
        log_warn "No active physical LAN IP detected. Server is running in offline localhost mode."
        printf "  Local Workstation Access:        ${CYAN}http://localhost:4000${NC}\n"
    fi
    printf "${BOLD}====================================================================${NC}\n\n"
}

# -----------------------------------------------------------------------------
# MAIN EXECUTION
# -----------------------------------------------------------------------------
main() {
    print_header
    check_platform
    check_ports
    check_firewall
    audit_lan_topology
    log_pass "macOS LAN network & firewall configuration audit completed successfully."
}

main "$@"
