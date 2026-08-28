/**
 * DENTE Dental CRM — Strict Mathematical DMS & Franchise Billing Engine.
 *
 * Implements:
 * 1. Integer Kopeck Arithmetic (type Kopecks = number) with ZERO floating-point rounding errors.
 * 2. Statutory Russian DMS Franchise Split (Сплитование чека):
 *      patientKopecks = Math.round((totalKopecks * franchisePercent) / 100)
 *      insurerKopecks = totalKopecks - patientKopecks
 *    Guarantee: patientKopecks + insurerKopecks === totalKopecks (to the exact kopeck).
 * 3. Standard Russian corporate franchise tiers: 0%, 10%, 20%, 30%, 50%, 80%.
 * 4. Multi-item invoice breakdown with per-item franchise overrides and non-covered service exclusions.
 * 5. Guarantee letter limit overflow handling: insurer share above remaining limit automatically
 *    converts to patient portion with penny-exact balance preservation.
 */

import { z } from "zod";
import type { Kopecks } from "../utils/money.js";
import { formatKopecksRu } from "../utils/money.js";

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

/**
 * Input item for DMS invoice / billing split.
 */
export interface DmsInvoiceItem {
	readonly id: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumberFdi?: number | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
	readonly franchisePercentOverride?: number | undefined;
	readonly isCoveredByDms?: boolean | undefined; // default true
	readonly guaranteeLetterId?: string | undefined;
}

export const dmsInvoiceItemSchema = z.object({
	id: z.string().min(1, { message: "Идентификатор позиции обязателен" }),
	serviceCode804n: z.string().min(1, { message: "Код услуги по Номенклатуре 804н обязателен" }),
	serviceName: z.string().min(1, { message: "Наименование услуги обязательно" }),
	toothNumberFdi: z.number().int().min(0).max(85).optional(),
	quantity: z.number().int().positive({ message: "Количество должно быть положительным целым" }),
	unitPriceKopecks: z.number().int().nonnegative({ message: "Цена за единицу должна быть неотрицательной" }),
	totalKopecks: z.number().int().nonnegative({ message: "Сумма позиции должна быть неотрицательной" }),
	franchisePercentOverride: dmsFranchiseRateSchema.optional(),
	isCoveredByDms: z.boolean().optional(),
	guaranteeLetterId: z.string().optional(),
});

/**
 * Result of splitting a single service line between Patient and Insurer.
 */
export interface DmsSplitItemResult {
	readonly itemId: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumberFdi?: number | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
	readonly effectiveFranchisePercent: number;
	readonly isCoveredByDms: boolean;
	readonly patientKopecks: Kopecks;
	readonly insurerKopecks: Kopecks;
}

export const dmsSplitItemResultSchema = z.object({
	itemId: z.string(),
	serviceCode804n: z.string(),
	serviceName: z.string(),
	toothNumberFdi: z.number().int().optional(),
	quantity: z.number().int().positive(),
	unitPriceKopecks: z.number().int().nonnegative(),
	totalKopecks: z.number().int().nonnegative(),
	effectiveFranchisePercent: dmsFranchiseRateSchema,
	isCoveredByDms: z.boolean(),
	patientKopecks: z.number().int().nonnegative(),
	insurerKopecks: z.number().int().nonnegative(),
});

/**
 * Input for splitting an entire medical invoice or treatment plan.
 */
export interface DmsInvoiceSplitInput {
	readonly items: readonly DmsInvoiceItem[];
	readonly defaultFranchisePercent: number;
	readonly guaranteeLetterRemainingLimitKopecks?: Kopecks | undefined;
}

export const dmsInvoiceSplitInputSchema = z.object({
	items: z.array(dmsInvoiceItemSchema),
	defaultFranchisePercent: dmsFranchiseRateSchema,
	guaranteeLetterRemainingLimitKopecks: z.number().int().nonnegative().optional(),
});

/**
 * Summary breakdown of an invoice split between Patient and Insurer.
 */
export interface DmsInvoiceSplitSummary {
	readonly items: readonly DmsSplitItemResult[];
	readonly totalGrossKopecks: Kopecks;
	readonly calculatedPatientKopecks: Kopecks;
	readonly calculatedInsurerKopecks: Kopecks;
	readonly guaranteeLetterRemainingLimitKopecks?: Kopecks | undefined;
	readonly limitExceeded: boolean;
	readonly limitOverflowKopecks: Kopecks;
	readonly finalPatientKopecks: Kopecks;
	readonly finalInsurerKopecks: Kopecks;
	readonly formattedTotalGrossRu: string;
	readonly formattedFinalPatientRu: string;
	readonly formattedFinalInsurerRu: string;
}

export const dmsInvoiceSplitSummarySchema = z.object({
	items: z.array(dmsSplitItemResultSchema),
	totalGrossKopecks: z.number().int().nonnegative(),
	calculatedPatientKopecks: z.number().int().nonnegative(),
	calculatedInsurerKopecks: z.number().int().nonnegative(),
	guaranteeLetterRemainingLimitKopecks: z.number().int().nonnegative().optional(),
	limitExceeded: z.boolean(),
	limitOverflowKopecks: z.number().int().nonnegative(),
	finalPatientKopecks: z.number().int().nonnegative(),
	finalInsurerKopecks: z.number().int().nonnegative(),
	formattedTotalGrossRu: z.string(),
	formattedFinalPatientRu: z.string(),
	formattedFinalInsurerRu: z.string(),
});

