/**
 * @dental/web/components/anesthesia/anesthesiaCatalogData.ts
 * Clinical Anesthesia SSOT Catalog (Mandates 8b 200-250 lines, 8e, 8n, 8y, 8am)
 * 4 canonical drugs, 1-click chairside presets & soft negative stock writeoff.
 */

import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export type AnestheticDrugId =
	| "articaine_1_100k"
	| "articaine_1_200k"
	| "mepivacaine_plain"
	| "lidocaine_1_100k"
	| "septanest_1_100k"
	| "lidocaine_plain"
	| "bupivacaine_05";

export type VasoconstrictorRatio = "1:100000" | "1:200000" | "none";
export type NeedleGaugeType = "g27_long_35mm" | "g30_short_21mm" | "g30_ultrashort_12mm" | "g30_extrashort_8mm";
export type InjectionTechniqueId = "infiltration" | "mandibular_torus" | "mental_incisive" | "tuberal" | "palatal_greater" | "incisive_canal" | "intraligamentary_sta" | "intraseptal" | "application_topical";

export interface AnestheticDrugInfo {
	readonly id: AnestheticDrugId;
	readonly tradeNamesRu: readonly string[];
	readonly activeSubstanceRu: string;
	readonly activeConcentrationPercent: number;
	readonly mgPerMlActive: number;
	readonly vasoconstrictorNameRu: string;
	readonly vasoconstrictorRatio: VasoconstrictorRatio;
	readonly epinephrineMgPerMl: number;
	readonly carpuleVolumeMl: number;
	readonly mgActivePerCarpule: number;
	readonly mgEpiPerCarpule: number;
	readonly maxDoseMgPerKgAdult: number;
	readonly absoluteMaxDoseMgAdult: number;
	readonly maxCarpules70kgAdult: number;
	readonly containsSulfites: boolean;
	readonly isAdrenalineFree: boolean;
	readonly clinicalIndicationsRu: string;
	readonly contraindicationsRu: readonly string[];
}

export interface PrimaryAnestheticDrug {
	readonly id: AnestheticDrugId;
	readonly labelRu: string;
	readonly subLabelRu: string;
	readonly activeSubstanceRu: string;
	readonly vasoRatio: string;
	readonly isAdrenalineFree: boolean;
	readonly containsSulfites: boolean;
	readonly maxCarpules70kg: number;
	readonly tradeNames: string;
}

export interface ClinicalFastPresetItem {
	readonly drugId: AnestheticDrugId | "none";
	readonly shortLabelRu: string;
	readonly fullLabelRu: string;
	readonly subLabelRu: string;
	readonly count: number;
	readonly defaultTechnique?: InjectionTechniqueId | undefined;
	readonly isCardioRecommended?: boolean | undefined;
	readonly testId: string;
	readonly srOnlyText: string;
	readonly clinicalScopeRu: string;
}

export interface StandardAnesthesiaPreset {
	readonly id: string;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly testId: string;
	readonly drugId: AnestheticDrugId;
	readonly carpulesCount: number;
	readonly techniqueId: InjectionTechniqueId;
	readonly needleType: NeedleGaugeType;
	readonly descriptionRu: string;
	readonly isAdrenalineFree: boolean;
	readonly hasCardioRisk: boolean;
	readonly defaultWeightKg: number;
}

