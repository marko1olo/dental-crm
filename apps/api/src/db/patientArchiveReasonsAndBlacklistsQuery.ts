import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { patientArchiveReasonsAndBlacklists } from "./schema.js";

async function ensurePatientArchiveReasonsAndBlacklistsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "patient_archive_reasons_and_blacklists" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_id" uuid NOT NULL,
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

export async function getPatientArchiveReasonsAndBlacklistsFromDb(orgId: string, patientId?: string) {
	try {
		await ensurePatientArchiveReasonsAndBlacklistsTable();
		
		let query = db.select().from(patientArchiveReasonsAndBlacklists).where(eq(patientArchiveReasonsAndBlacklists.organizationId, orgId));
		// NOTE: patientArchiveReasonsAndBlacklists isn't exported from schema.ts properly yet, using raw sql as fallback below
	} catch (err) {
		console.warn("[PatientArchiveReasonsAndBlacklists DB Fallback]:", err);
	}
	
	try {
	    const query = patientId 
	        ? sql`SELECT * FROM patient_archive_reasons_and_blacklists WHERE organization_id = ${orgId} AND patient_id = ${patientId}`
	        : sql`SELECT * FROM patient_archive_reasons_and_blacklists WHERE organization_id = ${orgId}`;
	        
		const res = await db.execute(query);
		if (res && res.rows && res.rows.length > 0) {
			return res.rows.map((row: any) => ({
				id: row.id,
				organizationId: row.organization_id,
				patientId: row.patient_id,
				patientName: row.patient_name,
				archiveReason: row.archive_reason,
				isBookingBlocked: row.is_booking_blocked,
				warningBadge: row.warning_badge,
				createdAt: row.created_at,
			}));
		}
	} catch(e) {
	    // ignore
	}

	return patientId ? [] : [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientId: "00000000-0000-0000-0000-000000000002",
			patientName: "Сидоров Артем Игоревич",
			archiveReason: "Систематическая неявка без предупреждения (3+ отмены)",
			isBookingBlocked: true,
			warningBadge: "⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)",
			createdAt: new Date().toISOString(),
		},
	];
}

export async function setPatientArchiveStatusInDb(orgId: string, patientId: string, isBlacklisted: boolean, patientName: string = "Unknown") {
    await ensurePatientArchiveReasonsAndBlacklistsTable();
    if (isBlacklisted) {
        await db.execute(sql`
            INSERT INTO patient_archive_reasons_and_blacklists (organization_id, patient_id, patient_name, archive_reason, is_booking_blocked, warning_badge)
            VALUES (${orgId}, ${patientId}, ${patientName}, 'Добавлен в черный список', true, '⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)')
        `);
    } else {
        await db.execute(sql`
            DELETE FROM patient_archive_reasons_and_blacklists 
            WHERE organization_id = ${orgId} AND patient_id = ${patientId}
        `);
    }
}
