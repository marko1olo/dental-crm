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
import {
	hmacSha256Hex,
	safeRandomBytesHex,
	timingSafeStringEqual,
} from "./hashing.js";

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
	syncMode: z.enum([
		"streaming",
		"offline_queued",
		"sync_deferred",
		"read_only",
		"temporary_master_active",
	]),
	isTemporaryMaster: z.boolean().optional(),
	temporaryMasterNodeId: z.string().nullable().optional(),
	leaseTerm: z.number().int().nonnegative().optional(),
	consecutiveMissedHeartbeats: z.number().int().nonnegative().optional(),
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

export const DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS = 5000;
export const MISSED_HEARTBEATS_FAILOVER_THRESHOLD = 2;
export const DEFAULT_LEASE_FAILOVER_TIMEOUT_MS = 10000; // 2 * 5000ms threshold

export const masterLeaseHeartbeatSchema = z.object({
	leaseId: z.string().min(1).max(128),
	masterNodeId: z.string().min(1).max(128),
	clinicId: z.string().min(1).max(128),
	term: z.number().int().nonnegative(),
	issuedAt: z.number().nonnegative(),
	expiresAt: z.number().nonnegative(),
	leaseDurationMs: z.number().int().positive().default(5000),
	schemaVersion: z.union([z.number().int().nonnegative(), z.string()]),
	appVersion: z.string(),
	signature: z.string().min(16),
});
export type MasterLeaseHeartbeat = z.infer<typeof masterLeaseHeartbeatSchema>;

export function getLeaseSigningPayload(params: {
	leaseId: string;
	clinicId: string;
	masterNodeId: string;
	term: number;
	issuedAt: number;
	expiresAt: number;
	schemaVersion: number | string;
	appVersion: string;
}): string {
	const normalizedSchema = normalizeSchemaVersion(params.schemaVersion);
	return `${params.leaseId}:${params.clinicId}:${params.masterNodeId}:${params.term}:${params.issuedAt}:${params.expiresAt}:${normalizedSchema}:${params.appVersion}`;
}

export function createMasterLeaseHeartbeat(params: {
	masterNodeId: string;
	clinicId: string;
	term: number;
	schemaVersion: number | string;
	appVersion: string;
	leaseDurationMs?: number | undefined;
	secret?: string | undefined;
	issuedAt?: number | undefined;
	leaseId?: string | undefined;
}): MasterLeaseHeartbeat {
	const leaseId = params.leaseId || `lease-${Date.now()}-${safeRandomBytesHex(4)}`;
	const issuedAt = params.issuedAt ?? Date.now();
	const leaseDurationMs = params.leaseDurationMs ?? DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS;
	const expiresAt = issuedAt + leaseDurationMs;
	const secret = params.secret || `dente-mesh-secret-${params.clinicId}`;

	const signingPayload = getLeaseSigningPayload({
		leaseId,
		clinicId: params.clinicId,
		masterNodeId: params.masterNodeId,
		term: params.term,
		issuedAt,
		expiresAt,
		schemaVersion: params.schemaVersion,
		appVersion: params.appVersion,
	});

	const signature = hmacSha256Hex(secret, signingPayload);

	return {
		leaseId,
		masterNodeId: params.masterNodeId,
		clinicId: params.clinicId,
		term: params.term,
		issuedAt,
		expiresAt,
		leaseDurationMs,
		schemaVersion: params.schemaVersion,
		appVersion: params.appVersion,
		signature,
	};
}

