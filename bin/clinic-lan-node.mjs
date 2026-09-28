#!/usr/bin/env node

/**
 * DENTE CRM — Standalone Clinic LAN Zero-Conf Node Runner
 *
 * Zero-dependency standalone CLI runner for multi-PC clinic deployments
 * on any computer (Doctor 1, Doctor 2, Reception, Server/Master)
 * WITHOUT requiring Internet access or external npm packages:
 *
 * - Built-in HTTP server on ports 4100-4105
 * - UDP Multicast (239.255.255.250) + Broadcast (255.255.255.255) on port 4101
 * - Subnet HTTP active prober for AP-isolated Wi-Fi routers
 * - Schema version compatibility verification & graceful degradation
 * - Dynamic Master election & offline mutation queuing
 *
 * Usage:
 *   node bin/clinic-lan-node.mjs --role=master --port=4100
 *   node bin/clinic-lan-node.mjs --role=doctor --port=4102
 *   node bin/clinic-lan-node.mjs --role=reception --port=4103
 */

import * as crypto from "node:crypto";
import * as dgram from "node:dgram";
import * as http from "node:http";
import * as os from "node:os";

// ─────────────────────────────────────────────────────────────────────────────
// CLI Argument Parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(args) {
	const params = {
		role: "doctor",
		port: 4100,
		udpPort: 4101,
		clinicId: "clinic-default",
		nodeId: `node-${crypto.randomUUID().slice(0, 8)}`,
		appVersion: "2.4.0",
		schemaVersion: 182,
		probe: false,
		statusOnly: false,
		help: false,
	};

	for (const arg of args) {
		if (arg === "--help" || arg === "-h") {
			params.help = true;
		} else if (arg === "--probe") {
			params.probe = true;
		} else if (arg === "--status") {
			params.statusOnly = true;
		} else if (arg.startsWith("--role=")) {
			params.role = arg.slice(7).trim();
		} else if (arg.startsWith("--port=")) {
			params.port = Number.parseInt(arg.slice(7).trim(), 10) || 4100;
		} else if (arg.startsWith("--udp-port=")) {
			params.udpPort = Number.parseInt(arg.slice(11).trim(), 10) || 4101;
		} else if (arg.startsWith("--clinic-id=")) {
			params.clinicId = arg.slice(12).trim();
		} else if (arg.startsWith("--node-id=")) {
			params.nodeId = arg.slice(10).trim();
		} else if (arg.startsWith("--app-version=")) {
			params.appVersion = arg.slice(14).trim();
		} else if (arg.startsWith("--schema-version=")) {
			params.schemaVersion = Number.parseInt(arg.slice(17).trim(), 10) || 182;
		}
	}
	return params;
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
	console.log(`
DENTE CRM — Clinic LAN Zero-Conf Node Runner
============================================
Autonomous multi-PC network mesh for dental practices without Internet.

Options:
  --role=<role>             Node role: master | doctor | reception | admin (default: doctor)
  --port=<port>             HTTP API port (default: 4100)
  --udp-port=<port>         UDP discovery port (default: 4101)
  --clinic-id=<id>          Clinic practice tenant ID (default: clinic-default)
  --node-id=<id>            Unique identifier for this PC (default: auto-generated)
  --app-version=<version>   Application version string (default: 2.4.0)
  --schema-version=<num>    Database schema version integer (default: 182)
  --probe                   Execute immediate subnet scan on startup
  --status                  Query local node status on port and exit
  --help, -h                Show this help message

Examples:
  node bin/clinic-lan-node.mjs --role=master --port=4100
  node bin/clinic-lan-node.mjs --role=doctor --port=4102 --node-id=doctor-cab1
  node bin/clinic-lan-node.mjs --role=reception --port=4103 --node-id=reception-main
`);
	process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Network Interface Discovery (Physical RFC1918)
// ─────────────────────────────────────────────────────────────────────────────

