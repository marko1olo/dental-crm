import React from "react";
import type { PatientClinicalSafetyProfile } from "../../safetyMath";
import type { PatientGeneralInfo } from "./types";
import type { ClinicalVisitItem } from "../../PatientHistoryTab";

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
	clinicalTimelineVisits: ClinicalVisitItem[];
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
	onOpenTaxCertificate?: (() => void) | undefined;
}
