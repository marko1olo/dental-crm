import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { clinics, organizations, users } from "./auth.js";

/**
 * copilot_sessions — Persistent storage for AI Copilot dialogue sessions.
 * Ensures session survival across server restarts and deploys, with 152-FZ redaction state.
 */
export const copilotSessions = pgTable(
	"copilot_sessions",
	{
		id: text("id").primaryKey(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
		clinicId: uuid("clinic_id").references(() => clinics.id, { onDelete: "set null" }),
		history: jsonb("history").notNull().default(sql`'[]'::jsonb`),
		redactorState: jsonb("redactor_state").notNull().default(sql`'{}'::jsonb`),
		metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	},
	(t) => ({
		organizationIdIdx: index("copilot_sessions_organization_id_idx").on(
			t.organizationId,
		),
		userIdIdx: index("copilot_sessions_user_id_idx").on(t.userId),
		expiresAtIdx: index("copilot_sessions_expires_at_idx").on(t.expiresAt),
		orgUpdatedIdx: index("copilot_sessions_org_updated_idx").on(
			t.organizationId,
			t.updatedAt,
		),
	}),
);

/**
 * copilot_pending_actions — Persistent human-in-the-loop action confirmations.
 * Retains pending write/destructive tool invocations across restarts until confirmed or expired.
 */
export const copilotPendingActions = pgTable(
	"copilot_pending_actions",
	{
		id: text("id").primaryKey(), // callId (e.g. call_act_123)
		sessionId: text("session_id").notNull(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
		toolName: text("tool_name").notNull(),
		arguments: jsonb("arguments").notNull().default(sql`'{}'::jsonb`),
		status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'rejected' | 'expired'
		rejectionReason: text("rejection_reason"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
	},
	(t) => ({
		organizationIdIdx: index("copilot_pending_actions_org_id_idx").on(
			t.organizationId,
		),
		sessionIdIdx: index("copilot_pending_actions_session_id_idx").on(
			t.sessionId,
		),
		statusIdx: index("copilot_pending_actions_status_idx").on(t.status),
		expiresAtIdx: index("copilot_pending_actions_expires_at_idx").on(t.expiresAt),
	}),
);
