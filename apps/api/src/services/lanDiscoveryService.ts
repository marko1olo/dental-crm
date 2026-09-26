/**
 * DENTE Dental CRM — LAN Server Discovery & Network Topology Service
 *
 * Enables automatic discovery and zero-config pairing of clinic server over local network:
 * - Hardened physical adapter prioritization: Wired Ethernet / Wi-Fi with RFC 1918 private subnets
 * - Cross-platform support: Windows, macOS (en0/en1, awdl, llw, utun), Linux (eth, wlan)
 * - Strict virtual adapter blacklist: Hyper-V, WSL, VirtualBox, Docker, TAP-Windows, vEthernet,
 *   ZeroTier, Tailscale, WireGuard, macOS awdl/llw/utun/bridge/gif/stf/anpi/ap
 * - Inactive adapter rejection: filters unassigned IPs and link-local APIPA (169.254.x.x)
 * - Dual-probe UDP broadcast / SSDP responder on port 4101
 * - Exposes real LAN IP candidates for QR pairing modals and doctor/assistant tablet connections
 */

import * as childProcess from "node:child_process";
import * as crypto from "node:crypto";
import * as dgram from "node:dgram";
import * as os from "node:os";

export interface LanInterfaceCandidate {
	readonly name: string;
	readonly address: string;
	readonly netmask: string;
	readonly mac: string;
	readonly family: "IPv4" | "IPv6";
	readonly isWifi: boolean;
	readonly isEthernet: boolean;
	readonly isVirtual: boolean;
	readonly score: number;
	readonly reason: string;
}

export interface LanDiscoveryMetadata {
	readonly serverName: string;
	readonly serverId: string;
	readonly apiPort: number;
	readonly webPort: number;
	readonly hostname: string;
	readonly primaryIp: string;
	readonly lanAddresses: string[];
	readonly interfaces: LanInterfaceCandidate[];
	readonly version: string;
	readonly status: "online" | "degraded";
	readonly onlineSince: string;
	readonly timestamp: string;
}

export interface LanEvaluationOptions {
	readonly hardwarePorts?: ReadonlyMap<string, "ethernet" | "wifi">;
	readonly isWifi?: boolean;
	readonly isEthernet?: boolean;
	readonly platform?: NodeJS.Platform;
}

const serverStartupTime = new Date().toISOString();
const serverInstanceId = crypto.randomUUID();
let activeUdpSocket: dgram.Socket | null = null;

let macHardwarePortsCache: {
	timestamp: number;
	map: Map<string, "ethernet" | "wifi">;
} | null = null;

/**
 * Parses macOS `/usr/sbin/networksetup -listallhardwareports` to determine
 * whether a physical interface (e.g. en0, en1) is wired Ethernet or Wi-Fi.
 */
export function getMacOsHardwarePorts(forceRefresh = false): Map<string, "ethernet" | "wifi"> {
	const now = Date.now();
	if (!forceRefresh && macHardwarePortsCache && now - macHardwarePortsCache.timestamp < 30000) {
		return macHardwarePortsCache.map;
	}

	const map = new Map<string, "ethernet" | "wifi">();
	if (process.platform === "darwin") {
		try {
			const stdout = childProcess.execSync("/usr/sbin/networksetup -listallhardwareports", {
				encoding: "utf8",
				timeout: 2000,
				stdio: ["ignore", "pipe", "ignore"],
			});

			const blocks = stdout.split(/Hardware Port:/i);
			for (const block of blocks) {
				const portMatch = block.match(/^\s*([^\n\r]+)/);
				const deviceMatch = block.match(/Device:\s*([^\n\r]+)/i);
				if (portMatch && deviceMatch) {
					const portName = portMatch[1]?.trim() || "";
					const device = deviceMatch[1]?.trim() || "";
					if (/wi-fi|airport|wireless/i.test(portName)) {
						map.set(device, "wifi");
					} else if (/ethernet|lan/i.test(portName)) {
						map.set(device, "ethernet");
					}
				}
			}
		} catch {
			// Ignore if networksetup is unavailable, restricted, or timed out
		}
	}

	macHardwarePortsCache = { timestamp: now, map };
	return map;
}

