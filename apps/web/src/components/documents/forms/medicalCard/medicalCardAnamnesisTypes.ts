/**
 * forms/medicalCard/medicalCardAnamnesisTypes.ts
 * Types for Medical Card Anamnesis tab and sub-sections (Mandate 8b <= 120 lines)
 */

import type React from "react";
import type { DentalBiteType, OralMucosaStatus } from "@dental/shared";

export interface DentalMedicalCardAnamnesisTabProps {
	readonly chiefComplaint: string;
	readonly setChiefComplaint: (v: string) => void;
	readonly historyOfPresentIllness: string;
	readonly setHistoryOfPresentIllness: (v: string) => void;
	readonly allergologicalHistory: string;
	readonly setAllergologicalHistory: (v: string) => void;
	readonly concomitantDiseases: string;
	readonly setConcomitantDiseases: (v: string) => void;
	readonly currentMedications: string;
	readonly setCurrentMedications: (v: string) => void;
	readonly pregnancyLactationStatus: string;
	readonly setPregnancyLactationStatus: (v: string) => void;
	readonly pastDentalInterventions: string;
	readonly setPastDentalInterventions: (v: string) => void;
	readonly biteType: DentalBiteType;
	readonly setBiteType: (v: DentalBiteType) => void;
	readonly biteDescription: string;
	readonly setBiteDescription: (v: string) => void;
	readonly oralMucosa: OralMucosaStatus;
	readonly setOralMucosa: React.Dispatch<React.SetStateAction<OralMucosaStatus>>;
	readonly xrayFindingsDescription: string;
	readonly setXrayFindingsDescription: (v: string) => void;
	readonly generalTreatmentPlan: string;
	readonly setGeneralTreatmentPlan: (v: string) => void;
	readonly effectiveDisabled: boolean;
	readonly onApplyAnamnesisNorm: () => void;
}
