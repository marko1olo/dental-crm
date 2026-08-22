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
