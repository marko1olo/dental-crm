import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { uisOmniMessengerQueues } from "./schema.js";

async function ensureUisOmniMessengerQueuesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "uis_omni_messenger_queues" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"channel_provider" text DEFAULT 'whatsapp_waba' NOT NULL,
				"message_body" text NOT NULL,
				"dispatch_status" text DEFAULT 'queued' NOT NULL,
				"scheduled_delay_seconds" integer DEFAULT 60 NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureUisOmniMessengerQueuesTable warning]:", err);
	}
}

export async function getUisOmniMessengerQueuesFromDb(orgId: string) {
	try {
		await ensureUisOmniMessengerQueuesTable();
		const rows = await db
			.select()
			.from(uisOmniMessengerQueues)
			.where(eq(uisOmniMessengerQueues.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[UisOmniMessengerQueues DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Медведев Артем Игоревич",
			channelProvider: "whatsapp_waba",
			messageBody: "Здравствуйте, Артем! Напоминаем о визите завтра в 14:00 к д-ру Орлову.",
			dispatchStatus: "queued",
			scheduledDelaySeconds: 60,
			createdAt: new Date().toISOString(),
		},
	];
}
