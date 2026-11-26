/**
 * DENTE Dental CRM — Desktop LAN / Wi-Fi Pairing & Discovery Bridge
 *
 * Preserves and modularizes LAN pairing bridge (commit cafa05ed7b):
 * - Selects physical RFC 1918 LAN IPv4 interfaces while filtering virtual/VPN adapters.
 * - Probes clinic API `/api/health/discovery` endpoints over HTTP with AbortSignal timeouts.
 * - Discovers clinic servers on UDP port 4101 (DENTE LAN Beacon).
 * - Resolves and persists `clinicServerUrl` in `userData/runtime.json`.
 */

const dgram = require("node:dgram");
const os = require("node:os");
const { createDesktopLogger } = require("./desktopLogger.cjs");

const logger = createDesktopLogger("LanBeaconBridge");
const DEFAULT_LAN_BEACON_PORT = 4101;
const VIRTUAL_ADAPTER_PATTERNS = [
	/vethernet/i,
	/wsl/i,
	/hyper-v/i,
	/virtualbox/i,
	/vbox/i,
	/docker/i,
	/tap[-_]?/i,
	/tun[-_]?/i,
	/zerotier/i,
	/tailscale/i,
	/wireguard/i,
	/radmin/i,
	/hamachi/i,
	/openvpn/i,
	/vmware/i,
	/vmnet/i,
	/loopback/i,
	/bluetooth/i,
	/awdl/i,
	/llw/i,
	/utun/i,
];

function isPrivateIpv4(ip) {
	if (!ip || typeof ip !== "string") return false;
	const parts = ip.split(".").map((seg) => Number.parseInt(seg, 10));
	if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
		return false;
	}
	const [p0, p1] = parts;
	if (p0 === 127 || p0 === 0 || p0 === 26) return false;
	if (p0 === 169 && p1 === 254) return false;
	if (p0 === 100 && p1 >= 64 && p1 <= 127) return false;
	if (p0 === 10) return true;
	if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
	if (p0 === 192 && p1 === 168) return true;
	return false;
}

function getLocalPhysicalLanAddresses() {
	const interfaces = os.networkInterfaces();
	const candidates = [];

	for (const [name, addrs] of Object.entries(interfaces)) {
		if (!Array.isArray(addrs)) continue;
		const isVirtual = VIRTUAL_ADAPTER_PATTERNS.some((pat) => pat.test(name));
		if (isVirtual) continue;

		for (const addr of addrs) {
			if (!addr || addr.internal || addr.family !== "IPv4") continue;
			if (!isPrivateIpv4(addr.address)) continue;
			const isWifi = /wi-?fi|wlan|wireless/i.test(name);
			const isEthernet = /eth|en\d+|ethernet|lan/i.test(name);
			candidates.push({
				name,
				address: addr.address,
				netmask: addr.netmask,
				isWifi,
				isEthernet,
				score: isEthernet ? 100 : isWifi ? 80 : 50,
			});
		}
	}

	candidates.sort((a, b) => b.score - a.score);
	return candidates;
}

function resolveConfiguredClinicServerUrl(runtimeConfig = {}) {
	const fromEnv = (process.env.DENTE_CLINIC_SERVER_URL || process.env.DENTE_API_URL || "").trim();
	const raw = fromEnv || (typeof runtimeConfig.clinicServerUrl === "string" ? runtimeConfig.clinicServerUrl.trim() : "");
	if (!raw) return null;
	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
		return parsed.origin;
	} catch (err) {
		logger.warn("Invalid configured clinicServerUrl", { raw, error: err instanceof Error ? err.message : String(err) });
		return null;
	}
}

async function probeClinicDiscoveryEndpoint(baseUrl, timeoutMs = 1500) {
	if (!baseUrl) return { reachable: false, error: "Empty server URL" };
	const cleanBase = baseUrl.replace(/\/+$/, "");
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	if (typeof timer.unref === "function") timer.unref();

	try {
		const res = await fetch(`${cleanBase}/api/health/discovery`, {
			method: "GET",
			headers: { "x-dente-client": "desktop-lan-bridge" },
			signal: controller.signal,
		});
		if (!res.ok) {
			return { reachable: false, status: res.status, error: `HTTP ${res.status}` };
		}
		const data = await res.json();
		return { reachable: true, baseUrl: cleanBase, discovery: data };
	} catch (err) {
		return {
			reachable: false,
			baseUrl: cleanBase,
			error: err instanceof Error ? err.message : String(err),
		};
	} finally {
		clearTimeout(timer);
	}
}

function probeLanServersViaUdp(options = {}) {
	const beaconPort = Number(options.port || DEFAULT_LAN_BEACON_PORT);
	const timeoutMs = Number(options.timeoutMs || 1200);
	const broadcastAddr = options.broadcastAddress || "255.255.255.255";

	return new Promise((resolve) => {
		const found = new Map();
		const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
		let settled = false;

		const finish = () => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try {
				socket.close();
			} catch (closeErr) {
				logger.warn("Failed to close LAN discovery UDP socket", closeErr);
			}
			resolve(Array.from(found.values()));
		};

		const timer = setTimeout(finish, timeoutMs);
		if (typeof timer.unref === "function") timer.unref();

		socket.on("error", (err) => {
			logger.warn("LAN UDP probe socket error", err);
			finish();
		});

		socket.on("message", (msg, rinfo) => {
			try {
				const parsed = JSON.parse(msg.toString("utf8"));
				if (parsed && (parsed.service === "dental-crm" || parsed.serverId || parsed.apiPort)) {
					const apiPort = Number(parsed.apiPort || 4100);
					const host = parsed.primaryIp || rinfo.address;
					const url = `http://${host}:${apiPort}`;
					found.set(url, {
						url,
						address: host,
						apiPort,
						serverName: parsed.serverName || "DENTE Clinic Server",
						serverId: parsed.serverId || null,
						version: parsed.version || null,
					});
				}
			} catch (parseErr) {
				logger.debug("Ignored non-JSON UDP packet during LAN probe", {
					from: rinfo?.address,
					error: parseErr instanceof Error ? parseErr.message : String(parseErr),
				});
			}
		});

		socket.bind(0, "0.0.0.0", () => {
			try {
				socket.setBroadcast(true);
				const probeBuf = Buffer.from(JSON.stringify({ type: "DENTE_DISCOVERY_PROBE", ts: Date.now() }), "utf8");
				socket.send(probeBuf, 0, probeBuf.length, beaconPort, broadcastAddr, (sendErr) => {
					if (sendErr) {
						logger.warn("Failed to send LAN discovery broadcast", sendErr);
					}
				});
			} catch (err) {
				logger.warn("LAN UDP probe setup failed", err);
				finish();
			}
		});
	});
}

module.exports = {
	DEFAULT_LAN_BEACON_PORT,
	isPrivateIpv4,
	getLocalPhysicalLanAddresses,
	resolveConfiguredClinicServerUrl,
	probeClinicDiscoveryEndpoint,
	probeLanServersViaUdp,
};
