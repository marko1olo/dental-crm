/**
 * packages/shared/src/sanpin/packagingSsot/packageSizes.ts
 * Типоразмеры крафт-пакетов стерилизации.
 * Мандат 8b: строго <= 120 строк.
 */

export type SanpinPackageSizeId =
	| "size_75x150"
	| "size_100x200"
	| "size_100x250"
	| "size_150x250"
	| "size_200x300";

export interface SanpinPackageSizeDefinition {
	readonly id: SanpinPackageSizeId;
	readonly widthMm: number;
	readonly heightMm: number;
	readonly dimensionsMmRu: string;
	readonly titleRu: string;
	readonly dentalApplicationRu: string;
	readonly standardCapacityItems: number;
}

export const SANPIN_PACKAGE_SIZES: readonly SanpinPackageSizeDefinition[] = [
	{
		id: "size_75x150",
		widthMm: 75,
		heightMm: 150,
		dimensionsMmRu: "75 × 150 мм",
		titleRu: "Компактный (боры и эндо)",
		dentalApplicationRu: "Смотровой лоток, алмазные и твердосплавные боры, файлы, полиры",
		standardCapacityItems: 6,
	},
	{
		id: "size_100x200",
		widthMm: 100,
		heightMm: 200,
		dimensionsMmRu: "100 × 200 мм",
		titleRu: "Стандартный (щипцы и элеваторы)",
		dentalApplicationRu: "Хирургические щипцы, элеваторы, базовый терапевтический лоток",
		standardCapacityItems: 5,
	},
	{
		id: "size_100x250",
		widthMm: 100,
		heightMm: 250,
		dimensionsMmRu: "100 × 250 мм",
		titleRu: "Удлиненный (наконечники)",
		dentalApplicationRu: "Наконечники турбинные, микромоторные угловые, насадки скейлера",
		standardCapacityItems: 4,
	},
	{
		id: "size_150x250",
		widthMm: 150,
		heightMm: 250,
		dimensionsMmRu: "150 × 250 мм",
		titleRu: "Широкий (имплантация и хирургия)",
		dentalApplicationRu: "Базовый набор имплантации, хирургический лоток, кюреты Грейси",
		standardCapacityItems: 8,
	},
	{
		id: "size_200x300",
		widthMm: 200,
		heightMm: 300,
		dimensionsMmRu: "200 × 300 мм",
		titleRu: "Крупный кассетный",
		dentalApplicationRu: "Сетчатые кассеты имплантологии, полные ортопедические наборы",
		standardCapacityItems: 12,
	},
];

export function getSanpinPackageSize(id: SanpinPackageSizeId): SanpinPackageSizeDefinition {
	return SANPIN_PACKAGE_SIZES.find((s) => s.id === id) || SANPIN_PACKAGE_SIZES[1]!;
}
