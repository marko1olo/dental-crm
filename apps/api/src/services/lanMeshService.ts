/**
 * DENTE CRM — Autonomous Clinic LAN Zero-Conf Network Mesh Service
 *
 * Coordinates multi-PC clinic workstations (Doctor 1, Doctor 2, Reception, Server)
 * without requiring Internet access:
 *
 * 1. Autonomous Peer Discovery (Zero-Conf):
 *    - UDP multicast (239.255.255.250) & broadcast (255.255.255.255) beacons on port 4101
 *    - LAN subnet HTTP active probe scanner (ports 4100-4105) for AP-isolated Wi-Fi
 *    - Sub-second peer discovery (<500ms)
 *
 * 2. Version & Capability Negotiation:
 *    - Handshake exchange: { nodeId, clinicId, appVersion, schemaVersion, role, ip, port, peerList }
 *    - Schema compatibility verification: prevents database corruption between heterogeneous versions
 *    - Safe read-only or sync-deferred mode with non-blocking status alerts
 *
 * 3. Multi-PC Role Hierarchy & Dynamic Leader Election:
 *    - Dynamic election of Master (Server/PostgreSQL) vs Satellites (Doctor, Reception, Admin)
 *    - Satellite mutation streaming to Master
 *    - Offline mutation queue buffering when Master goes offline with auto-flush on reconnection
 */

import * as crypto from "node:crypto";
import * as dgram from "node:dgram";
import * as http from "node:http";
import * as os from "node:os";
import {
	DEFAULT_MESH_HTTP_PORTS,
	DEFAULT_MESH_UDP_PORT,
	type LanMeshHandshakePayload,
	type LanMeshPeerSummary,
	type LanMeshRole,
	LanMeshTopologyManager,
	type MeshMutationAction,
	type MeshSyncStatusBadge,
	type QueuedMeshMutation,
	type SchemaCompatibilityResult,
	createMeshDiscoveryBeacon,
	parseMeshDiscoveryBeacon,
	verifyMeshSchemaCompatibility,
} from "@dental/shared";
import { getLocalLanAddresses, getPrimaryLanIp } from "./lanDiscoveryService.js";

export interface LanMeshServiceConfig {
	readonly nodeId?: string;
	readonly clinicId?: string;
	readonly role?: LanMeshRole;
	readonly appVersion?: string;
	readonly schemaVersion?: number | string;
	readonly apiPort?: number;
	readonly udpPort?: number;
	readonly beaconIntervalMs?: number;
	readonly pruneIntervalMs?: number;
	readonly probeOnStart?: boolean;
	readonly logger?: {
		info: (...args: unknown[]) => void;
		error: (...args: unknown[]) => void;
		warn?: (...args: unknown[]) => void;
		debug?: (...args: unknown[]) => void;
	};
}

export class LanMeshService {
	readonly nodeId: string;
	readonly clinicId: string;
	readonly role: LanMeshRole;
	readonly appVersion: string;
	readonly schemaVersion: number | string;
	readonly apiPort: number;
	readonly udpPort: number;

	private readonly topologyManager: LanMeshTopologyManager;
	private readonly logger?: LanMeshServiceConfig["logger"];
	private udpSocket: dgram.Socket | null = null;
	private beaconTimer: NodeJS.Timeout | null = null;
	private pruneTimer: NodeJS.Timeout | null = null;
	private flushTimer: NodeJS.Timeout | null = null;
	private isRunning = false;

