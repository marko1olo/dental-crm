/**
 * prescriptionPreviewTypes.ts — Canonical Types and Props Interface for Prescription Sheet Preview
 * Mandates 8e, 8x, 8y & Apple HIG. Decomposed module <= 120 lines (Mandate 8b).
 */

export type PrescriptionFormType =
	| "standard"
	| "special"
	| "107-1u"
	| "148-1u-88";

export interface PrescriptionDrugItem {
	readonly id: string;
	readonly latinName: string;
	readonly tradeName: string;
	readonly form: string;
	readonly dosage: string;
	readonly quantity: string;
	readonly dispenseLatin: string;
	readonly signaRussian: string;
	readonly category?: string | undefined;
}

export interface PrescriptionSheetPreviewProps {
	readonly customSeriesNumber: string;
	readonly penicillinConflict: boolean;
	readonly nsaidConflict: boolean;
	readonly anestheticConflict?: boolean;
	readonly ddiSafetyAudit?:
		| {
				readonly drugInteractions: readonly {
					readonly primaryDrug?: string;
					readonly interactingDrug?: string;
					readonly severity?: string;
					readonly effectDescriptionRu?: string;
					readonly clinicalRecommendationRu?: string;
				}[];
		  }
		| null
		| undefined;
	readonly withStampAndSignature: boolean;
	readonly clinic: string;
	readonly address: string;
	readonly phone: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly licNum: string;
	readonly activeForm: PrescriptionFormType;
	readonly prescriptionDate: string;
	readonly patientName: string;
	readonly patientBirth: string;
	readonly patientCard: string;
	readonly patientAddress?: string | undefined;
	readonly docName: string;
	readonly docSpecialty: string;
	readonly diary?:
		| { readonly diagnosisIcd10?: string | null | undefined }
		| null
		| undefined;
	readonly activeItems: readonly PrescriptionDrugItem[];
	readonly validityDays: string;
	readonly isChronicSpecialCare: boolean;
	readonly chronicPeriodicity: string;
	readonly isUkepSigned?: boolean | undefined;
	readonly ukepSignature?: unknown;
	readonly className?: string | undefined;
}
