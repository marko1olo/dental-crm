import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { messageTemplateCatalogs } from "./schema.js";

async function ensureMessageTemplateCatalogsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "message_template_catalogs" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"template_name" text NOT NULL,
				"channel_type" text DEFAULT 'sms' NOT NULL,
				"body_text" text NOT NULL,
				"dynamic_tags" text NOT NULL,
				"is_default" boolean DEFAULT true NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureMessageTemplateCatalogsTable warning]:", err);
	}
}

export async function getMessageTemplateCatalogsFromDb(orgId: string) {
	try {
		await ensureMessageTemplateCatalogsTable();
		const rows = await db
			.select()
			.from(messageTemplateCatalogs)
			.where(eq(messageTemplateCatalogs.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[MessageTemplateCatalogs DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			templateName: "Напоминание о приеме на завтра",
			channelType: "SMS / WhatsApp",
			bodyText: "Здравствуйте, {{patient_name}}! Напоминаем о вашем визите к {{doctor_name}} {{appointment_time}}.",
			dynamicTags: "{{patient_name}}, {{doctor_name}}, {{appointment_time}}",
			isDefault: true,
			createdAt: new Date().toISOString(),
		},
	];
}
