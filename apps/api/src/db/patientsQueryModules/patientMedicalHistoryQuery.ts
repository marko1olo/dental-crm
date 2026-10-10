import { and, eq } from "drizzle-orm";
import { patients as inMemoryPatients } from "../../sampleData.js";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { useInMemory } from "./patientSearchCore.js";
import type { PatientConsentRecordInput } from "./types.js";

export async function recordPatientConsentInDb(
	organizationId: string,
	patientId: string,
	input: PatientConsentRecordInput,
) {
	const now = input.signedAt ? new Date(input.signedAt) : new Date();
	const consentKind = input.code || input.templateKey || "informed_consent";

	if (useInMemory()) {
		const patient = inMemoryPatients.find(
			(p) => p.id === patientId && p.organizationId === organizationId,
		);
		if (!patient) return null;

		const currentProfile =
			(patient.administrativeProfile as Record<string, unknown> | null) || {};
		const currentConsentAudit =
			(currentProfile.consentSignatures as Record<string, unknown> | undefined) || {};
		const updatedAudit = {
			...currentConsentAudit,
			[consentKind]: {
				consentId: consentKind,
				...input,
				signedAtIso: now.toISOString(),
			},
		};
		patient.administrativeProfile = {
			...currentProfile,
			consentSignatures: updatedAudit,
			// biome-ignore lint/suspicious/noExplicitAny: in-memory profile
		} as any;
		patient.updatedAt = now.toISOString();

		return {
			success: true,
			consentId: consentKind,
			integrityHash: input.integrityHash,
			signedAtIso: now.toISOString(),
		};
	}

	const [patientRow] = await db
		.select()
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.id, patientId),
				eq(schema.patients.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!patientRow) return null;

	const currentProfile =
		(patientRow.administrativeProfile as Record<string, unknown> | null) || {};
	const currentConsentAudit =
		(currentProfile.consentSignatures as Record<string, unknown> | undefined) || {};
	const updatedAudit = {
		...currentConsentAudit,
		[consentKind]: {
			consentId: consentKind,
			...input,
			signedAtIso: now.toISOString(),
		},
	};

	await db.transaction(async (tx) => {
		// 1. Insert into patientConsents table
		await tx.insert(schema.patientConsents).values({
			organizationId,
			patientId,
			kind: consentKind,
			grantedAt: now,
		});

		// 2. Update patient's administrativeProfile.consentSignatures
		await tx
			.update(schema.patients)
			.set({
				administrativeProfile: {
					...currentProfile,
					consentSignatures: updatedAudit,
					// biome-ignore lint/suspicious/noExplicitAny: jsonb update
				} as any,
				updatedAt: now,
			})
			.where(
				and(
					eq(schema.patients.id, patientId),
					eq(schema.patients.organizationId, organizationId),
				),
			);
	});

	return {
		success: true,
		consentId: consentKind,
		integrityHash: input.integrityHash,
		signedAtIso: now.toISOString(),
	};
}
