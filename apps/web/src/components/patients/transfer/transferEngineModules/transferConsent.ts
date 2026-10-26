/**
 * transferConsent.ts — Генерация информированного согласия на трансфер медкарты.
 * Лимит <= 120 строк по Мандату 8b.
 */

import type { PatientBranchTransferConsent, PatientSignatureType } from "./types.js";

let globalConsentSeq = 1000;

export function createPatientBranchTransferConsent(params: {
	patientId: string;
	patientFullName: string;
	patientPassportOrId: string;
	sourceBranchId: string;
	targetBranchId: string;
	transferPurposeRu: string;
	operatorFullName: string;
	operatorPosition: string;
	signatureType: PatientSignatureType;
}): PatientBranchTransferConsent {
	const patientSuffix = params.patientId.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001";
	const consentId = `CNST-TRF-${Date.now()}-${++globalConsentSeq}-${patientSuffix}`;
	const signedAtIso = new Date().toISOString();
	const signatureHash = `SHA256:CONSENT:${params.patientId}`;
	return {
		consentId,
		patientId: params.patientId,
		patientFullName: params.patientFullName,
		patientPassportOrId: params.patientPassportOrId,
		sourceBranchId: params.sourceBranchId,
		targetBranchId: params.targetBranchId,
		transferPurposeRu: params.transferPurposeRu,
		operatorFullName: params.operatorFullName,
		operatorPosition: params.operatorPosition,
		signatureType: params.signatureType,
		signedAtIso,
		signatureHash,
	};
}
