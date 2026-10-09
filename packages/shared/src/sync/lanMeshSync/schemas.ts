import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Zod Schemas & Domain Types (Layer 0)
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

export const lanMeshLeaseHeartbeatPacketSchema = z.object({
	magic: z.literal("DENTE_MESH_LEASE"),
	lease: masterLeaseHeartbeatSchema,
});
export type LanMeshLeaseHeartbeatPacket = z.infer<typeof lanMeshLeaseHeartbeatPacketSchema>;
