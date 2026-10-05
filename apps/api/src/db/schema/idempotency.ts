/**
 * idempotency.ts — PostgreSQL Schema for Totipotency & Idempotency Keys.
 *
 * Implements strict exactly-once semantics, prevents double spend in billing/cashiering,
 * prevents duplicate inventory write-offs, and guarantees deterministic idempotent replays.
 *
 * Table: `idempotency_keys`
 * Columns: (clinic_id, key, status, response_body, response_code, created_at, locked_at)
 */

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

export const idempotencyKeys = pgTable(
	"idempotency_keys",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		clinicId: uuid("clinic_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		key: text("key").notNull(),
		status: text("status")
			.$type<"in_flight" | "completed" | "failed">()
			.notNull()
			.default("in_flight"),
		payloadHash: text("payload_hash"),
		responseBody: jsonb("response_body").$type<Record<string, unknown> | null>(),
		responseCode: integer("response_code").notNull().default(200),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lockedAt: timestamp("locked_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		clinicKeyIdx: uniqueIndex("idempotency_keys_clinic_key_idx").on(
			t.clinicId,
			t.key,
		),
		clinicLockedAtIdx: index("idempotency_keys_clinic_locked_at_idx").on(
			t.clinicId,
			t.lockedAt,
		),
	}),
);

export type IdempotencyKeyRecord = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKeyRecord = typeof idempotencyKeys.$inferInsert;