	constructor(config: LanMeshServiceConfig = {}) {
		this.nodeId = config.nodeId || process.env.DENTE_NODE_ID || `node-${crypto.randomUUID().slice(0, 8)}`;
		this.clinicId = config.clinicId || process.env.DENTE_CLINIC_ID || "clinic-default";
		this.role = (config.role || (process.env.DENTE_NODE_ROLE as LanMeshRole) || "doctor");
		this.appVersion = config.appVersion || process.env.DENTE_APP_VERSION || "2.4.0";
		this.schemaVersion = config.schemaVersion || process.env.DENTE_SCHEMA_VERSION || 182;
		this.apiPort = config.apiPort || Number.parseInt(process.env.API_PORT || "4100", 10);
		this.udpPort = config.udpPort || Number.parseInt(process.env.DENTE_MESH_UDP_PORT || String(DEFAULT_MESH_UDP_PORT), 10);
		this.logger = config.logger;

		const primaryIp = getPrimaryLanIp();

		this.topologyManager = new LanMeshTopologyManager({
			nodeId: this.nodeId,
			clinicId: this.clinicId,
			role: this.role,
			ip: primaryIp,
			port: this.apiPort,
			appVersion: this.appVersion,
			schemaVersion: this.schemaVersion,
			onPeerDiscovered: (peer) => this.handlePeerDiscovered(peer),
			onPeerLost: (lostNodeId) => this.handlePeerLost(lostNodeId),
			onMasterChanged: (newMaster) => this.handleMasterChanged(newMaster),
		});
	}

	getTopology(): LanMeshTopologyManager {
		return this.topologyManager;
	}

	getStatusBadge(): MeshSyncStatusBadge {
		return this.topologyManager.getStatusBadge();
	}

	getKnownPeers(): LanMeshPeerSummary[] {
		return this.topologyManager.getPeerSummaries();
	}

	/**
	 * Starts UDP beacon listener/broadcaster and periodic background synchronization.
	 */
	start(): { stop: () => void } {
		if (this.isRunning) {
			return { stop: () => this.stop() };
		}
		this.isRunning = true;

		this.initUdpSocket();

		// Broadcast beacon immediately
		this.broadcastBeacon();

		// Schedule periodic UDP discovery beacons (every 3 seconds)
		this.beaconTimer = setInterval(() => {
			this.broadcastBeacon();
		}, 3000);

		// Schedule peer pruning (every 5 seconds)
		this.pruneTimer = setInterval(() => {
			this.topologyManager.pruneStalePeers();
		}, 5000);

		// Schedule offline mutation flush retry (every 4 seconds)
		this.flushTimer = setInterval(() => {
			void this.flushOfflineMutationQueue();
		}, 4000);

		// Run subnet HTTP active probe non-blockingly
		void this.probeSubnetHttp();

		this.logger?.info?.(
			`[LanMeshService] Started LAN Mesh Node '${this.nodeId}' (Role: ${this.role}, Clinic: ${this.clinicId}, API: ${this.apiPort}, UDP: ${this.udpPort})`,
		);

		return { stop: () => this.stop() };
	}

	/**
	 * Stops all sockets and timers cleanly.
	 */
	stop(): void {
		this.isRunning = false;
		if (this.beaconTimer) {
			clearInterval(this.beaconTimer);
			this.beaconTimer = null;
		}
		if (this.pruneTimer) {
			clearInterval(this.pruneTimer);
			this.pruneTimer = null;
		}
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
		if (this.udpSocket) {
			try {
				this.udpSocket.close();
			} catch (err) {
				this.logger?.warn?.(`[LanMeshService] Error closing UDP socket: ${err instanceof Error ? err.message : String(err)}`);
			}
			this.udpSocket = null;
		}
		this.logger?.info?.(`[LanMeshService] Stopped LAN Mesh Node '${this.nodeId}'`);
	}

