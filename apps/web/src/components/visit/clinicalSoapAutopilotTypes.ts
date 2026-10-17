/**
 * clinicalSoapAutopilotTypes.ts
 * Types for Doctor 1-click clinical autopilot, templates and presets.
 */

import type { DiaryState } from "../useVisitDiaryLogic";
import type {
	ClinicalSoapPreset,
	ClinicalService804n,
	ClinicalMaterialDeduction,
	ToothClinicalState,
} from "./clinicalSoapTypes.js";

export interface DoctorAutopilotPreset extends ClinicalSoapPreset {
	readonly surfaces?: string;
	readonly informedConsent?: string;
	readonly postOpMemo?: string;
	readonly is1ClickAutopilot: true;
}

export interface Template {
	id: string;
	title: string;
	category?: string;
	prefilledAnamnesis?: string;
	prefilledObjective?: string;
	prefilledTreatment?: string;
	defaultIcd10?: string;
	isBuiltIn?: boolean;
}

export type CanonicalSoapTemplateKey =
	| "caries"
	| "pulpitis"
	| "periodontitis"
	| "hygiene"
	| "extraction"
	| "pediatric_adaptation"
	| "pediatric_caries"
	| "pediatric_pulpotomy"
	| "pediatric_silvering_fluoride"
	| "pediatric_fissure_sealing"
	| "ortho_prep_zirconia_emax"
	| "ortho_try_in_framework_crown"
	| "ortho_permanent_cementation"
	| "ortho_removable_prosthetics"
	| "ortho_inlay_emax"
	| "ortho_bridge"
	| "surgery_resection_rvk"
	| "perio_vector";

export type Canonical043TemplateKey = CanonicalSoapTemplateKey;

export interface Apply1ClickAutopilotOptions {
	toothNumber?: number | null;
	surfaces?: string;
	currentDiary?: Partial<DiaryState>;
	mode?: "clean_replace" | "smart_append";
}

export interface Apply1ClickAutopilotResult {
	diary: DiaryState;
	preset: DoctorAutopilotPreset;
	service804n?: ClinicalService804n;
	additionalServices804n?: readonly ClinicalService804n[];
	materials: readonly ClinicalMaterialDeduction[];
	recommendations: string;
	informedConsent?: string;
	postOpMemo?: string;
	toothNumber?: number;
	odontogramState?: ToothClinicalState;
}
