/**
 * apps/web/src/components/treatment-plans/bundlesPresets/types.ts
 *
 * Типы и фабричные методы клинических пакетов «под ключ».
 */

import { type Kopecks, parseKopecks } from "@dental/shared";
import type { TreatmentPlanStageKind } from "../types";

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
	| "impression_asilicone_2jaws";

export type ClinicalBundleCategory =
	| "therapy"
	| "surgery"
	| "hygiene"
	| "orthopedics"
	| "implantation";

export interface ClinicalBundleItemTemplate {
	readonly id: string;
	readonly serviceCode: string;
	readonly code804n?: string;
	readonly name: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly defaultPriceKopecks: Kopecks;
	readonly materials: string;
	readonly clinicalRationale: string;
	readonly optional?: boolean;
	readonly defaultSelected?: boolean;
	readonly hideInPatientPresentation?: boolean;
}

export interface ClinicalBundleDefinition {
	readonly id: ClinicalBundleId;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly category: ClinicalBundleCategory;
	readonly categoryLabel: string;
	readonly categoryName: string;
	readonly stageKind: TreatmentPlanStageKind;
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
	stageKind: TreatmentPlanStageKind;
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

export type CbctBundleId =
	| "sinus_lift_closed_turnkey"
	| "sinus_lift_open_turnkey"
	| "crown_implant_zirconia_turnkey";