	/**
	 * Initializes UDP discovery socket for multicast and subnet broadcast.
	 */
	private initUdpSocket(): void {
		try {
			const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
			this.udpSocket = socket;

			socket.on("error", (err) => {
				this.logger?.error?.(`[LanMeshService] UDP Socket error: ${err.message}`);
			});

			socket.on("message", (msgBuffer, rinfo) => {
				const beacon = parseMeshDiscoveryBeacon(msgBuffer);
				if (!beacon) return;
				if (beacon.nodeId === this.nodeId) return; // Ignore own beacons

				const isNew = !this.topologyManager.getPeer(beacon.nodeId);
				this.topologyManager.processIncomingBeacon(beacon);

				// Fast sub-second handshake trigger (<500ms)
				if (isNew) {
					void this.performHandshakeWithPeer(beacon.ip, beacon.port);
				}
			});

			socket.bind(this.udpPort, () => {
				try {
					socket.setBroadcast(true);
					socket.addMembership("239.255.255.250");
				} catch (err) {
					this.logger?.warn?.(
						`[LanMeshService] Multicast membership notice: ${err instanceof Error ? err.message : String(err)}`,
					);
				}
			});
		} catch (err) {
			this.logger?.error?.(
				`[LanMeshService] Could not bind UDP discovery socket on port ${this.udpPort}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	/**
	 * Broadcasts discovery beacon via UDP multicast & local subnet broadcast.
	 */
	broadcastBeacon(): void {
		if (!this.udpSocket) return;

		const beaconBuffer = createMeshDiscoveryBeacon({
			nodeId: this.nodeId,
			clinicId: this.clinicId,
			role: this.role,
			ip: getPrimaryLanIp(),
			port: this.apiPort,
			appVersion: this.appVersion,
			schemaVersion: this.schemaVersion,
		});

		// 1. Multicast group
		try {
			this.udpSocket.send(beaconBuffer, 0, beaconBuffer.length, this.udpPort, "239.255.255.250");
		} catch {
			// Best-effort
		}

		// 2. Local subnet broadcast
		try {
			this.udpSocket.send(beaconBuffer, 0, beaconBuffer.length, this.udpPort, "255.255.255.255");
		} catch {
			// Best-effort
		}
	}

	/**
	 * Subnet HTTP probe scanner:
	 * Probes candidate IPs on ports 4100-4105 with fast timeout (<300ms)
	 * to bypass AP-isolation and discover peers instantly even if UDP is filtered.
	 */
	async probeSubnetHttp(targetPorts: readonly number[] = DEFAULT_MESH_HTTP_PORTS): Promise<string[]> {
		const discovered: string[] = [];
		const localAddresses = getLocalLanAddresses();
		const primaryIp = localAddresses[0] || "127.0.0.1";

		// Generate candidate IP list
		const candidates: string[] = ["127.0.0.1"];

		if (primaryIp !== "127.0.0.1") {
			const parts = primaryIp.split(".");
			if (parts.length === 4) {
				const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
				const currentOctet = Number.parseInt(parts[3] || "0", 10);

				// Probe gateway (.1) and nearby neighbors (+- 10 IPs)
				candidates.push(`${prefix}.1`);
				for (let offset = -10; offset <= 10; offset++) {
					const octet = currentOctet + offset;
					if (octet > 1 && octet < 255 && octet !== currentOctet) {
						candidates.push(`${prefix}.${octet}`);
					}
				}
			}
		}

		const uniqueCandidates = Array.from(new Set(candidates));

		// Probe candidate hosts in parallel batches with fast timeout
		const probeTasks: Promise<void>[] = [];

		for (const ip of uniqueCandidates) {
			for (const port of targetPorts) {
				if (ip === "127.0.0.1" && port === this.apiPort) continue; // Skip self

				probeTasks.push(
					this.probeHttpEndpoint(ip, port).then((success) => {
						if (success) {
							discovered.push(`${ip}:${port}`);
						}
					}),
				);
			}
		}

		await Promise.allSettled(probeTasks);
		return discovered;
	}

	private async probeHttpEndpoint(ip: string, port: number): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			const req = http.request(
				{
					hostname: ip,
					port,
					path: "/api/network/lan-mesh/handshake",
					method: "GET",
					timeout: 300,
				},
				(res) => {
					// Any HTTP response (even 405 Method Not Allowed or 200) confirms a DENTE node exists!
					if (res.statusCode && res.statusCode < 500) {
						void this.performHandshakeWithPeer(ip, port);
						resolve(true);
					} else {
						resolve(false);
					}
					res.resume();
				},
			);

			req.on("error", () => resolve(false));
			req.on("timeout", () => {
				req.destroy();
				resolve(false);
			});
			req.end();
		});
	}

	/**
	 * Initiates HTTP handshake with a discovered peer.
	 */
	async performHandshakeWithPeer(peerIp: string, peerPort: number): Promise<boolean> {
		const payload = this.topologyManager.createHandshakePayload();
		const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");

		return new Promise<boolean>((resolve) => {
			const req = http.request(
				{
					hostname: peerIp,
					port: peerPort,
					path: "/api/network/lan-mesh/handshake",
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Content-Length": payloadBytes.length,
					},
					timeout: 800,
				},
				(res) => {
					let data = "";
					res.setEncoding("utf8");
					res.on("data", (chunk) => (data += chunk));
					res.on("end", () => {
						try {
							const response = JSON.parse(data) as {
								ok: boolean;
								handshake: LanMeshHandshakePayload;
								compatibility: SchemaCompatibilityResult;
							};
							if (response && response.handshake) {
								this.topologyManager.processIncomingHandshake(response.handshake);
								resolve(true);
								return;
							}
						} catch {
							// Ignore parse failure
						}
						resolve(false);
					});
				},
			);

			req.on("error", () => resolve(false));
			req.on("timeout", () => {
				req.destroy();
				resolve(false);
			});
			req.write(payloadBytes);
			req.end();
		});
	}

	/**
	 * Handles an incoming handshake request received on this node's HTTP server.
	 */
	handleIncomingHandshake(remotePayload: LanMeshHandshakePayload): {
		ok: boolean;
		compatibility: SchemaCompatibilityResult;
		handshake: LanMeshHandshakePayload;
	} {
		const result = this.topologyManager.processIncomingHandshake(remotePayload);
		return {
			ok: result.accepted,
			compatibility: result.compatibility,
			handshake: result.localResponse,
		};
	}

	/**
	 * Submits a clinical mutation (appointment, diary note, payment).
	 * If local node is Master: applies immediately.
	 * If local node is Satellite: streams to Master if online, or buffers in offline queue.
	 */
	async submitMutation(params: {
		entityKind: string;
		entityId: string;
		action: MeshMutationAction;
		payload: Record<string, unknown>;
		idempotencyKey?: string;
	}): Promise<{
		applied: boolean;
		queuedOffline: boolean;
		mode: "direct_master" | "streamed_to_master" | "offline_queued" | "sync_deferred";
		mutationId: string;
		reason?: string;
	}> {
		const mutationId = `mut-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
		const idempotencyKey = params.idempotencyKey || `idem-${mutationId}`;

		const mutation: QueuedMeshMutation = {
			id: mutationId,
			entityKind: params.entityKind,
			entityId: params.entityId,
			action: params.action,
			payload: params.payload,
			timestamp: Date.now(),
			attempts: 0,
			idempotencyKey,
			originNodeId: this.nodeId,
		};

		// 1. Local Node is Master: apply directly
		if (this.role === "master") {
			return {
				applied: true,
				queuedOffline: false,
				mode: "direct_master",
				mutationId,
			};
		}

		// 2. Check Master reachability & schema compatibility
		const masterNode = this.topologyManager.getMasterNode();
		const badge = this.topologyManager.getStatusBadge();

		if (badge.syncMode === "sync_deferred" || badge.syncMode === "read_only") {
			// Incompatible schema: buffer in offline queue to prevent DB corruption
			this.topologyManager.getMutationQueue().enqueue(mutation);
			return {
				applied: false,
				queuedOffline: true,
				mode: "sync_deferred",
				mutationId,
				reason: badge.warningBadge?.message || "Schema incompatible, mutation deferred.",
			};
		}

		if (!masterNode || masterNode.nodeId === this.nodeId) {
			// Master offline: queue locally
			this.topologyManager.getMutationQueue().enqueue(mutation);
			return {
				applied: false,
				queuedOffline: true,
				mode: "offline_queued",
				mutationId,
				reason: "Master node currently offline. Mutation queued for background sync.",
			};
		}

		// 3. Stream mutation to Master
		const streamSuccess = await this.sendMutationToMaster(masterNode, mutation);
		if (streamSuccess) {
			return {
				applied: true,
				queuedOffline: false,
				mode: "streamed_to_master",
				mutationId,
			};
		}

		// Streaming failed: buffer in offline queue with non-blocking resilience
		this.topologyManager.getMutationQueue().enqueue(mutation);
		return {
			applied: false,
			queuedOffline: true,
			mode: "offline_queued",
			mutationId,
			reason: "Master connection failed during stream. Buffered in offline queue.",
		};
	}

	private async sendMutationToMaster(master: LanMeshPeerSummary, mutation: QueuedMeshMutation): Promise<boolean> {
		const bodyBytes = Buffer.from(JSON.stringify({ mutations: [mutation] }), "utf8");

		return new Promise<boolean>((resolve) => {
			const req = http.request(
				{
					hostname: master.ip,
					port: master.port,
					path: "/api/network/lan-mesh/mutations",
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Content-Length": bodyBytes.length,
					},
					timeout: 1000,
				},
				(res) => {
					resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300));
					res.resume();
				},
			);

			req.on("error", () => resolve(false));
			req.on("timeout", () => {
				req.destroy();
				resolve(false);
			});
			req.write(bodyBytes);
			req.end();
		});
	}

	/**
	 * Flushes queued offline mutations when Master is available and compatible.
	 */
	async flushOfflineMutationQueue(): Promise<number> {
		const queue = this.topologyManager.getMutationQueue();
		if (queue.size() === 0) return 0;

		const master = this.topologyManager.getMasterNode();
		if (!master || master.nodeId === this.nodeId) return 0;

		const badge = this.topologyManager.getStatusBadge();
		if (badge.syncMode === "sync_deferred" || badge.syncMode === "read_only") {
			return 0; // Incompatible schema, hold mutations
		}

		const batch = queue.peekBatch(25);
		if (batch.length === 0) return 0;

		const bodyBytes = Buffer.from(JSON.stringify({ mutations: batch }), "utf8");

		const success = await new Promise<boolean>((resolve) => {
			const req = http.request(
				{
					hostname: master.ip,
					port: master.port,
					path: "/api/network/lan-mesh/mutations",
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Content-Length": bodyBytes.length,
					},
					timeout: 2000,
				},
				(res) => {
					resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300));
					res.resume();
				},
			);

			req.on("error", () => resolve(false));
			req.on("timeout", () => {
				req.destroy();
				resolve(false);
			});
			req.write(bodyBytes);
			req.end();
		});

		if (success) {
			const syncedKeys = batch.map((m) => m.idempotencyKey);
			const removed = queue.acknowledge(syncedKeys);
			this.logger?.info?.(`[LanMeshService] Flushed ${removed} offline mutations to Master '${master.nodeId}'`);
			return removed;
		}

		queue.recordFailure(batch.map((m) => m.idempotencyKey));
		return 0;
	}

	private handlePeerDiscovered(peer: LanMeshPeerSummary): void {
		this.logger?.info?.(
			`[LanMeshService] Discovered peer '${peer.nodeId}' (${peer.role}) at ${peer.ip}:${peer.port} [v${peer.appVersion}]`,
		);
	}

	private handlePeerLost(nodeId: string): void {
		this.logger?.warn?.(`[LanMeshService] Peer '${nodeId}' timed out or went offline.`);
	}

	private handleMasterChanged(newMaster: LanMeshPeerSummary | null): void {
		if (newMaster) {
			this.logger?.info?.(`[LanMeshService] Active Master is now '${newMaster.nodeId}' (${newMaster.ip}:${newMaster.port})`);
		} else {
			this.logger?.warn?.("[LanMeshService] No active Master found in clinic LAN. Operating in offline survivable mode.");
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

let activeLanMeshService: LanMeshService | null = null;

export function getLanMeshService(config?: LanMeshServiceConfig): LanMeshService {
	if (!activeLanMeshService) {
		activeLanMeshService = new LanMeshService(config);
	}
	return activeLanMeshService;
}

export function resetLanMeshServiceForTest(): void {
	if (activeLanMeshService) {
		activeLanMeshService.stop();
		activeLanMeshService = null;
	}
}