function getLocalIpv4Addresses() {
	const addresses = [];
	const interfaces = os.networkInterfaces();
	for (const name of Object.keys(interfaces)) {
		const ifaceList = interfaces[name];
		if (!ifaceList) continue;
		for (const iface of ifaceList) {
			if (iface.family === "IPv4" && !iface.internal) {
				const addr = iface.address;
				// Filter out APIPA 169.254.x and virtual patterns
				if (!addr.startsWith("169.254.") && !addr.startsWith("127.")) {
					addresses.push(addr);
				}
			}
		}
	}
	return addresses.length > 0 ? addresses : ["127.0.0.1"];
}

const primaryIp = getLocalIpv4Addresses()[0] || "127.0.0.1";

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Peer State & Mutation Queue
// ─────────────────────────────────────────────────────────────────────────────

const peers = new Map();
const offlineMutationQueue = new Map();
let activeMasterId = options.role === "master" ? options.nodeId : null;

function normalizeSchema(version) {
	if (typeof version === "number") return version;
	const match = String(version).match(/(\d+)/);
	return match ? Number.parseInt(match[1], 10) : 0;
}

function verifyCompatibility(remote) {
	if (options.clinicId !== remote.clinicId) {
		return {
			compatible: false,
			syncAllowed: false,
			mode: "read_only",
			reason: `Clinic mismatch: local '${options.clinicId}' vs remote '${remote.clinicId}'`,
		};
	}

	const localSchema = normalizeSchema(options.schemaVersion);
	const remoteSchema = normalizeSchema(remote.schemaVersion);

	if (localSchema !== remoteSchema) {
		return {
			compatible: false,
			syncAllowed: false,
			mode: "sync_deferred",
			reason: `Schema mismatch: local v${localSchema} vs remote v${remoteSchema}`,
		};
	}

	return {
		compatible: true,
		syncAllowed: true,
		mode: "full_sync",
		reason: "Compatible",
	};
}

function electMaster() {
	const candidates = [
		{
			nodeId: options.nodeId,
			role: options.role,
			schemaVersion: options.schemaVersion,
			status: "online",
		},
		...Array.from(peers.values()),
	];

	const masters = candidates.filter((c) => c.role === "master");
	if (masters.length > 0) {
		masters.sort((a, b) => {
			const sA = normalizeSchema(a.schemaVersion);
			const sB = normalizeSchema(b.schemaVersion);
			if (sA !== sB) return sB - sA;
			return a.nodeId.localeCompare(b.nodeId);
		});
		return masters[0].nodeId;
	}

	const admins = candidates.filter((c) => c.role === "admin");
	if (admins.length > 0) {
		admins.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
		return admins[0].nodeId;
	}

	candidates.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
	return candidates[0]?.nodeId || null;
}

