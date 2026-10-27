import { and, eq } from "drizzle-orm";
import { clinicalAuditLogs, visits } from "../../../db/schema.js";
import { buildEmkDiagnosisText } from "./diaryHashCalculator.js";
import type { DiaryDbTransaction } from "./signatureTypeVerifier.js";

/**
 * Синхронизация SOAP-полей дневника в visits ЭМК.
 */
export async function syncVisitEmkFromDiarySoap(
	executor: Pick<DiaryDbTransaction, "update">,
	params: {
		visitId: string;
		organizationId: string;
		anamnesis?: string | null;
		statusLocalis?: string | null;
		diagnosisIcd10?: string | null;
		diagnosisTooth?: string | null;
		treatmentDescription?: string | null;
	},
): Promise<void> {
	const visitId = typeof params.visitId === "string" ? params.visitId.trim() : "";
	if (!visitId) return;

	const patch: {
		anamnesis?: string;
		objectiveStatus?: string;
		diagnosis?: string;
		treatmentPlan?: string;
		updatedAt: Date;
	} = { updatedAt: new Date() };

	const anamnesis = (params.anamnesis ?? "").trim();
	if (anamnesis) patch.anamnesis = anamnesis;

	const objective = (params.statusLocalis ?? "").trim();
	if (objective) patch.objectiveStatus = objective;

	const diagnosisText = buildEmkDiagnosisText(params.diagnosisIcd10, params.diagnosisTooth);
	if (diagnosisText) patch.diagnosis = diagnosisText;

	const treatment = (params.treatmentDescription ?? "").trim();
	if (treatment) patch.treatmentPlan = treatment;

	if (
		patch.anamnesis === undefined &&
		patch.objectiveStatus === undefined &&
		patch.diagnosis === undefined &&
		patch.treatmentPlan === undefined
	) {
		return;
	}

	await executor
		.update(visits)
		.set(patch)
		.where(and(eq(visits.id, visitId), eq(visits.organizationId, params.organizationId)));
}

/**
 * Атомарная фиксация статуса визита 'signed'.
 */
export async function markVisitSigned(
	tx: Pick<DiaryDbTransaction, "update">,
	params: { visitId: string; organizationId: string; lockedAt: Date },
): Promise<void> {
	await tx
		.update(visits)
		.set({ status: "signed", signedAt: params.lockedAt, updatedAt: params.lockedAt })
		.where(
			and(
				eq(visits.id, params.visitId),
				eq(visits.organizationId, params.organizationId),
				eq(visits.status, "draft"),
			),
		);
}

/**
 * Запись юридического следа в клинический журнал аудита.
 */
export async function recordSigningAuditLog(
	tx: Pick<DiaryDbTransaction, "insert">,
	params: {
		organizationId: string;
		patientId: string | null;
		diaryId: string;
		userId: string | null;
		action?: "VISIT_SIGNED_AND_LOCKED" | "VISIT_DIARY_REVISED";
	},
): Promise<string | null> {
	const [auditLog] = await tx
		.insert(clinicalAuditLogs)
		.values({
			organizationId: params.organizationId,
			patientId: params.patientId,
			action: params.action ?? "VISIT_SIGNED_AND_LOCKED",
			userId: params.userId,
			entityType: "visit_diary",
			entityId: params.diaryId,
		})
		.returning({ id: clinicalAuditLogs.id });
	return auditLog?.id ?? null;
}