/**
 * Strict regex blacklist of virtual adapters, container networks, VPN tunnels and fake loopbacks.
 * Includes macOS-specific service/tunnel interfaces:
 * - awdl: Apple Wireless Direct Link (AirDrop / AirPlay peer-to-peer mesh)
 * - llw: Low Latency WLAN (Apple micro-mesh)
 * - utun: User-space TUN / VPN tunnels
 * - bridge: Thunderbolt and VM bridges
 * - gif: Generic tunnel interface
 * - stf: 6to4 tunnel interface
 * - anpi: Apple Network Processing Interface
 * - ap: Apple Wi-Fi Access Point mode interface
 *
 * These interfaces must NEVER be selected as the clinic LAN server IP for tablet QR codes.
 */
export const VIRTUAL_ADAPTER_PATTERNS: readonly RegExp[] = [
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
	/awg/i,
	/hamachi/i,
	/openvpn/i,
	/nordlynx/i,
	/vmware/i,
	/vmnet/i,
	/loopback/i,
	/bluetooth/i,
	/p2p/i,
	/awdl/i,
	/llw/i,
	/multipass/i,
	/container/i,
	/bridge/i,
	/virbr/i,
	/dummy/i,
	/^lo\d*$/i,
	/^utun/i,
	/^gif\d*$/i,
	/^stf\d*$/i,
	/^anpi\d*$/i,
	/^ap\d*$/i,
	/^br\d+$/i,
	/^veth[0-9a-f]+$/i,
];

/**
 * Checks if network interface name matches known virtual/VPN adapter patterns.
 */
export function isVirtualAdapterName(name: string): boolean {
	const trimmed = name.trim();
	return VIRTUAL_ADAPTER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Validates whether an IPv4 address belongs to RFC 1918 private subnets:
 * - 192.168.0.0/16
 * - 10.0.0.0/8
 * - 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
 *
 * Explicitly rejects loopbacks (127.x), APIPA link-local (169.254.x), CGNAT (100.64-127.x), and public IPs.
 */
export function isPrivateIpv4(ip: string): boolean {
	const parts = ip.split(".").map((seg) => Number.parseInt(seg, 10));
	if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
		return false;
	}
	const [p0, p1] = parts;
	if (p0 === undefined || p1 === undefined) return false;

	// Loopback 127.0.0.0/8
	if (p0 === 127) return false;
	// 0.0.0.0
	if (p0 === 0) return false;
	// Link-local / APIPA 169.254.0.0/16 (DHCP failure / unassigned)
	if (p0 === 169 && p1 === 254) return false;
	// Carrier Grade NAT 100.64.0.0/10 (Used by Tailscale & mobile ISP CGNAT)
	if (p0 === 100 && p1 >= 64 && p1 <= 127) return false;
	// Radmin VPN (26.0.0.0/8)
	if (p0 === 26) return false;

	// Class A: 10.0.0.0/8
	if (p0 === 10) return true;
	// Class B: 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
	if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
	// Class C: 192.168.0.0/16
	if (p0 === 192 && p1 === 168) return true;

	return false;
}

/**
 * Evaluates an individual network interface candidate, calculates reliability score,
 * and detects virtual adapter markers (zero MAC, /32 netmask, blacklist names, link-local).
 */
