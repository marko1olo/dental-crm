/**
 * treatmentPlanBundlesPresets.ts — Эталонные клинические пакеты «под ключ» DENTE CRM.
 * (Мандат 8e: Запрет на палки в колёса врачам и персоналу / Пакеты под ключ вместо номенклатурного ада).
 */

import {
	type ClinicalBundleId,
	type ClinicalBundleCategory,
	type ClinicalBundleItemTemplate,
	type ClinicalBundleDefinition,
	type CbctBundleId,
} from "./bundlesPresets/types";
import { therapyBundles } from "./bundlesPresets/therapyPresets";
import { surgeryBundles } from "./bundlesPresets/surgeryPresets";
import { orthopedicBundles } from "./bundlesPresets/orthopedicPresets";
import { cbctBundles } from "./bundlesPresets/cbctPresets";

export type {
	ClinicalBundleId,
	ClinicalBundleCategory,
	ClinicalBundleItemTemplate,
	ClinicalBundleDefinition,
	CbctBundleId,
};

export const CLINICAL_BUNDLES: readonly ClinicalBundleDefinition[] = [
	...therapyBundles,
	...surgeryBundles,
	...orthopedicBundles,
];

export const CBCT_CLINICAL_BUNDLES: readonly ClinicalBundleDefinition[] = cbctBundles;
