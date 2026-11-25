import { z } from "zod";
import type { Kopecks } from "../../money.js";
import { calculatePercentDiscountKopecks, toExactKopecks } from "../../money.js";
import { dmsFranchiseRateSchema, isValidFranchiseRate } from "./dmsFranchisePresets.js";

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
}).strict();

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
 *   patientKopecks = calculatePercentDiscountKopecks(totalKopecks, franchisePercent)
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

	const patientKopecks = calculatePercentDiscountKopecks(totalKopecks, franchisePercent);
	const insurerKopecks = totalKopecks - patientKopecks;

	return {
		patientKopecks,
		insurerKopecks,
	};
}
