import type { DiaryState } from "../useVisitDiaryLogic";

export type ToothClinicalState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Filled"
	| "Crown"
	| "Implant"
	| "Planned_Implant"
	| "Missing"
	| "Healthy";

export type ClinicalPresetCategory =
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "hygiene"
	| "periodontology"
	| "pediatric";

export interface ClinicalMaterialDeduction {
	readonly name: string;
	readonly category: "composite" | "adhesive" | "endo" | "implant" | "suture" | "anesthesia" | "hygiene" | "ppe" | "auxiliary" | "surgery" | "orthopedics" | "biomaterial";
	readonly unit: "г" | "мл" | "шт." | "пары" | "карп." | "компл." | "упак.";
	readonly quantity: number;
	readonly unitCostRub?: number | undefined;
	readonly okeiCode?: string | undefined;
}

export interface ClinicalService804n {
	readonly code804n: string;
	readonly title: string;
	readonly basePriceRub: number;
	readonly category: ClinicalPresetCategory;
}

export interface ClinicalSoapPreset {
	readonly id: string;
	readonly title: string;
	readonly shortBadge: string;
	readonly category: ClinicalPresetCategory;
	readonly icd10: string;
	readonly icd10Label: string;
	readonly complaint: string;
	readonly anamnesis: string;
	readonly statusLocalis: string;
	readonly treatmentDescription: string;
	readonly toothState?: ToothClinicalState | undefined;
	readonly defaultTooth?: number | undefined;
	readonly anesthetic?: {
		readonly drugKey: "ultracain_ds_forte" | "ultracain_ds" | "scandonest_3" | "septanest_100";
		readonly drugName: string;
		readonly carpulesCount: number;
		readonly volumeMl: number;
	} | undefined;
	readonly service804n?: ClinicalService804n | undefined;
	readonly additionalServices804n?: readonly ClinicalService804n[] | undefined;
	readonly materialsToDeduct?: readonly ClinicalMaterialDeduction[] | undefined;
	readonly recommendations?: string | undefined;
	readonly warrantyMonths?: number | undefined;
	readonly serviceLifeMonths?: number | undefined;
}

export type ClinicalQuickPreset = ClinicalSoapPreset;

/**
 * Расширенный интерфейс клинического автопилота врача-стоматолога у кресла.
 * Регламентирован Приказами Минздрава РФ № 804н, № 1051н (ИДС), Формой 043/у и клиническими рекомендациями СтАР.
 */
export interface DoctorAutopilotPreset extends ClinicalSoapPreset {
	readonly surfaces?: string | undefined;
	readonly informedConsent?: string | undefined;
	readonly postOpMemo?: string | undefined;
	readonly is1ClickAutopilot: true;
}

export interface FormattedSoapResult {
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly diagnosis: string;
	readonly treatmentPlan: string;
	readonly billLine: string;
	readonly materialsSummary: string;
	readonly service804n?: ClinicalService804n | undefined;
	readonly materialsToDeduct: readonly ClinicalMaterialDeduction[];
}

export interface Template {
	id: string;
	title: string;
	category?: string;
	prefilledAnamnesis?: string;
	prefilledObjective?: string;
	prefilledTreatment?: string;
	defaultIcd10?: string;
	/** Встроенный протокол — DELETE /api/templates/:id отвечает 403 CannotDeleteBuiltIn. */
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
	toothNumber?: number | null | undefined;
	surfaces?: string | undefined;
	currentDiary?: Partial<DiaryState> | undefined;
	mode?: "clean_replace" | "smart_append" | undefined;
}

export interface Apply1ClickAutopilotResult {
	diary: DiaryState;
	preset: DoctorAutopilotPreset;
	service804n?: ClinicalService804n | undefined;
	additionalServices804n?: readonly ClinicalService804n[] | undefined;
	materials: readonly ClinicalMaterialDeduction[];
	recommendations: string;
	informedConsent?: string | undefined;
	postOpMemo?: string | undefined;
	toothNumber?: number | undefined;
	odontogramState?: ToothClinicalState | undefined;
}
