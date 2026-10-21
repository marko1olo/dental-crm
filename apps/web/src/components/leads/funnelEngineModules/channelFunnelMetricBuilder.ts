/**
 * FUNNEL ENGINE MODULES: CHANNEL FUNNEL METRIC BUILDER
 * Mandate 8b (<= 120 lines), Mandate 8s (Modular Architecture)
 */

import { safeDivide, safePercent } from "./funnelRoiMath.js";
import type {
	CanonicalMarketingChannelKey,
	ChannelEfficiencyRating,
	ChannelFunnelMetric,
} from "./types.js";

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
			recommendation:
				"Бесплатный/органический трафик. Развивать реферальные программы.",
		};
	}
	if (paidCount === 0) {
		return {
			rating: "critical",
			recommendation:
				"0 продаж при наличии расходов. Проверить скрипты и квалификацию лидов.",
		};
	}
	if (romiPercent >= 300) {
		return {
			rating: "excellent",
			recommendation:
				"Сверхвысокая окупаемость (>300%). Масштабировать рекламный бюджет.",
		};
	}
	if (romiPercent >= 100) {
		return {
			rating: "good",
			recommendation:
				"Рентабельный канал. Удерживать объем и оптимизировать CPL.",
		};
	}
	if (romiPercent >= 0) {
		return {
			rating: "warning",
			recommendation:
				"Работает в ноль/слабый плюс. Требуется повышение среднего чека.",
		};
	}
	return {
		rating: "critical",
		recommendation:
			"Отрицательный ROMI. Пересмотреть посадочные страницы или снизить ставки.",
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
	const conversionRatePercent = safePercent(
		params.paidCount,
		params.leadsCount,
	);
	const showUpRatePercent = safePercent(params.showUpCount, params.bookedCount);
	const avgBillRub = safeDivide(params.revenueRub, params.paidCount);
	const cplRub = safeDivide(params.spendRub, params.leadsCount);
	const cacRub = safeDivide(params.spendRub, params.paidCount);
	const netProfit = params.revenueRub - params.spendRub;
	const romiPercent =
		params.spendRub > 0 ? safePercent(netProfit, params.spendRub) : 0;

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