export const DENTAL_ANESTHETICS: Record<AnestheticDrugId, AnestheticDrugInfo> = {
	articaine_1_100k: {
		id: "articaine_1_100k", tradeNamesRu: ["Ультракаин Д-С форте", "Убистезин форте"], activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:100 000",
		activeConcentrationPercent: 4.0, mgPerMlActive: 40, vasoconstrictorNameRu: "Эпинефрин", vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01, carpuleVolumeMl: 1.7, mgActivePerCarpule: 68, mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 7.0, absoluteMaxDoseMgAdult: 500, maxCarpules70kgAdult: 7.2, containsSulfites: true, isAdrenalineFree: false,
		clinicalIndicationsRu: "Основной рабочий анестетик: терапия, хирургия, эндодонтия", contraindicationsRu: ["Аллергия на артикаин / сульфиты"],
	},
	articaine_1_200k: {
		id: "articaine_1_200k", tradeNamesRu: ["Ультракаин Д-С", "Убистезин"], activeSubstanceRu: "Артикаин 4% + Эпинефрин 1:200 000",
		activeConcentrationPercent: 4.0, mgPerMlActive: 40, vasoconstrictorNameRu: "Эпинефрин", vasoconstrictorRatio: "1:200000",
		epinephrineMgPerMl: 0.005, carpuleVolumeMl: 1.7, mgActivePerCarpule: 68, mgEpiPerCarpule: 0.0085,
		maxDoseMgPerKgAdult: 7.0, absoluteMaxDoseMgAdult: 500, maxCarpules70kgAdult: 7.2, containsSulfites: true, isAdrenalineFree: false,
		clinicalIndicationsRu: "Мягкая вазоконстрикция: компенсированная кардио-патология, пожилые", contraindicationsRu: ["Аллергия на артикаин / сульфиты"],
	},
	mepivacaine_plain: {
		id: "mepivacaine_plain", tradeNamesRu: ["Скандонест 3%", "Мепивастезин"], activeSubstanceRu: "Мепивакаин 3% (без адреналина)",
		activeConcentrationPercent: 3.0, mgPerMlActive: 30, vasoconstrictorNameRu: "Отсутствует", vasoconstrictorRatio: "none",
		epinephrineMgPerMl: 0, carpuleVolumeMl: 1.7, mgActivePerCarpule: 51, mgEpiPerCarpule: 0,
		maxDoseMgPerKgAdult: 4.4, absoluteMaxDoseMgAdult: 300, maxCarpules70kgAdult: 5.8, containsSulfites: false, isAdrenalineFree: true,
		clinicalIndicationsRu: "Препарат выбора при кардиориске, аритмии, тиреотоксикозе, астме", contraindicationsRu: ["Аллергия на мепивакаин"],
	},
	lidocaine_1_100k: {
		id: "lidocaine_1_100k", tradeNamesRu: ["Лидокаин 2%", "Ксилокаин"], activeSubstanceRu: "Лидокаин 2% + Эпинефрин 1:100 000",
		activeConcentrationPercent: 2.0, mgPerMlActive: 20, vasoconstrictorNameRu: "Эпинефрин", vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01, carpuleVolumeMl: 1.7, mgActivePerCarpule: 34, mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 4.4, absoluteMaxDoseMgAdult: 300, maxCarpules70kgAdult: 8.8, containsSulfites: true, isAdrenalineFree: false,
		clinicalIndicationsRu: "Резервный анестетик", contraindicationsRu: ["Аллергия на лидокаин"],
	},
	septanest_1_100k: {
		id: "septanest_1_100k", tradeNamesRu: ["Септанест 1:100 000"], activeSubstanceRu: "Артикаин 4% + Адреналин 1:100 000",
		activeConcentrationPercent: 4.0, mgPerMlActive: 40, vasoconstrictorNameRu: "Адреналин", vasoconstrictorRatio: "1:100000",
		epinephrineMgPerMl: 0.01, carpuleVolumeMl: 1.7, mgActivePerCarpule: 68, mgEpiPerCarpule: 0.017,
		maxDoseMgPerKgAdult: 7.0, absoluteMaxDoseMgAdult: 500, maxCarpules70kgAdult: 7.2, containsSulfites: true, isAdrenalineFree: false,
		clinicalIndicationsRu: "Септанест", contraindicationsRu: ["Аллергия на артикаин"],
	},
	lidocaine_plain: {
		id: "lidocaine_plain", tradeNamesRu: ["Лидокаин 2%"], activeSubstanceRu: "Лидокаин 2%", activeConcentrationPercent: 2.0, mgPerMlActive: 20,
		vasoconstrictorNameRu: "Отсутствует", vasoconstrictorRatio: "none", epinephrineMgPerMl: 0, carpuleVolumeMl: 1.7, mgActivePerCarpule: 34, mgEpiPerCarpule: 0,
		maxDoseMgPerKgAdult: 4.4, absoluteMaxDoseMgAdult: 300, maxCarpules70kgAdult: 8.8, containsSulfites: false, isAdrenalineFree: true,
		clinicalIndicationsRu: "Лидокаин чистый", contraindicationsRu: ["Аллергия на лидокаин"],
	},
	bupivacaine_05: {
		id: "bupivacaine_05", tradeNamesRu: ["Маркаин 0.5%"], activeSubstanceRu: "Бупивакаин 0.5%", activeConcentrationPercent: 0.5, mgPerMlActive: 5,
		vasoconstrictorNameRu: "Отсутствует", vasoconstrictorRatio: "none", epinephrineMgPerMl: 0, carpuleVolumeMl: 1.8, mgActivePerCarpule: 9.0, mgEpiPerCarpule: 0,
		maxDoseMgPerKgAdult: 2.0, absoluteMaxDoseMgAdult: 90, maxCarpules70kgAdult: 10.0, containsSulfites: false, isAdrenalineFree: true,
		clinicalIndicationsRu: "Пролонгированная анестезия", contraindicationsRu: ["Дети до 12 лет"],
	},
};

