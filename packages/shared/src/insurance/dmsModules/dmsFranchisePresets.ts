import { z } from "zod";

/**
 * Standard Russian DMS franchise rates applied by corporate health insurers (СОГАЗ, Ингосстрах, АльфаСтрахование, РЕСО).
 */
export const STANDARD_DMS_FRANCHISE_RATES = [0, 10, 20, 30, 50, 80] as const;
export type StandardDmsFranchiseRate = (typeof STANDARD_DMS_FRANCHISE_RATES)[number];

export interface DmsFranchisePreset {
	readonly ratePercent: number;
	readonly labelRu: string;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly isCommonRussianCorporateRate: boolean;
}

export const DMS_FRANCHISE_PRESETS: readonly DmsFranchisePreset[] = [
	{
		ratePercent: 0,
		labelRu: "0% (Полный ДМС)",
		titleRu: "100% покрытие страховой компанией",
		descriptionRu: "Без франшизы. Страховая компания полностью оплачивает все покрываемые договором медицинские услуги.",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 10,
		labelRu: "10% (Минимальная франшиза)",
		titleRu: "90% страховая / 10% пациент",
		descriptionRu: "Корпоративный тариф с символическим участием пациента (10% от стоимости приема оплачивает застрахованный).",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 20,
		labelRu: "20% (Стандартная франшиза)",
		titleRu: "80% страховая / 20% пациент",
		descriptionRu: "Наиболее распространенный тариф ДМС в РФ. 80% счета покрывает страховая, 20% удерживается в кассе клиники с пациента.",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 30,
		labelRu: "30% (Расширенная франшиза)",
		titleRu: "70% страховая / 30% пациент",
		descriptionRu: "Корпоративная программа с повышенным софинансированием сотрудника (30% оплачивает пациент, 70% страховая).",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 50,
		labelRu: "50% (Паритетная сооплата)",
		titleRu: "50% страховая / 50% пациент",
		descriptionRu: "Паритетное разделение расходов (50/50) между страховой компанией и пациентом.",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 80,
		labelRu: "80% (Высокая франшиза)",
		titleRu: "20% страховая / 80% пациент",
		descriptionRu: "Программа с минимальным участием страховой (20% покрывает полис ДМС, 80% оплачивает пациент).",
		isCommonRussianCorporateRate: true,
	},
];

/**
 * Validates whether the given franchise rate is a valid percentage (integer 0..100).
 */
export function isValidFranchiseRate(rate: number): boolean {
	return Number.isInteger(rate) && rate >= 0 && rate <= 100;
}

/**
 * Zod schema for DMS franchise percentage (0..100 integer).
 */
export const dmsFranchiseRateSchema = z
	.number()
	.int({ message: "Процент франшизы должен быть целым числом" })
	.min(0, { message: "Процент франшизы не может быть меньше 0%" })
	.max(100, { message: "Процент франшизы не может превышать 100%" });
