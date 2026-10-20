/**
 * prescriptionPreviewTypes.ts — Props Interface for Prescription Sheet Preview
 */

import type { PrescriptionDoctorUkep } from "@dental/shared";
import type { PrescriptionFormType } from "./PrescriptionPrintModal";

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
	readonly activeItems: readonly {
		readonly id: string;
		readonly latinName: string;
		readonly dispenseLatin: string;
		readonly signaRussian: string;
		readonly tradeName: string;
	}[];
	readonly validityDays: string;
	readonly isChronicSpecialCare: boolean;
	readonly chronicPeriodicity: string;
	readonly isUkepSigned: boolean;
	readonly ukepSignature?:
		| (PrescriptionDoctorUkep & {
				readonly validFrom?: string | null | undefined;
				readonly validTo?: string | null | undefined;
		  })
		| null
		| undefined;
	readonly className?: string | undefined;
}
