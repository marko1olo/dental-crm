/**
 * packages/shared/src/clinical/presets/types.ts
 *
 * Canonical Unified Types for Clinical Presets, Bundles & Autopilots (SSOT).
 * Unifies:
 * 1. Clinical SOAP Presets (Visit EMR, Ministry of Health Orders No. 804n, No. 1051n, StAR).
 * 2. Doctor 1-Click Autopilot Presets (Mandate 8e: Doctor autonomy, 0-friction chairside).
 * 3. Clinical Bundle Definitions (Treatment Plans & Pricelist turnkey packages).
 * 4. Chairside Copilot Presets (AI Assistant clinical protocols & thoughts).
 *
 * Mandate 8b: Subcomponent modularity.
 * Mandate 8d item 7: Strictly 0 cartoon emojis in clinical records.
 * Mandate 8v: Automated BOM deduction without manual nurse clicking.
 */

import { type Kopecks, parseKopecks } from "../../money.js";
import type {
	ClinicalAnestheticInfo,
	ClinicalMaterialCategory,
	ClinicalMaterialDeduction,
	ClinicalMaterialUnit,
	ClinicalPresetCategory,
	ClinicalService804n,
	ToothClinicalState,
} from "../soap/soapTypes.js";

export type {
	ClinicalAnestheticInfo,
	ClinicalMaterialCategory,
	ClinicalMaterialDeduction,
	ClinicalMaterialUnit,
	ClinicalPresetCategory,
	ClinicalService804n,
	ToothClinicalState,
};

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
	readonly defaultTooth?: number | null | undefined;
	readonly anesthetic?: ClinicalAnestheticInfo | undefined;
	readonly service804n?: ClinicalService804n | null | undefined;
	readonly additionalServices804n?: readonly ClinicalService804n[] | undefined;
	readonly materialsToDeduct?: readonly ClinicalMaterialDeduction[] | undefined;
	readonly recommendations?: string | undefined;
	readonly warrantyMonths?: number | undefined;
	readonly serviceLifeMonths?: number | undefined;
	readonly informedConsent?: string | undefined;
	readonly postOpMemo?: string | undefined;
	readonly tags?: readonly string[] | undefined;
	readonly is1ClickAutopilot?: boolean | undefined;
	readonly surfaces?: string | null | undefined;
}

export interface DoctorAutopilotPreset extends ClinicalSoapPreset {
	readonly surfaces?: string | null | undefined;
	readonly informedConsent?: string | undefined;
	readonly postOpMemo?: string | undefined;
	readonly is1ClickAutopilot: true;
}

export type ClinicalBundleId =
	| "caries_turnkey"
	| "endo_1canal_turnkey"
	| "endo_3canal_turnkey"
	| "hygiene_turnkey"
	| "extraction_turnkey"
	| "complex_extraction"
	| "implant_turnkey"
	| "crown_metalloceramic_turnkey"
	| "crown_zirconia_turnkey"
	| "impression_asilicone_2jaws"
	| string;

export type ClinicalBundleCategory =
	| "therapy"
	| "surgery"
	| "hygiene"
	| "orthopedics"
	| "implantation";

export interface ClinicalBundleItemTemplate {
	readonly id: string;
	readonly serviceCode: string;
	readonly code804n?: string | undefined;
	readonly name: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly defaultPriceKopecks: Kopecks;
	readonly materials: string;
	readonly clinicalRationale: string;
	readonly optional?: boolean | undefined;
	readonly defaultSelected?: boolean | undefined;
	readonly hideInPatientPresentation?: boolean | undefined;
}

export interface ClinicalBundleDefinition {
	readonly id: ClinicalBundleId;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly category: ClinicalBundleCategory;
	readonly categoryLabel: string;
	readonly categoryName: string;
	readonly stageKind: string;
	readonly stageNumber: 1 | 2 | 3;
	readonly totalPriceRub: number;
	readonly totalPriceKopecks: Kopecks;
	readonly basePriceRub: number;
	readonly basePriceKopecks: Kopecks;
	readonly requiresTooth: boolean;
	readonly defaultTooth: number;
	readonly items: readonly ClinicalBundleItemTemplate[];
	readonly badgeColor: string;
}

export function item(
	id: string,
	serviceCode: string,
	name: string,
	category: string,
	defaultPriceRub: number,
	materials: string,
	clinicalRationale: string,
	optional = false,
): ClinicalBundleItemTemplate {
	return {
		id,
		serviceCode,
		code804n: serviceCode,
		name,
		category,
		defaultPriceRub,
		defaultPriceKopecks: parseKopecks(defaultPriceRub),
		materials,
		clinicalRationale,
		optional,
		defaultSelected: true,
		hideInPatientPresentation: false,
	};
}

export function bundle(def: {
	id: ClinicalBundleId;
	title: string;
	shortTitle: string;
	description: string;
	category: ClinicalBundleCategory;
	categoryLabel: string;
	categoryName: string;
	stageKind: string;
	stageNumber: 1 | 2 | 3;
	totalPriceRub: number;
	requiresTooth: boolean;
	defaultTooth: number;
	badgeColor: string;
	items: readonly ClinicalBundleItemTemplate[];
}): ClinicalBundleDefinition {
	return {
		...def,
		totalPriceKopecks: parseKopecks(def.totalPriceRub),
		basePriceRub: def.totalPriceRub,
		basePriceKopecks: parseKopecks(def.totalPriceRub),
	};
}

export interface ChairsideCopilotService {
	readonly id: string;
	readonly code804n: string;
	readonly title: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly toothNumber?: number | undefined;
}

export interface ChairsideCopilotPreset {
	readonly id: string;
	readonly label: string;
	readonly prompt: string;
	readonly toothNumber: number;
	readonly toothState: string;
	readonly toothStateLabel: string;
	readonly surfaces: readonly string[];
	readonly services: readonly ChairsideCopilotService[];
	readonly soap: {
		readonly complaint: string;
		readonly anamnesis: string;
		readonly objectiveStatus: string;
		readonly diagnosis: string;
		readonly treatmentPlan: string;
		readonly recommendations: string;
	};
	readonly anesthetic?: {
		readonly drugName: string;
		readonly carpulesCount: number;
		readonly patientWeightKg?: number | undefined;
		readonly maxCarpules?: number | undefined;
		readonly epinephrineMcg?: number | undefined;
		readonly isCardiovascularRisk?: boolean | undefined;
		readonly notes?: string | undefined;
	} | undefined;
	readonly consent?: {
		readonly consentCode: string;
		readonly consentTitle: string;
		readonly regulatoryBasis: string;
		readonly procedureType: string;
		readonly toothOrArea: string;
	} | undefined;
	readonly safetyAlert?: {
		readonly id: string;
		readonly severity: "info" | "warning" | "danger";
		readonly title: string;
		readonly description: string;
	} | undefined;
	readonly thoughts?: readonly {
		readonly id: string;
		readonly stepNumber: number;
		readonly title: string;
		readonly status: "done" | "in_progress" | "pending";
		readonly detail: string;
		readonly durationMs: number;
	}[] | undefined;
}