export const PRIMARY_ANESTHETIC_DRUGS: readonly PrimaryAnestheticDrug[] = [
	{ id: "articaine_1_100k", labelRu: "Артикаин 1:100 000", subLabelRu: "Ультракаин Д-С Форте", activeSubstanceRu: "Артикаин 4% + 1:100к", vasoRatio: "1:100 000", isAdrenalineFree: false, containsSulfites: true, maxCarpules70kg: 7.2, tradeNames: "Ультракаин Д-С форте, Убистезин форте" },
	{ id: "articaine_1_200k", labelRu: "Артикаин 1:200 000", subLabelRu: "Ультракаин Д-С", activeSubstanceRu: "Артикаин 4% + 1:200к", vasoRatio: "1:200 000", isAdrenalineFree: false, containsSulfites: true, maxCarpules70kg: 7.2, tradeNames: "Ультракаин Д-С, Убистезин" },
	{ id: "mepivacaine_plain", labelRu: "Мепивакаин 3% (без адреналина)", subLabelRu: "Скандонест 3%", activeSubstanceRu: "Мепивакаин 3% чистый", vasoRatio: "Без адреналина", isAdrenalineFree: true, containsSulfites: false, maxCarpules70kg: 5.8, tradeNames: "Скандонест 3%, Мепивастезин" },
	{ id: "lidocaine_1_100k", labelRu: "Лидокаин 2%", subLabelRu: "Ксилокаин", activeSubstanceRu: "Лидокаин 2% + 1:100к", vasoRatio: "1:100 000", isAdrenalineFree: false, containsSulfites: true, maxCarpules70kg: 8.8, tradeNames: "Лидокаин, Ксилокаин" },
];

export const CLINICAL_FAST_PRESETS: readonly ClinicalFastPresetItem[] = [
	{
		drugId: "articaine_1_100k", shortLabelRu: "Артикаин 1:100 000", fullLabelRu: "Норма: Артикаин 1:100k (Убистезин форте / Ультракаин)",
		subLabelRu: "1 карпула (1.7 мл)", count: 1.0, defaultTechnique: "infiltration", testId: "anesthesia-dose-norm-preset",
		srOnlyText: "Норма: Артикаин 1:100k Убистезин форте Ультракаин Д-С", clinicalScopeRu: "Стандарт для 90% приёмов (терапия, ортопедия, хирургия)",
	},
	{
		drugId: "articaine_1_200k", shortLabelRu: "Артикаин 1:200 000", fullLabelRu: "Артикаин 1:200к (Ультракаин Д-С)",
		subLabelRu: "1 карпула (1.7 мл)", count: 1.0, defaultTechnique: "infiltration", testId: "anesthesia-preset-infiltration-articaine-200k",
		srOnlyText: "Артикаин 1:200 000 мягкий", clinicalScopeRu: "Мягкий вазоконстриктор для пациентов старшего возраста",
	},
	{
		drugId: "mepivacaine_plain", shortLabelRu: "Мепивакаин 3% (без адреналина)", fullLabelRu: "Скандонест 3% (без адреналина)",
		subLabelRu: "1 карпула (1.7 мл)", count: 1.0, defaultTechnique: "infiltration", isCardioRecommended: true,
		testId: "anesthesia-preset-scandonest-cardio", srOnlyText: "Мепивакаин 3% кардио", clinicalScopeRu: "Кардиориск, пожилые, астма, тиреотоксикоз, беременность",
	},
	{
		drugId: "none", shortLabelRu: "Без анестезии", fullLabelRu: "Без анестезии (отказ / не требуется)",
		subLabelRu: "0 карпул", count: 0, testId: "btn-anes-none",
		srOnlyText: "Без анестезии", clinicalScopeRu: "Консультация, снятие швов, полировка или отказ пациента",
	},
];

