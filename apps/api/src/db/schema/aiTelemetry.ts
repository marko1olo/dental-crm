import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";

/**
 * ai_token_telemetry — Persistent token and cost audit trail for AI Copilot, Dictation & Clinical Agent calls.
 * Enforces per-organization budget tracking, latency telemetry, error audits, and kopeck-exact financial accounting.
 */
export const aiTokenTelemetry = pgTable(
	"ai_token_telemetry",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
		sessionId: text("session_id"),
		modelName: text("model_name").notNull(),
		provider: text("provider").notNull(),
		promptTokens: integer("prompt_tokens").notNull().default(0),
		completionTokens: integer("completion_tokens").notNull().default(0),
		totalTokens: integer("total_tokens").notNull().default(0),
		estimatedCostKopecks: integer("estimated_cost_kopecks").notNull().default(0),
		latencyMs: integer("latency_ms"),
		status: text("status").notNull().default("success"), // 'success' | 'error'
		errorCode: text("error_code"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdIdx: index("ai_token_telemetry_org_id_idx").on(t.organizationId),
		createdAtIdx: index("ai_token_telemetry_created_at_idx").on(t.createdAt),
		userIdIdx: index("ai_token_telemetry_user_id_idx").on(t.userId),
		orgCreatedIdx: index("ai_token_telemetry_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
		sessionIdIdx: index("ai_token_telemetry_session_id_idx").on(t.sessionId),
	}),
);

export type AiTokenTelemetry = typeof aiTokenTelemetry.$inferSelect;
export type NewAiTokenTelemetry = typeof aiTokenTelemetry.$inferInsert;
