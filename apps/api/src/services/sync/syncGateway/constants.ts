import { sql } from "drizzle-orm";

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

/**
 * SQL statements for bootstrapping synchronization infrastructure.
 */
export const SYNC_TABLE_DDL = {
	CREATE_IDEMPOTENCY_RECORDS_TABLE: sql`
		CREATE TABLE IF NOT EXISTS "sync_idempotency_records" (
			"id" uuid PRIMARY KEY DEFAULT uuidv7(),
			"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
			"idempotency_key" text NOT NULL,
			"payload_hash" text NOT NULL,
			"entity_kind" text NOT NULL,
			"entity_id" text NOT NULL,
			"action" text NOT NULL,
			"response_status" integer NOT NULL DEFAULT 200,
			"response_json" jsonb,
			"client_mutation_vector" jsonb,
			"created_at" timestamp with time zone NOT NULL DEFAULT now(),
			"updated_at" timestamp with time zone NOT NULL DEFAULT now()
		);
	`,
	CREATE_IDEMPOTENCY_ORG_KEY_INDEX: sql`
		CREATE UNIQUE INDEX IF NOT EXISTS "sync_idempotency_records_org_key_idx"
		ON "sync_idempotency_records" ("organization_id", "idempotency_key");
	`,
	CREATE_IDEMPOTENCY_ORG_ENTITY_INDEX: sql`
		CREATE INDEX IF NOT EXISTS "sync_idempotency_records_org_entity_idx"
		ON "sync_idempotency_records" ("organization_id", "entity_kind", "entity_id");
	`,
	CREATE_ENTITY_VECTORS_TABLE: sql`
		CREATE TABLE IF NOT EXISTS "sync_entity_vectors" (
			"id" uuid PRIMARY KEY DEFAULT uuidv7(),
			"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
			"entity_kind" text NOT NULL,
			"entity_id" text NOT NULL,
			"current_version" integer NOT NULL DEFAULT 1,
			"vector_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
			"last_mutation_id" text,
			"created_at" timestamp with time zone NOT NULL DEFAULT now(),
			"updated_at" timestamp with time zone NOT NULL DEFAULT now()
		);
	`,
	CREATE_ENTITY_VECTORS_ORG_KIND_ENTITY_INDEX: sql`
		CREATE UNIQUE INDEX IF NOT EXISTS "sync_entity_vectors_org_kind_entity_idx"
		ON "sync_entity_vectors" ("organization_id", "entity_kind", "entity_id");
	`,
};