export function verifyMasterLeaseHeartbeat(
	lease: MasterLeaseHeartbeat,
	options: {
		secret?: string | undefined;
		expectedClinicId?: string | undefined;
		now?: number | undefined;
		clockSkewToleranceMs?: number | undefined;
	} = {},
): { valid: boolean; reason?: string | undefined } {

	const parseRes = masterLeaseHeartbeatSchema.safeParse(lease);
	if (!parseRes.success) {
		return { valid: false, reason: "Malformed lease schema" };
	}

	const data = parseRes.data;

	if (options.expectedClinicId && data.clinicId !== options.expectedClinicId) {
		return {
			valid: false,
			reason: `Clinic mismatch: expected '${options.expectedClinicId}', got '${data.clinicId}'`,
		};
	}

	const secret = options.secret || `dente-mesh-secret-${data.clinicId}`;
	const expectedPayload = getLeaseSigningPayload(data);
	const expectedSignature = hmacSha256Hex(secret, expectedPayload);

	if (!timingSafeStringEqual(data.signature, expectedSignature)) {
		return { valid: false, reason: "Invalid cryptographic lease signature" };
	}

	const now = options.now ?? Date.now();
	const tolerance = options.clockSkewToleranceMs ?? 2000;
	if (now > data.expiresAt + tolerance) {
		return { valid: false, reason: `Lease expired at ${data.expiresAt} (current time: ${now})` };
	}

	return { valid: true };
}

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
export function electMasterNode<T extends PeerElectionCandidate>(
	candidates: T[],
	options: { allowTemporaryConsensus?: boolean } = {},
): T | null {
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

	// 3. Dynamic consensus failover: all active satellites participate
	if (options.allowTemporaryConsensus) {
		return activeCandidates.sort((a, b) => {
			const schemaA = normalizeSchemaVersion(a.schemaVersion);
			const schemaB = normalizeSchemaVersion(b.schemaVersion);
			if (schemaA !== schemaB) return schemaB - schemaA;
			return a.nodeId.localeCompare(b.nodeId);
		})[0]!;
	}

	// 4. If no master or admin server is online and consensus failover not enabled, return null (satellites buffer offline)
	return null;
}

/**
 * Instant consensus election among satellites when the primary Master is dead.
 * Requirement: highest schema version + lowest nodeId becomes the temporary active Master.
 */
