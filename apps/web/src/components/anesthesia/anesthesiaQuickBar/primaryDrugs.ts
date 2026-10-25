/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/primaryDrugs.ts
 * Primary Anesthetic Drugs & Weight Presets for QuickBar (Mandates 8b, 8e, 8y, <= 120 lines)
 */

import type { AnestheticDrugId } from "../anesthesiaCatalog";

export const WEIGHT_QUICK_PRESETS: readonly number[] = [15, 30, 50, 70, 85, 100];
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
		id: "articaine_1_100k",
		labelRu: "Ультракаин 1:100к",
		subLabelRu: "Ультракаин Д-С Форте 1:100 000 • Артикаин 4%",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000",
		vasoRatio: "1:100 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "articaine_1_200k",
		labelRu: "Убистезин",
		subLabelRu: "Ультракаин Д-С 1:200 000 (Убистезин) • Щадящий адреналин",
		activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000",
		vasoRatio: "1:200 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
	{
		id: "mepivacaine_plain",
		labelRu: "Скандонест (без адреналина)",
		subLabelRu: "Скандонест без адреналина • Мепивакаин 3% чистый",
		activeSubstanceRu: "Мепивакаин 3% (чистый)",
		vasoRatio: "Без адреналина",
		isAdrenalineFree: true,
		isCardioRecommended: true,
	},
	{
		id: "lidocaine_1_100k",
		labelRu: "Лидокаин 2%",
		subLabelRu: "Лидокаин 2% с адреналином 1:100 000",
		activeSubstanceRu: "Лидокаин 2% + Эпинефрин 1:100 000",
		vasoRatio: "1:100 000",
		isAdrenalineFree: false,
		isCardioRecommended: false,
	},
];
