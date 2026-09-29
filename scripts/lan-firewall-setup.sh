#!/usr/bin/env bash
# ==============================================================================
# DENTE CRM — macOS & Linux Firewall Setup for Clinic LAN Mesh
#
# Configures inbound firewall rules:
# - UDP 4101: Peer discovery beacons & master lease heartbeats
# - TCP 4100-4105: Local HTTP API & tablet mutation streaming
# - TCP 5432: PostgreSQL server port
#
# Usage:
#   sudo ./scripts/lan-firewall-setup.sh
#   ./scripts/lan-firewall-setup.sh --check
#   sudo ./scripts/lan-firewall-setup.sh --remove
# ==============================================================================

set -euo pipefail

MODE="install"
for arg in "$@"; do
    case "$arg" in
        --check)
            MODE="check"
            ;;
        --remove)
            MODE="remove"
            ;;
        --help|-h)
            echo "Usage: $0 [--check | --remove]"
            exit 0
            ;;
    esac
done

echo ""
echo "================================================================================"
echo "   DENTE CRM -- Clinic LAN Mesh Firewall Configuration (macOS / Linux)         "
echo "================================================================================"
echo ""

# 1. Root privilege verification
if [ "$MODE" != "check" ] && [ "$(id -u)" -ne 0 ]; then
    echo "[!] NOTICE: Administrator privileges (sudo) required."
    echo "[*] Elevating via sudo..."
    exec sudo "$0" "$@"
fi

OS_NAME="$(uname -s)"
echo "[*] Detected Operating System: $OS_NAME"

# 2. macOS Configuration (PF - Packet Filter)
if [ "$OS_NAME" = "Darwin" ]; then
    PF_ANCHOR_FILE="/etc/pf.anchors/com.dente.crm.lan"
    PF_CONF="/etc/pf.conf"

    if [ "$MODE" = "check" ]; then
        echo "[*] Auditing macOS Packet Filter rules..."
        if [ -f "$PF_ANCHOR_FILE" ]; then
            echo "  [+] DENTE CRM anchor file exists: $PF_ANCHOR_FILE"
            cat "$PF_ANCHOR_FILE"
        else
            echo "  [-] DENTE CRM anchor file not found: $PF_ANCHOR_FILE"
        fi
        exit 0
    fi

    if [ "$MODE" = "remove" ]; then
        echo "[*] Removing macOS PF anchor..."
        if [ -f "$PF_ANCHOR_FILE" ]; then
            rm -f "$PF_ANCHOR_FILE"
            echo "  [-] Removed $PF_ANCHOR_FILE"
        fi
        # Reload PF
        if pfctl -s info >/dev/null 2>&1; then
            pfctl -f /etc/pf.conf 2>/dev/null || true
        fi
        echo "[+] macOS rules successfully removed."
        exit 0
    fi

    echo "[*] Configuring macOS Packet Filter anchor ($PF_ANCHOR_FILE)..."
    cat << 'EOF' > "$PF_ANCHOR_FILE"
# DENTE CRM LAN Mesh Firewall Rules
# Inbound discovery beacons & lease heartbeats
pass in proto udp from any to any port 4101
# Inbound HTTP API & tablet mutation streaming
pass in proto tcp from any to any port 4100:4105
# Inbound PostgreSQL server
pass in proto tcp from any to any port 5432
EOF

    echo "  [+] Created PF anchor: $PF_ANCHOR_FILE"

    # Verify pfctl syntax
    if pfctl -nf "$PF_ANCHOR_FILE" >/dev/null 2>&1; then
        echo "  [+] PF syntax validation: PASSED"
    else
        echo "  [!] Warning: PF syntax check reported notice"
    fi

    echo ""
    echo "[+] macOS firewall rules configured. To activate PF anchor, run:"
    echo "    sudo pfctl -ef $PF_ANCHOR_FILE"
    exit 0
fi

