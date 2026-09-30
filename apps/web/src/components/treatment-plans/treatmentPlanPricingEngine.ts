/**
 * treatmentPlanPricingEngine.ts — калькулятор цен, скидок, бонусов, 13% налогового вычета НДФЛ
 * и беспроцентной рассрочки для планов лечения DENTE CRM (Мандаты 8b, 8e, 8k).
 */

import {
	type Kopecks,
	parseKopecks,
	percentageOfKopecks,
	splitKopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
} from "@dental/shared";
import type {
	LoyaltyBonusDeduction,
	NdflDeductionResult,
	TierInstallmentPlan,
	TreatmentPlanItem,
} from "./types";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export interface CatalogServiceLookupItem {
	readonly id: string;
	readonly title: string;
	readonly category: string;
	readonly basePath?: string;
	readonly basePriceRub: number;
	readonly active?: boolean;
	readonly code?: string;
	readonly order804nCode?: string;
}

export interface MatchCatalogServiceResult {
	readonly priceRub: number;
	readonly unitPriceRub: number;
	readonly title: string;
	readonly priceId: string | null;
	readonly fromCatalog: boolean;
	readonly isDraft: boolean;
	readonly requiresManualPricing: boolean;
}

/**
 * Поиск услуги в прейскуранте клиники по коду 804н или ключевым словам.
 * В PROD-режиме: при отсутствии в каталоге возвращает priceRub: 0, unitPriceRub: 0, isDraft: true, requiresManualPricing: true.
 * В DEMO-режиме: использует демонстрационную цену fallbackPriceRub.
 */
export function matchCatalogService(
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	category: string,
	keywords: readonly string[],
	fallbackPriceRub: number,
	order804nCode?: string,
	options?: { isDemoMode?: boolean },
): MatchCatalogServiceResult {
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);

	if (catalog && catalog.length > 0) {
		const normalizedKeywords = keywords.map((k) => k.toLowerCase().replace(/ё/g, "е"));

		// 1. Точное совпадение по Order 804n коду (если есть в прайсе)
		if (order804nCode) {
			const byCode = catalog.find(
				(s) =>
					s.active !== false &&
					(s.title.includes(order804nCode) ||
						s.order804nCode === order804nCode ||
						s.code === order804nCode),
			);
			if (byCode && typeof byCode.basePriceRub === "number" && byCode.basePriceRub > 0) {
				return {
					priceRub: byCode.basePriceRub,
					unitPriceRub: byCode.basePriceRub,
					title: byCode.title,
					priceId: byCode.id,
					fromCatalog: true,
					isDraft: false,
					requiresManualPricing: false,
				};
			}
		}

		// 2. Сопоставление по ключевым словам и категории
		const matched = catalog.filter((item) => {
			const title = item.title.toLowerCase().replace(/ё/g, "е");
			return normalizedKeywords.some((kw) => title.includes(kw));
		});

		const activeMatch = matched.find((s) => s.active !== false) ?? matched[0];
		if (activeMatch && typeof activeMatch.basePriceRub === "number" && activeMatch.basePriceRub > 0) {
			return {
				priceRub: activeMatch.basePriceRub,
				unitPriceRub: activeMatch.basePriceRub,
				title: activeMatch.title,
				priceId: activeMatch.id,
				fromCatalog: true,
				isDraft: false,
				requiresManualPricing: false,
			};
		}
	}

	// Услуга отсутствует в каталоге или basePriceRub === 0:
	if (isDemo) {
		return {
			priceRub: fallbackPriceRub,
			unitPriceRub: fallbackPriceRub,
			title: "",
			priceId: null,
			fromCatalog: false,
			isDraft: false,
			requiresManualPricing: false,
		};
	}

	// PROD-режим: запрещено подставлять фиксированные дефолтные цены!
	return {
		priceRub: 0,
		unitPriceRub: 0,
		title: "",
		priceId: null,
		fromCatalog: false,
		isDraft: true,
		requiresManualPricing: true,
	};
}

/**
 * Расчет бонусов лояльности и скидки.
 */