/**
 * Calculates the exact kopeck split for a single service line based on franchise percentage.
 *
 * Mathematical Invariant:
 *   patientKopecks = Math.round((totalKopecks * franchisePercent) / 100)
 *   insurerKopecks = totalKopecks - patientKopecks
 *   patientKopecks + insurerKopecks === totalKopecks
 */
export function calculateItemDmsSplit(
	totalKopecks: Kopecks,
	franchisePercent: number,
	isCoveredByDms = true,
): { patientKopecks: Kopecks; insurerKopecks: Kopecks } {
	if (!Number.isInteger(totalKopecks)) {
		throw new Error(
			`Сумма позиции должна быть целым числом копеек, получено ${totalKopecks}`,
		);
	}
	if (!isValidFranchiseRate(franchisePercent)) {
		throw new Error(
			`Процент франшизы должен быть целым числом от 0 до 100, получено ${franchisePercent}`,
		);
	}

	// If the service is not covered by DMS, 100% goes to the patient
	if (!isCoveredByDms || franchisePercent === 100) {
		return {
			patientKopecks: totalKopecks,
			insurerKopecks: 0,
		};
	}

	// If 0% franchise (full DMS coverage), insurer pays 100%
	if (franchisePercent === 0) {
		return {
			patientKopecks: 0,
			insurerKopecks: totalKopecks,
		};
	}

	const patientKopecks = Math.round((totalKopecks * franchisePercent) / 100);
	const insurerKopecks = totalKopecks - patientKopecks;

	return {
		patientKopecks,
		insurerKopecks,
	};
}

/**
 * Calculates the complete invoice DMS split with support for itemized franchise overrides,
 * non-covered services, and guarantee letter limit overflow handling.
 */
export function calculateInvoiceDmsSplit(
	input: DmsInvoiceSplitInput,
): DmsInvoiceSplitSummary {
	if (!isValidFranchiseRate(input.defaultFranchisePercent)) {
		throw new Error(
			`Базовый процент франшизы должен быть от 0 до 100, получено ${input.defaultFranchisePercent}`,
		);
	}

	let totalGross = 0;
	let calcPatient = 0;
	let calcInsurer = 0;

	const splitItems: DmsSplitItemResult[] = [];

	for (const item of input.items) {
		const isCovered = item.isCoveredByDms !== false;
		const effectiveFranchise = isCovered
			? (item.franchisePercentOverride ?? input.defaultFranchisePercent)
			: 100;

		const expectedTotal = item.quantity * item.unitPriceKopecks;
		const itemTotal = item.totalKopecks !== undefined ? item.totalKopecks : expectedTotal;

		const { patientKopecks, insurerKopecks } = calculateItemDmsSplit(
			itemTotal,
			effectiveFranchise,
			isCovered,
		);

		totalGross += itemTotal;
		calcPatient += patientKopecks;
		calcInsurer += insurerKopecks;

		splitItems.push({
			itemId: item.id,
			serviceCode804n: item.serviceCode804n,
			serviceName: item.serviceName,
			toothNumberFdi: item.toothNumberFdi,
			quantity: item.quantity,
			unitPriceKopecks: item.unitPriceKopecks,
			totalKopecks: itemTotal,
			effectiveFranchisePercent: effectiveFranchise,
			isCoveredByDms: isCovered,
			patientKopecks,
			insurerKopecks,
		});
	}

	// Evaluate guarantee letter limit overflow
	let limitExceeded = false;
	let limitOverflowKopecks = 0;
	let finalPatientKopecks = calcPatient;
	let finalInsurerKopecks = calcInsurer;

	if (
		input.guaranteeLetterRemainingLimitKopecks !== undefined &&
		input.guaranteeLetterRemainingLimitKopecks !== null
	) {
		const remainingLimit = Math.max(0, input.guaranteeLetterRemainingLimitKopecks);
		if (calcInsurer > remainingLimit) {
			limitExceeded = true;
			limitOverflowKopecks = calcInsurer - remainingLimit;
			finalInsurerKopecks = remainingLimit;
			finalPatientKopecks = calcPatient + limitOverflowKopecks;
		}
	}

	// Strictly verify penny-exact balance invariant
	if (finalPatientKopecks + finalInsurerKopecks !== totalGross) {
		throw new Error(
			`Критическая ошибка баланса ДМС: сумма пациента (${finalPatientKopecks}) + страховой (${finalInsurerKopecks}) != общая сумма (${totalGross})`,
		);
	}

	return {
		items: splitItems,
		totalGrossKopecks: totalGross,
		calculatedPatientKopecks: calcPatient,
		calculatedInsurerKopecks: calcInsurer,
		guaranteeLetterRemainingLimitKopecks: input.guaranteeLetterRemainingLimitKopecks,
		limitExceeded,
		limitOverflowKopecks,
		finalPatientKopecks,
		finalInsurerKopecks,
		formattedTotalGrossRu: formatKopecksRu(totalGross),
		formattedFinalPatientRu: formatKopecksRu(finalPatientKopecks),
		formattedFinalInsurerRu: formatKopecksRu(finalInsurerKopecks),
	};
}
