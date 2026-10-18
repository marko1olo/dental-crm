/**
 * apps/web/src/components/sanpin/kraft/popularKraftPresets.ts
 *
 * Популярные пресеты крафт-пакетов (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

import type { KraftPackageMaterialId, KraftPackageSizeId } from "./kraftPackagePresets";

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
		descriptionRu: "Пакет бумажный самоклеящийся (СанПиН 3.3686-21)",
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
