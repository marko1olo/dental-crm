import { and, eq } from "drizzle-orm";
import { visitDiaries, visitDiaryRevisions } from "../../../db/schema.js";
import { computeDiaryHash } from "./diaryHashCalculator.js";
import { DiarySigningError, type DiaryDbTransaction } from "./signatureTypeVerifier.js";
import { recordSigningAuditLog, syncVisitEmkFromDiarySoap } from "./diaryVisitStateSynchronizer.js";

export interface DiaryRevisionResult {
	diaryId: string;
	hash: string;
	version: number;
	revisedAt: Date;
	auditLogId: string | null;
}

/**
 * Церемония внесения исправления в подписанный дневник («Исправленному верить»).
 * Врач имеет право на ошибку и свободно вносит поправки с версионированием (Мандат 8e).
 */
export async function runDiaryRevisionCeremony(
	tx: DiaryDbTransaction,
	params: {
		diaryId: string; organizationId: string; userId: string | null;
		anamnesis?: string | null; statusLocalis?: string | null;
		diagnosisIcd10?: string | null; diagnosisTooth?: string | null;
		treatmentDescription?: string | null; complications?: string | null;
		comorbidities?: string | null; instrumentTrayBarcode?: string | null;
		revisionReason?: string | null;
	},
): Promise<DiaryRevisionResult> {
	const { diaryId, organizationId, userId } = params;

	const [existing] = await tx
		.select()
		.from(visitDiaries)
		.where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, organizationId)))
		.limit(1)
		.for("update");

	if (!existing) throw new DiarySigningError("NotFound", "Дневник этого приёма не найден в клинике.");
	if (!existing.isLocked) throw new DiarySigningError("NotSaved", "Дневник ещё не подписан — сохраняйте через черновик.");

	const nextTrayBarcode =
		params.instrumentTrayBarcode !== undefined
			? (params.instrumentTrayBarcode?.trim() ?? null)
			: existing.instrumentTrayBarcode;

	const newHash = computeDiaryHash(
		existing.visitId, existing.patientId ?? "",
		params.anamnesis !== undefined ? params.anamnesis : existing.anamnesis,
		params.statusLocalis !== undefined ? params.statusLocalis : existing.statusLocalis,
		params.treatmentDescription !== undefined ? params.treatmentDescription : existing.treatmentDescription,
		params.diagnosisIcd10 !== undefined ? params.diagnosisIcd10 : existing.diagnosisIcd10,
		params.diagnosisTooth !== undefined ? params.diagnosisTooth : existing.diagnosisTooth,
		params.complications !== undefined ? params.complications : existing.complications,
		params.comorbidities !== undefined ? params.comorbidities : existing.comorbidities,
		nextTrayBarcode,
	);

	const priorVersion = existing.version ?? 1;
	const nextVersion = priorVersion + 1;
	const revisedAt = new Date();
	const reason = (params.revisionReason ?? "").trim() || "Исправленному верить";

	const updatedRows = await tx
		.update(visitDiaries)
		.set({
			anamnesis: params.anamnesis !== undefined ? params.anamnesis : existing.anamnesis,
			statusLocalis: params.statusLocalis !== undefined ? params.statusLocalis : existing.statusLocalis,
			diagnosisIcd10: params.diagnosisIcd10 !== undefined ? params.diagnosisIcd10 : existing.diagnosisIcd10,
			diagnosisTooth: params.diagnosisTooth !== undefined ? params.diagnosisTooth : existing.diagnosisTooth,
			treatmentDescription: params.treatmentDescription !== undefined ? params.treatmentDescription : existing.treatmentDescription,
			complications: params.complications !== undefined ? params.complications : existing.complications,
			comorbidities: params.comorbidities !== undefined ? params.comorbidities : existing.comorbidities,
			instrumentTrayBarcode: nextTrayBarcode, diaryHash: newHash, cryptoSignaturePkcs7: null,
			version: nextVersion, updatedAt: revisedAt,
		})
		.where(
			and(
				eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, organizationId),
				eq(visitDiaries.isLocked, true), eq(visitDiaries.version, priorVersion),
			),
		)
		.returning({ id: visitDiaries.id });

	if (updatedRows.length === 0) {
		throw new DiarySigningError("AlreadyLocked", "Конфликт версий: дневник был изменен в параллельной сессии.");
	}

	await tx.insert(visitDiaryRevisions).values({
		organizationId, diaryId, revisionReason: reason,
		previousAnamnesis: existing.anamnesis, previousStatusLocalis: existing.statusLocalis,
		previousDiagnosisIcd10: existing.diagnosisIcd10, previousDiagnosisTooth: existing.diagnosisTooth,
		previousTreatmentDescription: existing.treatmentDescription, previousComplications: existing.complications,
		previousComorbidities: existing.comorbidities, previousInstrumentTrayBarcode: existing.instrumentTrayBarcode,
		revisedByUserId: userId ?? existing.authorId ?? null, revisedAt,
	});

	if (existing.visitId) {
		await syncVisitEmkFromDiarySoap(tx, {
			visitId: existing.visitId,
			organizationId,
			anamnesis: params.anamnesis !== undefined ? params.anamnesis : existing.anamnesis,
			statusLocalis: params.statusLocalis !== undefined ? params.statusLocalis : existing.statusLocalis,
			diagnosisIcd10: params.diagnosisIcd10 !== undefined ? params.diagnosisIcd10 : existing.diagnosisIcd10,
			diagnosisTooth: params.diagnosisTooth !== undefined ? params.diagnosisTooth : existing.diagnosisTooth,
			treatmentDescription: params.treatmentDescription !== undefined ? params.treatmentDescription : existing.treatmentDescription,
		});
	}

	const auditLogId = await recordSigningAuditLog(tx, {
		organizationId,
		patientId: existing.patientId,
		diaryId,
		userId,
		action: "VISIT_DIARY_REVISED",
	});

	return { diaryId, hash: newHash, version: nextVersion, revisedAt, auditLogId };
}
