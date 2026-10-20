export * from "./clinicalSoapAutopilotTypes.js";

export type ToothClinicalState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Filled"
	| "Crown"
	| "Planned_Crown"
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
	readonly unitCostRub?: number;
	readonly okeiCode?: string;
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
	readonly toothState?: ToothClinicalState;
	readonly defaultTooth?: number;
	readonly anesthetic?: {
		readonly drugKey: "ultracain_ds_forte" | "ultracain_ds" | "scandonest_3" | "septanest_100";
		readonly drugName: string;
		readonly carpulesCount: number;
		readonly volumeMl: number;
	};
	readonly service804n?: ClinicalService804n;
	readonly additionalServices804n?: readonly ClinicalService804n[];
	readonly materialsToDeduct?: readonly ClinicalMaterialDeduction[];
	readonly recommendations?: string;
	readonly warrantyMonths?: number;
	readonly serviceLifeMonths?: number;
}

export type ClinicalQuickPreset = ClinicalSoapPreset;

export interface FormattedSoapResult {
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly diagnosis: string;
	readonly treatmentPlan: string;
	readonly billLine: string;
	readonly materialsSummary: string;
	readonly service804n?: ClinicalService804n;
	readonly materialsToDeduct: readonly ClinicalMaterialDeduction[];
}
