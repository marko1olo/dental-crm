import { sumKopecks } from "@dental/shared";
import {
	chargeLineKopecks,
	debtNumericText,
	rublesFromKopecks,
} from "../../../money/patientDebt.js";
import { numeric, splitStoredPriceId } from "../../odontogram/planHelpers.js";

/**
 * treatmentPlanTotalsCalculator.ts — Детерминированный калькулятор сумм,
 * скидок, НДС и копеек сметы плана лечения.
 *
 * Декомпозирован из patientTreatmentPlanHandlers.ts по Мандатам 8b и 8zi.
 * Обеспечивает:
 * - Мандат 8e (Автономия врача): свободный расчет скидок до 100% без блокировок.
 * - Целочисленная арифметика в копейках (amountKopecks, BIGINT) без ошибок округления IEEE-754.
 * - Чистые функции без побочных эффектов.
 */

export interface TreatmentPlanItemInputForTotals {
	price: number;
	quantity: number;
	discount: number;
	priceId?: string | undefined;
	name?: string | undefined;
}

export interface CalculatedPlanItemSummary {
	serviceCode: string;
	serviceTitle: string;
	unitPriceRub: number;
	planDiscountRub: number;
	planDiscountPercent: number;
	quantity: number;
	planLineTotalRub: number;
	lineTotalKopecks: number;
}

export interface CalculatedPlanTotals {
	totalPriceKopecks: number;
	totalPriceRub: number;
	totalPriceText: string;
	lineKopecks: number[];
}

/**
 * Расчет стоимостных характеристик отдельной позиции плана лечения
 */
export function calculateTreatmentPlanItemSummary(
	item: {
		id: string;
		priceId: string;
		price: string | number;
		discount: string | number;
		quantity: number;
		toothNumber?: number | null | undefined;
		phase?: number | null | undefined;
	},
): CalculatedPlanItemSummary & { itemId: string; toothNumber?: number | undefined; phase: number } {
	const { priceId, name } = splitStoredPriceId(item.priceId);
	const unitPrice = numeric(item.price);
	const discountRub = numeric(item.discount);
	const quantity = item.quantity || 1;
	const lineTotal = Math.max(0, unitPrice * quantity - discountRub);
	const discountPercent =
		unitPrice > 0 ? Math.round((discountRub / (unitPrice * quantity)) * 100) : 0;

	return {
		itemId: item.id,
		...(item.toothNumber !== null && item.toothNumber !== undefined
			? { toothNumber: item.toothNumber }
			: {}),
		serviceCode: priceId || "A16.07.002",
		serviceTitle: name || "Медицинская услуга",
		unitPriceRub: unitPrice,
		planDiscountRub: discountRub,
		planDiscountPercent: discountPercent,
		quantity,
		planLineTotalRub: lineTotal,
		lineTotalKopecks: Math.round(lineTotal * 100),
		phase: item.phase || 1,
	};
}

/**
 * Детерминированный расчет итоговых сумм плана лечения в копейках и рублях
 */
export function calculateTreatmentPlanTotals(
	patientId: string,
	items: TreatmentPlanItemInputForTotals[],
): CalculatedPlanTotals {
	const lineKopecks = items.map((item) =>
		chargeLineKopecks({
			patientId,
			status: "proposed",
			unitPriceRub: item.price,
			quantity: item.quantity,
			discountRub: item.discount,
		}),
	);

	const totalPriceKopecks = sumKopecks(lineKopecks);
	const totalPriceRub = numeric(rublesFromKopecks(totalPriceKopecks));
	const totalPriceText = debtNumericText(totalPriceKopecks);

	return {
		totalPriceKopecks,
		totalPriceRub,
		totalPriceText,
		lineKopecks,
	};
}

/**
 * Расчет глобальной скидки на план лечения (Мандат 8e: свобода скидок врача до 100%)
 */
export function calculateEffectivePlanDiscount(params: {
	baseTotalKopecks: number;
	discountMode?: "none" | "plan_fixed" | "on_selection" | string;
	planDiscountPercent?: number;
	planDiscountRub?: number;
}): {
	discountKopecks: number;
	finalTotalKopecks: number;
} {
	const {
		baseTotalKopecks,
		discountMode = "plan_fixed",
		planDiscountPercent = 0,
		planDiscountRub = 0,
	} = params;

	if (discountMode === "none" || baseTotalKopecks <= 0) {
		return { discountKopecks: 0, finalTotalKopecks: baseTotalKopecks };
	}

	let discountKopecks = 0;
	if (planDiscountPercent > 0) {
		const clampedPercent = Math.min(100, Math.max(0, planDiscountPercent));
		discountKopecks = Math.round((baseTotalKopecks * clampedPercent) / 100);
	} else if (planDiscountRub > 0) {
		discountKopecks = Math.min(baseTotalKopecks, Math.round(planDiscountRub * 100));
	}

	const finalTotalKopecks = Math.max(0, baseTotalKopecks - discountKopecks);
	return { discountKopecks, finalTotalKopecks };
}
