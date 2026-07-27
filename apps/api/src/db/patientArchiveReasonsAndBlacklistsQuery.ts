import { and, eq, or } from "drizzle-orm";
import { db } from "./client.js";
import { patientArchiveReasonsAndBlacklists, patients } from "./schema.js";

const inMemoryBlacklist = new Set<string>();

export async function getPatientArchiveReasonsAndBlacklistsFromDb(orgId: string, _patientId?: string) {
	return db
		.select()
		.from(patientArchiveReasonsAndBlacklists)
		.where(eq(patientArchiveReasonsAndBlacklists.organizationId, orgId));
}

export async function isPatientBookingBlocked(orgId: string, patientId: string): Promise<boolean> {
	if (inMemoryBlacklist.has(`${orgId}:${patientId}`)) {
		return true;
	}
	try {
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

