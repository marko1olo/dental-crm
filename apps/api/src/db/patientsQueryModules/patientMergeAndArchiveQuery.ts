import type { CreatePatientInput, Patient, PatientAdministrativeProfile } from "@dental/shared";
import { eq, sql } from "drizzle-orm";
import {
	canonicalizeHomoglyphs,
	type PatientDuplicateCandidate,
} from "../../services/patients/duplicateDetection.js";
import { withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import {
	createPatientInDb,
	getPatientsFromDb,
	useInMemory,
} from "./patientSearchCore.js";
import type { CreatePatientSafeResult } from "./types.js";

export async function createPatientSafeInDb(
	organizationId: string,
	input: CreatePatientInput,
	duplicateCheckFn: (patients: readonly PatientDuplicateCandidate[], input: CreatePatientInput) => unknown,
	options?: { allowDuplicate?: boolean },
): Promise<CreatePatientSafeResult> {
	if (useInMemory()) {
		if (!options?.allowDuplicate) {
			const dbPatients = await getPatientsFromDb(organizationId);
			const duplicate = duplicateCheckFn(dbPatients, input);
			if (duplicate) return { type: "duplicate", duplicate };
		}
		return {
			type: "success",
			patient: await createPatientInDb(organizationId, input),
		};
	}

	return await withTenantCtx(organizationId, async (tx) => {
		const phoneDigits = (input.phone ?? "").replace(/\D/g, "");
		const phoneKey = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";
		const normalizedName = canonicalizeHomoglyphs(input.fullName ?? "")
			.toLowerCase()
			.replace(/ё/g, "е")
			.replace(/-/g, " ")
			.replace(/[^\p{L}\s]/gu, "")
			.split(/\s+/)
			.filter(Boolean)
			.sort()
			.join(" ");

		const directSnils =
			"snils" in input &&
			typeof (input as CreatePatientInput & { snils?: string | null }).snils === "string"
				? (input as CreatePatientInput & { snils?: string | null }).snils
				: null;
		const snilsDigits = (
			directSnils ??
			input.administrativeProfile?.snils ??
			""
		)
			.toString()
			.replace(/\D/g, "");

		if (phoneKey) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, 'phone', ${phoneKey}::text)))`,
			);
		}
		if (snilsDigits.length >= 11) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, 'snils', ${snilsDigits}::text)))`,
			);
		}
		if (normalizedName) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, 'name', ${normalizedName}::text)))`,
			);
		}
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, ${phoneKey}::text, ${normalizedName}::text)))`,
		);

		if (!options?.allowDuplicate) {
			const rawPatients = await tx
				.select()
				.from(schema.patients)
				.where(eq(schema.patients.organizationId, organizationId));

			const duplicate = duplicateCheckFn(rawPatients, input);
			if (duplicate) return { type: "duplicate", duplicate };
		}

		const created = await createPatientInDb(organizationId, input, tx);
		return { type: "success", patient: created };
	});
}
