/**
 * FUNNEL ENGINE MODULES: ROI ENGINE
 *
 * Layer 2: Калькулятор ROMI, окупаемости рекламных каналов, безопасной математики деления
 * и юнит-экономики (CPL, CAC, CPS, средний чек).
 *
 * ИНВАРИАНТЫ:
 * - 100% защита от деления на 0 во всех операциях.
 * - Чистые функции без сайд-эффектов.
 * - Отсутствие NaN / Infinity.
 */

import {
	type CanonicalMarketingChannelKey,
	type ChannelEfficiencyRating,
	type ChannelFunnelMetric,
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

/**
 * Оценка эффективности рекламного канала
 */
export function evaluateChannelEfficiency(
	spendRub: number,
	paidCount: number,
	romiPercent: number,
): { rating: ChannelEfficiencyRating; recommendation: string } {
	if (spendRub <= 0) {
		return {
			rating: "organic",
			recommendation: "Бесплатный/органический трафик. Развивать реферальные программы.",
		};
	}
	if (paidCount === 0) {
		return {
			rating: "critical",
			recommendation: "0 продаж при наличии расходов. Проверить скрипты и квалификацию лидов.",
		};
	}
	if (romiPercent >= 300) {
		return {
			rating: "excellent",
			recommendation: "Сверхвысокая окупаемость (>300%). Масштабировать рекламный бюджет.",
		};
	}
	if (romiPercent >= 100) {
		return {
			rating: "good",
			recommendation: "Рентабельный канал. Удерживать объем и оптимизировать CPL.",
		};
	}
	if (romiPercent >= 0) {
		return {
			rating: "warning",
			recommendation: "Работает в ноль/слабый плюс. Требуется повышение среднего чека.",
		};
	}
	return {
		rating: "critical",
		recommendation: "Отрицательный ROMI. Пересмотреть посадочные страницы или снизить ставки.",
	};
}

/**
 * Сборка полной метрики канала привлечения
 */
export function buildChannelFunnelMetric(params: {
	channelKey: CanonicalMarketingChannelKey;
	channelLabel: string;
	color: string;
	spendRub: number;
	leadsCount: number;
	bookedCount: number;
	showUpCount: number;
	agreedCount: number;
	paidCount: number;
	revenueRub: number;
}): ChannelFunnelMetric {
	const conversionRatePercent = safePercent(params.paidCount, params.leadsCount);
	const showUpRatePercent = safePercent(params.showUpCount, params.bookedCount);
	const avgBillRub = safeDivide(params.revenueRub, params.paidCount);
	const cplRub = safeDivide(params.spendRub, params.leadsCount);
	const cacRub = safeDivide(params.spendRub, params.paidCount);
	const netProfit = params.revenueRub - params.spendRub;
	const romiPercent = params.spendRub > 0 ? safePercent(netProfit, params.spendRub) : 0;

	const { rating, recommendation } = evaluateChannelEfficiency(
		params.spendRub,
		params.paidCount,
		romiPercent,
	);

	return {
		channelKey: params.channelKey,
		channelLabel: params.channelLabel,
		color: params.color,
		spendRub: params.spendRub,
		leadsCount: params.leadsCount,
		bookedCount: params.bookedCount,
		showUpCount: params.showUpCount,
		agreedCount: params.agreedCount,
		paidCount: params.paidCount,
		conversionRatePercent,
		showUpRatePercent,
		revenueRub: params.revenueRub,
		avgBillRub,
		cplRub,
		cacRub,
		romiPercent,
		efficiencyRating: rating,
		recommendation,
	};
}