# 3. Linux Configuration (UFW / firewalld / iptables)
if [ "$OS_NAME" = "Linux" ]; then
    # 3.1 UFW (Ubuntu / Debian / Linux Mint)
    if command -v ufw >/dev/null 2>&1 && ufw status | grep -qw "active"; then
        echo "[*] Active UFW detected."

        if [ "$MODE" = "check" ]; then
            ufw status verbose | grep -E "4101|4100:4105|5432" || echo "[-] No DENTE CRM rules found in UFW."
            exit 0
        fi

        if [ "$MODE" = "remove" ]; then
            echo "[*] Removing DENTE CRM rules from UFW..."
            ufw delete allow 4101/udp || true
            ufw delete allow 4100:4105/tcp || true
            ufw delete allow 5432/tcp || true
            echo "[+] UFW rules removed."
            exit 0
        fi

        echo "[*] Adding DENTE CRM rules to UFW..."
        ufw allow 4101/udp comment 'DENTE CRM LAN Mesh UDP'
        ufw allow 4100:4105/tcp comment 'DENTE CRM LAN Mesh HTTP'
        ufw allow 5432/tcp comment 'DENTE CRM PostgreSQL'
        echo "[+] UFW rules successfully applied."
        exit 0
    fi

    # 3.2 firewalld (RHEL / Fedora / CentOS / Alma / Rocky)
    if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld; then
        echo "[*] Active firewalld detected."

        if [ "$MODE" = "check" ]; then
            firewall-cmd --list-ports | grep -E "4101|4100-4105|5432" || echo "[-] No DENTE CRM ports found in firewalld."
            exit 0
        fi

        if [ "$MODE" = "remove" ]; then
            echo "[*] Removing DENTE CRM ports from firewalld..."
            firewall-cmd --permanent --remove-port=4101/udp || true
            firewall-cmd --permanent --remove-port=4100-4105/tcp || true
            firewall-cmd --permanent --remove-port=5432/tcp || true
            firewall-cmd --reload
            echo "[+] firewalld ports removed."
            exit 0
        fi

        echo "[*] Adding DENTE CRM ports to firewalld..."
        firewall-cmd --permanent --add-port=4101/udp
        firewall-cmd --permanent --add-port=4100-4105/tcp
        firewall-cmd --permanent --add-port=5432/tcp
        firewall-cmd --reload
        echo "[+] firewalld ports successfully applied."
        exit 0
    fi

    # 3.3 Raw iptables fallback
    if command -v iptables >/dev/null 2>&1; then
        echo "[*] Using iptables..."

        if [ "$MODE" = "check" ]; then
            iptables -L INPUT -n -v | grep -E "4101|4100:4105|5432" || echo "[-] No DENTE CRM rules found in iptables."
            exit 0
        fi

        if [ "$MODE" = "remove" ]; then
            echo "[*] Removing iptables rules..."
            iptables -D INPUT -p udp --dport 4101 -j ACCEPT 2>/dev/null || true
            iptables -D INPUT -p tcp --dport 4100:4105 -j ACCEPT 2>/dev/null || true
            iptables -D INPUT -p tcp --dport 5432 -j ACCEPT 2>/dev/null || true
            echo "[+] iptables rules removed."
            exit 0
        fi

        # Idempotent addition
        if ! iptables -C INPUT -p udp --dport 4101 -j ACCEPT 2>/dev/null; then
            iptables -I INPUT -p udp --dport 4101 -j ACCEPT
        fi
        if ! iptables -C INPUT -p tcp --dport 4100:4105 -j ACCEPT 2>/dev/null; then
            iptables -I INPUT -p tcp --dport 4100:4105 -j ACCEPT
        fi
        if ! iptables -C INPUT -p tcp --dport 5432 -j ACCEPT 2>/dev/null; then
            iptables -I INPUT -p tcp --dport 5432 -j ACCEPT
        fi

        echo "[+] iptables rules successfully applied."
        exit 0
    fi

    echo "[!] No supported firewall manager (ufw, firewalld, iptables) found."
    exit 1
fi

echo "[-] Unsupported platform: $OS_NAME"
exit 1
