/**
 * @file syncGatewayService.ts
 * @description Canonical Layer 5 Facade for DENTE CRM Sync Gateway Service.
 * Re-exports the modularized Sync Gateway components preserving 100% API compatibility.
 */

export {
	SyncGatewayService,
	SyncEntityHandlers,
	SyncQueueManager,
	SyncSecurityEnforcer,
	SyncStreamTransport,
	APPOINTMENT_STATUS_RANK,
	VALID_APPOINTMENT_STATUSES,
	SYNC_COLLISION_CODES,
	SYNC_DEFAULT_TIMEOUT_MS,
	SYNC_HEARTBEAT_INTERVAL_MS,
	SYNC_MAX_BATCH_SIZE,
	SYNC_MAX_RETRIES,
	SYNC_RETRY_BACKOFF_BASE_MS,
	SYNC_STREAM_CHUNK_SIZE,
	SYNC_TABLE_DDL,
	buildOdontogramVector,
	parseTeethFromPayload,
	performFieldLevelCrdtMerge,
	resolveAppointmentStatusConflict,
	resolveOdontogramToothConflict,
} from "./syncGateway/index.js";

export type {
	AppointmentStatusConflictResolution,
	EntityMutationHandlerResult,
	FieldConflictDetail,
	MutationVector,
	OdontogramParsedTooth,
	SyncLogger,
	SyncMutationEnvelope,
	SyncMutationResult,
	SyncMutationStatus,
	SyncNodeInfo,
	SyncNodeStatus,
	SyncProcessOptions,
	SyncPullResult,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
	SyncQueueItem,
	SyncQueueStats,
	SyncSecurityValidationResult,
	SyncStreamConnection,
} from "./syncGateway/index.js";
