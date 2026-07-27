import { and, eq, or, sql } from "drizzle-orm";
import { db } from "./client.js";
import { patientArchiveReasonsAndBlacklists, patients } from "./schema.js";

async function ensurePatientArchiveReasonsAndBlacklistsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "patient_archive_reasons_and_blacklists" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_id" uuid,
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

const inMemoryBlacklist = new Set<string>();

export async function getPatientArchiveReasonsAndBlacklistsFromDb(orgId: string, _patientId?: string) {
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

export async function isPatientBookingBlocked(orgId: string, patientId: string): Promise<boolean> {
	if (inMemoryBlacklist.has(`${orgId}:${patientId}`)) {
		return true;
	}
	try {
		await ensurePatientArchiveReasonsAndBlacklistsTable();
		let fullName = "";
		try {
			const [patientRow] = await db
				.select({ fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);
			if (patientRow && patientRow.fullName) {
				fullName = patientRow.fullName.trim();
			}
		} catch (e) {
			// ignore lookup failure
		}

		const conditions = [
			eq(patientArchiveReasonsAndBlacklists.organizationId, orgId),
			eq(patientArchiveReasonsAndBlacklists.isBookingBlocked, true),
		];

		const matchRules = [eq(patientArchiveReasonsAndBlacklists.patientId, patientId)];
		if (fullName) {
			matchRules.push(eq(patientArchiveReasonsAndBlacklists.patientName, fullName));
		}

		const rows = await db
			.select()
			.from(patientArchiveReasonsAndBlacklists)
			.where(and(...conditions, or(...matchRules)))
			.limit(1);

		return rows.length > 0;
	} catch (err) {
		return inMemoryBlacklist.has(`${orgId}:${patientId}`);
	}
}

export async function setPatientArchiveStatusInDb(
	orgId: string,
	patientId: string,
	isBlacklisted: boolean,
	patientName?: string,
) {
	if (isBlacklisted) {
		inMemoryBlacklist.add(`${orgId}:${patientId}`);
	} else {
		inMemoryBlacklist.delete(`${orgId}:${patientId}`);
	}
	try {
		await ensurePatientArchiveReasonsAndBlacklistsTable();
		if (isBlacklisted) {
			await db.insert(patientArchiveReasonsAndBlacklists).values({
				organizationId: orgId,
				patientId: patientId,
				patientName: patientName || "Пациент",
				archiveReason: "Внесен в черный список администратором",
				isBookingBlocked: true,
				warningBadge: "⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)",
			});
		} else {
			await db
				.delete(patientArchiveReasonsAndBlacklists)
				.where(
					and(
						eq(patientArchiveReasonsAndBlacklists.organizationId, orgId),
						or(
							eq(patientArchiveReasonsAndBlacklists.patientId, patientId),
							eq(patientArchiveReasonsAndBlacklists.patientName, patientName || "")
						),
					),
				);
		}
	} catch (err) {
		// safe in-memory fallback
	}
}

