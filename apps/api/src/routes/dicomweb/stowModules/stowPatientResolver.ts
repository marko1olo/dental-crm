import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import { cleanDicomPatientName, UUID_SHAPE } from "../../dicomwebHelpers.js";

export async function resolvePatientForStow(options: {
	organizationId: string;
	explicitPatientId?: string | null;
	dicomPatientId?: string | null;
	dicomPatientName?: string | null;
	dicomBirthDate?: string | null;
}): Promise<{
	patientId: string;
	matchMethod: "explicit" | "dicom_patient_id" | "dicom_name_exact" | "dicom_name_birthdate";
} | null> {
	const { organizationId, explicitPatientId, dicomPatientId, dicomPatientName, dicomBirthDate } = options;

	// 1. Explicit patientId provided via query (?patientId=...) or headers (X-Patient-ID)
	if (explicitPatientId) {
		const trimmedId = explicitPatientId.trim();
		if (UUID_SHAPE.test(trimmedId)) {
			const [found] = await db
				.select({ id: schema.patients.id, mergedIntoPatientId: schema.patients.mergedIntoPatientId })
				.from(schema.patients)
				.where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, trimmedId)))
				.limit(1);
			if (found) {
				return { patientId: found.mergedIntoPatientId ?? found.id, matchMethod: "explicit" };
			}
		}
		return null;
	}

	// 2. DICOM tag PatientID (0010,0020)
	if (dicomPatientId) {
		const trimmedPatientId = dicomPatientId.trim();
		if (UUID_SHAPE.test(trimmedPatientId)) {
			const [found] = await db
				.select({ id: schema.patients.id, mergedIntoPatientId: schema.patients.mergedIntoPatientId })
				.from(schema.patients)
				.where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, trimmedPatientId)))
				.limit(1);
			if (found) {
				return { patientId: found.mergedIntoPatientId ?? found.id, matchMethod: "dicom_patient_id" };
			}
		}
	}

	// 3. DICOM tag PatientName (0010,0010)
	const cleanedName = cleanDicomPatientName(dicomPatientName);
	if (cleanedName) {
		const candidates = await db
			.select({
				id: schema.patients.id,
				fullName: schema.patients.fullName,
				birthDate: schema.patients.birthDate,
				mergedIntoPatientId: schema.patients.mergedIntoPatientId,
			})
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					sql`lower(trim(${schema.patients.fullName})) = lower(trim(${cleanedName}))`,
				),
			);

		if (candidates.length === 1) {
			const candidate = candidates[0]!;
			const dDate = (dicomBirthDate ?? "").replace(/\D/g, "");
			const pDate = (candidate.birthDate ?? "").replace(/\D/g, "");
			if (dDate && pDate && dDate !== pDate) return null;
			return { patientId: candidate.mergedIntoPatientId ?? candidate.id, matchMethod: "dicom_name_exact" };
		}

		if (candidates.length > 1 && dicomBirthDate) {
			const dDate = dicomBirthDate.replace(/\D/g, "");
			const matching = candidates.filter((c) => (c.birthDate ?? "").replace(/\D/g, "") === dDate);
			if (matching.length === 1) {
				return { patientId: matching[0]!.mergedIntoPatientId ?? matching[0]!.id, matchMethod: "dicom_name_birthdate" };
			}
		}
	}

	return null;
}
