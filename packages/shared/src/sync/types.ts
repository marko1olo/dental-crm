import { z } from "zod";

export const syncMutationEntityKindSchema = z.enum([
	"patient",
	"visit",
	"visit_diary",
	"payment",
	"patient_invoice",
	"appointment",
	"treatment_item",
	"clinical_task",
	"odontogram_state",
	"patient_administrative_profile",
]);
export type SyncMutationEntityKind = z.infer<typeof syncMutationEntityKindSchema>;

export const syncMutationActionSchema = z.enum([
	"create",
	"update",
	"delete",
	"upsert",
]);
export type SyncMutationAction = z.infer<typeof syncMutationActionSchema>;

export const fieldVectorEntrySchema = z.object({
	updatedAt: z.string(),
	version: z.number().int().nonnegative().optional(),
	authorId: z.string().optional(),
	clientId: z.string().optional(),
});
export type FieldVectorEntry = z.infer<typeof fieldVectorEntrySchema>;

export const mutationVectorSchema = z.record(z.string(), fieldVectorEntrySchema);
export type MutationVector = z.infer<typeof mutationVectorSchema>;

export const vectorClockSchema = z.record(z.string(), z.number().int().nonnegative());
export type VectorClock = z.infer<typeof vectorClockSchema>;

export const syncMutationEnvelopeSchema = z.object({
	mutationId: z.string().min(1).max(128),
	idempotencyKey: z.string().min(1).max(256),
	payloadHash: z.string().min(16).max(128),
	entityKind: syncMutationEntityKindSchema,
	entityId: z.string().min(1).max(128),
	action: syncMutationActionSchema,
	payload: z.record(z.string(), z.unknown()),
	updatedAt: z.string(),
	mutationVector: mutationVectorSchema.optional(),
	vectorClock: vectorClockSchema.optional(),
	clientId: z.string().min(1).max(128).optional(),
	authorUserId: z.string().uuid().optional(),
	baseVersion: z.number().int().nonnegative().optional(),
});
export type SyncMutationEnvelope = z.infer<typeof syncMutationEnvelopeSchema>;

export const syncPushBatchRequestSchema = z.object({
	syncBatchId: z.string().min(1).max(128),
	clientId: z.string().min(1).max(128),
	mutations: z.array(syncMutationEnvelopeSchema),
	sentAt: z.string(),
});
export type SyncPushBatchRequest = z.infer<typeof syncPushBatchRequestSchema>;

export const conflictResolutionStrategySchema = z.enum([
	"field_merge",
	"lww",
	"crdt",
	"idempotent_replay",
	"status_priority",
	"rejected",
]);
export type ConflictResolutionStrategy = z.infer<
	typeof conflictResolutionStrategySchema
>;

export const fieldConflictDetailSchema = z.object({
	field: z.string(),
	clientValue: z.unknown(),
	serverValue: z.unknown(),
	resolvedValue: z.unknown(),
	strategy: conflictResolutionStrategySchema,
	winner: z.enum(["client", "server", "merged"]),
	reason: z.string(),
});
export type FieldConflictDetail = z.infer<typeof fieldConflictDetailSchema>;

export const syncMutationStatusSchema = z.enum([
	"applied",
	"duplicate",
	"merged",
	"conflict_resolved",
	"rejected",
]);
export type SyncMutationStatus = z.infer<typeof syncMutationStatusSchema>;

export const syncMutationResultSchema = z.object({
	mutationId: z.string(),
	idempotencyKey: z.string(),
	status: syncMutationStatusSchema,
	entityKind: syncMutationEntityKindSchema,
	entityId: z.string(),
	appliedAt: z.string(),
	mergedFields: z.array(z.string()).optional(),
	conflictDetails: z.array(fieldConflictDetailSchema).optional(),
	currentServerEntity: z.record(z.string(), z.unknown()).optional(),
	error: z.string().optional(),
});
export type SyncMutationResult = z.infer<typeof syncMutationResultSchema>;

