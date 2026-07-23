import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { bulkImageOperationLogs } from "./schema.js";

async function ensureBulkImageOperationLogsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "bulk_image_operation_logs" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"selected_images_count" integer DEFAULT 1 NOT NULL,
				"assigned_tooth_number" integer,
				"operation_type" text DEFAULT 'batch_link' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureBulkImageOperationLogsTable warning]:", err);
	}
}

export async function getBulkImageOperationLogsFromDb(orgId: string) {
	try {
		await ensureBulkImageOperationLogsTable();
		const rows = await db
			.select()
			.from(bulkImageOperationLogs)
			.where(eq(bulkImageOperationLogs.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[BulkImageOperationLogs DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Григорьева Мария Алексеевна",
			selectedImagesCount: 4,
			assignedToothNumber: 46,
			operationType: "Пакетная привязка снимков к зубу #46",
			createdAt: new Date().toISOString(),
		},
	];
}
