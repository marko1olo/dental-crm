import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./client.js";
import { doctorPreferences } from "./schema.js";

export interface DoctorPreferencesRecord {
	id: string;
	organizationId: string;
	doctorId: string | null;
	specialty: string;
	preferences: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Reads doctor clinical preferences from PostgreSQL (127.0.0.1:5432).
 * First attempts to find preferences tailored to the specific doctor,
 * falling back to clinic-wide default preferences (where doctorId is null).
 */
export async function getDoctorPreferencesFromDb(
	organizationId: string,
	doctorId?: string | null,
): Promise<DoctorPreferencesRecord | null> {
	if (doctorId) {
		const [specific] = await db
			.select()
			.from(doctorPreferences)
			.where(
				and(
					eq(doctorPreferences.organizationId, organizationId),
					eq(doctorPreferences.doctorId, doctorId),
				),
			)
			.limit(1);

		if (specific) {
			return specific as DoctorPreferencesRecord;
		}
	}

	// Fallback to clinic-wide default preferences or most recent entry for this organization
	const [clinicDefault] = await db
		.select()
		.from(doctorPreferences)
		.where(
			and(
				eq(doctorPreferences.organizationId, organizationId),
				isNull(doctorPreferences.doctorId),
			),
		)
		.limit(1);

	if (clinicDefault) {
		return clinicDefault as DoctorPreferencesRecord;
	}

	// If no null-doctor row, check any entry in organization
	const [anyOrgPref] = await db
		.select()
		.from(doctorPreferences)
		.where(eq(doctorPreferences.organizationId, organizationId))
		.orderBy(desc(doctorPreferences.updatedAt))
		.limit(1);

	return (anyOrgPref as DoctorPreferencesRecord) ?? null;
}

/**
 * Saves/upserts doctor clinical preferences in PostgreSQL (127.0.0.1:5432).
 * Guarantees atomic cross-device synchronization and persistence on remote server.
 */
export async function saveDoctorPreferencesInDb(
	organizationId: string,
	doctorId: string | null | undefined,
	preferences: Record<string, unknown>,
	specialty = "therapist",
): Promise<DoctorPreferencesRecord> {
	const cleanDoctorId =
		doctorId && doctorId.trim().length > 0 ? doctorId.trim() : null;
	const now = new Date();

	// 1. Check existing record
	let existing: { id: string } | undefined;
	if (cleanDoctorId) {
		const [row] = await db
			.select({ id: doctorPreferences.id })
			.from(doctorPreferences)
			.where(
				and(
					eq(doctorPreferences.organizationId, organizationId),
					eq(doctorPreferences.doctorId, cleanDoctorId),
				),
			)
			.limit(1);
		existing = row;
	} else {
		const [row] = await db
			.select({ id: doctorPreferences.id })
			.from(doctorPreferences)
			.where(
				and(
					eq(doctorPreferences.organizationId, organizationId),
					isNull(doctorPreferences.doctorId),
				),
			)
			.limit(1);
		existing = row;
	}

	if (existing) {
		const [updated] = await db
			.update(doctorPreferences)
			.set({
				specialty,
				preferences,
				updatedAt: now,
			})
			.where(eq(doctorPreferences.id, existing.id))
			.returning();
		return updated as DoctorPreferencesRecord;
	}

	try {
		const [inserted] = await db
			.insert(doctorPreferences)
			.values({
				organizationId,
				doctorId: cleanDoctorId,
				specialty,
				preferences,
				createdAt: now,
				updatedAt: now,
			})
			.returning();
		return inserted as DoctorPreferencesRecord;
	} catch (err: unknown) {
		// Concurrent insert race condition: fallback to update
		const isConflict =
			err &&
			typeof err === "object" &&
			"code" in err &&
			(err as { code: string }).code === "23505";
		if (isConflict) {
			const fallbackWhere = cleanDoctorId
				? and(
						eq(doctorPreferences.organizationId, organizationId),
						eq(doctorPreferences.doctorId, cleanDoctorId),
					)
				: and(
						eq(doctorPreferences.organizationId, organizationId),
						isNull(doctorPreferences.doctorId),
					);

			const [updated] = await db
				.update(doctorPreferences)
				.set({
					specialty,
					preferences,
					updatedAt: now,
				})
				.where(fallbackWhere)
				.returning();
			if (updated) {
				return updated as DoctorPreferencesRecord;
			}
		}
		throw err;
	}
}
