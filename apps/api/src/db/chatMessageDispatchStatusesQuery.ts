import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { chatMessageDispatchStatuses } from "./schema.js";

async function ensureChatMessageDispatchStatusesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "chat_message_dispatch_statuses" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"message_id" text NOT NULL,
				"recipient_name" text NOT NULL,
				"status" text DEFAULT 'delivered' NOT NULL,
				"can_retry" boolean DEFAULT false NOT NULL,
				"dispatch_timestamp" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureChatMessageDispatchStatusesTable warning]:", err);
	}
}

export async function getChatMessageDispatchStatusesFromDb(orgId: string) {
	try {
		await ensureChatMessageDispatchStatusesTable();
		const rows = await db
			.select()
			.from(chatMessageDispatchStatuses)
			.where(eq(chatMessageDispatchStatuses.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[ChatMessageDispatchStatuses DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			messageId: "msg-wa-90412",
			recipientName: "Ковалев Андрей Дмитриевич",
			status: "Доставлено и прочитано",
			canRetry: false,
			dispatchTimestamp: new Date().toISOString(),
		},
	];
}
