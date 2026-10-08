import type {
	StomxRepresentativeType,
	StomxRepresentativeTypeMeta,
} from "@dental/shared";
import type { PatientClinicalSafetyProfile } from "../../safetyMath";

export type { StomxRepresentativeType, StomxRepresentativeTypeMeta };

export type IdentityDocType =
	| "passport_rf"
	| "birth_certificate"
	| "foreign_passport"
	| "residence_permit"
	| "other";

export interface PatientVisitHistoryItem {
	id: string;
	date: string;
	time?: string;
	doctorName: string;
	specialty: string;
	status: "completed" | "scheduled" | "cancelled" | "in_progress";
	services: string;
	amountRub: number;
	toothNumber?: string;
}

export interface PatientGeneralInfo {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	cardNumber?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | null | undefined;
	gender?: "male" | "female" | "other" | string | null | undefined;
	address?: string | null | undefined;
	snils?: string | null | undefined;
	inn?: string | null | undefined;
	omsPolicyNumber?: string | null | undefined;
	notes?: string | null | undefined;
	acquisitionSource?: string | null | undefined;

	// 1. Паспортные данные (для договоров и чеков)
	docType?: IdentityDocType | string | null | undefined;
	passportSeries?: string | null | undefined;
	passportNumber?: string | null | undefined;
	passportIssuedBy?: string | null | undefined;
	passportDepartmentCode?: string | null | undefined;
	passportIssuedDate?: string | null | undefined;
	registrationAddress?: string | null | undefined;
	residentialAddress?: string | null | undefined;
	addressesMatch?: boolean | null | undefined;

	// 2. Государственная и страховая идентификация
	dmsInsuranceCompany?: string | null | undefined;
	dmsPolicyNumber?: string | null | undefined;
	dmsProgramName?: string | null | undefined;

	// 3. Заметки и особенности обслуживания
	registryNotes?: string | null | undefined;
	doctorClinicalNotes?: string | null | undefined;
	serviceAlertTags?: string[] | null | undefined;

	// 4. Краткая история приёмов и финансовый статус
	patientBalanceRub?: number | string | null | undefined;
	familyBalanceRub?: number | string | null | undefined;
	familyGroupId?: string | null | undefined;
	familyGroupName?: string | null | undefined;
	visitsHistory?: PatientVisitHistoryItem[] | null | undefined;

	// 5. Законные представители и семейные связи
	representativeType?: string | null | undefined;
	representativeFullName?: string | null | undefined;
	representativePhone?: string | null | undefined;
	representativeDoc?: string | null | undefined;
	preferredDocumentRecipient?: string | null | undefined;
	dataProcessingBasisNote?: string | null | undefined;
}

export interface PatientGeneralInfoTabProps {
	patient?: PatientGeneralInfo | null | undefined;
	safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	onUpdateSafetyProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	onApplySomaticNorm?: (() => void) | undefined;
	disabled?: boolean | undefined;
	activeSection?: "all" | "general" | "somatic" | "visits" | "family" | undefined;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
	onOpenDmsLetters?: (() => void) | undefined;
	onOpenTaxCertificate?: (() => void) | undefined;
}

export interface PatientIdentitySectionProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
	isOpen?: boolean | undefined;
	onToggle?: (() => void) | undefined;
	summary?: string | undefined;
	addressesMatchState: boolean;
	setAddressesMatchState: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface PatientInsuranceSectionProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
	isOpen?: boolean | undefined;
	onToggle?: (() => void) | undefined;
	summary?: string | undefined;
	onOpenDmsLetters?: (() => void) | undefined;
	onOpenTaxCertificate?: (() => void) | undefined;
}

export interface PatientTagsMarketingSectionProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
	isOpen?: boolean | undefined;
	onToggle?: (() => void) | undefined;
	summary?: string | undefined;
	onToggleServiceTag: (tag: string) => void;
	onAppendDoctorTag: (tag: string) => void;
}

export interface PatientRepresentativesSectionProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
	mode?: "compact" | "full" | undefined;
}

export interface PatientSafetyBannerProps {
	currentProfile: PatientClinicalSafetyProfile;
	disabled?: boolean | undefined;
	mode?: "compact" | "full" | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	onToggleAllergy: (field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => void;
	onApplySomaticNorm?: (() => void) | undefined;
	onUpdateSafetyProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
}

export interface PatientDemographicsBasicCardProps {
	patient?: PatientGeneralInfo | null | undefined;
	currentProfile: PatientClinicalSafetyProfile;
	disabled?: boolean | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	onToggleAllergy: (field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => void;
	onApplySomaticNorm?: (() => void) | undefined;
	onUpdateSafetyProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
}

export interface PatientVisitsOverviewSectionProps {
	patient?: PatientGeneralInfo | null | undefined;
	disabled?: boolean | undefined;
	clinicalTimelineVisits: import("../../PatientHistoryTab").ClinicalVisitItem[];
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
	onOpenTaxCertificate?: (() => void) | undefined;
}

