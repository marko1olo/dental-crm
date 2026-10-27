/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/primaryDrugs.ts
 * Primary Anesthetic Drugs & 1-Click Clinical Presets (Mandates 8b, 8e, 8y, <= 120 lines)
 */

import type { AnestheticDrugId, InjectionTechniqueId } from "../anesthesiaCatalog";

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
	{ id: "articaine_1_200k", labelRu: "Артикаин 1:200 000", subLabelRu: "Артикаин 4% 1:200 000 (Ультракаин Д-С 1.7 мл)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000", vasoRatio: "1:200 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "articaine_1_100k", labelRu: "Артикаин 1:100 000", subLabelRu: "Артикаин 4% 1:100 000 (Ультракаин Д-С Форте 1.7 мл)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "mepivacaine_plain", labelRu: "Мепивакаин 3% (без адреналина)", subLabelRu: "Мепивакаин 3% (Скандонест 1.8 мл) • Кардио / Аллергия", activeSubstanceRu: "Мепивакаин 3% (чистый)", vasoRatio: "Без адреналина", isAdrenalineFree: true, isCardioRecommended: true },
	{ id: "septanest_1_100k", labelRu: "Септанест 1:100 000", subLabelRu: "Септанест с адреналином 1:100 000 (1.7 мл)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "lidocaine_1_100k", labelRu: "Лидокаин 2%", subLabelRu: "Лидокаин 2% с адреналином 1:100 000", activeSubstanceRu: "Лидокаин 2% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
];

export interface ClinicalFastPresetItem {
	readonly drugId: AnestheticDrugId | "none";
	readonly count: number;
	readonly volumeMl: number;
	readonly shortLabelRu: string;
	readonly fullLabelRu: string;
	readonly clinicalScopeRu: string;
	readonly testId: string;
	readonly altTestId?: string;
	readonly srOnlyText: string;
	readonly defaultTechnique?: InjectionTechniqueId;
	readonly isCardioRecommended?: boolean;
}

export const CLINICAL_FAST_PRESETS: readonly ClinicalFastPresetItem[] = [
	{
		drugId: "articaine_1_200k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Артикаин 1:200 000",
		fullLabelRu: "Артикаин 1:200 000 (Ультракаин Д-С 1.7 мл)",
		clinicalScopeRu: "Стандартная терапия/эндодонтия",
		testId: "anesthesia-preset-infiltration-articaine-200k",
		altTestId: "btn-anesthesia-preset-ultracain-ds",
		srOnlyText: "Артикаин 1:200 000 Ультракаин Д-С 1:200к Убистезин терапия",
	},
	{
		drugId: "articaine_1_100k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Артикаин 1:100 000",
		fullLabelRu: "Артикаин 1:100 000 (Ультракаин Д-С Форте 1.7 мл)",
		clinicalScopeRu: "Длительные вмешательства / хирургия",
		testId: "anesthesia-dose-norm-preset",
		altTestId: "btn-anesthesia-preset-ultracain-ds-forte",
		srOnlyText: "Норма: Артикаин 1:100k Убистезин форте Ультракаин Д-С Форте 1:100 000",
	},
	{
		drugId: "mepivacaine_plain",
		count: 1.0,
		volumeMl: 1.8,
		shortLabelRu: "Мепивакаин 3% (без адреналина)",
		fullLabelRu: "Мепивакаин 3% (Скандонест без адреналина 1.8 мл)",
		clinicalScopeRu: "Кардио-риск, аллергия в анамнезе, пожилые пациенты, беременность",
		testId: "anesthesia-preset-scandonest-cardio",
		altTestId: "btn-anesthesia-preset-mepivacaine-plain",
		srOnlyText: "Мепивакаин 3% Скандонест без адреналина кардио-защита",
		isCardioRecommended: true,
	},
	{
		drugId: "septanest_1_100k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Септанест 1:100 000",
		fullLabelRu: "Септанест с адреналином 1:100 000 (1.7 мл)",
		clinicalScopeRu: "Септанест с адреналином 1:100 000",
		testId: "btn-anesthesia-preset-septanest-100k",
		srOnlyText: "Септанест с адреналином 1:100 000 1 карпула 1.7 мл",
	},
	{
		drugId: "none",
		count: 0,
		volumeMl: 0,
		shortLabelRu: "Без анестезии",
		fullLabelRu: "Без анестезии / Интактно по согласию пациента",
		clinicalScopeRu: "Лечение без анестезии",
		testId: "btn-anes-none",
		srOnlyText: "Без анестезии / Интактно",
	},
];
