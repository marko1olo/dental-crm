/**
 * SANPIN 3.3686-21 & GOST R ISO 11607 KRAFT PACKAGING PRESETS & NORMS
 */

import {
	type KraftPackageMaterialId,
	type KraftPackageMaterialDefinition,
	KRAFT_PACKAGE_MATERIALS,
	type KraftPackageSizeId,
	type KraftPackageSizeDefinition,
	KRAFT_PACKAGE_SIZES,
} from "@dental/shared";

import {
	type ChemicalIndicatorClass,
	type ChemicalIndicatorDefinition,
	SANPIN_CHEMICAL_INDICATORS,
} from "./kraftPackageChemicalIndicators.js";

import {
	type DentalToolSetDefinition,
	DENTAL_TOOL_SETS_CATALOG,
} from "./kraftPackageToolSets.js";

export type {
	KraftPackageMaterialId,
	KraftPackageMaterialDefinition,
	KraftPackageSizeId,
	KraftPackageSizeDefinition,
	ChemicalIndicatorClass,
	ChemicalIndicatorDefinition,
	DentalToolSetDefinition,
};

export {
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
	SANPIN_CHEMICAL_INDICATORS,
	DENTAL_TOOL_SETS_CATALOG,
};

export interface AutoclaveUnitPreset {
	readonly id: string;
	readonly brandModelRu: string;
	readonly serialNumber: string;
	readonly chamberVolumeLiters: number;
}

export const CLINIC_AUTOCLAVE_UNITS: readonly AutoclaveUnitPreset[] = [
	{
		id: "AUTO-01",
		brandModelRu: "Melag Vacuklav 23 B+ (Германия)",
		serialNumber: "MEL-2024-9841",
		chamberVolumeLiters: 22,
	},
	{
		id: "AUTO-02",
		brandModelRu: "W&H Lisa 500 EcoDry (Австрия)",
		serialNumber: "WH-2023-44129",
		chamberVolumeLiters: 17,
	},
	{
		id: "AUTO-03",
		brandModelRu: "Euronda E9 Next (Италия)",
		serialNumber: "EUR-2025-88120",
		chamberVolumeLiters: 24,
	},
];

export function getKraftMaterialDefinition(id: KraftPackageMaterialId): KraftPackageMaterialDefinition {
	const found = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === id);
	return found || KRAFT_PACKAGE_MATERIALS[0]!;
}

export function getKraftSizeDefinition(id: KraftPackageSizeId): KraftPackageSizeDefinition {
	const found = KRAFT_PACKAGE_SIZES.find((s) => s.id === id);
	return found || KRAFT_PACKAGE_SIZES[1]!;
}

export function getChemicalIndicatorDefinition(id: string): ChemicalIndicatorDefinition {
	const found = SANPIN_CHEMICAL_INDICATORS.find((i) => i.id === id);
	return found || SANPIN_CHEMICAL_INDICATORS[0]!;
}

export function getDentalToolSetDefinition(id: string): DentalToolSetDefinition {
	const found = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === id);
	return found || DENTAL_TOOL_SETS_CATALOG[0]!;
}
