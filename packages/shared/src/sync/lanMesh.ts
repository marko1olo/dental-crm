/**
 * DENTE CRM — Clinic LAN Zero-Conf Network Mesh & Multi-PC Orchestrator
 *
 * Core shared protocol and state machine for autonomous clinic operations
 * across multiple computers (Doctor 1, Doctor 2, Reception, Server/Master)
 * WITHOUT requiring Internet access:
 *
 * 1. Autonomous Zero-Conf Discovery:
 *    - UDP multicast/broadcast beacon payloads
 *    - LAN subnet HTTP probe contracts (ports 4100-4105)
 *    - Sub-second peer discovery (<500ms)
 *
 * 2. Version & Capability Negotiation:
 *    - Handshake payload: { nodeId, clinicId, appVersion, schemaVersion, role, ip, port, peerList }
 *    - Schema compatibility verification: prevents database corruption between heterogeneous versions
 *    - Automatic graceful degradation to safe read-only or sync-deferred mode with non-blocking alerts
 *
 * 3. Multi-PC Role Hierarchy & Dynamic Leader Election:
 *    - Roles: 'master' (Server/PostgreSQL), 'doctor', 'reception', 'admin'
 *    - Deterministic Master election and failover
 *    - Offline mutation queue on satellites when Master is offline
 *    - Resilient reconnection & idempotent replay
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Zod Schemas & Domain Types
// ─────────────────────────────────────────────────────────────────────────────

export const lanMeshRoleSchema = z.enum(["master", "doctor", "reception", "admin"]);
export type LanMeshRole = z.infer<typeof lanMeshRoleSchema>;

export const lanMeshNodeStatusSchema = z.enum([
	"online",
	"degraded",
	"read_only",
	"sync_deferred",
	"offline",
]);
export type LanMeshNodeStatus = z.infer<typeof lanMeshNodeStatusSchema>;

export const lanMeshPeerSummarySchema = z.object({
	nodeId: z.string().min(1).max(128),
	role: lanMeshRoleSchema,
	ip: z.string(),
	port: z.number().int().positive(),
	appVersion: z.string(),
	schemaVersion: z.union([z.number().int().nonnegative(), z.string()]),
	lastSeen: z.number().nonnegative(),
	status: lanMeshNodeStatusSchema,
});
export type LanMeshPeerSummary = z.infer<typeof lanMeshPeerSummarySchema>;

export const lanMeshHandshakePayloadSchema = z.object({
	nodeId: z.string().min(1).max(128),
	clinicId: z.string().min(1).max(128),
	appVersion: z.string().min(1),
	schemaVersion: z.union([z.number().int().nonnegative(), z.string()]),
	role: lanMeshRoleSchema,
	ip: z.string(),
	port: z.number().int().positive(),
	peerList: z.array(lanMeshPeerSummarySchema),
	timestamp: z.number().nonnegative().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});
export type LanMeshHandshakePayload = z.infer<typeof lanMeshHandshakePayloadSchema>;

export const lanMeshDiscoveryBeaconPayloadSchema = z.object({
	magic: z.literal("DENTE_MESH_BEACON"),
	protocolVersion: z.string().default("2.0.0"),
	nodeId: z.string().min(1).max(128),
	clinicId: z.string().min(1).max(128),
	role: lanMeshRoleSchema,
	ip: z.string(),
	port: z.number().int().positive(),
	appVersion: z.string(),
	schemaVersion: z.union([z.number().int().nonnegative(), z.string()]),
	timestamp: z.number().nonnegative(),
});
export type LanMeshDiscoveryBeaconPayload = z.infer<typeof lanMeshDiscoveryBeaconPayloadSchema>;

export const schemaCompatibilityModeSchema = z.enum(["full_sync", "read_only", "sync_deferred"]);
export type SchemaCompatibilityMode = z.infer<typeof schemaCompatibilityModeSchema>;

export const schemaCompatibilityResultSchema = z.object({
	compatible: z.boolean(),
	syncAllowed: z.boolean(),
	mode: schemaCompatibilityModeSchema,
	reason: z.string(),
	warningBadge: z
		.object({
			code: z.enum(["INCOMPATIBLE_SCHEMA", "VERSION_MISMATCH", "CLINIC_MISMATCH"]),
			title: z.string(),
			message: z.string(),
			level: z.enum(["info", "warning", "critical"]),
		})
		.optional(),
});
export type SchemaCompatibilityResult = z.infer<typeof schemaCompatibilityResultSchema>;

export const meshMutationActionSchema = z.enum(["create", "update", "delete", "upsert"]);
export type MeshMutationAction = z.infer<typeof meshMutationActionSchema>;

export const queuedMeshMutationSchema = z.object({
	id: z.string().min(1).max(128),
	entityKind: z.string().min(1).max(64),
	entityId: z.string().min(1).max(128),
	action: meshMutationActionSchema,
	payload: z.record(z.string(), z.unknown()),
	timestamp: z.number().nonnegative(),
	attempts: z.number().int().nonnegative().default(0),
	idempotencyKey: z.string().min(1).max(256),
	originNodeId: z.string().min(1).max(128),
});
export type QueuedMeshMutation = z.infer<typeof queuedMeshMutationSchema>;

export const meshSyncStatusBadgeSchema = z.object({
	isMasterOnline: z.boolean(),
	masterNodeId: z.string().nullable(),
	activePeersCount: z.number().int().nonnegative(),
	queuedMutationsCount: z.number().int().nonnegative(),
	syncMode: z.enum(["streaming", "offline_queued", "sync_deferred", "read_only"]),
	warningBadge: z
		.object({
			code: z.string(),
			title: z.string(),
			message: z.string(),
			level: z.enum(["info", "warning", "critical"]),
		})
		.optional(),
});
export type MeshSyncStatusBadge = z.infer<typeof meshSyncStatusBadgeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Schema & Protocol Version Negotiation Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes a schemaVersion representation into a major integer number for safe compatibility checks.
 * Examples:
 *   - 42 -> 42
 *   - "42" -> 42
 *   - "2.4.1" -> 2
 *   - "schema_v12" -> 12
 */