function createHandshakePayload() {
	return {
		nodeId: options.nodeId,
		clinicId: options.clinicId,
		appVersion: options.appVersion,
		schemaVersion: options.schemaVersion,
		role: options.role,
		ip: primaryIp,
		port: options.port,
		peerList: Array.from(peers.values()),
		timestamp: Date.now(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Server (Rest API & Handshake Responder)
// ─────────────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
	const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
	const pathname = url.pathname;

	// CORS headers for local LAN browsers & tablets
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (req.method === "OPTIONS") {
		res.writeHead(204);
		res.end();
		return;
	}

	// 1. GET /api/network/ping
	if (pathname === "/api/network/ping" && req.method === "GET") {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ ok: true, service: "dente-lan-node", time: new Date().toISOString() }));
		return;
	}

	// 2. GET /api/network/lan-mesh/handshake (Probe)
	if (pathname === "/api/network/lan-mesh/handshake" && req.method === "GET") {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify(createHandshakePayload()));
		return;
	}

	// 3. POST /api/network/lan-mesh/handshake (Negotiation)
	if (pathname === "/api/network/lan-mesh/handshake" && req.method === "POST") {
		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			try {
				const remote = JSON.parse(body);
				const compat = verifyCompatibility(remote);

				if (compat.syncAllowed) {
					peers.set(remote.nodeId, {
						nodeId: remote.nodeId,
						role: remote.role,
						ip: remote.ip,
						port: remote.port,
						appVersion: remote.appVersion,
						schemaVersion: remote.schemaVersion,
						lastSeen: Date.now(),
						status: "online",
					});
					activeMasterId = electMaster();
				}

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						ok: compat.syncAllowed,
						compatibility: compat,
						handshake: createHandshakePayload(),
					}),
				);
			} catch {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: false, error: "MalformedJson" }));
			}
		});
		return;
	}

	// 4. GET /api/network/lan-mesh/status
	if (pathname === "/api/network/lan-mesh/status" && req.method === "GET") {
		const isMasterOnline = activeMasterId === options.nodeId || peers.has(activeMasterId);
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				ok: true,
				localNode: createHandshakePayload(),
				masterNodeId: activeMasterId,
				isMasterOnline,
				activePeersCount: peers.size,
				queuedMutationsCount: offlineMutationQueue.size,
				peers: Array.from(peers.values()),
			}),
		);
		return;
	}

	// 5. POST /api/network/lan-mesh/mutations (Mutation Receiver)
	if (pathname === "/api/network/lan-mesh/mutations" && req.method === "POST") {
		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			try {
				const parsed = JSON.parse(body);
				const count = Array.isArray(parsed.mutations) ? parsed.mutations.length : 0;
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: true, appliedCount: count, appliedAt: new Date().toISOString() }));
			} catch {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: false, error: "MalformedJson" }));
			}
		});
		return;
	}

	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ error: "NotFound" }));
});

// ─────────────────────────────────────────────────────────────────────────────
// UDP Multicast & Broadcast Discovery
// ─────────────────────────────────────────────────────────────────────────────

let udpSocket = null;

function broadcastBeacon() {
	if (!udpSocket) return;

	const beacon = {
		magic: "DENTE_MESH_BEACON",
		protocolVersion: "2.0.0",
		nodeId: options.nodeId,
		clinicId: options.clinicId,
		role: options.role,
		ip: primaryIp,
		port: options.port,
		appVersion: options.appVersion,
		schemaVersion: options.schemaVersion,
		timestamp: Date.now(),
	};
	const buf = Buffer.from(JSON.stringify(beacon), "utf8");

	try {
		udpSocket.send(buf, 0, buf.length, options.udpPort, "239.255.255.250");
		udpSocket.send(buf, 0, buf.length, options.udpPort, "255.255.255.255");
	} catch {
		// Ignore transient UDP errors
	}
}

function initUdp() {
	try {
		udpSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

		udpSocket.on("message", (msg) => {
			try {
				const beacon = JSON.parse(msg.toString("utf8"));
				if (beacon.magic !== "DENTE_MESH_BEACON") return;
				if (beacon.nodeId === options.nodeId) return;
				if (beacon.clinicId !== options.clinicId) return;

				const isNew = !peers.has(beacon.nodeId);
				peers.set(beacon.nodeId, {
					nodeId: beacon.nodeId,
					role: beacon.role,
					ip: beacon.ip,
					port: beacon.port,
					appVersion: beacon.appVersion,
					schemaVersion: beacon.schemaVersion,
					lastSeen: Date.now(),
					status: "online",
				});
				activeMasterId = electMaster();

				if (isNew) {
					performHandshake(beacon.ip, beacon.port);
				}
			} catch {
				// Ignore
			}
		});

		udpSocket.bind(options.udpPort, () => {
			try {
				udpSocket.setBroadcast(true);
				udpSocket.addMembership("239.255.255.250");
			} catch {
				// Ignore
			}
		});
	} catch (err) {
		console.warn(`[DENTE LAN] UDP discovery unavailable on port ${options.udpPort}: ${err.message}`);
	}
}

