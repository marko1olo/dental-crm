/**
 * packages/shared/src/clinical/presets/index.ts
 *
 * Canonical Unified Presets Package Barrel (Mandates 8b, 8e, 8x, 8ap).
 * Single Source of Truth for Clinical SOAP, Autopilot, Bundles & Chairside Presets.
 */

export * from "./types.js";
export * from "./therapyPresets.js";
export * from "./surgeryPresets.js";

import { THERAPY_SOAP_PRESETS } from "./therapyPresets.js";
import { SURGERY_SOAP_PRESETS } from "./surgeryPresets.js";
import { therapyBundles } from "./therapyPresets.js";
import { surgeryBundles } from "./surgeryPresets.js";
import type { ClinicalSoapPreset, ClinicalBundleDefinition } from "./types.js";

/**
 * Returns all canonical SOAP protocols across therapy and surgery.
 */
export function getAllCanonicalSoapPresets(): readonly ClinicalSoapPreset[] {
	return [...THERAPY_SOAP_PRESETS, ...SURGERY_SOAP_PRESETS];
}

/**
 * Lookup a therapy SOAP preset by its ID.
 */
export function findTherapySoapPresetById(id: string): ClinicalSoapPreset | undefined {
	return THERAPY_SOAP_PRESETS.find((p) => p.id === id);
}

/**
 * Lookup a surgery SOAP preset by its ID.
 */
export function findSurgerySoapPresetById(id: string): ClinicalSoapPreset | undefined {
	return SURGERY_SOAP_PRESETS.find((p) => p.id === id);
}

/**
 * Universal lookup for any canonical clinical preset by ID.
 */
export function findCanonicalPresetById(id: string): ClinicalSoapPreset | undefined {
	return findTherapySoapPresetById(id) || findSurgerySoapPresetById(id);
}

/**
 * Universal lookup for any clinical bundle by ID.
 */
export function findClinicalBundleById(id: string): ClinicalBundleDefinition | undefined {
	return [...therapyBundles, ...surgeryBundles].find((b) => b.id === id);
}
