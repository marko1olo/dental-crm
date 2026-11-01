/**
 * apps/api/src/db/alternativeTreatmentPlans/alternativePlanCalculations.ts
 *
 * Калькулятор тарифов и финансовых разниц альтернативных планов лечения.
 * Расчеты ведутся строго в целочисленных копейках (amountKopecks / BigInt)
 * с гарантией нулевых потерь на округлении (Мандат 8e, Мандат 8wy).
 */

import { sumKopecks, type Kopecks } from "@dental/shared";
import {
	chargeLineKopecks,
	debtNumericText,
	rublesFromKopecks,
} from "../../money/patientDebt.js";

export const LEDGER_ID_PREFIX_LENGTH = 32;
export const LEDGER_MAX_SLOT = 0xffff;

export const UUID_SHAPE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AlternativePlanItemInput {
	toothNumber?: number | null | undefined;
	priceId: string;
	name?: string | null | undefined;
	quantity: number;
	price: number;
	discount?: number | undefined;
	phase?: number | undefined;
	isAuto?: boolean | undefined;
}

export interface AlternativePlanVariantInput {
	name: string;
	alternativeTier?: string | undefined; // "optimum" | "economy" | "premium" | "compromise"
	items: AlternativePlanItemInput[];
	isInitiallyApproved?: boolean | undefined;
	notes?: string | undefined;
}

export interface CreateAlternativePlanGroupInput {
	organizationId: string;
	patientId: string;
	doctorId?: string | null;
	groupName: string;
	variants: AlternativePlanVariantInput[];
	actorUserId?: string | null;
}

export interface SelectPlanVariantInput {
	organizationId: string;
	patientId: string;
	planId: string;
	actorUserId?: string | null;
	reason?: string | null;
}

/**
 * Генерация детерминированного row-id для наряда лечения (treatment_items)
 */
export function ledgerRowId(planId: string, slot: number): string {
	return `${planId.slice(0, LEDGER_ID_PREFIX_LENGTH)}${slot
		.toString(16)
		.padStart(4, "0")}`;
}

export interface VariantFinancialSummary {
	readonly totalKopecks: Kopecks;
	readonly totalPriceText: string;
	readonly totalPriceRub: number;
}

/**
 * Точный расчет стоимости варианта плана в копейках и рублях
 */
export function calculateVariantFinancialSummary(
	patientId: string,
	isApproved: boolean,
	items: readonly AlternativePlanItemInput[],
): VariantFinancialSummary {
	const lineKopecks = items.map((item) =>
		chargeLineKopecks({
			patientId,
			status: isApproved ? "approved" : "proposed",
			unitPriceRub: item.price,
			quantity: item.quantity,
			discountRub: item.discount ?? 0,
		}),
	);
	const totalKopecks = sumKopecks(lineKopecks);
	const totalPriceText = debtNumericText(totalKopecks);
	const totalPriceRub = rublesFromKopecks(totalKopecks);

	return {
		totalKopecks,
		totalPriceText,
		totalPriceRub,
	};
}

export interface TierPriceDiff {
	readonly diffKopecks: Kopecks;
	readonly diffRub: number;
	readonly percentageDiff: number;
}

/**
 * Расчет разницы между двумя альтернативными планами лечения
 */
export function calculateTierPriceDiff(
	baseKopecks: Kopecks,
	targetKopecks: Kopecks,
): TierPriceDiff {
	const diffKopecks = targetKopecks - baseKopecks;
	const diffRub = rublesFromKopecks(diffKopecks);
	const baseRub = rublesFromKopecks(baseKopecks);
	const percentageDiff =
		baseRub > 0 ? Math.round(((diffRub) / baseRub) * 100) : 0;

	return {
		diffKopecks,
		diffRub,
		percentageDiff,
	};
}
