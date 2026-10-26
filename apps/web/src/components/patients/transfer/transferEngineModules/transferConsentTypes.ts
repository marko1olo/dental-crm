/**
 * transferConsentTypes.ts — Типы информированного согласия и подписи при трансфере медкарты.
 * Лимит <= 120 строк по Мандату 8b.
 */

export type PatientSignatureType =
	| "simple_electronic_signature_sms"
	| "sms_code"
	| "tablet_stylus"
	| "paper_scan"
	| "paper_signed_consent"
	| "ukep_crypto_pro";

export interface PatientBranchTransferConsent {
	readonly consentId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientPassportOrId: string;
	readonly sourceBranchId: string;
	readonly targetBranchId: string;
	readonly transferPurposeRu: string;
	readonly operatorFullName: string;
	readonly operatorPosition: string;
	readonly signatureType: PatientSignatureType;
	readonly signedAtIso: string;
	readonly signatureHash: string;
}
