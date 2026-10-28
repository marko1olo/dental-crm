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
	{ id: "septanest_1_100k", labelRu: "Септанест 1:100 000", subLabelRu: "Септанест с адреналином 1:100 000 (1.7 мл)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "articaine_1_200k", labelRu: "Ультракаин Д-С (Артикаин 1:200 000)", subLabelRu: "Ультракаин Д-С 1:200 000 (1.7 мл, щадящий)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000", vasoRatio: "1:200 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "mepivacaine_plain", labelRu: "Скандонест 3% (без адреналина)", subLabelRu: "Скандонест 3% (Мепивакаин 1.7 мл) • Кардио / Аллергия", activeSubstanceRu: "Мепивакаин 3% (чистый)", vasoRatio: "Без адреналина", isAdrenalineFree: true, isCardioRecommended: true },
	{ id: "articaine_1_100k", labelRu: "Артикаин 1:100 000 (Убистезин форте)", subLabelRu: "Артикаин 1:100 000 (1.7 мл, игла 30G)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
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
		shortLabelRu: "Септанест 1:100к (Артикаин 1:100 000)",
		fullLabelRu: "Септанест 1:100 000 (Артикаин 1:100 000) 1.7 мл, инфильтрация, игла 30G",
		clinicalScopeRu: "Стандартная инфильтрационная терапия (1 клик дефолт)",
		testId: "anesthesia-dose-norm-preset",
		altTestId: "btn-anesthesia-preset-septanest",
		srOnlyText: "Норма: Артикаин 1:100 000 Септанест 1:100k Убистезин форте инфильтрация игла 30G короткая 21мм",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
	},
	{
		drugId: "articaine_1_200k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Ультракаин Д-С (Артикаин 1:200 000)",
		fullLabelRu: "Ультракаин Д-С (Артикаин 1:200 000) 1.7 мл, инфильтрация",
		clinicalScopeRu: "Щадящая терапия / эндодонтия (пониженный адреналин)",
		testId: "anesthesia-preset-infiltration-articaine-200k",
		altTestId: "btn-anesthesia-preset-ultracain-ds",
		srOnlyText: "Артикаин 1:200 000 Ультракаин Д-С 1:200к терапия",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
	},
	{
		drugId: "mepivacaine_plain",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Скандонест 3% (Мепивакаин без адреналина)",
		fullLabelRu: "Скандонест 3% (Мепивакаин без адреналина) 1.7 мл — Кардио-безопасный",
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
];
