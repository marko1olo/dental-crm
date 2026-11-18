import type {
	ToothClinicalState,
	ClinicalPresetCategory,
	ClinicalMaterialCategory,
	ClinicalMaterialUnit,
	ClinicalMaterialDeduction,
	ClinicalService804n,
	ClinicalSoapPreset,
	DoctorAutopilotPreset,
	ClinicalAnestheticInfo,
} from "@dental/shared";

export type {
	ToothClinicalState,
	ClinicalPresetCategory,
	ClinicalMaterialCategory,
	ClinicalMaterialUnit,
	ClinicalMaterialDeduction,
	ClinicalService804n,
	ClinicalSoapPreset,
	DoctorAutopilotPreset,
	ClinicalAnestheticInfo,
};

export * from "./clinicalSoapAutopilotTypes.js";

export type ClinicalQuickPreset = ClinicalSoapPreset;

export interface FormattedSoapResult {
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly diagnosis: string;
	readonly treatmentPlan: string;
	readonly recommendations?: string | undefined;
	readonly billLine: string;
	readonly materialsSummary: string;
	readonly service804n?: ClinicalService804n | null | undefined;
	readonly materialsToDeduct: readonly ClinicalMaterialDeduction[];
}

