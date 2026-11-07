import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.js";
import {
	electronicPrescriptionItems,
	electronicPrescriptions,
	patientDrugAllergies,
	patients,
} from "../../db/schema.js";
import { validatePrescriptionAllergiesAndSafety } from "../../services/clinical/prescriptionValidationService.js";
import type { createPrescriptionBodySchema } from "./prescriptionSchemas.js";

type PrescriptionInput = z.infer<typeof createPrescriptionBodySchema>;
type PatientRow = typeof patients.$inferSelect;

export async function auditPrescriptionDdiAndAllergies(
	orgId: string,
	patientId: string,
	proposedDrugNames: readonly string[],
	now: Date,
) {
	const allergies = await db
		.select()
		.from(patientDrugAllergies)
		.where(and(eq(patientDrugAllergies.organizationId, orgId), eq(patientDrugAllergies.patientId, patientId)));

	const [patientRow] = await db
		.select({ notes: patients.notes })
		.from(patients)
		.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
		.limit(1);

	const recent = await db
		.select({ innLatin: electronicPrescriptionItems.innLatin })
		.from(electronicPrescriptionItems)
		.innerJoin(electronicPrescriptions, eq(electronicPrescriptionItems.prescriptionId, electronicPrescriptions.id))
		.where(and(eq(electronicPrescriptions.organizationId, orgId), eq(electronicPrescriptions.patientId, patientId), eq(electronicPrescriptions.status, "issued")))
		.limit(20);

	const allAllergyTerms: string[] = [
		...allergies
			.map((a) => a.allergenGroup || a.drugInnLatin)
			.filter((s): s is string => typeof s === "string" && s.length > 0),
		...(patientRow?.notes ? [patientRow.notes] : []),
	];

	const validationResult = validatePrescriptionAllergiesAndSafety({
		proposedDrugs: proposedDrugNames,
		patientAllergies: allAllergyTerms,
		existingMedications: recent.map((p) => p.innLatin).filter((s): s is string => Boolean(s)),
	});

	const safetyAuditSnapshotJson = {
		evaluatedAt: now.toISOString(),
		safetyAuditPassed: validationResult.safetyAuditPassed,
		hasAllergyWarning: validationResult.hasAllergyWarning,
		hasDdiWarning: validationResult.hasDdiWarning,
		passiveWarnings: Array.from(validationResult.passiveWarnings),
		allergyWarnings: Array.from(validationResult.allergyWarnings),
		drugInteractions: Array.from(validationResult.drugInteractions),
		blockedPrescriptions: [], // Mandate 8e: Nothing is blocked!
		safeAlternativeRecommendations: Array.from(validationResult.safeAlternativeRecommendations),
		patientAllergies: allergies.map((a) => ({ allergenGroup: a.allergenGroup, drugInnLatin: a.drugInnLatin, reactionSeverity: a.reactionSeverity })),
		isDoctorAutonomyPermitted: true,
	};

	return {
		ddiAudit: { drugInteractions: validationResult.drugInteractions },
		safetyAuditSnapshotJson,
		safetyAuditPassed: validationResult.safetyAuditPassed,
		passiveWarnings: validationResult.passiveWarnings,
	};
}

export async function insertPrescriptionWithItems(
	orgId: string,
	patient: PatientRow,
	doctorId: string,
	doctorFullName: string,
	input: PrescriptionInput,
	series: string,
	num: string,
	expiresAt: Date,
	snapshot: Record<string, unknown>,
	passed: boolean,
	now: Date,
) {
	return await db.transaction(async (tx) => {
		const [presc] = await tx
			.insert(electronicPrescriptions)
			.values({
				organizationId: orgId,
				patientId: input.patientId,
				visitId: input.visitId || null,
				prescribingDoctorId: doctorId,
				prescriptionSeries: series,
				prescriptionNumber: num,
				formType: input.formType,
				status: input.ukepSignature?.cryptoSignaturePkcs7 ? "signed" : "issued",
				validityPeriod: input.validityPeriod,
				isSpecialChronicIndication: input.isSpecialChronicIndication,
				chronicDispenseFrequencyNotes: input.chronicDispenseFrequencyNotes || null,
				patientFullName: patient.fullName,
				patientBirthDate: patient.birthDate || "1990-01-01",
				patientCardNumber: `043/у-${patient.id.slice(-6).toUpperCase()}`,
				doctorFullName,
				clinicalDiagnosisMkb10: input.clinicalDiagnosisMkb10 || null,
				clinicalDiagnosisDescription: input.clinicalDiagnosisDescription || null,
				safetyAuditPassed: passed,
				safetyAuditSnapshotJson: snapshot,
				cryptoSignaturePkcs7: input.ukepSignature?.cryptoSignaturePkcs7 || null,
				issuedAt: now,
				expiresAt,
			})
			.returning();

		if (!presc) throw new Error("Не удалось сохранить электронный рецепт в базе данных.");

		if (input.items.length > 0) {
			const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			await tx.insert(electronicPrescriptionItems).values(
				input.items.map((item, index) => ({
					organizationId: orgId,
					prescriptionId: presc.id,
					catalogDrugId: item.catalogDrugId && uuidRx.test(item.catalogDrugId) ? item.catalogDrugId : null,
					itemIndex: index + 1,
					innLatin: item.innLatin,
					dosageFormLatin: item.dosageFormLatin,
					dosageDoseConcentration: item.dosageDoseConcentration,
					dispenseInstructionLatin: item.dispenseInstructionLatin,
					signatureDirectionRussian: item.signatureDirectionRussian,
					quantityPackages: item.quantityPackages,
					durationDays: item.durationDays,
					frequencyTimesPerDay: item.frequencyTimesPerDay,
					mealRelation: item.mealRelation,
				})),
			);
		}
		return presc;
	});
}
