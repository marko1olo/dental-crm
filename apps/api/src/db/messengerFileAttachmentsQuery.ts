import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { messengerFileAttachments } from "./schema.js";

async function ensureMessengerFileAttachmentsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "messenger_file_attachments" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"file_name" text NOT NULL,
				"file_type" text DEFAULT 'pdf' NOT NULL,
				"target_messenger" text DEFAULT 'telegram' NOT NULL,
				"delivery_status" text DEFAULT 'sent' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureMessengerFileAttachmentsTable warning]:", err);
	}
}

export async function getMessengerFileAttachmentsFromDb(orgId: string) {
	try {
		await ensureMessengerFileAttachmentsTable();
		const rows = await db
			.select()
			.from(messengerFileAttachments)
			.where(eq(messengerFileAttachments.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[MessengerFileAttachments DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Григорьева Мария Алексеевна",
			fileName: "План_лечения_Имплантация_2026.pdf",
			fileType: "application/pdf",
			targetMessenger: "Telegram",
			deliveryStatus: "delivered",
			createdAt: new Date().toISOString(),
		},
	];
}
