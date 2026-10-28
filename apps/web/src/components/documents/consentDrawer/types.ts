import type { Patient } from "@dental/shared";

export type ConsentKindOption =
	| "therapeutic"
	| "surgical_implantation"
	| "anesthesia"
	| "orthodontic"
	| "orthopedic"
	| "personal_data"
	| "paid_contract";

export interface ConsentKindItem {
	id: ConsentKindOption;
	title: string;
	shortTitle: string;
	description: string;
}

export interface PatientConsentSignDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	patient: Patient | null;
	doctorFullName?: string | null | undefined;
	clinicName?: string | undefined;
	defaultConsentKind?: ConsentKindOption | undefined;
	onSigned?: ((signatureDataUrl: string, consentKind: ConsentKindOption) => void) | undefined;
	onPrintBlank?: ((consentKind: ConsentKindOption) => void) | undefined;
}
