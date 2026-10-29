/**
 * prescriptionEngineTypes.ts — Prescription Document & Memo Generation Types
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Mandate 8b <= 120 lines).
 */

import type { DentalMedicationPreset } from "./prescriptionPresetTypes";

export interface PrescriptionDocumentInput {
	readonly prescriptionSeriesNumber: string;
	readonly dateIso: string;
	readonly validityDays: 15 | 30 | 60 | 365;
	readonly clinicName: string;
	readonly clinicOgrn: string;
	readonly clinicAddress: string;
	readonly clinicInn?: string;
	readonly medicalLicenseNumber?: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientMedicalCardNumber: string;
	readonly patientAddress?: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly doctorSnils?: string;
	readonly selectedMedicationIds: readonly string[];
	readonly isChronicSpecialCare?: boolean;
	readonly chronicPeriodicity?: string;
	readonly ukepSignature?: {
		certificateSerialNumber?: string;
		certificateIssuer?: string;
		signedAt?: string;
		cryptoSignaturePkcs7?: string;
	} | null;
}

export interface PrescriptionRenderedItem {
	readonly itemNumber: number;
	readonly latinRp: string;
	readonly dispenseLatin: string;
	readonly signaRu: string;
	readonly tradeNameRu: string;
}

export interface PrescriptionDocument {
	readonly header: {
		readonly seriesNumber: string;
		readonly dateLabelRu: string;
		readonly validityPeriodLabelRu: string;
		readonly expiresAtIso: string;
		readonly clinicName: string;
		readonly clinicOgrn: string;
		readonly clinicAddress: string;
		readonly clinicInn?: string | undefined;
		readonly medicalLicenseNumber?: string | undefined;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly cardNum: string;
		readonly address?: string | undefined;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty: string;
		readonly snils?: string | undefined;
	};
	readonly items: readonly PrescriptionRenderedItem[];
	readonly ukepSignature?:
		| {
				certificateSerialNumber?: string | undefined;
				certificateIssuer?: string | undefined;
				signedAt?: string | undefined;
				cryptoSignaturePkcs7?: string | undefined;
		  }
		| null
		| undefined;
	readonly isChronicSpecialCare?: boolean | undefined;
	readonly chronicPeriodicity?: string | undefined;
}

/** Backward compatibility aliases for legacy tests */
export type Form107PrescriptionInput = PrescriptionDocumentInput;
export type Form107RenderedItem = PrescriptionRenderedItem;
export type Form107PrescriptionDocument = PrescriptionDocument;
export type PrescriptionGeneratedDocument = PrescriptionDocument;

export interface PatientPrescriptionMemoParams {
	clinicName: string;
	clinicPhone: string;
	patientName?: string;
	patientFullName?: string;
	doctorName?: string;
	doctorFullName?: string;
	prescriptionDate?: string | undefined;
	medications: readonly (
		| DentalMedicationPreset
		| {
				id: string;
				nameRu?: string;
				tradeNameRu?: string;
				activeSubstanceRu?: string;
				formRu?: string;
				dosageRu?: string;
				latinRp?: string;
				signaRu?: string;
				dispenseLatin?: string;
		  }
	)[];
	additionalNotesRu?: string | undefined;
}
