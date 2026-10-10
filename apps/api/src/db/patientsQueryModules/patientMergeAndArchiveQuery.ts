import type { CreatePatientInput, Patient } from "@dental/shared";
import { eq, sql } from "drizzle-orm";
import { canonicalizeHomoglyphs } from "../../services/patients/duplicateDetection.js";
import { db } from "../client.js";
import * as schema from "../schema.js";
import {
	createPatientInDb,
	getPatientsFromDb,
	rowToPatient,
	useInMemory,
} from "./patientSearchCore.js";
import type { CreatePatientSafeResult } from "./types.js";

export async function createPatientSafeInDb(
	organizationId: string,
	input: CreatePatientInput,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	duplicateCheckFn: (patients: any[], input: CreatePatientInput) => any,
): Promise<CreatePatientSafeResult> {
	if (useInMemory()) {
		const dbPatients = await getPatientsFromDb(organizationId);
		const duplicate = duplicateCheckFn(dbPatients, input);
		if (duplicate) return { type: "duplicate", duplicate };
		return {
			type: "success",
			patient: await createPatientInDb(organizationId, input),
		};
	}

	return await db.transaction(async (tx) => {
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

		const snilsDigits = (
			(input as unknown as { snils?: string | null })?.snils ??
			(input.administrativeProfile as Record<string, unknown> | null | undefined)?.snils ??
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

		const rawPatients = await tx
			.select()
			.from(schema.patients)
			.where(eq(schema.patients.organizationId, organizationId));

		const duplicate = duplicateCheckFn(rawPatients, input);
		if (duplicate) return { type: "duplicate", duplicate };

		const [created] = await tx
			.insert(schema.patients)
			.values({
				organizationId,
				fullName: input.fullName,
				birthDate: input.birthDate ?? null,
				phone: input.phone ?? null,
				email: input.email ?? null,
				notes: input.notes ?? null,
				administrativeProfile: (input.administrativeProfile as any) ?? null,
			})
			.returning();

		if (!created) throw new Error("Не удалось создать карточку пациента в базе данных");

		return { type: "success", patient: rowToPatient(created, 0) };
	});
}
