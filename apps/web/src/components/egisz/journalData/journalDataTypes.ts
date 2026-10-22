/**
 * journalDataTypes.ts — TypeScript interfaces and types for REMD Journal
 */

import type {
	EgiszDentalCdaPayload,
	EgiszDentalSemdCode,
	GostSignatureInfo,
} from "./../egiszRemdEngine";

export type RemdDocumentStatus =
	| "draft"
	| "signed"
	| "sent"
	| "registered"
	| "accepted_by_egisz"
	| "rejected_by_egisz"
	| "error";

export interface RemdValidationError {
	errorCode: string;
	errorCategory: "frmr" | "frmo" | "804n" | "icd10" | "crypto" | "schema" | "patient";
	errorMessage: string;
	actionableHint: string;
	occurredAt: string;
}

export interface RemdRegistrationInfo {
	remdDocId: string;
	regNumber: string;
	registeredAt: string;
	registryOid: string;
	documentHashGost: string;
	channel: string;
}

export interface RemdDocumentRecord {
	id: string;
	documentUuid: string;
	docTypeCode: EgiszDentalSemdCode | "1151156";
	docTypeName: string;
	createdAt: string;
	updatedAt: string;
	encounterDate: string;
	patient: {
		id: string;
		fullName: string;
		birthDate: string;
		snils?: string | undefined;
		cardNumber: string;
		polisOms?: string | undefined;
	};
	doctor: {
		id: string;
		fullName: string;
		snils: string;
		position: string;
		specialty: string;
	};
	clinic: {
		name: string;
		oid: string;
		ogrn: string;
		inn: string;
	};
	status: RemdDocumentStatus;
	doctorSignature?: GostSignatureInfo | undefined;
	moSignature?: GostSignatureInfo | undefined;
	clinicSignature?: GostSignatureInfo | undefined;
	cdaPayload?: EgiszDentalCdaPayload | undefined;
	registrationInfo?: RemdRegistrationInfo | undefined;
	validationError?: RemdValidationError | undefined;
}

/**
 * Production Journal Baseline per Mandate 8c (Zero Mocks) & Mandate 8f (Real Persistence).
 */
export const SAMPLE_REMD_JOURNAL_RECORDS: RemdDocumentRecord[] = [];
