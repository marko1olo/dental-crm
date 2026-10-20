/**
 * apps/web/src/components/settings/deepClinicalModules/deepClinicalTypes.ts
 *
 * Types, clinical presets, ICD-10 protocol templates, physiological norm autofill,
 * sterilization norms, and somatic safety/anesthetic dosage helpers.
 */

import type {
	AnestheticPackageItem,
	DeepClinicalSettings,
} from "../../../store/deepClinicalSettingsStore";

export type { AnestheticPackageItem, DeepClinicalSettings };

export type DeepClinicalSubTab = "protocols" | "warehouse" | "intercom" | "fiscal";

export interface InformedConsentTemplateOption {
	key: DeepClinicalSettings["informedConsentTemplate"];
	title: string;
	desc: string;
}

export interface Icd10ProtocolTemplate {
	code: string;
	diagnosisTitle: string;
	category: "therapy" | "endo" | "surgery" | "perio" | "ortho";
	physiologicalNormSnippet: string;
	recommendedAutoclaveMode: "134C_5min" | "121C_20min";
	defaultWarrantyMonths: number;
}

export interface SomaticSafetyRule {
	id: string;
	conditionLabel: string;
	thresholdLabel: string;
	anestheticConstraint: string;
	severity: "warning" | "critical";
}

export const INFORMED_CONSENT_TEMPLATES: readonly InformedConsentTemplateOption[] = [
	{
		key: "simplified_ambulatory",
		title: "Упрощенный (Амбулаторный)",
		desc: "Для соло-врача и регулярной терапии. 1 страница с подписью.",
	},
	{
		key: "standard_1051n",
		title: "Стандарт Минздрава 1051н",
		desc: "Регламентное согласие на первичное медицинское вмешательство.",
	},
	{
		key: "implant_extended",
		title: "Хирургия и Имплантация",
		desc: "Расширенный протокол рисков, гарантийных сроков и приживления.",
	},
];

export const DEFAULT_ICD10_PROTOCOL_TEMPLATES: readonly Icd10ProtocolTemplate[] = [
	{
		code: "K02.1",
		diagnosisTitle: "Кариес дентина (глубокий / средний)",
		category: "therapy",
		physiologicalNormSnippet:
			"Слизистая оболочка бледно-розовая, умеренно увлажнена. Перкуссия безболезненна, термопроба кратковременная.",
		recommendedAutoclaveMode: "134C_5min",
		defaultWarrantyMonths: 12,
	},
	{
		code: "K04.0",
		diagnosisTitle: "Пульпит (обратимый / необратимый)",
		category: "endo",
		physiologicalNormSnippet:
			"Регионарные лимфоузлы не увеличены. Коффердам наложен герметично, устья каналов проходимы, апекслокация стабильна.",
		recommendedAutoclaveMode: "134C_5min",
		defaultWarrantyMonths: 12,
	},
	{
		code: "K04.5",
		diagnosisTitle: "Хронический апикальный периодонтит",
		category: "endo",
		physiologicalNormSnippet:
			"Переходная складка без флюктуации. Корневые каналы обработаны по протоколу гипохлорита натрия 3% и ЭДТА 17%.",
		recommendedAutoclaveMode: "134C_5min",
		defaultWarrantyMonths: 6,
	},
	{
		code: "K08.1",
		diagnosisTitle: "Потеря зубов (дентальная имплантация)",
		category: "surgery",
		physiologicalNormSnippet:
			"Костная ткань зоны имплантации достаточного объёма. Первичная стабилизация торк ≥ 35 Н·см, гемостаз состоятелен.",
		recommendedAutoclaveMode: "134C_5min",
		defaultWarrantyMonths: 60,
	},
];

export const DEFAULT_SOMATIC_SAFETY_RULES: readonly SomaticSafetyRule[] = [
	{
		id: "allergy-amide",
		conditionLabel: "Аллергия на амидные анестетики (Артикаин / Лидокаин)",
		thresholdLabel: "Абсолютный стоп-маркер в шапке ЭМК",
		anestheticConstraint: "Запрет стандартных карпул; показ протокола аллергопроб",
		severity: "critical",
	},
	{
		id: "cardio-hypertension",
		conditionLabel: "Артериальная гипертензия / ИБС (АД > 150/95 мм рт. ст.)",
		thresholdLabel: "Ограничение вазоконстриктора",
		anestheticConstraint: "Эпинефрин не выше 1:200 000 или мепивакаин 3% без адреналина",
		severity: "warning",
	},
	{
		id: "anticoagulants-inr",
		conditionLabel: "Приём антикоагулянтов (Варфарин / НОАК, МНО > 2.5)",
		thresholdLabel: "Контроль гемостаза при хирургии",
		anestheticConstraint: "Отказ от проводниковой анестезии в пользу инфильтрационной/интралигаментарной",
		severity: "warning",
	},
];

/**
 * Расчет максимально допустимого числа карпул артикаина 4% (1.7 мл = 68 мг)
 * по весу пациента (макс. доза 7 мг/кг для взрослых, лимит 500 мг; при кардио-риске — лимит 2 карпулы с эпинефрином 1:200 000).
 */
export function calculateMaxArticaineCarpules(
	weightKg: number,
	hasCardiovascularRisk = false,
): { maxCarpules: number; maxDoseMg: number; recommendedDilution: "1:100000" | "1:200000" | "free" } {
	const safeWeight = Number.isFinite(weightKg) ? Math.max(15, Math.min(180, weightKg)) : 70;
	const rawMaxDoseMg = Math.min(500, safeWeight * 7);
	const mgPerCarpule = 68; // 40 mg/ml * 1.7 ml
	const calculatedCarpules = Math.floor((rawMaxDoseMg / mgPerCarpule) * 10) / 10;

	if (hasCardiovascularRisk) {
		return {
			maxCarpules: Math.min(2.0, calculatedCarpules),
			maxDoseMg: Math.min(136, Math.round(rawMaxDoseMg)),
			recommendedDilution: "1:200000",
		};
	}

	return {
		maxCarpules: Math.min(7.0, calculatedCarpules),
		maxDoseMg: Math.round(rawMaxDoseMg),
		recommendedDilution: "1:100000",
	};
}
