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
	DEFAULT_LEASE_FAILOVER_TIMEOUT_MS,
	DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS,
	DEFAULT_MESH_HTTP_PORTS,
	DEFAULT_MESH_UDP_PORT,
	type LanMeshHandshakePayload,
	type LanMeshPeerSummary,
	type LanMeshRole,
	LanMeshTopologyManager,
	type LocalMutationRingBuffer,
	type MasterLeaseHeartbeat,
	type MeshMutationAction,
	type MeshSyncStatusBadge,
	type QueuedMeshMutation,
	type SchemaCompatibilityResult,
	type SyncMutationEntityKind,
	type SyncMutationEnvelope,
	VectorClockEngine,
	computePayloadHash,
	createMeshDiscoveryBeacon,
	createMeshLeaseHeartbeatPacket,
	parseMeshDiscoveryBeacon,
	parseMeshLeaseHeartbeatPacket,
	verifyMeshSchemaCompatibility,
} from "@dental/shared";
import { createApiLogger, safeLogError } from "../observability/logger.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";

const meshLogger = createApiLogger("lanMeshService");
import {
	browseMdnsDenteServers,
	getLanDiscoveryUdpSocket,
	getLocalLanAddresses,
	getPrimaryLanIp,
	registerLanDiscoveryUdpListener,
	sendLanDiscoveryUdpPacket,
} from "./lanDiscoveryService.js";
import { SyncGatewayService } from "./sync/syncGatewayService.js";