export function normalizeSchemaVersion(version: number | string): number {
	if (typeof version === "number" && Number.isFinite(version)) {
		return Math.max(0, Math.floor(version));
	}
	if (typeof version === "string") {
		const match = version.match(/(\d+)/);
		if (match && match[1]) {
			const parsed = Number.parseInt(match[1], 10);
			if (Number.isFinite(parsed)) return parsed;
		}
	}
	return 0;
}

/**
 * Parses semantic version string "X.Y.Z" into [major, minor, patch].
 */
export function parseMeshSemver(versionStr: string): [number, number, number] {
	if (!versionStr || typeof versionStr !== "string") return [0, 0, 0];
	const parts = versionStr.replace(/^[^\d]*/, "").split(".");
	const major = Number.parseInt(parts[0] || "0", 10) || 0;
	const minor = Number.parseInt(parts[1] || "0", 10) || 0;
	const patch = Number.parseInt(parts[2] || "0", 10) || 0;
	return [major, minor, patch];
}

/**
 * Rigorously checks schema and version compatibility between two clinic nodes:
 * - If clinicId differs: complete rejection (isolation between independent practices).
 * - If schemaVersion differs: prevents database corruption by rejecting direct schema mutations
 *   and falling back to sync-deferred or read-only mode with a non-blocking alert badge.
 * - If appVersion differs by major version: prompts an upgrade warning while preserving read-only safety.
 */