export const syncPushBatchResponseSchema = z.object({
	syncBatchId: z.string(),
	processedCount: z.number().int().nonnegative(),
	appliedCount: z.number().int().nonnegative(),
	duplicateCount: z.number().int().nonnegative(),
	mergedCount: z.number().int().nonnegative(),
	rejectedCount: z.number().int().nonnegative(),
	results: z.array(syncMutationResultSchema),
	serverTime: z.string(),
});
export type SyncPushBatchResponse = z.infer<typeof syncPushBatchResponseSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// LAN Mesh Node & Wi-Fi Peer-to-Peer Replication Contracts
// ─────────────────────────────────────────────────────────────────────────────

export const lanNodeRoleSchema = z.enum([
	"primary_server",
	"reception_workstation",
	"doctor_tablet",
	"autonomous_workstation",
	"diagnostics_pc",
]);
export type LanNodeRole = z.infer<typeof lanNodeRoleSchema>;

export const syncTierModeSchema = z.enum([
	"cloud_postgresql",
	"lan_local_mesh",
	"autonomous_offline",
]);
export type SyncTierMode = z.infer<typeof syncTierModeSchema>;

export const lanMeshNodeSchema = z.object({
	nodeId: z.string().min(1).max(128),
	role: lanNodeRoleSchema,
	name: z.string().min(1).max(128),
	baseUrl: z.string(),
	ipAddresses: z.array(z.string()),
	port: z.number().int().positive(),
	lastSeenIso: z.string(),
	latencyMs: z.number().nonnegative().optional(),
	vectorClock: vectorClockSchema.optional(),
	status: z.enum(["online", "busy", "degraded", "offline"]).default("online"),
	organizationId: z.string().optional(),
});
export type LanMeshNode = z.infer<typeof lanMeshNodeSchema>;

export const lanDiscoveryBeaconSchema = z.object({
	protocolVersion: z.string().default("1.0.0"),
	serverName: z.string(),
	serverId: z.string(),
	role: lanNodeRoleSchema,
	baseUrl: z.string(),
	apiPort: z.number().int().positive(),
	lanAddresses: z.array(z.string()),
	timestamp: z.string(),
	organizationId: z.string().optional(),
	activeSyncTier: syncTierModeSchema.default("lan_local_mesh"),
	signature: z.string().optional(),
});
export type LanDiscoveryBeacon = z.infer<typeof lanDiscoveryBeaconSchema>;

export const meshSyncExchangeRequestSchema = z.object({
	exchangeId: z.string().min(1).max(128),
	senderNodeId: z.string().min(1).max(128),
	senderRole: lanNodeRoleSchema,
	senderVectorClock: vectorClockSchema,
	mutations: z.array(syncMutationEnvelopeSchema),
	sentAt: z.string(),
	organizationId: z.string().optional(),
});
export type MeshSyncExchangeRequest = z.infer<
	typeof meshSyncExchangeRequestSchema
>;

export const meshSyncExchangeResponseSchema = z.object({
	exchangeId: z.string(),
	responderNodeId: z.string(),
	responderVectorClock: vectorClockSchema,
	processedMutationsCount: z.number().int().nonnegative(),
	appliedMutationsCount: z.number().int().nonnegative(),
	mergedMutationsCount: z.number().int().nonnegative(),
	duplicateMutationsCount: z.number().int().nonnegative(),
	returnMutations: z.array(syncMutationEnvelopeSchema).default([]),
	results: z.array(syncMutationResultSchema),
	responderTime: z.string(),
});
export type MeshSyncExchangeResponse = z.infer<
	typeof meshSyncExchangeResponseSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// LAN WebSocket / BroadcastChannel Instantaneous P2P Clinical Events
// ─────────────────────────────────────────────────────────────────────────────

export const lanChairStatusSchema = z.enum([
	"empty",
	"patient_seated",
	"treatment_in_progress",
	"ready_for_sanitization",
	"sanitizing",
	"sanitized",
]);
export type LanChairStatus = z.infer<typeof lanChairStatusSchema>;

