/**
 * DENTAL IMPLANTS & SURGICAL PASSPORT COCKPIT (DENTE CRM)
 * Fast parameter fixation, zero non-medical certification bureaucracy,
 * touch-first ergonomics, warehouse soft overdraft non-blocking operations.
 */

export * from "./implantQuickPresets";
export * from "./ImplantPassportCard";
export * from "./ImplantPassportModal";
export * from "./implantCatalog";
export * from "./implantTorqueCatalog";

import {
	IMPLANT_BRANDS_METADATA,
	type ImplantBrand,
	type BrandMetadata,
	type PlatformType,
	getFixturesByBrand,
} from "./implantCatalog";

// Re-exports from existing catalog for backward compatibility
export function getImplantBrandById(brand: ImplantBrand): BrandMetadata | undefined {
	return IMPLANT_BRANDS_METADATA[brand];
}

export function getImplantPlatformById(brand: ImplantBrand, line?: string): PlatformType | undefined {
	const fix = getFixturesByBrand(brand).find((f) => !line || f.line === line);
	return fix?.platformType;
}

export {
	ImplantPassportModal as ImplantSurgicalPassportModal,
} from "./ImplantPassportModal";
export type {
	FastImplantPassportData as ImplantSurgicalPassportData,
} from "./implantQuickPresets";
