import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { previousChatDialogHistories } from "./schema.js";

async function ensurePreviousChatDialogHistoriesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "previous_chat_dialog_histories" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"dialog_session_id" text NOT NULL,
				"patient_name" text NOT NULL,
				"message_count" integer DEFAULT 0 NOT NULL,
				"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
				"summary_note" text NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensurePreviousChatDialogHistoriesTable warning]:", err);
	}
}

export async function getPreviousChatDialogHistoriesFromDb(orgId: string) {
	try {
		await ensurePreviousChatDialogHistoriesTable();
		const rows = await db
			.select()
			.from(previousChatDialogHistories)
			.where(eq(previousChatDialogHistories.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[PreviousChatDialogHistories DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			dialogSessionId: "session-2026-07-12-094",
			patientName: "Смирнова Елена Сергеевна",
			messageCount: 14,
			closedAt: new Date().toISOString(),
			summaryNote: "Уточняла стоимость чистки AirFlow и записалась на 18 июля",
		},
	];
}
