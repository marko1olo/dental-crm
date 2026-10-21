import type { AnestheticDrugId } from "../anesthesiaCatalog";

export const WEIGHT_QUICK_PRESETS: readonly number[] = [
	15, 30, 50, 70, 85, 100,
];
export const WEIGHT_PRESETS: readonly number[] = WEIGHT_QUICK_PRESETS;

export interface PrimaryAnestheticDrug {
	readonly id: AnestheticDrugId;
	readonly labelRu: string;
	readonly subLabelRu: string;
	readonly activeSubstanceRu: string;
	readonly vasoRatio: string;
	readonly isAdrenalineFree: boolean;
	readonly isCardioRecommended: boolean;
}

export const PRIMARY_ANESTHETIC_DRUGS: readonly PrimaryAnestheticDrug[] = [
	{
		id: "articaine_1_200k",
		labelRu: "Ультракаин D-S 1:200k (Септонест)",
		subLabelRu: "Артикаин 4% • Щадящий адреналин 1:200 000 • Стандарт терапии",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000",
		vasoRatio: "1:200 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "articaine_1_100k",
		labelRu: "Ультракаин D-S forte 1:100k",
		subLabelRu: "Артикаин 4% • Глубокая анестезия • Эндодонтия и хирургия",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000",
		vasoRatio: "1:100 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "mepivacaine_plain",
		labelRu: "Скандонест 3% (без вазоконстр.)",
		subLabelRu:
			"Мепивакаин 3% • Для сердечников, беременных и при астме • Без сульфитов",
		activeSubstanceRu: "Мепивакаин 3% (чистый)",
		vasoRatio: "Без адреналина",
		isAdrenalineFree: true,
		isCardioRecommended: true,
	},
	{
		id: "lidocaine_1_100k",
		labelRu: "Лидокаин 2% (с адреналином)",
		subLabelRu: "Лидокаин 2% • Традиционная анестезия",
		activeSubstanceRu: "Лидокаин 2% + Эпинефрин 1:100 000",
		vasoRatio: "1:100 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
];
