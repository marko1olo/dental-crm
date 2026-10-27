import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { visitDiaries } from "../../../db/schema.js";
import { Icd10ClinicalValidator } from "../Icd10ClinicalValidator.js";
import { buildEmkDiagnosisText, computeDiaryHash } from "./diaryHashCalculator.js";
import { dispatchDiarySigningSideEffects, type DiaryStockDeduction } from "./diarySideEffectsAsyncDispatcher.js";
import { runDiaryRevisionCeremony } from "./diaryRevisionManager.js";
import {
	DiarySigningError, formatDoctorSpecialtyLabel, redactLegacyPinSignature,
	resolveSignatureForStorage, SIMPLE_PIN_EP_MARK, type DiaryDbTransaction,
} from "./signatureTypeVerifier.js";
import { markVisitSigned, recordSigningAuditLog, syncVisitEmkFromDiarySoap } from "./diaryVisitStateSynchronizer.js";

export interface DiarySigningResult {
	diaryId: string; hash: string; lockedAt: Date;
	completedTreatmentItems: number; deductions: DiaryStockDeduction[]; auditLogId: string | null;
}

/**
 * Церемония цифрового подписания дневника приёма в транзакции.
 */
export async function runDiarySigningCeremony(
	tx: DiaryDbTransaction,
	params: { diaryId: string; organizationId: string; userId: string | null; pkcs7Signature: string | null },
): Promise<DiarySigningResult> {
	const { diaryId, organizationId, userId } = params;
	const [diary] = await tx
		.select().from(visitDiaries)
		.where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, organizationId)))
		.limit(1).for("update");
	if (!diary) throw new DiarySigningError("NotFound", "Дневник приёма не найден. Сохраните черновик и повторите.");
	if (diary.isLocked) throw new DiarySigningError("AlreadyLocked", "Дневник уже подписан.");

	const validation = Icd10ClinicalValidator.validate(diary.diagnosisIcd10, diary.diagnosisTooth?.trim() || undefined);
	if (!validation.isValid) throw new DiarySigningError(validation.errorCode, validation.errorMessage);

	const hash = computeDiaryHash(
		diary.visitId, diary.patientId ?? "", diary.anamnesis, diary.statusLocalis,
		diary.treatmentDescription, diary.diagnosisIcd10, diary.diagnosisTooth,
		diary.complications, diary.comorbidities, diary.instrumentTrayBarcode,
	);
	const lockedAt = new Date();
	const sig = params.pkcs7Signature;
	const finalizedSignature = typeof sig === "string" && sig.startsWith(`${SIMPLE_PIN_EP_MARK}|`) && sig.endsWith("|")
		? `${sig}${hash.slice(0, 12)}` : sig;

	const lockedRows = await tx.update(visitDiaries).set({
		isLocked: true, lockedAt, lockedByUserId: userId, coSignedByUserId: userId,
		authorId: userId, doctorId: userId, diaryHash: hash,
		cryptoSignaturePkcs7: finalizedSignature, updatedAt: lockedAt,
	}).where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, organizationId), eq(visitDiaries.isLocked, false)))
	.returning({ id: visitDiaries.id });
	if (lockedRows.length === 0) throw new DiarySigningError("AlreadyLocked", "Дневник подписан и заблокирован.");

	const sideEffects = await dispatchDiarySigningSideEffects(tx, { organizationId, visitId: diary.visitId, userId });
	const auditLogId = await recordSigningAuditLog(tx, {
		organizationId, patientId: diary.patientId, diaryId, userId, action: "VISIT_SIGNED_AND_LOCKED",
	});

	if (diary.visitId) {
		await syncVisitEmkFromDiarySoap(tx, {
			visitId: diary.visitId, organizationId, anamnesis: diary.anamnesis, statusLocalis: diary.statusLocalis,
			diagnosisIcd10: diary.diagnosisIcd10, diagnosisTooth: diary.diagnosisTooth, treatmentDescription: diary.treatmentDescription,
		});
		await markVisitSigned(tx, { visitId: diary.visitId, organizationId, lockedAt });
	}

	return {
		diaryId, hash, lockedAt, completedTreatmentItems: sideEffects.completedTreatmentItems,
		deductions: sideEffects.deductions, auditLogId,
	};
}

export class DiarySigningCeremonyService {
	static computeHash = computeDiaryHash;
	static resolveSignature = resolveSignatureForStorage;
	static redactSignature = redactLegacyPinSignature;
	static formatSpecialty = formatDoctorSpecialtyLabel;
	static buildEmkDiagnosis = buildEmkDiagnosisText;
	static syncVisitEmk = syncVisitEmkFromDiarySoap;
	static runCeremony = runDiarySigningCeremony;
	static runRevision = runDiaryRevisionCeremony;
	static validateClinicalProtocol = Icd10ClinicalValidator.validate;
	static isDentalIcd10 = Icd10ClinicalValidator.isDentalIcd10;
	static isToothSpecificDiagnosis = Icd10ClinicalValidator.isToothSpecificDiagnosis;
	static isValidFdiTooth = Icd10ClinicalValidator.isValidFdiTooth;
	static parseAndValidateTeeth = Icd10ClinicalValidator.parseAndValidateTeeth;

	static async signDiary(params: Parameters<typeof runDiarySigningCeremony>[1]): Promise<DiarySigningResult> {
		return await db.transaction((tx) => runDiarySigningCeremony(tx, params));
	}
	static async reviseDiary(params: Parameters<typeof runDiaryRevisionCeremony>[1]) {
		return await db.transaction((tx) => runDiaryRevisionCeremony(tx, params));
	}
}
