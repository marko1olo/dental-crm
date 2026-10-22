export type KraftPackagingType =
	| "kraft_heat_sealed"
	| "kraft_self_adhesive"
	| "laminated_heat_sealed"
	| "crepe_paper_double"
	| "bix_filter_kspf"
	| "unpacked";

export interface KraftPackagingMeta {
	readonly id: KraftPackagingType;
	readonly nameRu: string;
	readonly statutoryShelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly descriptionRu: string;
	readonly standardClauseRu: string;
}

export const STATUTORY_PACKAGING_TYPES: Record<KraftPackagingType, KraftPackagingMeta> = {
	kraft_heat_sealed: {
		id: "kraft_heat_sealed",
		nameRu: "Крафт-пакет бумажный (термосварка швом >= 8 мм)",
		statutoryShelfLifeDays: 50,
		sealingMethodRu: "Термосварочный аппарат (импульсный запайщик)",
		descriptionRu: "Пакеты из крафт-бумаги плотностью 70 г/м², запечатанные термоклеевым швом",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (до 50 суток в одинарном пакете)",
	},
	kraft_self_adhesive: {
		id: "kraft_self_adhesive",
		nameRu: "Крафт-пакет бумажный (самоклеящийся клапан)",
		statutoryShelfLifeDays: 30,
		sealingMethodRu: "Клеевая полоса с защитным лайнером",
		descriptionRu: "Пакеты с липким клапаном (Клинпак, Медтест, DGM Steriguard)",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (до 30 суток с самоклеящейся лентой)",
	},
	laminated_heat_sealed: {
		id: "laminated_heat_sealed",
		nameRu: "Комбинированный рулон/пакет пленка/бумага (термосварка)",
		statutoryShelfLifeDays: 180,
		sealingMethodRu: "Термосварочный аппарат с контролем температуры",
		descriptionRu: "Прозрачная многослойная полимерная пленка + медицинская бумага",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (до 180 суток при одинарном шве)",
	},
	crepe_paper_double: {
		id: "crepe_paper_double",
		nameRu: "Крепированная бумага (двойная упаковка)",
		statutoryShelfLifeDays: 30,
		sealingMethodRu: "Складывание конвертом + индикаторная лента",
		descriptionRu: "Листовая крепированная бумага медицинского назначения",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (21-30 суток)",
	},
	bix_filter_kspf: {
		id: "bix_filter_kspf",
		nameRu: "Стерилизационная коробка с антибактериальным фильтром (КСПФ)",
		statutoryShelfLifeDays: 20,
		sealingMethodRu: "Замки бикса + фильтры",
		descriptionRu: "Металлические биксы с многоразовыми фильтрами",
		standardClauseRu: "СанПиН 3.3686-21 п. 3632 (до 20 суток)",
	},
	unpacked: {
		id: "unpacked",
		nameRu: "Без упаковки (на открытом стерильном лотке)",
		statutoryShelfLifeDays: 0,
		sealingMethodRu: "Без запечатывания",
		descriptionRu: "Использование непосредственно после извлечения (до 6 ч на стерильном столе)",
		standardClauseRu: "СанПиН 3.3686-21 п. 3634",
	},
};

export type SterilityStatus = "sterile_valid" | "expiring_soon_7d" | "expired" | "recalled";

export interface SterilityCalculation {
	readonly packDateFormatted: string;
	readonly expDateFormatted: string;
	readonly expDateIso: string;
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: SterilityStatus;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly humanReadableRemainingRu: string;
}
