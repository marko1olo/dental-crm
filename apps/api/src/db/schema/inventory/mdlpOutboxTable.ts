import { sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organizations } from "../auth.js";

export const mdlpOutboxStatusEnum = [
	"pending",
	"in_flight",
	"completed",
	"failed",
	"dlq",
] as const;

export type MdlpOutboxStatus = (typeof mdlpOutboxStatusEnum)[number];

/**
 * mdlpOutboxTable — Transactional Outbox для государственной маркировки МДЛП «Честный Знак».
 * Гарантирует атомарную запись события списания внутри транзакции приёма врача у кресла (<15мс)
 * и асинхронную надёжную доставку в ЦРПТ фоновым демоном с блокировкой FOR UPDATE SKIP LOCKED.
 */
export const mdlpOutboxTable = pgTable(
	"mdlp_outbox",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		entityType: text("entity_type").notNull().default("visit"),
		entityId: uuid("entity_id"),
		documentType: text("document_type").notNull().default("10560"),
		idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull().unique(),
		payload: jsonb("payload").notNull(),
		status: text("status", { enum: mdlpOutboxStatusEnum })
			.notNull()
			.default("pending"),
		attempts: integer("attempts").notNull().default(0),
		maxAttempts: integer("max_attempts").notNull().default(5),
		nextRetryAt: timestamp("next_retry_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lockedAt: timestamp("locked_at", { withTimezone: true }),
		lockedBy: text("locked_by"),
		lastError: text("last_error"),
		crptOperationId: varchar("crpt_operation_id", { length: 128 }),
		crptResponsePayload: jsonb("crpt_response_payload"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		orgStatusIdx: index("mdlp_outbox_org_status_idx").on(
			table.organizationId,
			table.status,
		),
		statusRetryIdx: index("mdlp_outbox_status_retry_idx").on(
			table.status,
			table.nextRetryAt,
		),
	}),
);
