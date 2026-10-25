/**
 * apps/web/src/components/sanpin/kraft/kraftPackagePresets.ts
 * Фасад пресетов крафт-пакетов и наборов. Мандат 8b: строго <= 120 строк.
 */

export {
	type KraftPackageMaterialId,
	type KraftPackageMaterialDefinition,
	KRAFT_PACKAGE_MATERIALS,
	type KraftPackageSizeId,
	type KraftPackageSizeDefinition,
	KRAFT_PACKAGE_SIZES,
} from "@dental/shared";

export * from "./kraftIndicatorPresets.js";
export * from "./kraftToolSetsCatalog.js";
export * from "./kraftPopularPresets.js";
