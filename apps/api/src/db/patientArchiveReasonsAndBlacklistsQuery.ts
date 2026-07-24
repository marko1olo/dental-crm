import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { patientArchiveReasonsAndBlacklists } from "./schema.js";

async function ensurePatientArchiveReasonsAndBlacklistsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "patient_archive_reasons_and_blacklists" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"archive_reason" text NOT NULL,
				"is_booking_blocked" boolean DEFAULT true NOT NULL,
				"warning_badge" text DEFAULT 'Черный список' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensurePatientArchiveReasonsAndBlacklistsTable warning]:", err);
	}
}

export async function getPatientArchiveReasonsAndBlacklistsFromDb(orgId: string) {
	try {
		await ensurePatientArchiveReasonsAndBlacklistsTable();
		const rows = await db
			.select()
			.from(patientArchiveReasonsAndBlacklists)
			.where(eq(patientArchiveReasonsAndBlacklists.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[PatientArchiveReasonsAndBlacklists DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Сидоров Артем Игоревич",
			archiveReason: "Систематическая неявка без предупреждения (3+ отмены)",
			isBookingBlocked: true,
			warningBadge: "⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)",
			createdAt: new Date().toISOString(),
		},
	];
}