export function calculateLoyaltyBonusDeduction(
	grossKopecks: Kopecks,
	discountPercent: number,
	availablePatientBalanceRub: number,
	requestedBonusToSpendRub: number = 0,
): LoyaltyBonusDeduction {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const discountKopecks =
		validDiscountPct > 0
			? (percentageOfKopecks(grossKopecks, validDiscountPct * 100))
			: (0 as Kopecks);

	const afterDiscountKopecks = Math.max(0, grossKopecks - discountKopecks) as Kopecks;
	const afterDiscountRub = Math.round(afterDiscountKopecks / 100);

	const maxSpendableBonusRub = Math.max(
		0,
		Math.min(availablePatientBalanceRub, afterDiscountRub),
	);
	const appliedBonusRub = Math.max(
		0,
		Math.min(requestedBonusToSpendRub, maxSpendableBonusRub),
	);
	const appliedBonusKopecks = parseKopecks(appliedBonusRub);

	const netPayableKopecks = Math.max(
		0,
		afterDiscountKopecks - appliedBonusKopecks,
	) as Kopecks;
	const netPayableRub = Math.round(netPayableKopecks / 100);

	return {
		availableBalanceRub: availablePatientBalanceRub,
		appliedBonusRub,
		appliedBonusKopecks,
		grossKopecks,
		discountKopecks,
		netPayableKopecks,
		netPayableRub,
	};
}

/**
 * Расчет налогового вычета 13% НДФЛ.
 */
export function calculateNdflDeduction(
	totalKopecks: Kopecks,
	isHighCostCode02: boolean = true,
): NdflDeductionResult {
	const code = isHighCostCode02 ? "02" : "01";
	const codeDescription = isHighCostCode02
		? "Код 02 — Дорогостоящее лечение (имплантация, костная пластика, синус-лифтинг) — налоговый вычет 13% со всей суммы без ограничений"
		: "Код 01 — Обычное медицинское лечение (терапия, гигиена, ортопедия) — налоговый вычет 13% с лимитом налоговой базы 150 000 ₽ (макс. возврат 19 500 ₽)";

	if (totalKopecks <= 0) {
		return {
			code,
			codeDescription,
			isHighCostCode02,
			baseKopecks: 0 as Kopecks,
			refundKopecks: 0 as Kopecks,
			refundRub: 0,
			finalPriceWithRefundRub: 0,
			annualLimitRub: isHighCostCode02 ? undefined : 150000,
		};
	}

	let refundKopecks: Kopecks;
	let baseKopecks: Kopecks;
	if (isHighCostCode02) {
		baseKopecks = totalKopecks;
		refundKopecks = percentageOfKopecks(totalKopecks, 1300); // 13.00%
	} else {
		const cap = parseKopecks(150000);
		baseKopecks = Math.min(totalKopecks, cap) as Kopecks;
		refundKopecks = percentageOfKopecks(baseKopecks, 1300);
	}

	const refundRub = Math.round(refundKopecks / 100);
	const totalRub = Math.round(totalKopecks / 100);
	const finalPriceWithRefundRub = Math.max(0, totalRub - refundRub);

	return {
		code,
		codeDescription,
		isHighCostCode02,
		baseKopecks,
		refundKopecks,
		refundRub,
		finalPriceWithRefundRub,
		annualLimitRub: isHighCostCode02 ? undefined : 150000,
	};
}

/**
 * Расчет рассрочки 0% без потерь копеек.
 */
export function computeTierInstallments(
	totalKopecks: Kopecks,
): Record<3 | 6 | 12 | 24, TierInstallmentPlan> {
	const build = (months: 3 | 6 | 12 | 24): TierInstallmentPlan => {
		if (totalKopecks <= 0) {
			return {
				months,
				monthlyPaymentKopecks: 0 as Kopecks,
				monthlyPaymentRub: 0,
				partsKopecks: Array(months).fill(0 as Kopecks),
				remainderKopecks: 0 as Kopecks,
			};
		}
		const parts = splitKopecks(totalKopecks, months);
		const monthlyPaymentKopecks = (parts[0] ?? 0) as Kopecks;
		const monthlyPaymentRub = Math.round(monthlyPaymentKopecks / 100);
		const remainderKopecks = ((parts[parts.length - 1] ?? 0) - monthlyPaymentKopecks) as Kopecks;
		return {
			months,
			monthlyPaymentKopecks,
			monthlyPaymentRub,
			partsKopecks: parts,
			remainderKopecks,
		};
	};

	return {
		3: build(3),
		6: build(6),
		12: build(12),
		24: build(24),
	};
}

/**
 * Прямой расчет поэтапной оплаты (30% / 40% / 30%) с балансировкой копеек.
 */
export function calculateStagedPayment304030(totalKopecksOrRub: number, isKopecks: boolean = true) {
	return calculateStaged304030Schedule(totalKopecksOrRub, isKopecks);
}

/**
 * Прямой расчет экономии 13% НДФЛ для плана лечения.
 */
export function calculatePlanNdflDeduction(
	items: readonly TreatmentPlanItem[] | readonly { readonly code804n?: string; readonly serviceName?: string; readonly priceRub?: number; readonly unitPriceRub?: number; readonly quantity?: number; readonly name?: string }[],
) {
	return calculatePlanTaxDeductionBreakdown(items as any);
}
