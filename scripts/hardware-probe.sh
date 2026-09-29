#!/bin/sh
# ============================================================================
# DENTE CRM — macOS / Linux Hardware & Peripheral Discovery Probe (POSIX sh)
# ============================================================================
# Queries CUPS printers (lpstat), macOS system_profiler SPPrintersDataType,
# and serial/USB ports (/dev/tty.*, /dev/ttyUSB*, /dev/ttyACM*) for connected
# clinic peripherals: ESC/POS receipt printers, TSPL/ZPL label printers,
# barcode scanners, and fiscal cash registers.
# Outputs normalized JSON strictly compliant with HardwareDiscoveryResult.
# ============================================================================

set -e

HOST_PLATFORM="linux"
UNAME_OUT="$(uname -s 2>/dev/null || echo 'Unknown')"
case "$UNAME_OUT" in
    Darwin*) HOST_PLATFORM="darwin" ;;
    Linux*)  HOST_PLATFORM="linux" ;;
    *)       HOST_PLATFORM="linux" ;;
esac

PROBE_NETWORK=0
TIMEOUT_SEC=1

for arg in "$@"; do
    case "$arg" in
        --network) PROBE_NETWORK=1 ;;
        --timeout=*) TIMEOUT_SEC="${arg#*=}" ;;
    esac
done

NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%d %H:%M:%S")"

DEVICES_JSON="[]"

# Helper python/node JSON builder if available, or fallback awk/printf
# Node is standard in DENTE CRM host environment
if command -v node >/dev/null 2>&1; then
    node -e '
const fs = require("fs");
const { execSync } = require("child_process");

const platform = process.platform;
const devices = [];

// 1. CUPS / LPSTAT discovery
try {
    const defaultPrinterRaw = execSync("lpstat -d 2>/dev/null || true", { encoding: "utf8" });
    const defaultMatch = defaultPrinterRaw.match(/destination:\s*([^\s]+)/i);
    const defaultName = defaultMatch ? defaultMatch[1] : null;

    const lpstatRaw = execSync("lpstat -p 2>/dev/null || true", { encoding: "utf8" });
    const lines = lpstatRaw.split("\n");
    for (const line of lines) {
        const m = line.match(/^printer\s+([^\s]+)\s+(is\s+(idle|printing|disabled)|disabled)/i);
        if (m) {
            const name = m[1];
            const state = m[2].toLowerCase();
            const isIdle = state.includes("idle") || state.includes("printing");
            const isDefault = (name === defaultName);

            const lower = name.toLowerCase();
            let type = "document_printer";
            let emulation = undefined;
            let paperWidth = undefined;

            if (lower.match(/xprinter|rongta|pos-?58|pos-?80|thermal|receipt|escpos|evotor/)) {
                type = "thermal_receipt";
                emulation = "escpos";
                paperWidth = lower.includes("80") ? 80 : 58;
            } else if (lower.match(/tsc|zebra|godex|gprinter|argox|hprt|label|zd\d+|xp-3/)) {
                type = "label_printer";
                emulation = lower.match(/zebra|zd|gk4/) ? "zpl" : "tspl";
            } else if (lower.match(/atol|shtrih|kkt/)) {
                type = "fiscal_kkt";
            }

            devices.push({
                id: `printer:cups:${name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase()}`,
                name: name,
                type: type,
                interface: "system_spooler",
                status: isIdle ? "online" : "offline",
                isDefault: isDefault,
                model: name,
                emulation: emulation,
                paperWidthMm: paperWidth,
                details: { cupsState: state }
            });
        }
    }
} catch (e) {
    // Ignore CUPS errors
}

// 2. macOS system_profiler printers
if (platform === "darwin") {
    try {
        const spRaw = execSync("system_profiler SPPrintersDataType -json 2>/dev/null || true", { encoding: "utf8" });
        if (spRaw.trim()) {
            const spData = JSON.parse(spRaw);
            const printers = spData.SPPrintersDataType || [];
            for (const p of printers) {
                const name = p._name || "Unknown Printer";
                const uri = p.uri || "";
                const driver = p.driver || "";
                const id = `printer:sp:${name.replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase()}`;
                if (!devices.some(d => d.id === id || d.name === name)) {
                    devices.push({
                        id: id,
                        name: name,
                        type: name.toLowerCase().match(/xprinter|pos|receipt|thermal/) ? "thermal_receipt" : "document_printer",
                        interface: uri.startsWith("usb://") ? "usb" : "system_spooler",
                        status: p.status === "idle" || p.status === "printing" ? "online" : "unknown",
                        isDefault: Boolean(p.default_printer),
                        model: driver,
                        port: uri,
                        details: { uri: uri }
                    });
                }
            }
        }
    } catch (e) {}
}

// 3. Serial / COM Ports (/dev/tty.*, /dev/ttyUSB*, /dev/ttyACM*)
const serialPaths = [];
const devDir = "/dev";
try {
    if (fs.existsSync(devDir)) {
        const entries = fs.readdirSync(devDir);
        for (const entry of entries) {
            if (entry.startsWith("tty.") || entry.startsWith("cu.") || entry.startsWith("ttyUSB") || entry.startsWith("ttyACM")) {
                serialPaths.push(`/dev/${entry}`);
            }
        }
    }
} catch (e) {}

for (const p of serialPaths) {
    const lower = p.toLowerCase();
    let devType = "serial_com";
    if (lower.match(/scanner|barcode/)) devType = "barcode_scanner";
    else if (lower.match(/atol|shtrih|kkt/)) devType = "fiscal_kkt";

    devices.push({
        id: `com:${p.replace("/dev/", "").replace(/[^a-zA-Z0-9_\-]/g, "_").toLowerCase()}`,
        name: p,
        type: devType,
        interface: "serial_com",
        status: "online",
        isDefault: false,
        port: p,
        model: p
    });
}

const summary = {
    total: devices.length,
    online: devices.filter(d => d.status === "online").length,
    printers: devices.filter(d => d.type === "thermal_receipt" || d.type === "label_printer" || d.type === "document_printer").length,
    scanners: devices.filter(d => d.type === "barcode_scanner").length,
    kkt: devices.filter(d => d.type === "fiscal_kkt").length
};

const result = {
    timestamp: new Date().toISOString(),
    hostPlatform: platform === "darwin" ? "darwin" : "linux",
    devices: devices,
    summary: summary
};

console.log(JSON.stringify(result));
'
else
    # Minimal POSIX awk/sh fallback
    printf '{"timestamp":"%s","hostPlatform":"%s","devices":[],"summary":{"total":0,"online":0,"printers":0,"scanners":0,"kkt":0}}\n' "$NOW_ISO" "$HOST_PLATFORM"
fi
