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
	{ id: "articaine_1_100k", labelRu: "Убистезин форте (Артикаин 1:100 000)", subLabelRu: "Убистезин форте 1:100 000 (1.7 мл, игла 30G)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "articaine_1_200k", labelRu: "Артикаин 1:200 000", subLabelRu: "Артикаин 4% 1:200 000 (Ультракаин Д-С 1.7 мл)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000", vasoRatio: "1:200 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "mepivacaine_plain", labelRu: "Мепивакаин 3% (без адреналина)", subLabelRu: "Мепивакаин 3% (Скандонест 1.7 мл) • Кардио / Аллергия", activeSubstanceRu: "Мепивакаин 3% (чистый)", vasoRatio: "Без адреналина", isAdrenalineFree: true, isCardioRecommended: true },
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
	readonly needleType?: string;
	readonly isCardioRecommended?: boolean;
}

export const CLINICAL_FAST_PRESETS: readonly ClinicalFastPresetItem[] = [
	{
		drugId: "articaine_1_100k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Убистезин форте (Артикаин 1:100к)",
		fullLabelRu: "Убистезин форте (Артикаин 1:100 000) 1.7 мл, инфильтрация, игла 30G короткая 21мм",
		clinicalScopeRu: "Стандартная инфильтрационная терапия (1 клик дефолт)",
		testId: "anesthesia-dose-norm-preset",
		altTestId: "btn-anesthesia-preset-ubistesin-forte",
		srOnlyText: "Норма: Артикаин 1:100 000 Убистезин форте 1:100k Артикаин 1:100 000 инфильтрация игла 30G короткая 21мм",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
	},
	{
		drugId: "articaine_1_100k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Мандибулярная (Артикаин 1:100к)",
		fullLabelRu: "Мандибулярная анестезия (Артикаин 1:100 000) 1.7 мл, игла 27G длинная 35мм",
		clinicalScopeRu: "Сложные случаи / проводниковая анестезия",
		testId: "anesthesia-preset-articaine-mandibular",
		altTestId: "btn-anesthesia-preset-mandibular",
		srOnlyText: "Мандибулярная анестезия Артикаин 1:100 000 игла 27G длинная 35мм",
		defaultTechnique: "mandibular_torus",
		needleType: "g27_long_35mm",
	},
	{
		drugId: "mepivacaine_plain",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Мепивакаин 3% (Скандонест)",
		fullLabelRu: "Мепивакаин 3% (Скандонест) без адреналина 1.7 мл",
		clinicalScopeRu: "Пациенты группы риска: кардио, гипертония, пожилые, беременность",
		testId: "anesthesia-preset-scandonest-cardio",
		altTestId: "btn-anesthesia-preset-mepivacaine-plain",
		srOnlyText: "Мепивакаин 3% (без адреналина) Скандонест без адреналина кардио-защита группа риска",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
		isCardioRecommended: true,
	},
	{
		drugId: "none",
		count: 0,
		volumeMl: 0,
		shortLabelRu: "Без анестезии",
		fullLabelRu: "Лечение без анестезии / Интактно по согласию пациента",
		clinicalScopeRu: "Лечение без анестезии",
		testId: "btn-anes-none",
		srOnlyText: "Лечение без анестезии / Интактно",
	},
	{
		drugId: "articaine_1_200k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Артикаин 1:200 000",
		fullLabelRu: "Артикаин 1:200 000 (Ультракаин Д-С 1.7 мл)",
		clinicalScopeRu: "Щадящая терапия / эндодонтия",
		testId: "anesthesia-preset-infiltration-articaine-200k",
		altTestId: "btn-anesthesia-preset-ultracain-ds",
		srOnlyText: "Артикаин 1:200 000 Ультракаин Д-С 1:200к терапия",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
	},
];