export function evaluateInterfaceCandidate(
	name: string,
	iface: os.NetworkInterfaceInfo,
	options?: LanEvaluationOptions,
): LanInterfaceCandidate {
	const rawAddress = iface?.address ? String(iface.address).trim() : "";

	// Inactive / unassigned IP check
	if (!rawAddress || rawAddress === "0.0.0.0") {
		return {
			name,
			address: rawAddress || "0.0.0.0",
			netmask: iface.netmask,
			mac: iface.mac,
			family: iface.family,
			isWifi: false,
			isEthernet: false,
			isVirtual: true,
			score: -1000,
			reason: "Inactive adapter (no IP assigned)",
		};
	}

	// Link-local / APIPA 169.254.x.x check (DHCP unassigned or failed)
	if (rawAddress.startsWith("169.254.")) {
		return {
			name,
			address: rawAddress,
			netmask: iface.netmask,
			mac: iface.mac,
			family: iface.family,
			isWifi: false,
			isEthernet: false,
			isVirtual: true,
			score: -400,
			reason: `Link-local / APIPA address (inactive DHCP): ${rawAddress}`,
		};
	}

	const isIpv4 = iface.family === "IPv4";
	if (!isIpv4) {
		return {
			name,
			address: rawAddress,
			netmask: iface.netmask,
			mac: iface.mac,
			family: iface.family,
			isWifi: false,
			isEthernet: false,
			isVirtual: true,
			score: -1000,
			reason: "Non-IPv4 interface",
		};
	}

	if (iface.internal) {
		return {
			name,
			address: rawAddress,
			netmask: iface.netmask,
			mac: iface.mac,
			family: iface.family,
			isWifi: false,
			isEthernet: false,
			isVirtual: true,
			score: -1000,
			reason: "Internal loopback",
		};
	}

	const isVirtualName = isVirtualAdapterName(name);
	if (isVirtualName) {
		return {
			name,
			address: rawAddress,
			netmask: iface.netmask,
			mac: iface.mac,
			family: iface.family,
			isWifi: false,
			isEthernet: false,
			isVirtual: true,
			score: -500,
			reason: `Matched virtual adapter blacklist: ${name}`,
		};
	}

	const isZeroMac = !iface.mac || iface.mac === "00:00:00:00:00:00";
	if (isZeroMac) {
		return {
			name,
			address: rawAddress,
			netmask: iface.netmask,
			mac: iface.mac,
			family: iface.family,
			isWifi: false,
			isEthernet: false,
			isVirtual: true,
			score: -400,
			reason: "Virtual/tunnel adapter (zero MAC)",
		};
	}

	const isPointToPoint = iface.netmask === "255.255.255.255";
	if (isPointToPoint) {
		return {
			name,
			address: rawAddress,
			netmask: iface.netmask,
			mac: iface.mac,
			family: iface.family,
			isWifi: false,
			isEthernet: false,
			isVirtual: true,
			score: -300,
			reason: "Point-to-point /32 tunnel (no local LAN subnet)",
		};
	}

	const isPrivate = isPrivateIpv4(rawAddress);
	if (!isPrivate) {
		return {
			name,
			address: rawAddress,
			netmask: iface.netmask,
			mac: iface.mac,
			family: iface.family,
			isWifi: false,
			isEthernet: false,
			isVirtual: false,
			score: -100,
			reason: `Non-RFC1918 address: ${rawAddress}`,
		};
	}

	const currentPlatform = options?.platform ?? process.platform;
	const isMacPhysical =
		/^en[01]$/i.test(name) || (currentPlatform === "darwin" && /^en\d+$/i.test(name));

	// Hardware port lookup (either passed explicitly in options, or queried on macOS)
	const hwPortType =
		options?.hardwarePorts?.get(name) ??
		(currentPlatform === "darwin" ? getMacOsHardwarePorts().get(name) : undefined);

	let isWifi = false;
	let isEthernet = false;

	if (options?.isWifi !== undefined) {
		isWifi = options.isWifi;
		isEthernet = options.isEthernet ?? !options.isWifi;
	} else if (options?.isEthernet !== undefined) {
		isEthernet = options.isEthernet;
		isWifi = !options.isEthernet;
	} else if (hwPortType === "wifi") {
		isWifi = true;
		isEthernet = false;
	} else if (hwPortType === "ethernet") {
		isEthernet = true;
		isWifi = false;
	} else if (/wi-fi|wifi|wlan|беспроводн|wireless|airport/i.test(name)) {
		isWifi = true;
		isEthernet = false;
	} else if (/ethernet|eth|сеть|локальн|подключение по локальной|lan/i.test(name)) {
		isEthernet = true;
		isWifi = false;
	} else if (/^en1$/i.test(name)) {
		// macOS default: en1 is typically Wi-Fi on Mac mini/iMac/Mac Pro
		isWifi = true;
		isEthernet = false;
	} else if (/^en0$/i.test(name)) {
		// macOS default: en0 is primary physical interface (Ethernet)
		isEthernet = true;
		isWifi = false;
	}

	let score = 0;
	const reasonParts: string[] = [];

	// Physical adapter type scoring
	// macOS physical en0/en1 with active RFC 1918 IPv4: +130 for wired Ethernet, +100 for Wi-Fi
	if (isMacPhysical) {
		if (isEthernet) {
			score += 130;
			reasonParts.push(`macOS physical Ethernet ${name} (+130)`);
		} else if (isWifi) {
			score += 100;
			reasonParts.push(`macOS physical Wi-Fi ${name} (+100)`);
		} else {
			score += 100;
			reasonParts.push(`macOS physical adapter ${name} (+100)`);
		}
	} else if (isEthernet) {
		score += 120;
		reasonParts.push("Ethernet adapter (+120)");
	} else if (isWifi) {
		score += 90;
		reasonParts.push("Wi-Fi adapter (+90)");
	} else {
		score += 60;
		reasonParts.push("Physical adapter (+60)");
	}

	// Subnet prioritization
	if (rawAddress.startsWith("192.168.")) {
		score += 30;
		reasonParts.push("Class C 192.168.x.x (+30)");
	} else if (rawAddress.startsWith("10.")) {
		score += 20;
		reasonParts.push("Class A 10.x.x.x (+20)");
	} else if (/^172\.(1[6-9]|2\d|3[01])\./.test(rawAddress)) {
		score += 15;
		reasonParts.push("Class B 172.16-31.x.x (+15)");
	}

	// Standard LAN subnet mask
	if (iface.netmask === "255.255.255.0") {
		score += 10;
		reasonParts.push("Standard /24 subnet (+10)");
	}

	// Windows Mobile Hotspot adapter detection bonus (192.168.137.1)
	if (rawAddress === "192.168.137.1") {
		score += 150;
		reasonParts.push("Windows Mobile Hotspot gateway (+150)");
	}

	return {
		name,
		address: rawAddress,
		netmask: iface.netmask,
		mac: iface.mac,
		family: iface.family,
		isWifi,
		isEthernet,
		isVirtual: false,
		score,
		reason: reasonParts.join("; "),
	};
}

