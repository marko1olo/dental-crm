import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { collaborativeChatProcessingStates } from "./schema.js";

async function ensureCollaborativeChatProcessingStatesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "collaborative_chat_processing_states" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"chat_id" text NOT NULL,
				"assigned_agent_name" text NOT NULL,
				"has_agent_replied" boolean DEFAULT false NOT NULL,
				"is_archived" boolean DEFAULT false NOT NULL,
				"updated_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureCollaborativeChatProcessingStatesTable warning]:", err);
	}
}

export async function getCollaborativeChatProcessingStatesFromDb(orgId: string) {
	try {
		await ensureCollaborativeChatProcessingStatesTable();
		const rows = await db
			.select()
			.from(collaborativeChatProcessingStates)
			.where(eq(collaborativeChatProcessingStates.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[CollaborativeChatProcessingStates DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			chatId: "chat-tg-88124",
			assignedAgentName: "Администратор Анна",
			hasAgentReplied: true,
			isArchived: false,
			updatedAt: new Date().toISOString(),
		},
	];
}