export function electConsensusMasterNode<T extends PeerElectionCandidate>(candidates: T[]): T | null {
	return electMasterNode(candidates, { allowTemporaryConsensus: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Offline Mesh Mutation Queue & Local Mutation Ring Buffer
// ─────────────────────────────────────────────────────────────────────────────

export interface LocalMutationRingBufferOptions {
	capacity?: number;
}

/**
 * Thread-safe, fixed-capacity circular ring buffer for satellite workstation mutations.
 * Guarantees zero disruption to active doctor sessions when disconnected from Master.
 * Bounded memory usage with O(1) idempotency lookup and FIFO overflow protection.
 */
export class LocalMutationRingBuffer {
	private readonly capacity: number;
	private readonly buffer: (QueuedMeshMutation | null)[];
	private head = 0; // next write slot
	private count = 0;
	private overflowCount = 0;
	private readonly indexByKey = new Map<string, number>();

	constructor(options: LocalMutationRingBufferOptions = {}) {
		this.capacity = Math.max(1, options.capacity ?? 5000);
		this.buffer = new Array(this.capacity).fill(null);
	}

	push(mutation: Omit<QueuedMeshMutation, "attempts"> & { attempts?: number }): {
		buffered: boolean;
		isDuplicate: boolean;
	} {
		const fullMutation: QueuedMeshMutation = {
			...mutation,
			attempts: mutation.attempts ?? 0,
		};

		// 1. In-place deduplication if idempotencyKey already in ring buffer
		const existingSlot = this.indexByKey.get(fullMutation.idempotencyKey);
		if (existingSlot !== undefined && this.buffer[existingSlot] !== null) {
			this.buffer[existingSlot] = fullMutation;
			return { buffered: true, isDuplicate: true };
		}

		// 2. FIFO overflow if capacity reached
		if (this.count >= this.capacity) {
			const old = this.buffer[this.head];
			if (old) {
				this.indexByKey.delete(old.idempotencyKey);
				this.overflowCount++;
			}
		} else {
			this.count++;
		}

		const slot = this.head;
		this.buffer[slot] = fullMutation;
		this.indexByKey.set(fullMutation.idempotencyKey, slot);
		this.head = (this.head + 1) % this.capacity;

		return { buffered: true, isDuplicate: false };
	}

	has(idempotencyKey: string): boolean {
		const slot = this.indexByKey.get(idempotencyKey);
		return slot !== undefined && this.buffer[slot] !== null;
	}

	getDroppedCount(): number {
		return this.overflowCount;
	}

	peekAll(): QueuedMeshMutation[] {
		const items: QueuedMeshMutation[] = [];
		for (const item of this.buffer) {
			if (item !== null) {
				items.push(item);
			}
		}
		return items.sort((a, b) => a.timestamp - b.timestamp);
	}

	peekBatch(limit = 50): QueuedMeshMutation[] {
		return this.peekAll().slice(0, Math.max(1, limit));
	}

	acknowledge(idempotencyKeys: string[]): number {
		let removed = 0;
		for (const key of idempotencyKeys) {
			const slot = this.indexByKey.get(key);
			if (slot !== undefined && this.buffer[slot] !== null) {
				this.buffer[slot] = null;
				this.indexByKey.delete(key);
				this.count = Math.max(0, this.count - 1);
				removed++;
			}
		}
		return removed;
	}

	recordFailure(idempotencyKeys: string[]): void {
		for (const key of idempotencyKeys) {
			const slot = this.indexByKey.get(key);
			if (slot !== undefined && this.buffer[slot] !== null) {
				this.buffer[slot]!.attempts += 1;
			}
		}
	}

	size(): number {
		return this.count;
	}

	getCapacity(): number {
		return this.capacity;
	}

	getOverflowCount(): number {
		return this.overflowCount;
	}

	clear(): void {
		this.buffer.fill(null);
		this.indexByKey.clear();
		this.head = 0;
		this.count = 0;
		this.overflowCount = 0;
	}
}

/**
 * Thread-safe, idempotent in-memory offline mutation queue for satellite workstations.
 * When the clinic Master goes offline or schema compatibility degrades, local operations
 * (appointments, diaries, invoices, payments) are preserved locally without data loss.
 */
export class OfflineMeshMutationQueue {
	private readonly queue = new Map<string, QueuedMeshMutation>();
	private readonly maxQueueSize: number;
	private readonly ringBuffer: LocalMutationRingBuffer;

	constructor(options: { maxQueueSize?: number } = {}) {
		this.maxQueueSize = options.maxQueueSize ?? 5000;
		this.ringBuffer = new LocalMutationRingBuffer({ capacity: this.maxQueueSize });
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
		this.ringBuffer.push(fullMutation);
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
		this.ringBuffer.acknowledge(idempotencyKeys);
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
		this.ringBuffer.recordFailure(idempotencyKeys);
	}

	size(): number {
		return this.queue.size;
	}

	getRingBuffer(): LocalMutationRingBuffer {
		return this.ringBuffer;
	}

	clear(): void {
		this.queue.clear();
		this.ringBuffer.clear();
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

export const lanMeshLeaseHeartbeatPacketSchema = z.object({
	magic: z.literal("DENTE_MESH_LEASE"),
	lease: masterLeaseHeartbeatSchema,
});
export type LanMeshLeaseHeartbeatPacket = z.infer<typeof lanMeshLeaseHeartbeatPacketSchema>;

/**
 * Creates a raw UDP broadcast/multicast lease heartbeat packet buffer.
 */
export function createMeshLeaseHeartbeatPacket(lease: MasterLeaseHeartbeat): Buffer {
	const packet: LanMeshLeaseHeartbeatPacket = {
		magic: "DENTE_MESH_LEASE",
		lease,
	};
	return Buffer.from(JSON.stringify(packet), "utf8");
}

/**
 * Parses and validates an incoming raw UDP lease heartbeat packet buffer.
 */
export function parseMeshLeaseHeartbeatPacket(buffer: Buffer | string): MasterLeaseHeartbeat | null {
	try {
		const rawString = typeof buffer === "string" ? buffer : buffer.toString("utf8");
		const parsedJson = JSON.parse(rawString);
		const result = lanMeshLeaseHeartbeatPacketSchema.safeParse(parsedJson);
		if (result.success) {
			return result.data.lease;
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
	peerTimeoutMs?: number | undefined;
	enableLeaseFailover?: boolean | undefined;
	leaseSecret?: string | undefined;
	leaseDurationMs?: number | undefined;
	onPeerDiscovered?: ((peer: LanMeshPeerSummary) => void) | undefined;
	onPeerLost?: ((nodeId: string) => void) | undefined;
	onMasterChanged?: ((newMaster: LanMeshPeerSummary | null) => void) | undefined;
	onStatusBadgeChanged?: ((badge: MeshSyncStatusBadge) => void) | undefined;
	onLeaseFailoverTriggered?: ((details: {
		deadMasterId: string | null;
		electedMasterId: string;
		isLocalElected: boolean;
		term: number;
	}) => void) | undefined;
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
	private readonly ringBuffer: LocalMutationRingBuffer;
	private activeMasterId: string | null = null;
	private activeWarningBadge: MeshSyncStatusBadge["warningBadge"] | undefined;

	// Lease & Consensus Failover State
	private currentTerm = 1;
	private activeLease: MasterLeaseHeartbeat | null = null;
	private lastMasterHeartbeatAt = 0;
	private consecutiveMissedHeartbeats = 0;
	private isTemporaryMaster = false;
	private temporaryMasterNodeId: string | null = null;
	private readonly enableLeaseFailover: boolean;
	private readonly leaseSecret?: string | undefined;
	private readonly leaseDurationMs: number;
	private readonly onLeaseFailoverTriggered?: ((details: {
		deadMasterId: string | null;
		electedMasterId: string;
		isLocalElected: boolean;
		term: number;
	}) => void) | undefined;

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
		this.enableLeaseFailover = options.enableLeaseFailover ?? false;
		this.leaseSecret = options.leaseSecret;
		this.leaseDurationMs = options.leaseDurationMs ?? DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS;
		this.onLeaseFailoverTriggered = options.onLeaseFailoverTriggered;

		this.ringBuffer = this.mutationQueue.getRingBuffer();

		this.onPeerDiscovered = options.onPeerDiscovered;
		this.onPeerLost = options.onPeerLost;
		this.onMasterChanged = options.onMasterChanged;
		this.onStatusBadgeChanged = options.onStatusBadgeChanged;

		if (this.role === "master") {
			this.activeMasterId = this.nodeId;
			this.lastMasterHeartbeatAt = Date.now();
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
	 * Directly registers or updates a peer in the topology table (e.g. from AutoJoin PIN pairing).
	 */
	addOrUpdatePeer(peer: LanMeshPeerSummary): void {
		const isNew = !this.peers.has(peer.nodeId);
		this.peers.set(peer.nodeId, {
			...peer,
			lastSeen: peer.lastSeen || Date.now(),
		});

		if (isNew && this.onPeerDiscovered) {
			this.onPeerDiscovered(peer);
		}

		this.recalculateMasterElection();
		this.notifyStatusBadge();
	}

	/**
	 * Prunes peers whose last heartbeat exceeds `peerTimeoutMs`.
	 */
	/**
	 * Creates a cryptographically signed lease heartbeat.
	 * Can be emitted by the primary Master or an elected Temporary Master.
	 */
	createLeaseHeartbeat(now?: number): MasterLeaseHeartbeat {
		const issuedAt = now ?? Date.now();
		const lease = createMasterLeaseHeartbeat({
			masterNodeId: this.nodeId,
			clinicId: this.clinicId,
			term: this.currentTerm,
			schemaVersion: this.schemaVersion,
			appVersion: this.appVersion,
			leaseDurationMs: this.leaseDurationMs,
			secret: this.leaseSecret,
			issuedAt,
		});

		this.activeLease = lease;
		this.lastMasterHeartbeatAt = issuedAt;
		return lease;
	}

	/**
	 * Ingests and verifies an incoming Master Lease Heartbeat.
	 * Resets missed heartbeat counters and relinquishes temporary master if primary returns.
	 */
	processMasterLeaseHeartbeat(
		lease: MasterLeaseHeartbeat,
		secret?: string | undefined,
		now?: number | undefined,
	): { accepted: boolean; reason?: string | undefined } {
		const verification = verifyMasterLeaseHeartbeat(lease, {
			secret: secret || this.leaseSecret,
			expectedClinicId: this.clinicId,
			now: now ?? lease.issuedAt,
		});

		if (!verification.valid) {
			return { accepted: false, reason: verification.reason };
		}

		this.lastMasterHeartbeatAt = lease.issuedAt || Date.now();
		this.consecutiveMissedHeartbeats = 0;
		this.activeLease = lease;

		if (lease.term > this.currentTerm) {
			this.currentTerm = lease.term;
		}

		// If this node was acting as temporary master, relinquish immediately upon primary master return
		if (this.isTemporaryMaster || this.temporaryMasterNodeId) {
			this.isTemporaryMaster = false;
			this.temporaryMasterNodeId = null;
		}
		this.activeMasterId = lease.masterNodeId;

		// Ensure master is registered in peer table as online
		const existingPeer = this.peers.get(lease.masterNodeId);
		if (existingPeer) {
			this.peers.set(lease.masterNodeId, {
				...existingPeer,
				status: "online",
				lastSeen: lease.issuedAt || Date.now(),
			});
		} else {
			this.peers.set(lease.masterNodeId, {
				nodeId: lease.masterNodeId,
				role: "master",
				ip: "127.0.0.1",
				port: 4100,
				appVersion: lease.appVersion,
				schemaVersion: lease.schemaVersion,
				lastSeen: lease.issuedAt || Date.now(),
				status: "online",
			});
		}

		this.recalculateMasterElection();
		this.notifyStatusBadge();
		return { accepted: true };
	}

	/**
	 * Evaluates Master lease freshness.
	 * If satellites miss 2 consecutive heartbeats (10s threshold), Master is marked dead.
	 * Satellites initiate instant consensus election: highest schema version + lowest nodeId
	 * becomes the temporary active Master.
	 */
	checkMasterLeaseHealth(now = Date.now()): {
		masterAlive: boolean;
		failoverTriggered: boolean;
		electedMasterId: string | null;
		isLocalElected: boolean;
	} {
		if (this.role === "master") {
			return {
				masterAlive: true,
				failoverTriggered: false,
				electedMasterId: this.nodeId,
				isLocalElected: true,
			};
		}

		if (this.lastMasterHeartbeatAt > 0) {
			const elapsed = now - this.lastMasterHeartbeatAt;
			if (elapsed >= DEFAULT_LEASE_FAILOVER_TIMEOUT_MS) {
				// Master missed >= 2 consecutive heartbeats (10s threshold) -> marked dead
				this.consecutiveMissedHeartbeats = Math.max(
					MISSED_HEARTBEATS_FAILOVER_THRESHOLD,
					Math.floor(elapsed / DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS),
				);

				const prevMaster = this.activeMasterId;
				if (prevMaster && this.peers.has(prevMaster)) {
					const p = this.peers.get(prevMaster)!;
					this.peers.set(prevMaster, { ...p, status: "offline" });
				}

				// Instant consensus election: highest schema version + lowest nodeId
				const candidates: PeerElectionCandidate[] = [
					{
						nodeId: this.nodeId,
						role: this.role,
						schemaVersion: this.schemaVersion,
						lastSeen: now,
						status: "online",
					},
					...Array.from(this.peers.values()).filter(
						(p) => p.status !== "offline" && p.nodeId !== prevMaster,
					),
				];

				const elected = electConsensusMasterNode(candidates);
				if (elected) {
					this.currentTerm += 1;
					this.temporaryMasterNodeId = elected.nodeId;
					this.activeMasterId = elected.nodeId;
					this.isTemporaryMaster = elected.nodeId === this.nodeId;

					if (this.onLeaseFailoverTriggered) {
						this.onLeaseFailoverTriggered({
							deadMasterId: prevMaster,
							electedMasterId: elected.nodeId,
							isLocalElected: this.isTemporaryMaster,
							term: this.currentTerm,
						});
					}

					if (this.onMasterChanged) {
						this.onMasterChanged(this.getMasterNode());
					}

					this.notifyStatusBadge();
					return {
						masterAlive: false,
						failoverTriggered: true,
						electedMasterId: elected.nodeId,
						isLocalElected: this.isTemporaryMaster,
					};
				}
			}
		}

		return {
			masterAlive: true,
			failoverTriggered: false,
			electedMasterId: this.activeMasterId,
			isLocalElected: this.isTemporaryMaster,
		};
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

		if (this.enableLeaseFailover) {
			this.checkMasterLeaseHealth(now);
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

		const elected =
			this.enableLeaseFailover &&
			(this.consecutiveMissedHeartbeats >= MISSED_HEARTBEATS_FAILOVER_THRESHOLD ||
				this.isTemporaryMaster)
				? electConsensusMasterNode(candidates)
				: electMasterNode(candidates);

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
			if (this.role === "master" || this.role === "admin" || this.isTemporaryMaster) {
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
		if (!master) return false;
		if (master.role === "master" || master.role === "admin") return true;
		if (
			this.isTemporaryMaster ||
			(this.temporaryMasterNodeId && this.temporaryMasterNodeId === master.nodeId)
		) {
			return true;
		}
		return false;
	}

	getMutationQueue(): OfflineMeshMutationQueue {
		return this.mutationQueue;
	}

	getRingBuffer(): LocalMutationRingBuffer {
		return this.ringBuffer;
	}

	isTemporaryMasterActive(): boolean {
		return this.isTemporaryMaster;
	}

	getTemporaryMasterNodeId(): string | null {
		return this.temporaryMasterNodeId;
	}

	getLeaseTerm(): number {
		return this.currentTerm;
	}

	getConsecutiveMissedHeartbeats(): number {
		return this.consecutiveMissedHeartbeats;
	}

	getActiveLease(): MasterLeaseHeartbeat | null {
		return this.activeLease;
	}

	/**
	 * Builds non-blocking status badge telemetry for clinic frontends.
	 */
	getStatusBadge(): MeshSyncStatusBadge {
		const isMasterOnline = this.isMasterOnline();
		const queuedCount = this.mutationQueue.size();

		let syncMode: MeshSyncStatusBadge["syncMode"] = "streaming";
		if (
			this.isTemporaryMaster ||
			(this.temporaryMasterNodeId && this.temporaryMasterNodeId === this.activeMasterId)
		) {
			syncMode = "temporary_master_active";
		} else if (!isMasterOnline) {
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
			isTemporaryMaster: this.isTemporaryMaster,
			temporaryMasterNodeId: this.temporaryMasterNodeId,
			leaseTerm: this.currentTerm,
			consecutiveMissedHeartbeats: this.consecutiveMissedHeartbeats,
			warningBadge: this.activeWarningBadge,
		};
	}

	private notifyStatusBadge(): void {
		if (this.onStatusBadgeChanged) {
			this.onStatusBadgeChanged(this.getStatusBadge());
		}
	}
}

