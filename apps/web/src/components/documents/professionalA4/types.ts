import {
    type A4DocumentContractData,
    type A4DocumentActData,
    type A4DocumentTreatmentPlanData,
    type A4DocumentInformedConsentData,
    type A4DocumentPersonalDataConsentData,
    type A4DocumentMedicalCardData
} from "@dental/shared";

export type ProfessionalA4DocumentTab =
	| "contract"
	| "act"
	| "treatment_plan"
	| "consent_1051n"
	| "informed_consent"
	| "personal_data"
	| "medical_card";

export type A4ZoomMode = "100%" | "80%" | "fit";

export interface ProfessionalDocumentA4SheetProps {
	readonly activeTab?: ProfessionalA4DocumentTab;
	readonly onTabChange?: (tab: ProfessionalA4DocumentTab) => void;
	readonly initialZoom?: A4ZoomMode;
	readonly contractData: A4DocumentContractData;
	readonly actData: A4DocumentActData;
	readonly treatmentPlanData: A4DocumentTreatmentPlanData;
	readonly consentData?: A4DocumentInformedConsentData | undefined;
	readonly informedConsentData?: A4DocumentInformedConsentData | undefined;
	readonly personalDataConsent?: A4DocumentPersonalDataConsentData | undefined;
	readonly personalDataConsentData?: A4DocumentPersonalDataConsentData | undefined;
	readonly medicalCardData: A4DocumentMedicalCardData;
	readonly onPrint?: () => void;
	readonly className?: string;
}