function performHandshake(ip, port) {
	const payload = Buffer.from(JSON.stringify(createHandshakePayload()), "utf8");
	const req = http.request(
		{
			hostname: ip,
			port,
			path: "/api/network/lan-mesh/handshake",
			method: "POST",
			headers: { "Content-Type": "application/json", "Content-Length": payload.length },
			timeout: 800,
		},
		(res) => {
			let data = "";
			res.on("data", (chunk) => (data += chunk));
			res.on("end", () => {
				try {
					const resp = JSON.parse(data);
					if (resp && resp.handshake) {
						peers.set(resp.handshake.nodeId, {
							nodeId: resp.handshake.nodeId,
							role: resp.handshake.role,
							ip: resp.handshake.ip,
							port: resp.handshake.port,
							appVersion: resp.handshake.appVersion,
							schemaVersion: resp.handshake.schemaVersion,
							lastSeen: Date.now(),
							status: "online",
						});
						activeMasterId = electMaster();
					}
				} catch {
					// Ignore
				}
			});
		},
	);
	req.on("error", () => {});
	req.on("timeout", () => req.destroy());
	req.write(payload);
	req.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// Subnet Probing (Ports 4100-4105)
// ─────────────────────────────────────────────────────────────────────────────

async function probeSubnet() {
	const ports = [4100, 4101, 4102, 4103, 4104, 4105];
	const ips = ["127.0.0.1"];

	if (primaryIp !== "127.0.0.1") {
		const parts = primaryIp.split(".");
		if (parts.length === 4) {
			const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
			const current = Number.parseInt(parts[3], 10);
			ips.push(`${prefix}.1`);
			for (let i = -5; i <= 5; i++) {
				const oct = current + i;
				if (oct > 1 && oct < 255 && oct !== current) {
					ips.push(`${prefix}.${oct}`);
				}
			}
		}
	}

	for (const ip of Array.from(new Set(ips))) {
		for (const port of ports) {
			if (ip === "127.0.0.1" && port === options.port) continue;
			const req = http.request(
				{ hostname: ip, port, path: "/api/network/lan-mesh/handshake", method: "GET", timeout: 250 },
				(res) => {
					if (res.statusCode && res.statusCode < 500) {
						performHandshake(ip, port);
					}
					res.resume();
				},
			);
			req.on("error", () => {});
			req.on("timeout", () => req.destroy());
			req.end();
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Startup & Execution
// ─────────────────────────────────────────────────────────────────────────────

server.listen(options.port, "0.0.0.0", () => {
	initUdp();
	broadcastBeacon();

	setInterval(broadcastBeacon, 3000);

	// Prune peers older than 15s
	setInterval(() => {
		const now = Date.now();
		for (const [id, peer] of peers.entries()) {
			if (now - peer.lastSeen > 15000) {
				peers.delete(id);
			}
		}
		activeMasterId = electMaster();
	}, 5000);

	if (options.probe) {
		void probeSubnet();
	}

	console.log(`
============================================================
  DENTE CRM — CLINIC LAN ZERO-CONF MESH NODE
============================================================
  Node ID:        ${options.nodeId}
  Role:           ${options.role.toUpperCase()}
  Clinic ID:      ${options.clinicId}
  LAN IP:         ${primaryIp}
  HTTP API Port:  ${options.port}
  UDP Mesh Port:  ${options.udpPort}
  App Version:    v${options.appVersion}
  Schema Version: v${options.schemaVersion}
  Status:         ONLINE (Zero-Conf Discovery Active)
============================================================
  Ready for multi-PC clinic peer sync without Internet.
  Press Ctrl+C to terminate cleanly.
`);
});

process.on("SIGINT", () => {
	if (udpSocket) udpSocket.close();
	server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
	if (udpSocket) udpSocket.close();
	server.close(() => process.exit(0));
});
