import { and, eq } from "drizzle-orm";
import { db } from "../../../../db/client.js";
import { visitDiaries } from "../../../../db/schema.js";
import {
	applyEmergencySterilizationToDiaryTreatment,
	computeDiaryHashForTrayLink,
} from "../sterilizationHelpers.js";

export interface LinkDiaryTransactionParams {
	organizationId: string;
	visitId: string;
	trimmedBarcode: string;
	doctorUserId: string | null;
	isEmergencyAdmission: boolean;
	emergencyAdmissionNote: string;
}

export async function executeLinkDiaryTransaction(params: LinkDiaryTransactionParams) {
	const {
		organizationId,
		visitId,
		trimmedBarcode,
		doctorUserId,
		isEmergencyAdmission,
		emergencyAdmissionNote,
	} = params;

	return db.transaction(async (tx) => {
		const [existingDiary] = await tx
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, organizationId),
				),
			)
			.limit(1)
			.for("update");

		if (!existingDiary) {
			const initialTreatmentDesc = isEmergencyAdmission && emergencyAdmissionNote
				? applyEmergencySterilizationToDiaryTreatment(null, trimmedBarcode)
				: null;
			const initialHash = computeDiaryHashForTrayLink({
				visitId,
				patientId: null,
				anamnesis: null,
				statusLocalis: null,
				treatmentDescription: initialTreatmentDesc,
				diagnosisIcd10: null,
				diagnosisTooth: null,
				complications: null,
				comorbidities: null,
				instrumentTrayBarcode: trimmedBarcode,
			});

			const [autoCreatedDiary] = await tx
				.insert(visitDiaries)
				.values({
					organizationId,
					visitId,
					instrumentTrayBarcode: trimmedBarcode,
					draftAuthorId: doctorUserId,
					authorId: doctorUserId,
					doctorId: doctorUserId,
					treatmentDescription: initialTreatmentDesc,
					diaryHash: initialHash,
					isLocked: false,
					content: "",
				})
				.returning();

			if (!autoCreatedDiary) return { kind: "failed_insert" as const };
			return { kind: "ok" as const, diary: autoCreatedDiary };
		}

		if (existingDiary.isLocked) {
			return { kind: "locked_admitted" as const, diary: existingDiary };
		}

		const nextTreatmentDescription = isEmergencyAdmission && emergencyAdmissionNote
			? applyEmergencySterilizationToDiaryTreatment(
					existingDiary.treatmentDescription,
					trimmedBarcode,
				)
			: existingDiary.treatmentDescription;

		const nextHash = computeDiaryHashForTrayLink({
			visitId: existingDiary.visitId,
			patientId: existingDiary.patientId,
			anamnesis: existingDiary.anamnesis,
			statusLocalis: existingDiary.statusLocalis,
			treatmentDescription: nextTreatmentDescription,
			diagnosisIcd10: existingDiary.diagnosisIcd10,
			diagnosisTooth: existingDiary.diagnosisTooth,
			complications: existingDiary.complications,
			comorbidities: existingDiary.comorbidities,
			instrumentTrayBarcode: trimmedBarcode,
		});

		const [updated] = await tx
			.update(visitDiaries)
			.set({
				instrumentTrayBarcode: trimmedBarcode,
				treatmentDescription: nextTreatmentDescription,
				diaryHash: nextHash,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(visitDiaries.id, existingDiary.id),
					eq(visitDiaries.organizationId, organizationId),
					eq(visitDiaries.isLocked, false),
				),
			)
			.returning();

		if (!updated) {
			return { kind: "locked_admitted" as const, diary: existingDiary };
		}
		return { kind: "ok" as const, diary: updated };
	});
}
