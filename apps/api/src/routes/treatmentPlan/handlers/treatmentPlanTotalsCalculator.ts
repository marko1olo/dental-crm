import {
	basisPointsFromPercent,
	sumKopecks,
	rublesToKopecks,
	kopecksToRubles,
	percentageOfKopecks,
	toExactKopecks,
} from "@dental/shared";
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
	unitPriceKopecks?: number | undefined;
	totalPriceKopecks?: number | undefined;
	priceId?: string | null | undefined;
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
	const unitPriceKopecks = rublesToKopecks(unitPrice);
	const discountKopecks = rublesToKopecks(discountRub);
	const lineTotalKopecks = Math.max(0, unitPriceKopecks * quantity - discountKopecks);
	const planLineTotalRub = kopecksToRubles(lineTotalKopecks);
	const discountPercent =
		unitPriceKopecks > 0 ? Math.round((discountKopecks / (unitPriceKopecks * quantity)) * 100) : 0;

	return {
		itemId: item.id,
		...(item.toothNumber !== null && item.toothNumber !== undefined
			? { toothNumber: item.toothNumber }
			: {}),
		serviceCode: priceId || item.id || "SRV-ITEM",
		serviceTitle: name || "Медицинская услуга",
		unitPriceRub: unitPrice,
		planDiscountRub: discountRub,
		planDiscountPercent: discountPercent,
		quantity,
		planLineTotalRub,
		lineTotalKopecks,
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
	const lineKopecks = items.map((item) => {
		if (item.totalPriceKopecks !== undefined && item.totalPriceKopecks >= 0) {
			return item.totalPriceKopecks;
		}
		if (item.unitPriceKopecks !== undefined && item.unitPriceKopecks >= 0) {
			const discountKop = rublesToKopecks(item.discount || 0);
			return Math.max(0, item.unitPriceKopecks * (item.quantity || 1) - discountKop);
		}
		return chargeLineKopecks({
			patientId,
			status: "proposed",
			unitPriceRub: item.price,
			quantity: item.quantity,
			discountRub: item.discount,
		});
	});

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
	planDiscountKopecks?: bigint | number | null | undefined;
}): {
	discountKopecks: number;
	finalTotalKopecks: number;
} {
	const {
		baseTotalKopecks,
		discountMode = "plan_fixed",
		planDiscountPercent = 0,
		planDiscountRub = 0,
		planDiscountKopecks,
	} = params;

	if (discountMode === "none" || baseTotalKopecks <= 0) {
		return { discountKopecks: 0, finalTotalKopecks: baseTotalKopecks };
	}

	let discountKopecks = 0;
	if (planDiscountKopecks != null && Number(planDiscountKopecks) >= 0) {
		discountKopecks = Math.min(baseTotalKopecks, Number(planDiscountKopecks));
	} else if (planDiscountPercent > 0) {
		const clampedPercent = Math.min(100, Math.max(0, planDiscountPercent));
		const basisPoints = basisPointsFromPercent(clampedPercent);
		discountKopecks = percentageOfKopecks(toExactKopecks(baseTotalKopecks), basisPoints);
	} else if (planDiscountRub > 0) {
		discountKopecks = Math.min(baseTotalKopecks, rublesToKopecks(planDiscountRub));
	}

	const finalTotalKopecks = Math.max(0, baseTotalKopecks - discountKopecks);
	return { discountKopecks, finalTotalKopecks };
}
