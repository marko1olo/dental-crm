/**
 * apps/web/src/components/sanpin/kraft/kraftPopularPresets.ts
 * Популярные пресеты крафт-пакетов и автоклавов. Мандат 8b: <= 120 строк.
 */

import {
	type KraftPackageMaterialId,
	type KraftPackageMaterialDefinition,
	KRAFT_PACKAGE_MATERIALS,
	type KraftPackageSizeId,
	type KraftPackageSizeDefinition,
	KRAFT_PACKAGE_SIZES,
} from "@dental/shared";

export interface QuickKraftPreset {
	readonly id: string;
	readonly brandNameRu: string;
	readonly dimensionsMm: string;
	readonly materialId: KraftPackageMaterialId;
	readonly sizeId: KraftPackageSizeId;
	readonly shelfLifeDays: number;
	readonly descriptionRu: string;
	readonly badgeTextRu: string;
}

export const POPULAR_KRAFT_PRESETS: readonly QuickKraftPreset[] = [
	{
		id: "sanpin_sealed_30d",
		brandNameRu: "Крафт-пакет запечатанный",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 30,
		descriptionRu: "Запечатанный самоклеящийся крафт-пакет (срок стерильности 30 суток)",
		badgeTextRu: "30 суток",
	},
	{
		id: "azov_100x200_50d",
		brandNameRu: "Azov Самоклейка",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 50,
		descriptionRu: "Пакет бумажный самоклеящийся",
		badgeTextRu: "50 суток",
	},
	{
		id: "dgm_75x150_50d",
		brandNameRu: "DGM Steriguard 75×150",
		dimensionsMm: "75×150 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_75x150",
		shelfLifeDays: 50,
		descriptionRu: "Самоклеящийся крафт-пакет для боров и эндодонтии",
		badgeTextRu: "50 суток",
	},
	{
		id: "dgm_100x200_30d",
		brandNameRu: "DGM Steriguard 100×200",
		dimensionsMm: "100×200 мм",
		materialId: "paper_self_seal_single",
		sizeId: "size_100x200",
		shelfLifeDays: 30,
		descriptionRu: "Пакет для смотровых и терапевтических наборов",
		badgeTextRu: "30 суток",
	},
];

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
		brandModelRu: "W&H Lina 17 (Австрия)",
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
