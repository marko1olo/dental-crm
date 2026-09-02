import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";
import { patients } from "./patients.js";

/**
 * copilot_sessions — Persistent PostgreSQL storage for AI Copilot dialogue sessions (SQUAD GAMMA).
 * Supports tenant isolation, active workspace view context, and compacted conversation summaries.
 */
export const copilotSessions = pgTable(
	"copilot_sessions",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
		patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
		activeView: text("active_view"),
		summary: text("summary"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("copilot_sessions_organization_id_idx").on(
			t.organizationId,
		),
		userIdIdx: index("copilot_sessions_user_id_idx").on(t.userId),
		patientIdIdx: index("copilot_sessions_patient_id_idx").on(t.patientId),
		orgUpdatedIdx: index("copilot_sessions_org_updated_idx").on(
			t.organizationId,
			t.updatedAt,
		),
	}),
);

/**
 * copilot_messages — Persistent normalized messages for Copilot sessions (SQUAD GAMMA).
 * Maintains exact role-based chat history, tool calls, and created timestamps.
 */
export const copilotMessages = pgTable(
	"copilot_messages",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => copilotSessions.id, { onDelete: "cascade" }),
		role: text("role").notNull(), // 'user' | 'assistant' | 'system' | 'tool'
		content: text("content").notNull(),
		toolCalls: jsonb("tool_calls"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		sessionIdIdx: index("copilot_messages_session_id_idx").on(t.sessionId),
		sessionCreatedIdx: index("copilot_messages_session_created_idx").on(
			t.sessionId,
			t.createdAt,
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

/**
 * copilot_hitl_cards — Persistent Human-in-the-Loop approval cards for incoming messages (WhatsApp, Telegram).
 * Retains drafted clinician replies, triage urgencies, and 1-click execution state in PostgreSQL.
 */
export const copilotHitlCards = pgTable(
	"copilot_hitl_cards",
	{
		id: text("id").primaryKey(), // approvalId
		organizationId: text("organization_id").notNull(),
		patientId: text("patient_id").notNull(),
		patientName: text("patient_name").notNull(),
		phone: text("phone").notNull(),
		intent: text("intent").notNull(),
		urgency: text("urgency").notNull().default("NORMAL"), // 'CRITICAL' | 'URGENT' | 'NORMAL'
		incomingSnippet: text("incoming_snippet").notNull(),
		draftReply: text("draft_reply").notNull(),
		channel: text("channel").notNull().default("whatsapp"),
		confidenceScore: text("confidence_score"),
		actionPrompt: text("action_prompt"),
		status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'sent'
		rejectionReason: text("rejection_reason"),
		category: text("category"),
		metadata: jsonb("metadata"),
		isWithin24HourWindow: text("is_within_24h_window"),
		templateRequired: text("template_required"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
	},
	(t) => ({
		organizationIdIdx: index("copilot_hitl_cards_org_idx").on(t.organizationId),
		statusIdx: index("copilot_hitl_cards_status_idx").on(t.status),
		createdIdx: index("copilot_hitl_cards_created_idx").on(t.createdAt),
	}),
);
