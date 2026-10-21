import type {
	A4DocumentActData,
	A4DocumentContractData,
	A4DocumentInformedConsentData,
	A4DocumentMedicalCardData,
	A4DocumentPersonalDataConsentData,
	A4DocumentTreatmentPlanData,
	GeneratedDocument,
	Patient,
} from "@dental/shared";

export type ProfessionalA4DocumentTab =
	| "contract"
	| "act"
	| "treatment_plan"
	| "informed_consent"
	| "consent_1051n"
	| "personal_data"
	| "medical_card";

export type A4ZoomMode = "80%" | "100%" | "fit";

export interface ProfessionalDocumentA4SheetProps {
	activeTab?: ProfessionalA4DocumentTab;
	onTabChange?: (tab: ProfessionalA4DocumentTab) => void;
	initialZoom?: A4ZoomMode;
	contractData?: Partial<A4DocumentContractData>;
	actData?: Partial<A4DocumentActData>;
	treatmentPlanData?: Partial<A4DocumentTreatmentPlanData>;
	consentData?: Partial<A4DocumentInformedConsentData>;
	informedConsentData?: Partial<A4DocumentInformedConsentData>;
	personalDataConsent?: Partial<A4DocumentPersonalDataConsentData>;
	personalDataConsentData?: Partial<A4DocumentPersonalDataConsentData>;
	medicalCardData?: Partial<A4DocumentMedicalCardData>;
	onPrint?: () => void;
	className?: string;
}

export interface UseA4PreviewDataOptions {
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile draft
	readonly clinicProfileDraft?: any;
	readonly existingDocuments?: readonly GeneratedDocument[] | undefined;
	readonly contractData?: Partial<A4DocumentContractData>;
	readonly actData?: Partial<A4DocumentActData>;
	readonly treatmentPlanData?: Partial<A4DocumentTreatmentPlanData>;
	readonly consentData?: Partial<A4DocumentInformedConsentData>;
	readonly personalDataConsent?: Partial<A4DocumentPersonalDataConsentData>;
	readonly medicalCardData?: Partial<A4DocumentMedicalCardData>;
}

export interface DocumentA4PrintPreviewModalProps
	extends UseA4PreviewDataOptions {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: ProfessionalA4DocumentTab;
}
