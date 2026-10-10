/**
 * ============================================================================
 * PATIENT BRANCH TRANSFER ENGINE — MASTER COORDINATOR & BARREL
 * ============================================================================
 */

import {
	buildPatientClinicalSnapshot,
	createPatientBranchTransferConsent,
	generateTransferActCsv,
	generateTransferActHtml,
	generateTransferVerificationQrDataUri,
} from "./emrPackageSerializer.js";
import { validateTransferDraft } from "./transferValidationRules.js";
import type { ExecuteTransferInput, ExecuteTransferResult } from "./types.js";

export * from "./types.js";
export * from "./financialDepositTransfer.js";
export * from "./transferValidationRules.js";
export * from "./emrPackageSerializer.js";

export function executePatientBranchTransfer(input: ExecuteTransferInput): ExecuteTransferResult {
	const validation = validateTransferDraft(input.draft, {
		demographics: input.demographics,
		balanceRub: input.balanceRub,
	});

	if (!validation.isValid) {
		throw new Error(`Ошибка валидации трансфера: ${validation.errors.join("; ")}`);
	}

	// 1. Create 152-FZ Consent
	const consent = createPatientBranchTransferConsent({
		patientId: input.draft.patientId,
		patientFullName: input.draft.patientFullName,
		patientPassportOrId: input.demographics.identityDocument || "Паспорт РФ не указан",
		sourceBranchId: input.draft.sourceBranchId,
		targetBranchId: input.draft.targetBranchId,
		transferPurposeRu: input.draft.transferReasonRu || "Продолжение стоматологического лечения в филиале сети клиник",
		operatorFullName: input.draft.operatorStaffName,
		operatorPosition: input.draft.operatorStaffPosition,
		signatureType: input.draft.signatureType,
	});

	// 2. Build full clinical snapshot
	const snapshot = buildPatientClinicalSnapshot({
		sourceBranchId: input.draft.sourceBranchId,
		targetBranchId: input.draft.targetBranchId,
		demographics: input.demographics,
		somaticAnamnesis: input.somaticAnamnesis,
		odontogramTeeth: input.odontogramTeeth,
		visitDiaries: input.visitDiaries,
		treatmentPlans: input.treatmentPlans,
		imagingStudies: input.imagingStudies,
		balanceRub: input.balanceRub,
		balanceKopecks: input.balanceKopecks,
		familyGroupId: input.familyGroupId,
		labOrders: input.labOrders,
		consent152Fz: consent,
		selectedComponents: input.draft.selectedComponents,
		transferReasonRu: input.draft.transferReasonRu,
		staffName: input.draft.operatorStaffName,
		staffPosition: input.draft.operatorStaffPosition,
	});

	// 3. Generate QR code
	const qrDataUri = generateTransferVerificationQrDataUri(snapshot, 180);

	// 4. Generate statutory Transfer Act HTML
	const transferActHtml = generateTransferActHtml(snapshot, qrDataUri);

	// 5. Generate CSV summary
	const csvSummary = generateTransferActCsv(snapshot);

	return {
		success: true,
		snapshot,
		voucher: snapshot.financialDeposit.transferVoucher,
		qrDataUri,
		transferActHtml,
		csvSummary,
	};
}
