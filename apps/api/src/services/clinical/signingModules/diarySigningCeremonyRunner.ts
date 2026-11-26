import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { visitDiaries } from "../../../db/schema.js";
import { Icd10ClinicalValidator } from "../Icd10ClinicalValidator.js";
import type { FastifyBaseLogger } from "fastify";
import { buildEmkDiagnosisText, computeDiaryHash } from "./diaryHashCalculator.js";
import { dispatchDiarySigningSideEffects, type DiarySideEffectsLogger, type DiaryStockDeduction } from "./diarySideEffectsAsyncDispatcher.js";
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
	params: {
		diaryId: string;
		organizationId: string;
		userId: string | null;
		pkcs7Signature: string | null;
		logger?: FastifyBaseLogger | DiarySideEffectsLogger | undefined;
	},
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
	const effectiveIcd10 = diary.diagnosisIcd10?.trim() || validation.normalizedCode;

	const hash = computeDiaryHash(
		diary.visitId,
		diary.patientId ?? "",
		diary.complaint,
		diary.anamnesis,
		diary.statusLocalis,
		diary.treatmentDescription,
		effectiveIcd10,
		diary.diagnosisTooth,
		diary.complications,
		diary.comorbidities,
	);
	const lockedAt = new Date();
	const sig = params.pkcs7Signature;
	const finalizedSignature = typeof sig === "string" && sig.startsWith(`${SIMPLE_PIN_EP_MARK}|`) && sig.endsWith("|")
		? `${sig}${hash.slice(0, 12)}` : sig;

	const lockedRows = await tx.update(visitDiaries).set({
		isLocked: true, lockedAt, lockedByUserId: userId, coSignedByUserId: userId,
		authorId: userId, doctorId: userId, diagnosisIcd10: effectiveIcd10, diaryHash: hash,
		cryptoSignaturePkcs7: finalizedSignature, updatedAt: lockedAt,
	}).where(and(eq(visitDiaries.id, diaryId), eq(visitDiaries.organizationId, organizationId), eq(visitDiaries.isLocked, false)))
	.returning({ id: visitDiaries.id });
	if (lockedRows.length === 0) throw new DiarySigningError("AlreadyLocked", "Дневник подписан и заблокирован.");

	const sideEffects = await dispatchDiarySigningSideEffects(tx, {
		organizationId,
		visitId: diary.visitId,
		userId,
		logger: params.logger,
	});
	const auditLogId = await recordSigningAuditLog(tx, {
		organizationId, patientId: diary.patientId, diaryId, userId, action: "VISIT_SIGNED_AND_LOCKED",
	});

	if (diary.visitId) {
		await syncVisitEmkFromDiarySoap(tx, {
			visitId: diary.visitId, organizationId, complaint: diary.complaint, anamnesis: diary.anamnesis, statusLocalis: diary.statusLocalis,
			diagnosisIcd10: effectiveIcd10, diagnosisTooth: diary.diagnosisTooth, treatmentDescription: diary.treatmentDescription,
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
	static validateClinicalProtocol = Icd10ClinicalValidator.validate;
	static isDentalIcd10 = Icd10ClinicalValidator.isDentalIcd10;
	static isToothSpecificDiagnosis = Icd10ClinicalValidator.isToothSpecificDiagnosis;
	static isValidFdiTooth = Icd10ClinicalValidator.isValidFdiTooth;
	static parseAndValidateTeeth = Icd10ClinicalValidator.parseAndValidateTeeth;

	static async signDiary(params: Parameters<typeof runDiarySigningCeremony>[1]): Promise<DiarySigningResult> {
		return await withTenantCtx(params.organizationId, (tx) => runDiarySigningCeremony(tx, params));
	}
}