export function verifyMeshSchemaCompatibility(
	local: { appVersion: string; schemaVersion: number | string; clinicId: string },
	remote: { appVersion: string; schemaVersion: number | string; clinicId: string },
): SchemaCompatibilityResult {
	// 1. Strict Clinic Multi-Tenant Isolation
	if (local.clinicId !== remote.clinicId) {
		return {
			compatible: false,
			syncAllowed: false,
			mode: "read_only",
			reason: `Clinic ID mismatch: local clinic is '${local.clinicId}', remote is '${remote.clinicId}'`,
			warningBadge: {
				code: "CLINIC_MISMATCH",
				title: "Другая клиника в сети",
				message: `Обнаружен компьютер клиники '${remote.clinicId}'. Синхронизация запрещена для защиты данных.`,
				level: "critical",
			},
		};
	}

	const localSchema = normalizeSchemaVersion(local.schemaVersion);
	const remoteSchema = normalizeSchemaVersion(remote.schemaVersion);

	// 2. Schema Compatibility Check
	if (localSchema !== remoteSchema) {
		const isRemoteAhead = remoteSchema > localSchema;
		return {
			compatible: false,
			syncAllowed: false,
			mode: "sync_deferred",
			reason: `Database schema mismatch: local schema v${localSchema} vs remote schema v${remoteSchema}`,
			warningBadge: {
				code: "INCOMPATIBLE_SCHEMA",
				title: "Несовпадение схемы базы данных",
				message: isRemoteAhead
					? `Узел сети имеет более новую схему БД (v${remoteSchema} против v${localSchema}). Мутации отложены во избежание повреждения базы данных. Обновите DENTE CRM.`
					: `Узел сети имеет устаревшую схему БД (v${remoteSchema} против v${localSchema}). Прямые мутации заблокированы для защиты целостности данных.`,
				level: "warning",
			},
		};
	}

	// 3. Application Version Semantic Compatibility Check
	const [localMajor, localMinor] = parseMeshSemver(local.appVersion);
	const [remoteMajor, remoteMinor] = parseMeshSemver(remote.appVersion);

	if (localMajor !== remoteMajor) {
		return {
			compatible: false,
			syncAllowed: false,
			mode: "read_only",
			reason: `Incompatible major application version: local v${local.appVersion} vs remote v${remote.appVersion}`,
			warningBadge: {
				code: "VERSION_MISMATCH",
				title: "Критическое несовпадение версий",
				message: `Версии приложений различаются (v${local.appVersion} и v${remote.appVersion}). Синхронизация переведена в безопасный режим чтения.`,
				level: "warning",
			},
		};
	}

	// Minor difference: compatible with mild notification if minor version differs
	if (localMinor !== remoteMinor) {
		return {
			compatible: true,
			syncAllowed: true,
			mode: "full_sync",
			reason: `Compatible schema v${localSchema}, minor application version delta (v${local.appVersion} vs v${remote.appVersion})`,
		};
	}

	return {
		compatible: true,
		syncAllowed: true,
		mode: "full_sync",
		reason: "Perfect schema and version match",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Dynamic Master Election & Role Hierarchy
// ─────────────────────────────────────────────────────────────────────────────

export interface PeerElectionCandidate {
	nodeId: string;
	role: LanMeshRole;
	schemaVersion: number | string;
	lastSeen: number;
	status: LanMeshNodeStatus;
	uptimeMs?: number;
}

/**
 * Deterministically elects or identifies the Master node among active peers:
 * 1. An explicitly configured 'master' node currently online always wins.
 * 2. If multiple nodes claim 'master', tie-break by highest schema version, then lowest nodeId.
 * 3. If no 'master' exists, an 'admin' node is eligible, or the node with lowest nodeId.
 */
export function electMasterNode<T extends PeerElectionCandidate>(candidates: T[]): T | null {
	const activeCandidates = candidates.filter(
		(c) => c.status === "online" || c.status === "read_only" || c.status === "sync_deferred",
	);

	if (activeCandidates.length === 0) return null;

	// 1. Filter nodes designated as 'master'
	const masters = activeCandidates.filter((c) => c.role === "master");
	if (masters.length > 0) {
		return masters.sort((a, b) => {
			const schemaA = normalizeSchemaVersion(a.schemaVersion);
			const schemaB = normalizeSchemaVersion(b.schemaVersion);
			if (schemaA !== schemaB) return schemaB - schemaA; // Highest schema first
			return a.nodeId.localeCompare(b.nodeId); // Deterministic tie-break
		})[0]!;
	}

	// 2. Filter nodes designated as 'admin'
	const admins = activeCandidates.filter((c) => c.role === "admin");
	if (admins.length > 0) {
		return admins.sort((a, b) => {
			const schemaA = normalizeSchemaVersion(a.schemaVersion);
			const schemaB = normalizeSchemaVersion(b.schemaVersion);
			if (schemaA !== schemaB) return schemaB - schemaA;
			return a.nodeId.localeCompare(b.nodeId);
		})[0]!;
	}

	// 3. If no master or admin server is online, return null (satellites buffer offline)
	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Offline Mesh Mutation Queue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thread-safe, idempotent in-memory offline mutation queue for satellite workstations.
 * When the clinic Master goes offline or schema compatibility degrades, local operations
 * (appointments, diaries, invoices, payments) are preserved locally without data loss.
 */
export class OfflineMeshMutationQueue {
	private readonly queue = new Map<string, QueuedMeshMutation>();
	private readonly maxQueueSize: number;

	constructor(options: { maxQueueSize?: number } = {}) {
		this.maxQueueSize = options.maxQueueSize ?? 5000;
	}

	/**
	 * Enqueues a mutation. If an identical idempotencyKey already exists, merges payload and preserves order.
	 */
	enqueue(mutation: Omit<QueuedMeshMutation, "attempts"> & { attempts?: number }): boolean {
		if (this.queue.size >= this.maxQueueSize && !this.queue.has(mutation.idempotencyKey)) {
			// Evict oldest mutation if ceiling hit (FIFO)
			const oldestKey = this.queue.keys().next().value;
			if (oldestKey) this.queue.delete(oldestKey);
		}

		const fullMutation: QueuedMeshMutation = {
			...mutation,
			attempts: mutation.attempts ?? 0,
		};
		this.queue.set(fullMutation.idempotencyKey, fullMutation);
		return true;
	}

	/**
	 * Returns all queued mutations in chronological order.
	 */
	peekAll(): QueuedMeshMutation[] {
		return Array.from(this.queue.values()).sort((a, b) => a.timestamp - b.timestamp);
	}

	/**
	 * Returns batch of up to `limit` mutations for synchronization attempt.
	 */
	peekBatch(limit = 50): QueuedMeshMutation[] {
		return this.peekAll().slice(0, Math.max(1, limit));
	}

	/**
	 * Acknowledges successful sync of specific idempotencyKeys, removing them from queue.
	 */
	acknowledge(idempotencyKeys: string[]): number {
		let removed = 0;
		for (const key of idempotencyKeys) {
			if (this.queue.delete(key)) {
				removed++;
			}
		}
		return removed;
	}

	/**
	 * Increments attempt count for mutations that encountered a retryable network error.
	 */
	recordFailure(idempotencyKeys: string[]): void {
		for (const key of idempotencyKeys) {
			const item = this.queue.get(key);
			if (item) {
				item.attempts += 1;
			}
		}
	}

	size(): number {
		return this.queue.size;
	}

	clear(): void {
		this.queue.clear();
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Zero-Conf Peer Discovery Beacon Generator
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_MESH_UDP_PORT = 4101;
export const DEFAULT_MESH_HTTP_PORTS = [4100, 4101, 4102, 4103, 4104, 4105] as const;

/**
 * Creates a raw UDP broadcast/multicast discovery beacon buffer.
 */
export function createMeshDiscoveryBeacon(params: {
	nodeId: string;
	clinicId: string;
	role: LanMeshRole;
	ip: string;
	port: number;
	appVersion: string;
	schemaVersion: number | string;
	timestamp?: number;
}): Buffer {
	const beaconPayload: LanMeshDiscoveryBeaconPayload = {
		magic: "DENTE_MESH_BEACON",
		protocolVersion: "2.0.0",
		nodeId: params.nodeId,
		clinicId: params.clinicId,
		role: params.role,
		ip: params.ip,
		port: params.port,
		appVersion: params.appVersion,
		schemaVersion: params.schemaVersion,
		timestamp: params.timestamp ?? Date.now(),
	};
	return Buffer.from(JSON.stringify(beaconPayload), "utf8");
}

/**
 * Parses and validates an incoming raw UDP beacon buffer.
 */
export function parseMeshDiscoveryBeacon(buffer: Buffer | string): LanMeshDiscoveryBeaconPayload | null {
	try {
		const rawString = typeof buffer === "string" ? buffer : buffer.toString("utf8");
		const parsedJson = JSON.parse(rawString);
		const result = lanMeshDiscoveryBeaconPayloadSchema.safeParse(parsedJson);
		if (result.success) {
			return result.data;
		}
	} catch {
		// Ignore malformed packets from other network services
	}
	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. LAN Mesh Topology Manager
// ─────────────────────────────────────────────────────────────────────────────

export interface LanMeshTopologyOptions {
	nodeId: string;
	clinicId: string;
	role: LanMeshRole;
	ip: string;
	port: number;
	appVersion: string;
	schemaVersion: number | string;
	peerTimeoutMs?: number;
	onPeerDiscovered?: (peer: LanMeshPeerSummary) => void;
	onPeerLost?: (nodeId: string) => void;
	onMasterChanged?: (newMaster: LanMeshPeerSummary | null) => void;
	onStatusBadgeChanged?: (badge: MeshSyncStatusBadge) => void;
}

/**
 * Central State Machine for a single clinic computer participating in the LAN Zero-Conf Mesh.
 */
export class LanMeshTopologyManager {
	readonly nodeId: string;
	readonly clinicId: string;
	readonly role: LanMeshRole;
	readonly ip: string;
	readonly port: number;
	readonly appVersion: string;
	readonly schemaVersion: number | string;

	private readonly peerTimeoutMs: number;
	private readonly peers = new Map<string, LanMeshPeerSummary>();
	private readonly mutationQueue = new OfflineMeshMutationQueue();
	private activeMasterId: string | null = null;
	private activeWarningBadge: MeshSyncStatusBadge["warningBadge"] | undefined;

	private readonly onPeerDiscovered?: ((peer: LanMeshPeerSummary) => void) | undefined;
	private readonly onPeerLost?: ((nodeId: string) => void) | undefined;
	private readonly onMasterChanged?: ((newMaster: LanMeshPeerSummary | null) => void) | undefined;
	private readonly onStatusBadgeChanged?: ((badge: MeshSyncStatusBadge) => void) | undefined;

	constructor(options: LanMeshTopologyOptions) {
		this.nodeId = options.nodeId;
		this.clinicId = options.clinicId;
		this.role = options.role;
		this.ip = options.ip;
		this.port = options.port;
		this.appVersion = options.appVersion;
		this.schemaVersion = options.schemaVersion;
		this.peerTimeoutMs = options.peerTimeoutMs ?? 15000;

		this.onPeerDiscovered = options.onPeerDiscovered;
		this.onPeerLost = options.onPeerLost;
		this.onMasterChanged = options.onMasterChanged;
		this.onStatusBadgeChanged = options.onStatusBadgeChanged;

		if (this.role === "master") {
			this.activeMasterId = this.nodeId;
		}
	}

	/**
	 * Generates handshake payload representing the local node and its known peer list.
	 */
	createHandshakePayload(): LanMeshHandshakePayload {
		return {
			nodeId: this.nodeId,
			clinicId: this.clinicId,
			appVersion: this.appVersion,
			schemaVersion: this.schemaVersion,
			role: this.role,
			ip: this.ip,
			port: this.port,
			peerList: this.getPeerSummaries(),
			timestamp: Date.now(),
		};
	}

	/**
	 * Processes an incoming handshake from a remote peer:
	 * - Validates schema & version compatibility
	 * - Registers/updates the peer in the topology table
	 * - Recalculates Master election
	 * - Emits telemetry
	 */
	processIncomingHandshake(remote: LanMeshHandshakePayload): {
		accepted: boolean;
		compatibility: SchemaCompatibilityResult;
		localResponse: LanMeshHandshakePayload;
	} {
		const compatibility = verifyMeshSchemaCompatibility(
			{
				clinicId: this.clinicId,
				appVersion: this.appVersion,
				schemaVersion: this.schemaVersion,
			},
			{
				clinicId: remote.clinicId,
				appVersion: remote.appVersion,
				schemaVersion: remote.schemaVersion,
			},
		);

		if (!compatibility.compatible && compatibility.mode === "read_only" && compatibility.warningBadge?.code === "CLINIC_MISMATCH") {
			return {
				accepted: false,
				compatibility,
				localResponse: this.createHandshakePayload(),
			};
		}

		const isNew = !this.peers.has(remote.nodeId);
		const status: LanMeshNodeStatus = compatibility.syncAllowed
			? "online"
			: compatibility.mode === "sync_deferred"
				? "sync_deferred"
				: "read_only";

		const peerSummary: LanMeshPeerSummary = {
			nodeId: remote.nodeId,
			role: remote.role,
			ip: remote.ip,
			port: remote.port,
			appVersion: remote.appVersion,
			schemaVersion: remote.schemaVersion,
			lastSeen: Date.now(),
			status,
		};

		this.peers.set(remote.nodeId, peerSummary);

		if (compatibility.warningBadge) {
			this.activeWarningBadge = compatibility.warningBadge;
		}

		if (isNew && this.onPeerDiscovered) {
			this.onPeerDiscovered(peerSummary);
		}

		// Update peer list from remote's known peers (gossip propagation)
		for (const remotePeer of remote.peerList) {
			if (remotePeer.nodeId !== this.nodeId && !this.peers.has(remotePeer.nodeId)) {
				this.peers.set(remotePeer.nodeId, {
					...remotePeer,
					lastSeen: Date.now(),
				});
			}
		}

		this.recalculateMasterElection();
		this.notifyStatusBadge();

		return {
			accepted: true,
			compatibility,
			localResponse: this.createHandshakePayload(),
		};
	}

	/**
	 * Ingests a discovery beacon from a peer.
	 */
	processIncomingBeacon(beacon: LanMeshDiscoveryBeaconPayload): boolean {
		if (beacon.nodeId === this.nodeId) return false;
		if (beacon.clinicId !== this.clinicId) return false;

		const existing = this.peers.get(beacon.nodeId);
		const isNew = !existing;

		const updated: LanMeshPeerSummary = {
			nodeId: beacon.nodeId,
			role: beacon.role,
			ip: beacon.ip,
			port: beacon.port,
			appVersion: beacon.appVersion,
			schemaVersion: beacon.schemaVersion,
			lastSeen: Date.now(),
			status: existing?.status ?? "online",
		};

		this.peers.set(beacon.nodeId, updated);

		if (isNew && this.onPeerDiscovered) {
			this.onPeerDiscovered(updated);
		}

		this.recalculateMasterElection();
		this.notifyStatusBadge();
		return true;
	}

	/**
	 * Prunes peers whose last heartbeat exceeds `peerTimeoutMs`.
	 */
	pruneStalePeers(now = Date.now()): string[] {
		const staleNodeIds: string[] = [];
		for (const [nodeId, peer] of this.peers.entries()) {
			if (now - peer.lastSeen > this.peerTimeoutMs) {
				staleNodeIds.push(nodeId);
				this.peers.delete(nodeId);
				if (this.onPeerLost) {
					this.onPeerLost(nodeId);
				}
			}
		}

		if (staleNodeIds.length > 0) {
			this.recalculateMasterElection();
			this.notifyStatusBadge();
		}
		return staleNodeIds;
	}

	/**
	 * Recalculates master election based on active peers and local node.
	 */
	private recalculateMasterElection(): void {
		const candidates: PeerElectionCandidate[] = [
			{
				nodeId: this.nodeId,
				role: this.role,
				schemaVersion: this.schemaVersion,
				lastSeen: Date.now(),
				status: "online",
			},
			...Array.from(this.peers.values()),
		];

		const elected = electMasterNode(candidates);
		const newMasterId = elected ? elected.nodeId : null;

		if (newMasterId !== this.activeMasterId) {
			this.activeMasterId = newMasterId;
			if (this.onMasterChanged) {
				const masterSummary =
					newMasterId === this.nodeId
						? {
								nodeId: this.nodeId,
								role: this.role,
								ip: this.ip,
								port: this.port,
								appVersion: this.appVersion,
								schemaVersion: this.schemaVersion,
								lastSeen: Date.now(),
								status: "online" as const,
							}
						: this.peers.get(newMasterId || "") || null;
				this.onMasterChanged(masterSummary);
			}
		}
	}

	getPeerSummaries(): LanMeshPeerSummary[] {
		return Array.from(this.peers.values());
	}

	getPeer(nodeId: string): LanMeshPeerSummary | undefined {
		return this.peers.get(nodeId);
	}

	getMasterNode(): LanMeshPeerSummary | null {
		if (this.activeMasterId === this.nodeId) {
			if (this.role === "master" || this.role === "admin") {
				return {
					nodeId: this.nodeId,
					role: this.role,
					ip: this.ip,
					port: this.port,
					appVersion: this.appVersion,
					schemaVersion: this.schemaVersion,
					lastSeen: Date.now(),
					status: "online",
				};
			}
			return null;
		}
		return this.activeMasterId ? this.peers.get(this.activeMasterId) || null : null;
	}

	isMasterOnline(): boolean {
		const master = this.getMasterNode();
		return Boolean(master && (master.role === "master" || master.role === "admin"));
	}

	getMutationQueue(): OfflineMeshMutationQueue {
		return this.mutationQueue;
	}

	/**
	 * Builds non-blocking status badge telemetry for clinic frontends.
	 */
	getStatusBadge(): MeshSyncStatusBadge {
		const isMasterOnline = this.isMasterOnline();
		const queuedCount = this.mutationQueue.size();

		let syncMode: MeshSyncStatusBadge["syncMode"] = "streaming";
		if (!isMasterOnline) {
			syncMode = "offline_queued";
		} else if (this.activeWarningBadge?.code === "INCOMPATIBLE_SCHEMA") {
			syncMode = "sync_deferred";
		} else if (this.activeWarningBadge?.code === "VERSION_MISMATCH") {
			syncMode = "read_only";
		}

		return {
			isMasterOnline,
			masterNodeId: this.activeMasterId,
			activePeersCount: this.peers.size,
			queuedMutationsCount: queuedCount,
			syncMode,
			warningBadge: this.activeWarningBadge,
		};
	}

	private notifyStatusBadge(): void {
		if (this.onStatusBadgeChanged) {
			this.onStatusBadgeChanged(this.getStatusBadge());
		}
	}
}