export const lanChairStatusEventSchema = z.object({
	cabinetNumber: z.union([z.string(), z.number()]),
	chairId: z.string().min(1),
	status: lanChairStatusSchema,
	patientId: z.string().optional(),
	patientName: z.string().optional(),
	doctorId: z.string().optional(),
	doctorName: z.string().optional(),
	updatedAt: z.string(),
	note: z.string().optional(),
});
export type LanChairStatusEvent = z.infer<typeof lanChairStatusEventSchema>;

export const lanCitoUrgencySchema = z.enum([
	"normal",
	"urgent",
	"cito_emergency",
]);
export type LanCitoUrgency = z.infer<typeof lanCitoUrgencySchema>;

export const lanCitoCallReasonSchema = z.enum([
	"sterilization_instruments",
	"anesthesia_aid",
	"patient_unwell",
	"supplies_needed",
	"custom",
]);
export type LanCitoCallReason = z.infer<typeof lanCitoCallReasonSchema>;

export const lanAssistantCitoEventSchema = z.object({
	callId: z.string().min(1),
	cabinetNumber: z.union([z.string(), z.number()]),
	urgency: lanCitoUrgencySchema,
	reason: lanCitoCallReasonSchema,
	customMessage: z.string().optional(),
	doctorId: z.string().min(1),
	doctorName: z.string().min(1),
	calledAt: z.string(),
	status: z.enum(["pending", "acknowledged", "resolved"]).default("pending"),
	acknowledgedBy: z.string().optional(),
	acknowledgedAt: z.string().optional(),
});
export type LanAssistantCitoEvent = z.infer<typeof lanAssistantCitoEventSchema>;

export const lanInvoiceTransferItemSchema = z.object({
	name: z.string().min(1),
	priceRub: z.number().nonnegative(),
	priceKopecks: z.number().int().nonnegative().optional(),
	quantity: z.number().int().positive().default(1),
	toothNumber: z.number().int().optional(),
	discountRub: z.number().nonnegative().optional(),
});
export type LanInvoiceTransferItem = z.infer<typeof lanInvoiceTransferItemSchema>;

export const lanInvoiceTransferEventSchema = z.object({
	transferId: z.string().min(1),
	cabinetNumber: z.union([z.string(), z.number()]),
	doctorId: z.string().min(1),
	doctorName: z.string().min(1),
	patientId: z.string().min(1),
	patientName: z.string().min(1),
	items: z.array(lanInvoiceTransferItemSchema).min(1),
	totalAmountRub: z.number().nonnegative(),
	totalAmountKopecks: z.number().int().nonnegative(),
	comments: z.string().optional(),
	transferredAt: z.string(),
	status: z
		.enum(["waiting_payment", "in_checkout", "paid", "cancelled"])
		.default("waiting_payment"),
});
export type LanInvoiceTransferEvent = z.infer<
	typeof lanInvoiceTransferEventSchema
>;

export const lanP2PEventTypeSchema = z.enum([
	"chair_status_changed",
	"assistant_call_cito",
	"invoice_transferred_to_cashier",
	"peer_presence_ping",
	"custom_alert",
]);
export type LanP2PEventType = z.infer<typeof lanP2PEventTypeSchema>;

export const lanP2PMessageSchema = z.object({
	messageId: z.string().min(1).max(128),
	eventType: lanP2PEventTypeSchema,
	senderNodeId: z.string().min(1).max(128),
	senderRole: lanNodeRoleSchema,
	senderName: z.string().min(1).max(128),
	organizationId: z.string().min(1),
	sentAt: z.string(),
	payload: z.record(z.string(), z.unknown()),
	vectorClock: vectorClockSchema.optional(),
	signature: z.string().optional(),
});
export type LanP2PMessage<TPayload = Record<string, unknown>> = Omit<
	z.infer<typeof lanP2PMessageSchema>,
	"payload"
> & {
	payload: TPayload;
};

