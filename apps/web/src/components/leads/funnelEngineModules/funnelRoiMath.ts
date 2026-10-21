/**
 * FUNNEL ENGINE MODULES: ROI MATH & HELPERS
 * Mandate 8b (<= 120 lines), Mandate 8s (Modular Architecture)
 */

import {
	type CanonicalMarketingChannelKey,
	type FunnelLead,
	MARKETING_CHANNELS,
} from "./types.js";

/**
 * Получение стандартного набора рекламных бюджетов по умолчанию
 */
export function getDefaultChannelSpendMap(): Record<
	CanonicalMarketingChannelKey,
	number
> {
	const map = {} as Record<CanonicalMarketingChannelKey, number>;
	for (const ch of MARKETING_CHANNELS) {
		map[ch.key] = ch.defaultSpendRub;
	}
	return map;
}

/**
 * Безопасное деление двух чисел с округлением до указанного числа знаков после запятой (проценты)
 */
export function safePercent(
	numerator: number,
	denominator: number,
	decimals = 1,
): number {
	if (!denominator || denominator <= 0 || !Number.isFinite(denominator)) {
		return 0;
	}
	if (!numerator || !Number.isFinite(numerator)) {
		return 0;
	}
	const val = (numerator / denominator) * 100;
	const factor = 10 ** decimals;
	return Math.round(val * factor) / factor;
}

/**
 * Безопасное деление для расчета средних и стоимостей (рубли)
 */
export function safeDivide(
	numerator: number,
	denominator: number,
	decimals = 0,
): number {
	if (!denominator || denominator <= 0 || !Number.isFinite(denominator)) {
		return 0;
	}
	if (!numerator || !Number.isFinite(numerator)) {
		return 0;
	}
	const val = numerator / denominator;
	if (decimals === 0) {
		return Math.round(val);
	}
	const factor = 10 ** decimals;
	return Math.round(val * factor) / factor;
}

/**
 * Извлекает числовую выручку по лиду (в рублях)
 */
export function extractLeadRevenueRub(lead: FunnelLead): number {
	if (typeof lead.actualRevenueRub === "number" && lead.actualRevenueRub > 0) {
		return Math.round(lead.actualRevenueRub);
	}
	if (typeof lead.paidAmountRub === "number" && lead.paidAmountRub > 0) {
		return Math.round(lead.paidAmountRub);
	}
	if (
		typeof lead.paidAmountKopecks === "number" &&
		lead.paidAmountKopecks > 0
	) {
		return Math.round(lead.paidAmountKopecks / 100);
	}
	return 0;
}