function generateUuidV7(): string {
	const bytes = crypto.randomBytes(16);
	const now = BigInt(Date.now());
	bytes[0] = Number((now >> 40n) & 0xffn);
	bytes[1] = Number((now >> 32n) & 0xffn);
	bytes[2] = Number((now >> 24n) & 0xffn);
	bytes[3] = Number((now >> 16n) & 0xffn);
	bytes[4] = Number((now >> 8n) & 0xffn);
	bytes[5] = Number(now & 0xffn);
	bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
	bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
	const hex = bytes.toString("hex");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function toSyncEntityKind(kind: string): SyncMutationEntityKind {
	const normalized = kind.toLowerCase().trim();
	if (normalized === "appointment") return "appointment";
	if (normalized === "visit") return "visit";
	if (
		normalized === "tooth_status" ||
		normalized === "odontogram" ||
		normalized === "odontogram_status" ||
		normalized === "odontogram_state"
	) {
		return "odontogram_state";
	}
	if (normalized === "payment" || normalized === "receipt") return "payment";
	if (normalized === "invoice" || normalized === "patient_invoice") return "patient_invoice";
	if (normalized === "visit_diary" || normalized === "diary") return "visit_diary";
	if (normalized === "treatment_item" || normalized === "service") return "treatment_item";
	if (normalized === "clinical_task") return "clinical_task";
	if (normalized === "patient_administrative_profile") return "patient_administrative_profile";
	return "patient";
}

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
	readonly leaseSecret?: string;
	readonly enableLeaseFailover?: boolean;
	readonly leaseHeartbeatIntervalMs?: number;
	readonly leaseFailoverCheckIntervalMs?: number;
	readonly ringBufferCapacity?: number;
	readonly vectorClockEngine?: VectorClockEngine;
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
	private readonly vectorClockEngine: VectorClockEngine;
	private readonly logger?: LanMeshServiceConfig["logger"];
	private readonly enableLeaseFailover: boolean;
	private readonly leaseSecret?: string | undefined;
	private readonly leaseHeartbeatIntervalMs: number;
	private readonly leaseFailoverCheckIntervalMs: number;

	private udpSocket: dgram.Socket | null = null;
	private sharedUdpUnsubscribe: (() => void) | null = null;
	private usingSharedUdpSocket = false;
	private beaconTimer: NodeJS.Timeout | null = null;
	private pruneTimer: NodeJS.Timeout | null = null;
	private flushTimer: NodeJS.Timeout | null = null;
	private leaseHeartbeatTimer: NodeJS.Timeout | null = null;
	private leaseHealthCheckTimer: NodeJS.Timeout | null = null;
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

		this.enableLeaseFailover = config.enableLeaseFailover ?? (process.env.DENTE_MESH_ENABLE_LEASE_FAILOVER === "true");
		this.leaseSecret = config.leaseSecret;
		this.leaseHeartbeatIntervalMs = config.leaseHeartbeatIntervalMs || DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS;
		this.leaseFailoverCheckIntervalMs = config.leaseFailoverCheckIntervalMs || 2500;
		this.vectorClockEngine = config.vectorClockEngine || new VectorClockEngine();

		const primaryIp = getPrimaryLanIp();

		this.topologyManager = new LanMeshTopologyManager({
			nodeId: this.nodeId,
			clinicId: this.clinicId,
			role: this.role,
			ip: primaryIp,
			port: this.apiPort,
			appVersion: this.appVersion,
			schemaVersion: this.schemaVersion,
			enableLeaseFailover: this.enableLeaseFailover,
			leaseSecret: this.leaseSecret,
			leaseDurationMs: this.leaseHeartbeatIntervalMs,
			onPeerDiscovered: (peer) => this.handlePeerDiscovered(peer),
			onPeerLost: (lostNodeId) => this.handlePeerLost(lostNodeId),
			onMasterChanged: (newMaster) => this.handleMasterChanged(newMaster),
			onLeaseFailoverTriggered: (event) => this.handleLeaseFailover(event),
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
		this.beaconTimer = this.startUnrefInterval(() => {
			this.broadcastBeacon();
		}, 3000);

		// If Master role: broadcast lease heartbeat immediately and schedule every leaseHeartbeatIntervalMs
		if (this.role === "master") {
			this.broadcastLeaseHeartbeat();
			this.leaseHeartbeatTimer = this.startUnrefInterval(() => {
				this.broadcastLeaseHeartbeat();
			}, this.leaseHeartbeatIntervalMs);
		}

		// If lease failover enabled: schedule lease health checks (every 2.5s)
		if (this.enableLeaseFailover) {
			this.leaseHealthCheckTimer = this.startUnrefInterval(() => {
				this.checkMasterLeaseHealth();
			}, this.leaseFailoverCheckIntervalMs);
		}

		// Schedule peer pruning (every 5 seconds)
		this.pruneTimer = this.startUnrefInterval(() => {
			this.topologyManager.pruneStalePeers();
		}, 5000);

		// Schedule offline mutation flush retry (every 4 seconds)
		this.flushTimer = this.startUnrefInterval(() => {
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
		if (this.leaseHeartbeatTimer) {
			clearInterval(this.leaseHeartbeatTimer);
			this.leaseHeartbeatTimer = null;
		}
		if (this.leaseHealthCheckTimer) {
			clearInterval(this.leaseHealthCheckTimer);
			this.leaseHealthCheckTimer = null;
		}
		if (this.pruneTimer) {
			clearInterval(this.pruneTimer);
			this.pruneTimer = null;
		}
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
		if (this.sharedUdpUnsubscribe) {
			this.sharedUdpUnsubscribe();
			this.sharedUdpUnsubscribe = null;
		}
		if (this.udpSocket && !this.usingSharedUdpSocket) {
			try {
				this.udpSocket.close();
			} catch (err) {
				this.logger?.warn?.(`[LanMeshService] Error closing UDP socket: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
		this.udpSocket = null;
		this.usingSharedUdpSocket = false;
		this.logger?.info?.(`[LanMeshService] Stopped LAN Mesh Node '${this.nodeId}'`);
	}

	private handleIncomingUdpPacket(msgBuffer: Buffer): void {
		// 1. Check for cryptographically signed Master Lease Heartbeat
		const lease = parseMeshLeaseHeartbeatPacket(msgBuffer);
		if (lease) {
			if (lease.masterNodeId !== this.nodeId) {
				this.topologyManager.processMasterLeaseHeartbeat(lease, this.leaseSecret);
			}
			return;
		}

		// 2. Fall back to standard discovery beacon
		const beacon = parseMeshDiscoveryBeacon(msgBuffer);
		if (!beacon) return;
		if (beacon.nodeId === this.nodeId) return; // Ignore own beacons

		const isNew = !this.topologyManager.getPeer(beacon.nodeId);
		this.topologyManager.processIncomingBeacon(beacon);

		// Fast sub-second handshake trigger (<500ms)
		if (isNew) {
			void this.performHandshakeWithPeer(beacon.ip, beacon.port);
		}
	}

	/**
	 * Initializes UDP discovery socket for multicast and subnet broadcast.
	 * Reuses the shared LanDiscoveryService UDP socket on port 4101 if already bound.
	 */
	private initUdpSocket(): void {
		const sharedSocket = getLanDiscoveryUdpSocket();
		if (sharedSocket) {
			this.udpSocket = sharedSocket;
			this.usingSharedUdpSocket = true;
			this.sharedUdpUnsubscribe = registerLanDiscoveryUdpListener((msgBuffer) => {
				this.handleIncomingUdpPacket(msgBuffer);
			});
			this.logger?.info?.(
				`[LanMeshService] Attached to shared UDP discovery socket on port ${this.udpPort}`,
			);
			return;
		}

		try {
			const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
			this.udpSocket = socket;
			this.usingSharedUdpSocket = false;

			socket.on("error", (err) => {
				this.logger?.error?.(`[LanMeshService] UDP Socket error: ${err.message}`);
			});

			socket.on("message", (msgBuffer) => {
				this.handleIncomingUdpPacket(msgBuffer);
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
	 * Emits a cryptographically signed Master Lease Heartbeat over UDP multicast & local subnet broadcast.
	 */
	broadcastLeaseHeartbeat(): void {
		if (!this.udpSocket && !this.usingSharedUdpSocket) return;
		if (this.role !== "master" && !this.topologyManager.isTemporaryMasterActive()) return;

		const lease = this.topologyManager.createLeaseHeartbeat();
		const packetBuffer = createMeshLeaseHeartbeatPacket(lease);

		if (this.usingSharedUdpSocket) {
			void sendLanDiscoveryUdpPacket(packetBuffer, this.udpPort, "239.255.255.250");
			void sendLanDiscoveryUdpPacket(packetBuffer, this.udpPort, "255.255.255.255", true);
			return;
		}
		if (!this.udpSocket) return;

		// 1. Multicast group
		try {
			this.udpSocket.send(packetBuffer, 0, packetBuffer.length, this.udpPort, "239.255.255.250");
		} catch (err) {
			meshLogger.debug({ err: safeLogError(err) }, "LAN mesh multicast lease heartbeat skipped");
		}

		// 2. Local subnet broadcast
		try {
			this.udpSocket.send(packetBuffer, 0, packetBuffer.length, this.udpPort, "255.255.255.255");
		} catch (err) {
			meshLogger.debug({ err: safeLogError(err) }, "LAN mesh broadcast lease heartbeat skipped");
		}
	}

	private startUnrefInterval(fn: () => void, intervalMs: number): NodeJS.Timeout {
		const timer = setInterval(fn, intervalMs);
		timer.unref();
		return timer;
	}

	/**
	 * Evaluates Master lease freshness and triggers instant consensus election if Master missed 2 consecutive heartbeats (10s threshold).
	 */
	checkMasterLeaseHealth(now = Date.now()): {
		masterAlive: boolean;
		failoverTriggered: boolean;
		electedMasterId: string | null;
		isLocalElected: boolean;
	} {
		const health = this.topologyManager.checkMasterLeaseHealth(now);
		if (health.failoverTriggered && health.isLocalElected) {
			this.logger?.warn?.(
				`[LanMeshService] Failover triggered: Node '${this.nodeId}' elected as Temporary Master. Broadcasting signed lease heartbeats.`,
			);
			this.broadcastLeaseHeartbeat();
			if (!this.leaseHeartbeatTimer) {
				this.leaseHeartbeatTimer = this.startUnrefInterval(() => {
					this.broadcastLeaseHeartbeat();
				}, this.leaseHeartbeatIntervalMs);
			}
		} else if (!this.topologyManager.isTemporaryMasterActive() && this.role !== "master" && this.leaseHeartbeatTimer) {
			clearInterval(this.leaseHeartbeatTimer);
			this.leaseHeartbeatTimer = null;
		}
		return health;
	}

	private handleLeaseFailover(details: {
		deadMasterId: string | null;
		electedMasterId: string;
		isLocalElected: boolean;
		term: number;
	}): void {
		this.logger?.warn?.(
			`[LanMeshService] Lease failover triggered: Primary Master '${details.deadMasterId}' dead. Elected temporary master '${details.electedMasterId}' (Term: ${details.term}, Local: ${details.isLocalElected})`,
		);
	}

	getVectorClockEngine(): VectorClockEngine {
		return this.vectorClockEngine;
	}

	getRingBuffer(): LocalMutationRingBuffer {
		return this.topologyManager.getRingBuffer();
	}

	isTemporaryMasterActive(): boolean {
		return this.topologyManager.isTemporaryMasterActive();
	}

	/**
	 * Broadcasts discovery beacon via UDP multicast & local subnet broadcast.
	 */
	broadcastBeacon(): void {
		if (!this.udpSocket && !this.usingSharedUdpSocket) return;

		const beaconBuffer = createMeshDiscoveryBeacon({
			nodeId: this.nodeId,
			clinicId: this.clinicId,
			role: this.role,
			ip: getPrimaryLanIp(),
			port: this.apiPort,
			appVersion: this.appVersion,
			schemaVersion: this.schemaVersion,
		});

		if (this.usingSharedUdpSocket) {
			void sendLanDiscoveryUdpPacket(beaconBuffer, this.udpPort, "239.255.255.250");
			void sendLanDiscoveryUdpPacket(beaconBuffer, this.udpPort, "255.255.255.255", true);
			return;
		}
		if (!this.udpSocket) return;

		// 1. Multicast group
		try {
			this.udpSocket.send(beaconBuffer, 0, beaconBuffer.length, this.udpPort, "239.255.255.250");
		} catch (err) {
			meshLogger.debug({ err: safeLogError(err) }, "LAN mesh multicast discovery beacon skipped");
		}

		// 2. Local subnet broadcast
		try {
			this.udpSocket.send(beaconBuffer, 0, beaconBuffer.length, this.udpPort, "255.255.255.255");
		} catch (err) {
			meshLogger.debug({ err: safeLogError(err) }, "LAN mesh broadcast discovery beacon skipped");
		}
	}

	private buildInternalAuthHeaders(extra: Record<string, string | number> = {}): Record<string, string | number> {
		const clinicToken = signToken(
			{
				organizationId: this.clinicId,
				role: "clinic",
				nodeId: this.nodeId,
			},
			authTokenSecret(),
			300,
		);
		return {
			"x-dente-clinic-token": clinicToken,
			"Idempotency-Key": generateUuidV7(),
			...extra,
		};
	}

	/**
	 * Subnet HTTP & mDNS active probe scanner:
	 * Scans full /24 subnet (1..254) with bounded concurrency=16 and fast 250ms timeout
	 * plus `_dente._tcp.local` mDNS peers to bypass AP-isolation when UDP broadcast is filtered.
	 */
	async probeSubnetHttp(targetPorts: readonly number[] = DEFAULT_MESH_HTTP_PORTS): Promise<string[]> {
		const discovered: string[] = [];
		const localAddresses = getLocalLanAddresses();
		const primaryIp = localAddresses[0] || "127.0.0.1";

		// Generate full /24 candidate IP list
		const candidates: string[] = ["127.0.0.1"];
		const candidateSet = new Set<string>(candidates);

		if (primaryIp !== "127.0.0.1") {
			const parts = primaryIp.split(".");
			if (parts.length === 4) {
				const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
				const currentOctet = Number.parseInt(parts[3] || "0", 10);

				for (const octet of [1]) {
					const ip = `${prefix}.${octet}`;
					if (!candidateSet.has(ip)) {
						candidateSet.add(ip);
						candidates.push(ip);
					}
				}
				for (let octet = 2; octet <= 254; octet++) {
					if (octet === currentOctet) continue;
					const ip = `${prefix}.${octet}`;
					if (!candidateSet.has(ip)) {
						candidateSet.add(ip);
						candidates.push(ip);
					}
				}
			}
		}

		const targets: Array<{ ip: string; port: number }> = [];
		try {
			const mdnsServers = await browseMdnsDenteServers(400);
			for (const svc of mdnsServers) {
				if (svc.address === primaryIp && svc.apiPort === this.apiPort) continue;
				if (!targets.some((t) => t.ip === svc.address && t.port === svc.apiPort)) {
					targets.push({ ip: svc.address, port: svc.apiPort });
				}
			}
		} catch (err) {
			meshLogger.debug({ err: safeLogError(err) }, "Best-effort mDNS enrichment skipped before HTTP probe");
		}

		for (const ip of candidates) {
			for (const port of targetPorts) {
				if ((ip === "127.0.0.1" || ip === primaryIp) && port === this.apiPort) continue;
				if (!targets.some((t) => t.ip === ip && t.port === port)) {
					targets.push({ ip, port });
				}
			}
		}

		const concurrency = 16;
		for (let i = 0; i < targets.length; i += concurrency) {
			const batch = targets.slice(i, i + concurrency);
			const results = await Promise.all(
				batch.map(async (target) => ({
					target,
					ok: await this.probeHttpEndpoint(target.ip, target.port),
				})),
			);
			for (const item of results) {
				if (item.ok) {
					discovered.push(`${item.target.ip}:${item.target.port}`);
				}
			}
		}

		return discovered;
	}

	private async probeHttpEndpoint(ip: string, port: number): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			const req = http.request(
				{
					hostname: ip,
					port,
					path: "/api/health/discovery",
					method: "GET",
					timeout: 250,
				},
				(res) => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
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
	 * Initiates authenticated HTTP handshake with a discovered peer.
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
					headers: this.buildInternalAuthHeaders({
						"Content-Type": "application/json",
						"Content-Length": payloadBytes.length,
					}),
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
						} catch (err) {
							meshLogger.debug({ err: safeLogError(err), peerIp, peerPort }, "Peer handshake JSON parse failed");
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
		mode: "direct_master" | "streamed_to_master" | "offline_queued" | "sync_deferred" | "temporary_master_active";
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

		// 1. Local Node is Master or Temporary Master: persist durably via SyncGatewayService
		if (this.role === "master" || this.topologyManager.isTemporaryMasterActive()) {
			this.vectorClockEngine.incrementVector(params.entityKind, params.entityId, this.nodeId);
			const envelope: SyncMutationEnvelope = {
				mutationId: mutation.id,
				idempotencyKey: mutation.idempotencyKey,
				payloadHash: computePayloadHash(mutation.payload),
				entityKind: toSyncEntityKind(mutation.entityKind),
				entityId: mutation.entityId,
				action: mutation.action === "delete" ? "delete" : mutation.action === "create" ? "create" : "update",
				payload: mutation.payload,
				updatedAt: new Date(mutation.timestamp).toISOString(),
				clientId: this.nodeId,
			};
			try {
				const syncOptions = this.logger
					? {
							logger: {
								info: (...args: unknown[]) => this.logger?.info(...args),
								warn: (...args: unknown[]) =>
									this.logger?.warn ? this.logger.warn(...args) : this.logger?.info(...args),
								error: (...args: unknown[]) => this.logger?.error(...args),
							},
						}
					: undefined;
				const pushResult = await SyncGatewayService.processPushBatch(
					this.clinicId,
					{
						syncBatchId: `mesh-local-${Date.now()}`,
						clientId: this.nodeId,
						mutations: [envelope],
						sentAt: new Date().toISOString(),
					},
					undefined,
					syncOptions,
				);
				if (pushResult.rejectedCount === 0) {
					return {
						applied: true,
						queuedOffline: false,
						mode: this.topologyManager.isTemporaryMasterActive() ? "temporary_master_active" : "direct_master",
						mutationId,
					};
				}
			} catch (err) {
				this.logger?.warn?.(
					`[LanMeshService] Master persistence failed, queuing mutation '${mutationId}' for retry: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
			this.topologyManager.getMutationQueue().enqueue(mutation);
			return {
				applied: false,
				queuedOffline: true,
				mode: "offline_queued",
				mutationId,
				reason: "Master database persistence failed; queued for durable retry.",
			};
		}

		// 2. Track local version vector on satellite workstation
		this.vectorClockEngine.incrementVector(params.entityKind, params.entityId, this.nodeId);

		// 3. Check Master reachability & schema compatibility
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
			// Master offline: queue locally (ring buffer buffers without disruption)
			this.topologyManager.getMutationQueue().enqueue(mutation);
			return {
				applied: false,
				queuedOffline: true,
				mode: "offline_queued",
				mutationId,
				reason: "Master node currently offline. Mutation queued for background sync.",
			};
		}

		// 4. Stream mutation to Master
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
					headers: this.buildInternalAuthHeaders({
						"Content-Type": "application/json",
						"Content-Length": bodyBytes.length,
					}),
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
					headers: this.buildInternalAuthHeaders({
						"Content-Type": "application/json",
						"Content-Length": bodyBytes.length,
					}),
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
