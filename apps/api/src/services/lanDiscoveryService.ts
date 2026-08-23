/**
 * DENTE Dental CRM — LAN Server Discovery & mDNS Beacon Service
 *
 * Enables automatic discovery of clinic server over local network (Wi-Fi / Ethernet):
 * - Broadcasts server identity on UDP port 4101 for LAN discovery probes
 * - Enumerates local IPv4 network adapters (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
 * - Exposes discovery beacon metadata for web / mobile clients and desktop apps
 */

import * as dgram from "node:dgram";
import * as os from "node:os";
import * as crypto from "node:crypto";

export interface LanDiscoveryMetadata {
	serverName: string;
	serverId: string;
	apiPort: number;
	hostname: string;
	lanAddresses: string[];
	version: string;
	status: "online" | "degraded";
	onlineSince: string;
	timestamp: string;
}

const serverStartupTime = new Date().toISOString();
const serverInstanceId = crypto.randomUUID();
let activeUdpSocket: dgram.Socket | null = null;

/**
 * Enumerates non-internal IPv4 LAN addresses of the current machine.
 */
export function getLocalLanAddresses(): string[] {
	const addresses: string[] = [];
	const interfaces = os.networkInterfaces();

	for (const name of Object.keys(interfaces)) {
		const ifaceList = interfaces[name];
		if (!ifaceList) continue;

		for (const iface of ifaceList) {
			if (iface.family === "IPv4" && !iface.internal) {
				addresses.push(iface.address);
			}
		}
	}

	return addresses;
}

/**
 * Returns structured metadata describing the clinic LAN server.
 */
export function getLanServerDiscoveryMetadata(): LanDiscoveryMetadata {
	const apiPort = Number.parseInt(process.env.API_PORT || "4100", 10);
	const lanAddresses = getLocalLanAddresses();
	const hostname = process.env.DENTE_SERVER_HOSTNAME || "dente-server.local";

	return {
		serverName: "DENTE Dental CRM Server",
		serverId: serverInstanceId,
		apiPort,
		hostname,
		lanAddresses: lanAddresses.length > 0 ? lanAddresses : ["127.0.0.1"],
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
	logger?: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
} = {}): { stop: () => void } {
	const udpPort = options.port || Number.parseInt(process.env.DENTE_DISCOVERY_UDP_PORT || "4101", 10);
	const log = options.logger;

	try {
		const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
		activeUdpSocket = socket;

		socket.on("error", (err) => {
			if (log) log.error(`[LanDiscoveryService] UDP Socket error: ${err.message}`);
		});

		socket.on("message", (msg, rinfo) => {
			const query = msg.toString("utf8").trim();
			if (query.includes("DENTE_DISCOVERY_PROBE") || query.includes("M-SEARCH") || query.includes("DISCOVER")) {
				const metadata = getLanServerDiscoveryMetadata();
				const responseBuffer = Buffer.from(JSON.stringify(metadata), "utf8");
				socket.send(responseBuffer, 0, responseBuffer.length, rinfo.port, rinfo.address, (err) => {
					if (err && log) {
						log.error(`[LanDiscoveryService] Failed to send discovery response: ${err.message}`);
					}
				});
			}
		});

		socket.bind(udpPort, () => {
			if (log) {
				log.info(`[LanDiscoveryService] Listening for LAN discovery queries on UDP port ${udpPort}`);
			}
		});

		return {
			stop: () => {
				try {
					socket.close();
				} catch {}
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
		} catch {}
		activeUdpSocket = null;
	}
}
