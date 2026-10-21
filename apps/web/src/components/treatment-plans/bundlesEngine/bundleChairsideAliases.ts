import {
	CLINICAL_BUNDLES,
	type ClinicalBundleCategory,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
	type ClinicalBundleItemTemplate,
} from "../treatmentPlanBundlesPresets";
import { createBundleInvoiceExport, createBundleInvoiceItems } from "./bundleInvoiceExporter";
import { createBundlePlanItems } from "./bundlePlanItemsBuilder";
import { calculateBundlePrice } from "./bundlePriceCalculator";
import { getAllClinicalBundles, getClinicalBundleById } from "./bundleRegistry";
import { applyClinicalBundleToStages } from "./bundleStageApplier";
import { applyClinicalBundleToTier } from "./bundleTierApplier";

export const getChairsideBundleById = getClinicalBundleById;
export const getAllChairsideBundles = getAllClinicalBundles;
export const CHAIRSIDE_CLINICAL_BUNDLES = CLINICAL_BUNDLES;
export const calculateChairsideBundlePrice = calculateBundlePrice;
export const createChairsideBundlePlanItems = createBundlePlanItems;
export const applyChairsideBundleToStages = applyClinicalBundleToStages;
export const applyChairsideBundleToTier = applyClinicalBundleToTier;
export const createChairsideBundleInvoiceItems = createBundleInvoiceItems;
export const createChairsideBundleInvoiceExport = createBundleInvoiceExport;

export type ChairsideBundleId = ClinicalBundleId;
export type ChairsideBundleCategory = ClinicalBundleCategory;
export type ChairsideClinicalBundleDefinition = ClinicalBundleDefinition;
export type ChairsideBundleItemDefinition = ClinicalBundleItemTemplate;
