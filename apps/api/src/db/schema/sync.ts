import type { MutationVector, SyncMutationEntityKind } from "@dental/shared";
import { sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./auth.js";

/**
 * Server-side idempotency log for all synchronized and direct mutations.
 * Enforces exactly-once execution, prevents double spending and duplicate billing receipts.
 */
export const syncIdempotencyRecords = pgTable(
	"sync_idempotency_records",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		idempotencyKey: text("idempotency_key").notNull(),
		payloadHash: text("payload_hash").notNull(),
		entityKind: text("entity_kind").$type<SyncMutationEntityKind>().notNull(),
		entityId: text("entity_id").notNull(),
		action: text("action").notNull(),
		responseStatus: integer("response_status").notNull().default(200),
		responseJson: jsonb("response_json").$type<Record<string, unknown> | null>(),
		clientMutationVector: jsonb("client_mutation_vector").$type<MutationVector | null>(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdempotencyKeyIdx: uniqueIndex(
			"sync_idempotency_records_org_key_idx",
		).on(t.organizationId, t.idempotencyKey),
		orgEntityIdx: index("sync_idempotency_records_org_entity_idx").on(
			t.organizationId,
			t.entityKind,
			t.entityId,
		),
	}),
);

export type SyncIdempotencyRecord =
	typeof syncIdempotencyRecords.$inferSelect;
export type NewSyncIdempotencyRecord =
	typeof syncIdempotencyRecords.$inferInsert;

/**
 * Field-level vector clock state for entities.
 * Tracks per-field timestamps and versions for deterministic CRDT conflict resolution.
 */
export const syncEntityVectors = pgTable(
	"sync_entity_vectors",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		entityKind: text("entity_kind").$type<SyncMutationEntityKind>().notNull(),
		entityId: text("entity_id").notNull(),
		currentVersion: integer("current_version").notNull().default(1),
		vectorJson: jsonb("vector_json").$type<MutationVector>().notNull().default({}),
		lastMutationId: text("last_mutation_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgEntityKindIdIdx: uniqueIndex(
			"sync_entity_vectors_org_kind_entity_idx",
		).on(t.organizationId, t.entityKind, t.entityId),
	}),
);

export type SyncEntityVector = typeof syncEntityVectors.$inferSelect;
export type NewSyncEntityVector = typeof syncEntityVectors.$inferInsert;