/**
 * Returns all network interfaces discovered on current machine, evaluated and sorted by priority.
 */
export function getRankedLanInterfaces(
	customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
	options?: LanEvaluationOptions,
): LanInterfaceCandidate[] {
	const candidates: LanInterfaceCandidate[] = [];
	const interfaces = customInterfaces || os.networkInterfaces();

	for (const name of Object.keys(interfaces)) {
		const ifaceList = interfaces[name];
		if (!ifaceList) continue;

		for (const iface of ifaceList) {
			candidates.push(evaluateInterfaceCandidate(name, iface, options));
		}
	}

	// Sort highest score first
	return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Enumerates valid, non-virtual physical IPv4 LAN addresses of the current machine,
 * prioritized for doctor/assistant tablet connections (Wired Ethernet first, then Wi-Fi).
 */
export function getLocalLanAddresses(
	customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
	options?: LanEvaluationOptions,
): string[] {
	const ranked = getRankedLanInterfaces(customInterfaces, options);
	const validPhysical = ranked
		.filter((c) => !c.isVirtual && c.score > 0 && c.family === "IPv4" && isPrivateIpv4(c.address))
		.map((c) => c.address);

	// Deduplicate preserving order
	const unique = Array.from(new Set(validPhysical));
	return unique.length > 0 ? unique : ["127.0.0.1"];
}

/**
 * Returns the single most reliable LAN IPv4 address for tablet QR code generation.
 */
export function getPrimaryLanIp(
	customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>,
	options?: LanEvaluationOptions,
): string {
	const addresses = getLocalLanAddresses(customInterfaces, options);
	return addresses[0] || "127.0.0.1";
}

/**
 * Returns structured metadata describing the clinic LAN server.
 */
export function getLanServerDiscoveryMetadata(): LanDiscoveryMetadata {
	const apiPort = Number.parseInt(process.env.API_PORT || "4100", 10);
	const webPort = Number.parseInt(process.env.WEB_PORT || "4000", 10);
	const rankedInterfaces = getRankedLanInterfaces();
	const lanAddresses = getLocalLanAddresses();
	const primaryIp = lanAddresses[0] || "127.0.0.1";
	const hostname = process.env.DENTE_SERVER_HOSTNAME || os.hostname() || "dente-server.local";

	return {
		serverName: "DENTE Dental CRM Server",
		serverId: serverInstanceId,
		apiPort,
		webPort,
		hostname,
		primaryIp,
		lanAddresses,
		interfaces: rankedInterfaces,
		version: "0.1.0",
		status: "online",
		onlineSince: serverStartupTime,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Starts UDP discovery responder on local network.
 */
export function startLanDiscoveryService(options: {
	port?: number;
	logger?: {
		info: (...args: unknown[]) => void;
		error: (...args: unknown[]) => void;
		warn?: (...args: unknown[]) => void;
	};
} = {}): { stop: () => void } {
	const udpPort =
		options.port || Number.parseInt(process.env.DENTE_DISCOVERY_UDP_PORT || "4101", 10);
	const log = options.logger;

	try {
		const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
		activeUdpSocket = socket;

		socket.on("error", (err) => {
			if (log) log.error(`[LanDiscoveryService] UDP Socket error: ${err.message}`);
		});

		socket.on("message", (msg, rinfo) => {
			const query = msg.toString("utf8").trim();
			if (
				query.includes("DENTE_DISCOVERY_PROBE") ||
				query.includes("M-SEARCH") ||
				query.includes("DISCOVER") ||
				query.includes("ST: urn:dente")
			) {
				const metadata = getLanServerDiscoveryMetadata();
				let responseBuffer: Buffer;

				if (query.includes("M-SEARCH") || query.includes("ST:")) {
					const primaryIp = metadata.primaryIp;
					const ssdpResponse = [
						"HTTP/1.1 200 OK",
						"CACHE-CONTROL: max-age=1800",
						"EXT:",
						`LOCATION: http://${primaryIp}:${metadata.apiPort}/api/health/discovery`,
						"SERVER: DENTE-Dental-CRM-Server/0.1.0 UPnP/1.1",
						"ST: urn:dente:service:clinic-server:1",
						`USN: uuid:${metadata.serverId}::urn:dente:service:clinic-server:1`,
						"",
						"",
					].join("\r\n");
					responseBuffer = Buffer.from(ssdpResponse, "utf8");
				} else {
					responseBuffer = Buffer.from(JSON.stringify(metadata), "utf8");
				}

				socket.send(
					responseBuffer,
					0,
					responseBuffer.length,
					rinfo.port,
					rinfo.address,
					(err) => {
						if (err && log) {
							log.error(
								`[LanDiscoveryService] Failed to send discovery response: ${err.message}`,
							);
						}
					},
				);
			}
		});

		socket.bind(udpPort, () => {
			if (log) {
				log.info(`[LanDiscoveryService] Listening for LAN discovery queries on UDP port ${udpPort}`);
			}
			try {
				socket.addMembership("239.255.255.250");
			} catch (err: unknown) {
				if (log?.warn)
					log.warn(
						`[LanDiscoveryService] Multicast addMembership failed (non-critical): ${err instanceof Error ? err.message : String(err)}`,
					);
			}
		});

		return {
			stop: () => {
				try {
					socket.close();
				} catch (err: unknown) {
					if (log?.warn)
						log.warn(
							`[LanDiscoveryService] Error closing discovery socket: ${err instanceof Error ? err.message : String(err)}`,
						);
				}
				if (activeUdpSocket === socket) activeUdpSocket = null;
			},
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		if (log) log.error(`[LanDiscoveryService] Could not bind UDP discovery socket: ${message}`);
		return { stop: () => {} };
	}
}

/**
 * Stops any active LAN discovery UDP socket.
 */
export function stopLanDiscoveryService(): void {
	if (activeUdpSocket) {
		try {
			activeUdpSocket.close();
		} catch (err: unknown) {
			console.warn("[LanDiscoveryService] Error closing active UDP socket:", err);
		}
		activeUdpSocket = null;
	}
}
