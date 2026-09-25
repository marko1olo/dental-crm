/**
 * packages/shared/src/clinical/soap/soapTypes.ts
 *
 * Canonical Types for Single Source of Truth (SSOT) Clinical SOAP Protocols.
 * Regulated by Orders of the Ministry of Health of the Russian Federation:
 * - No. 804n (Medical Services Nomenclature)
 * - No. 1051n (Informed Voluntary Consent / IDS)
 * - Order No. 043/u (Dental Outpatient Medical Record)
 * - Clinical Guidelines of the Dental Association of Russia (StAR)
 *
 * Mandate 8v: Automated Bill of Materials (BOM) deduction without nurse clicking bloat.
 * Mandate 8d item 7: Strictly 0 cartoon emojis in clinical / statutory records.
 */

export type ClinicalPresetCategory =
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "hygiene"
	| "periodontology"
	| "pediatric";

export type ToothClinicalState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Filled"
	| "Crown"
	| "Implant"
	| "Planned_Implant"
	| "Missing"
	| "Healthy"
	| "Retained";

export type ClinicalMaterialCategory =
	| "composite"
	| "adhesive"
	| "endo"
	| "implant"
	| "suture"
	| "anesthesia"
	| "hygiene"
	| "ppe"
	| "auxiliary"
	| "surgery"
	| "orthopedics"
	| "biomaterial";

export type ClinicalMaterialUnit =
	| "г"
	| "мл"
	| "шт."
	| "пары"
	| "карп."
	| "компл."
	| "упак.";

export interface ClinicalMaterialDeduction {
	readonly name: string;
	readonly category: ClinicalMaterialCategory;
	readonly unit: ClinicalMaterialUnit;
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

export interface ClinicalAnestheticInfo {
	readonly drugKey: string;
	readonly drugName: string;
	readonly carpulesCount: number;
	readonly volumeMl: number;
}

export interface ClinicalSoapMasterProtocol {
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
	readonly anesthetic?: ClinicalAnestheticInfo | undefined;
	readonly service804n?: ClinicalService804n | undefined;
	readonly additionalServices804n?: readonly ClinicalService804n[] | undefined;
	readonly materialsToDeduct: readonly ClinicalMaterialDeduction[];
	readonly recommendations?: string | undefined;
	readonly warrantyMonths?: number | undefined;
	readonly serviceLifeMonths?: number | undefined;
	readonly informedConsent?: string | undefined;
	readonly postOpMemo?: string | undefined;
	readonly stomxId?: number | undefined;
	readonly tags?: readonly string[] | undefined;
	readonly is1ClickAutopilot?: boolean | undefined;
}
