/**
 * apps/web/src/components/chairside/consentEngine/resolver/consentFinancialMath.ts
 *
 * Высокоточная целочисленная финансовая математика плана лечения и сметы.
 * Расчеты ведутся строго в целочисленных копейках (BIGINT / kopecks) без float-погрешностей.
 * Мандаты 8e (свобода скидок врача), 8n (прозрачные расчеты), 8ap (точность до копейки).
 */

import { formatKopecksToRubAndKop } from "../../../documents/paidContract/money.js";
import type { ChairsideTreatmentItem } from "../types.js";

/**
 * Расчет суммы отдельной позиции в целочисленных копейках с учетом скидки врача
 * Врач имеет право выставить скидку до 100% (Мандат 8e).
 * Отрицательные цены или количества санируются до безопасного минимума.
 */
export function calculateItemTotalKopecks(
	unitPriceKopecks: number,
	quantity: number,
	discountPercent = 0,
): number {
	const sanitizedPrice = Math.max(0, Math.round(unitPriceKopecks || 0));
	const sanitizedQty = Math.max(1, Math.round(quantity || 1));
	const sanitizedDiscount = Math.min(100, Math.max(0, discountPercent || 0));

	const subtotal = sanitizedPrice * sanitizedQty;
	if (sanitizedDiscount === 0) {
		return subtotal;
	}

	const discountAmount = Math.round((subtotal * sanitizedDiscount) / 100);
	return Math.max(0, subtotal - discountAmount);
}

/**
 * Расчет общей итоговой суммы сметы плана лечения в целочисленных копейках
 * Если у позиции уже предрассчитан totalKopecks, используется он;
 * иначе сумма вычисляется через calculateItemTotalKopecks.
 */
export function calculateEstimateTotalKopecks(items: readonly ChairsideTreatmentItem[]): number {
	if (!items || items.length === 0) return 0;
	return items.reduce((acc, item) => {
		const itemTotal = item.totalKopecks !== undefined
			? Math.max(0, Math.round(item.totalKopecks))
			: calculateItemTotalKopecks(item.unitPriceKopecks, item.quantity, item.discountPercent);
		return acc + itemTotal;
	}, 0);
}

/**
 * Форматирование суммы в копейках в каноническую строку валюты РФ с пробелом-разделителем:
 * Пример: 1250050 -> "12 500,50 ₽", 0 -> "0,00 ₽"
 */
export function formatKopecksToRubles(kopecks: number): string {
	return formatKopecksToRubAndKop(kopecks).formatted.replace(/\u00a0/g, " ");
}