export const CARPULE_PRESETS = [
	{ count: 0.5, label: "0.5", id: "anesthesia-dose-05carp" },
	{ count: 1.0, label: "1.0", id: "anesthesia-dose-1carp" },
	{ count: 2.0, label: "2.0", id: "anesthesia-dose-2carp" },
	{ count: 3.0, label: "3.0", id: "anesthesia-dose-3carp" },
] as const;

export const INJECTION_TECHNIQUES: Record<string, { id: InjectionTechniqueId; nameRu: string }> = {
	infiltration: { id: "infiltration", nameRu: "Инфильтрационная анестезия" },
	mandibular_torus: { id: "mandibular_torus", nameRu: "Проводниковая (мандибулярная) анестезия" },
	intraligamentary_sta: { id: "intraligamentary_sta", nameRu: "Интралигаментарная анестезия" },
	tuberal: { id: "tuberal", nameRu: "Туберальная анестезия" },
};

export const DENTAL_NEEDLES: Record<string, { id: NeedleGaugeType; nameRu: string; lengthMm: number; diameterMm: number; gauge: string }> = {
	g30_short_21mm: { id: "g30_short_21mm", nameRu: "Игла карпульная 30G короткая 21мм", lengthMm: 21, diameterMm: 0.3, gauge: "30G" },
	g27_long_35mm: { id: "g27_long_35mm", nameRu: "Игла карпульная 27G длинная 35мм", lengthMm: 35, diameterMm: 0.4, gauge: "27G" },
	g30_ultrashort_12mm: { id: "g30_ultrashort_12mm", nameRu: "Игла карпульная 30G ультракороткая 12мм", lengthMm: 12, diameterMm: 0.3, gauge: "30G" },
};

export const STANDARD_ANESTHESIA_PRESETS: Record<string, StandardAnesthesiaPreset> = {
	ultracain_ds_forte: {
		id: "ultracain_ds_forte", labelRu: "Ультракаин Д-С форте 1:100к (1 карпула)", shortLabelRu: "Артикаин 1:100к",
		testId: "anesthesia-dose-norm-preset", drugId: "articaine_1_100k", carpulesCount: 1.0, techniqueId: "infiltration",
		needleType: "g30_short_21mm", descriptionRu: "Стандарт инфильтрации для взрослого", isAdrenalineFree: false, hasCardioRisk: false, defaultWeightKg: 70,
	},
};

export const WEIGHT_PRESETS = [45, 60, 70, 85, 100];
export const WEIGHT_QUICK_PRESETS = [50, 70, 90];

export async function postQuickCarpuleWriteoff(params: {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	count: number;
	drugId?: string | undefined;
	needleName?: string | undefined;
	needlesCount?: number | undefined;
}): Promise<void> {
	try {
		await fetch("/api/inventory/quick-writeoff-carpules", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				visitId: params.visitId || null,
				patientId: params.patientId || null,
				carpulesCount: params.count,
				drugName: params.drugId || "Ультракаин Д-С",
				needleName: params.needleName,
				needlesCount: params.needlesCount ?? (params.count > 0 ? 1 : 0),
				notes: `Списание ${params.count} карпул (${params.drugId || "Артикаин"}) у кресла`,
			}),
		});
	} catch (err) {
		console.warn("[anesthesia] Quick carpule writeoff fallback:", err);
	}
}

export async function postEmergencyAntishockWriteoff(visitId?: string): Promise<void> {
	try {
		await fetch("/api/inventory/quick-writeoff-emergency-antishock", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				visitId: visitId || null,
				scenarioId: "anaphylactic_shock",
				notes: "Экстренное списание укладки «Антишок» у кресла",
			}),
		});
	} catch (err) {
		console.warn("[anesthesia] Emergency writeoff fallback:", err);
	}
}
