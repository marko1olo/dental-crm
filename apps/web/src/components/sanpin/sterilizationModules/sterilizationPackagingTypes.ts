import type { SanpinPackagingMaterialId } from "@dental/shared";

export interface PackagingShelfLifePreset {
	readonly id: string;
	readonly nameRu: string;
	readonly shelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly clauseRu: string;
	readonly sharedMaterialId?: SanpinPackagingMaterialId;
}

export const STATUTORY_PACKAGING_PRESETS: readonly PackagingShelfLifePreset[] = [
	{
		id: "kraft_self_adhesive",
		nameRu: "Бумажный крафт-пакет самоклеящийся",
		shelfLifeDays: 50,
		sealingMethodRu: "Клеевой клапан с защитным лайнером",
		clauseRu: "СанПиН 3.3686-21 Таблица 3.14 (20–50 суток)",
		sharedMaterialId: "kraft_self_seal",
	},
	{
		id: "laminated_heat_seal_single",
		nameRu: "Комбинированный пакет бумага + пленка (термосварка)",
		shelfLifeDays: 180,
		sealingMethodRu: "Термосварочный аппарат",
		clauseRu: "СанПиН 3.3686-21 Таблица 3.14 (до 180 суток)",
		sharedMaterialId: "heat_seal_pouch",
	},
	{
		id: "laminated_heat_seal_double",
		nameRu: "Двойная упаковка термосварочная",
		shelfLifeDays: 365,
		sealingMethodRu: "Двойной термосварочный шов",
		clauseRu: "СанПиН 3.3686-21 п. 3632 (до 1 года)",
	},
	{
		id: "bix_filter_kspf",
		nameRu: "Стерилизационная коробка (Бикс КСПФ с фильтром)",
		shelfLifeDays: 20,
		sealingMethodRu: "Механические замки бикса + фильтры",
		clauseRu: "СанПиН 3.3686-21 п. 3631 (20 суток)",
	},
	{
		id: "unpacked_tray",
		nameRu: "Без упаковки (на открытом стерильном лотке)",
		shelfLifeDays: 0,
		sealingMethodRu: "Без упаковки",
		clauseRu: "СанПиН 3.3686-21 п. 3634 (непосредственно перед процедурой)",
		sharedMaterialId: "unpacked_immediate",
	},
];

export interface ChamberPointState {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly labelRu: string;
	passed: boolean;
}

export const INITIAL_5_POINTS: ChamberPointState[] = [
	{ pointIndex: 1, code: "КТ-1", labelRu: "Верхний передний правый угол", passed: true },
	{ pointIndex: 2, code: "КТ-2", labelRu: "Нижний задний левый угол", passed: true },
	{ pointIndex: 3, code: "КТ-3", labelRu: "Центр камеры", passed: true },
	{ pointIndex: 4, code: "КТ-4", labelRu: "Зона выхода конденсата", passed: true },
	{ pointIndex: 5, code: "КТ-5", labelRu: "Верхняя задняя зона", passed: true },
];

export type SteamPenetrationTestType = "none" | "bowie_dick" | "helix_pcd";

export interface SteamPenetrationTestOption {
	readonly id: SteamPenetrationTestType;
	readonly nameRu: string;
	readonly descriptionRu: string;
}

export const STEAM_PENETRATION_TEST_OPTIONS: readonly SteamPenetrationTestOption[] = [
	{ id: "none", nameRu: "Без теста проникновения пара", descriptionRu: "Стандартная ежедневная загрузка" },
	{ id: "bowie_dick", nameRu: "Тест Бови-Дика", descriptionRu: "Проверка эффективности вакуума" },
	{ id: "helix_pcd", nameRu: "Helix-тест", descriptionRu: "Проверка проникновения в полые каналы" },
];
