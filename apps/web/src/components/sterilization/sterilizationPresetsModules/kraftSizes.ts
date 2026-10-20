/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/kraftSizes.ts
 *
 * Нормативные типоразмеры крафт-пакетов.
 * Мандат 8b: строго <= 120 строк.
 */

import type { KraftPackageSizeOption } from "./types.js";

export const STATUTORY_KRAFT_SIZES: readonly KraftPackageSizeOption[] = [
	{
		id: "size_75x150",
		dimensionsMm: "75x150 мм",
		widthMm: 75,
		heightMm: 150,
		maxShelfLifeDays: 50,
		indicatorTypeRu: "Химический индикатор 4/5 класса (Винар / DGM / Медтест)",
		typicalUsageRu: "Боры алмазные и твердосплавные, эндодонтические файлы",
	},
	{
		id: "size_100x200",
		dimensionsMm: "100x200 мм",
		widthMm: 100,
		heightMm: 200,
		maxShelfLifeDays: 50,
		indicatorTypeRu: "Химический интегратор 5 класса (ИнтеТЕСТ-В-134/5)",
		typicalUsageRu:
			"Стандартный смотровой терапевтический лоток (зеркало, зонд, пинцет)",
	},
	{
		id: "size_150x250",
		dimensionsMm: "150x250 мм",
		widthMm: 150,
		heightMm: 250,
		maxShelfLifeDays: 50,
		indicatorTypeRu: "Химический интегратор 5 класса (DGM Steriguard 5)",
		typicalUsageRu:
			"Хирургический экстракционный набор, кюреты Грейси, наконечники",
	},
];
