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
	{ id: "articaine_1_200k", labelRu: "Артикаин 1:200 000", subLabelRu: "Артикаин 1:200 000 (1.7 мл) — терапия/стандарт", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000", vasoRatio: "1:200 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "articaine_1_100k", labelRu: "Артикаин 1:100 000", subLabelRu: "Артикаин 1:100 000 (1.7 мл) — хирургия/гемостаз", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "mepivacaine_plain", labelRu: "Мепивакаин 3% (без адреналина)", subLabelRu: "Мепивакаин 3% без адреналина (1.7 мл) — кардио/беременность", activeSubstanceRu: "Мепивакаин 3% (чистый)", vasoRatio: "Без адреналина", isAdrenalineFree: true, isCardioRecommended: true },
	{ id: "lidocaine_plain", labelRu: "Лидокаин-спрей 10%", subLabelRu: "Лидокаин-спрей 10% (аппликационная)", activeSubstanceRu: "Лидокаин 10% спрей", vasoRatio: "Без адреналина", isAdrenalineFree: true, isCardioRecommended: false },
	{ id: "septanest_1_100k", labelRu: "Септанест 1:100 000", subLabelRu: "Септанест 1:100 000 (1.7 мл)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
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
		drugId: "articaine_1_200k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Артикаин 1:200 000",
		fullLabelRu: "Артикаин 1:200 000 (1.7 мл) — терапия/стандарт",
		clinicalScopeRu: "Терапия / стандарт (1.7 мл)",
		testId: "anesthesia-preset-infiltration-articaine-200k",
		altTestId: "btn-anesthesia-preset-ultracain-ds",
		srOnlyText: "Артикаин 1:200 000 Ультракаин Д-С 1:200к терапия",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
	},
	{
		drugId: "articaine_1_100k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Артикаин 1:100 000",
		fullLabelRu: "Артикаин 1:100 000 (1.7 мл) — хирургия/гемостаз",
		clinicalScopeRu: "Хирургия / гемостаз (1.7 мл)",
		testId: "anesthesia-dose-norm-preset",
		altTestId: "btn-anesthesia-preset-septanest",
		srOnlyText: "Норма: Артикаин 1:100 000 Септанест 1:100k Убистезин форте инфильтрация игла 30G короткая 21мм",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
	},
	{
		drugId: "mepivacaine_plain",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Мепивакаин 3% (без адреналина)",
		fullLabelRu: "Мепивакаин 3% без адреналина (1.7 мл) — кардио/беременность",
		clinicalScopeRu: "Кардио / беременность / группа риска (1.7 мл)",
		testId: "anesthesia-preset-scandonest-cardio",
		altTestId: "btn-anesthesia-preset-mepivacaine-plain",
		srOnlyText: "Мепивакаин 3% (без адреналина) Скандонест без адреналина кардио-защита группа риска",
		defaultTechnique: "infiltration",
		needleType: "g30_short_21mm",
		isCardioRecommended: true,
	},
	{
		drugId: "lidocaine_plain",
		count: 0.5,
		volumeMl: 0.5,
		shortLabelRu: "Лидокаин-спрей 10%",
		fullLabelRu: "Лидокаин-спрей 10% (аппликационная)",
		clinicalScopeRu: "Аппликационная анестезия места вкола",
		testId: "anesthesia-preset-lidocaine-spray",
		altTestId: "btn-anesthesia-preset-lidocaine-spray",
		srOnlyText: "Лидокаин-спрей 10% аппликационная анестезия",
		defaultTechnique: "application_topical",
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
];
