/**
 * packages/shared/src/sanpin/packagingSsot/packagingMaterials.ts
 * Упаковочные материалы и сроки стерильности (СанПиН 3.3686-21, ГОСТ Р ИСО 11607).
 * Мандат 8b: строго <= 120 строк.
 */

export type SanpinPackagingMaterialId =
	| "kraft_self_seal"
	| "heat_seal_roll"
	| "heat_seal_pouch"
	| "crepe_paper_wrap"
	| "unpacked_immediate";

export interface SanpinPackagingMaterialDefinition {
	readonly id: SanpinPackagingMaterialId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly statutoryShelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly sanpinClauseRu: string;
	readonly gostStandardRu: string;
	readonly descriptionRu: string;
	readonly isHeatSealed: boolean;
	readonly isImmediateUseOnly: boolean;
}

export const SANPIN_PACKAGING_MATERIALS: readonly SanpinPackagingMaterialDefinition[] = [
	{
		id: "kraft_self_seal",
		nameRu: "Крафт-пакет бумажный самоклеящийся",
		shortLabelRu: "Крафт-пакет самоклеящийся (50 сут.)",
		statutoryShelfLifeDays: 50,
		sealingMethodRu: "Встроенный самоклеящийся клапан с защитным лайнером",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / ГОСТ 10354",
		descriptionRu: "Пакет из влагопрочной крафт-бумаги с липким клапаном. Срок 50 суток.",
		isHeatSealed: false,
		isImmediateUseOnly: false,
	},
	{
		id: "heat_seal_roll",
		nameRu: "Термосварочный рулон (бумага + пленка)",
		shortLabelRu: "Термосварочный рулон (20 сут.)",
		statutoryShelfLifeDays: 20,
		sealingMethodRu: "Импульсный термосвариватель (ширина шва ≥ 8 мм)",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-5",
		descriptionRu: "Рулонный упаковочный материал бумага+полимер со сварным швом. Срок 20 суток.",
		isHeatSealed: true,
		isImmediateUseOnly: false,
	},
	{
		id: "heat_seal_pouch",
		nameRu: "Комбинированный пакет термосварной со швом ≥ 8 мм",
		shortLabelRu: "Комби-пакет термосварной (60–180 сут.)",
		statutoryShelfLifeDays: 60,
		sealingMethodRu: "Термосварочный аппарат с валидацией шва (шов ≥ 8 мм)",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632, п. 3634",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-5",
		descriptionRu: "Пакет бумага+пленка с тройным термошвом. 60 суток (до 180 суток в чистых боксах).",
		isHeatSealed: true,
		isImmediateUseOnly: false,
	},
	{
		id: "crepe_paper_wrap",
		nameRu: "Крепированная бумага стерилизационная (в 2 слоя)",
		shortLabelRu: "Креп-бумага 2 слоя (60 сут.)",
		statutoryShelfLifeDays: 60,
		sealingMethodRu: "Конвертное двухслойное пеленание с фиксацией индикаторной лентой",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3633",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-2",
		descriptionRu: "Двухслойная креп-бумага. Оптимальна для тяжелых хирургических кассет.",
		isHeatSealed: false,
		isImmediateUseOnly: false,
	},
	{
		id: "unpacked_immediate",
		nameRu: "Без упаковки (открытый лоток на столике)",
		shortLabelRu: "Без упаковки (немедленно)",
		statutoryShelfLifeDays: 0,
		sealingMethodRu: "Открытое размещение в стерилизационной камере",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3636",
		gostStandardRu: "СанПиН 3.3686-21",
		descriptionRu: "Инструменты без упаковки: использовать немедленно у кресла. Хранение запрещено.",
		isHeatSealed: false,
		isImmediateUseOnly: true,
	},
];

export function getSanpinPackagingMaterial(id: SanpinPackagingMaterialId): SanpinPackagingMaterialDefinition {
	return SANPIN_PACKAGING_MATERIALS.find((m) => m.id === id) || SANPIN_PACKAGING_MATERIALS[0]!;
}
