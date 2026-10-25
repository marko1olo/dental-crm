import type React from "react";
import type { RadiologySnapshotItem } from "../../visit/VisitSummaryModal";
import type { ToothData } from "../../odontogram/ToothChart";
import type { DocumentBrandColorPalette } from "../../../store/documentBrandingStore";

export interface PremiumPatientInfo {
	fullName?: string | null | undefined;
	birthDate?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	passport?: string | null | undefined;
	omsPolis?: string | null | undefined;
	snils?: string | null | undefined;
	phone?: string | null | undefined;
	address?: string | null | undefined;
	gender?: string | null | undefined;
}

export interface PremiumClinicalDiary {
	anamnesis?: string | null | undefined;
	statusLocalis?: string | null | undefined;
	treatmentDescription?: string | null | undefined;
	diagnosisIcd10?: string | null | undefined;
	diagnosisTooth?: string | null | undefined;
	complications?: string | null | undefined;
	comorbidities?: string | null | undefined;
}

export interface PremiumDocumentPrintSheetProps {
	documentType?: "medical_card" | "043u" | "treatment_plan" | "informed_consent" | "prescription" | "contract" | undefined;
	documentTitle?: string | undefined;
	documentSubtitle?: string | undefined;
	patient: PremiumPatientInfo | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	doctorSnils?: string | null | undefined;
	visitDate?: string | Date | null | undefined;
	diary?: PremiumClinicalDiary | null | undefined;
	icd10Label?: string | null | undefined;
	teethData?: readonly ToothData[] | null | undefined;
	radiologySnapshots?: readonly RadiologySnapshotItem[] | null | undefined;
	diaryHash?: string | null | undefined;
	hasCryptoSignature?: boolean | null | undefined;
	isLocked?: boolean | undefined;
	lockedAt?: string | Date | null | undefined;
	revisionCount?: number | null | undefined;
	customDisclaimer?: string | null | undefined;
	className?: string | undefined;
}
