/**
 * Replication heartbeat and network timeouts.
 */
export const SYNC_HEARTBEAT_INTERVAL_MS = 15_000;
export const SYNC_DEFAULT_TIMEOUT_MS = 30_000;
export const SYNC_STREAM_CHUNK_SIZE = 100;
export const SYNC_MAX_BATCH_SIZE = 500;
export const SYNC_MAX_RETRIES = 5;
export const SYNC_RETRY_BACKOFF_BASE_MS = 1_000;

/**
 * Deterministic rank hierarchy for appointment status transitions.
 * Prevents retrograde overwriting of in-clinic progression by stale clients.
 */
export const APPOINTMENT_STATUS_RANK: Record<string, number> = {
	planned: 1,
	confirmed: 2,
	arrived: 3,
	in_treatment: 4,
	completed: 5,
	no_show: 2,
	cancelled: 0,
};

/**
 * Valid recognized statuses for appointment entities.
 */
export const VALID_APPOINTMENT_STATUSES = new Set([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
	"completed",
	"cancelled",
	"no_show",
]);

/**
 * Error / collision diagnostic codes for conflict reporting.
 */
export const SYNC_COLLISION_CODES = {
	HASH_MISMATCH: "SYNC_HASH_MISMATCH",
	IDEMPOTENCY_COLLISION: "SYNC_IDEMPOTENCY_COLLISION",
	STALE_REVISION: "SYNC_STALE_REVISION",
	STATUS_REGRESSION: "SYNC_STATUS_REGRESSION",
	TENANT_BREACH: "SYNC_TENANT_BREACH",
} as const;
