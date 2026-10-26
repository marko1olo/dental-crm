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
	{ id: "articaine_1_200k", labelRu: "Ультракаин Д-С 1:200к", subLabelRu: "Ультракаин Д-С 1:200 000 (1 карпула 1.7 мл) • Стандартная терапия/эндодонтия", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000", vasoRatio: "1:200 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "articaine_1_100k", labelRu: "Ультракаин Д-С Форте 1:100к", subLabelRu: "Ультракаин Д-С Форте 1:100 000 (1 карпула 1.7 мл) • Длительные вмешательства / хирургия", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
	{ id: "mepivacaine_plain", labelRu: "Скандонест 3%", subLabelRu: "Скандонест 3% (Мепивакаин без вазоконстриктора, 1 карпула 1.8 мл) • Кардио-риск", activeSubstanceRu: "Мепивакаин 3% (чистый)", vasoRatio: "Без адреналина", isAdrenalineFree: true, isCardioRecommended: true },
	{ id: "septanest_1_100k", labelRu: "Септанест 1:100к", subLabelRu: "Септанест с адреналином 1:100 000 (1 карпула 1.7 мл)", activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000", vasoRatio: "1:100 000", isAdrenalineFree: false, isCardioRecommended: false },
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
		shortLabelRu: "Ультракаин Д-С 1:200к (1.7 мл)",
		fullLabelRu: "Ультракаин Д-С 1:200 000 (1 карпула 1.7 мл)",
		clinicalScopeRu: "Стандартная терапия/эндодонтия",
		testId: "anesthesia-preset-infiltration-articaine-200k",
		altTestId: "btn-anesthesia-preset-ultracain-ds",
		srOnlyText: "Ультракаин Д-С 1:200 000 Убистезин терапия эндодонтия",
	},
	{
		drugId: "articaine_1_100k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Ультракаин Д-С Форте 1:100к (1.7 мл)",
		fullLabelRu: "Ультракаин Д-С Форте 1:100 000 (1 карпула 1.7 мл)",
		clinicalScopeRu: "Длительные вмешательства / хирургия",
		testId: "anesthesia-dose-norm-preset",
		altTestId: "btn-anesthesia-preset-ultracain-ds-forte",
		srOnlyText: "Норма: Артикаин 1:100k Убистезин форте Ультракаин Д-С Форте 1:100 000",
	},
	{
		drugId: "mepivacaine_plain",
		count: 1.0,
		volumeMl: 1.8,
		shortLabelRu: "Скандонест 3% (1.8 мл)",
		fullLabelRu: "Скандонест 3% (Мепивакаин без вазоконстриктора, 1 карпула 1.8 мл)",
		clinicalScopeRu: "Кардио-риск, гипертония, пожилые пациенты, беременность",
		testId: "anesthesia-preset-scandonest-cardio",
		altTestId: "btn-anesthesia-preset-mepivacaine-plain",
		srOnlyText: "Скандонест без адреналина Мепивакаин 3% кардио-защита",
		isCardioRecommended: true,
	},
	{
		drugId: "septanest_1_100k",
		count: 1.0,
		volumeMl: 1.7,
		shortLabelRu: "Септанест 1:100к (1.7 мл)",
		fullLabelRu: "Септанест с адреналином 1:100 000 (1 карпула 1.7 мл)",
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
