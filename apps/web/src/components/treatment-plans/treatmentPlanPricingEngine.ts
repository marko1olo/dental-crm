/**
 * treatmentPlanPricingEngine.ts — калькулятор цен, скидок, бонусов, 13% налогового вычета НДФЛ
 * и беспроцентной рассрочки для планов лечения DENTE CRM (Мандаты 8b, 8e, 8k).
 */

import {
	type Kopecks,
	parseKopecks,
	percentageOfKopecks,
	splitKopecks,
	sumKopecks,
	multiplyKopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
} from "@dental/shared";
import type {
	LoyaltyBonusDeduction,
	NdflDeductionResult,
	TierInstallmentPlan,
	TreatmentPlanItem,
} from "./types";
import { isDemoShowcaseMode } from "../../lib/demoMode";

import type { PlanPriceCatalogItem } from "./planDriftAudit";

export type { PlanPriceCatalogItem };
export type LoyaltyBonusCalculationResult = LoyaltyBonusDeduction;
export type CatalogServiceLookupItem = PlanPriceCatalogItem;

/**
 * Разбор денежного значения без исключения посреди отрисовки.
 * @param allowEmptyAsZero - если true, null/undefined/"" дает 0 (для смет),
 *                            если false, дает null (для одонтограммы, где отсутствие цены = unknown).
 */
export function safeKopecks(
	value: number | string | null | undefined,
	options: { allowEmptyAsZero?: boolean } = { allowEmptyAsZero: true },
): Kopecks | null {
	if (value === null || value === undefined || value === "") {
		return options.allowEmptyAsZero ? (0 as Kopecks) : null;
	}
	if (typeof value === "number" && !Number.isFinite(value)) return null;
	try {
		return parseKopecks(value);
	} catch {
		return null;
	}
}

export const parseSafeKopecks = safeKopecks;

/** Строка сметы в том виде, в каком её отдаёт API. */
export interface PlanMoneyLine {
	readonly price: number | string;
	readonly quantity: number;
	readonly discount?: number | string | null;
}

/**
 * Итог по строке сметы, точно до копейки (Мандаты 8b, 8e).
 * Формула: Math.max(0, price * quantity - discountRub).
 */
export function planLineTotalKopecks(line: PlanMoneyLine): Kopecks | null {
	const unitKopecks = safeKopecks(line.price, { allowEmptyAsZero: true });
	if (unitKopecks === null) return null;
	if (!Number.isInteger(line.quantity) || line.quantity < 0) return null;
	const discountKopecks = safeKopecks(line.discount ?? 0, { allowEmptyAsZero: true });
	if (discountKopecks === null || discountKopecks < 0) return null;

	const gross = multiplyKopecks(unitKopecks, line.quantity);
	return Math.max(0, gross - discountKopecks) as Kopecks;
}

export interface PlanTotal {
	readonly kopecks: Kopecks | null;
	readonly unreadableLines: number;
}

/**
 * Итог плана лечения. Складываются целые копейки (Kopecks),
 * исключая ошибки с плавающей точкой IEEE 754 (0.1 + 0.2 != 0.3).
 */
export function planTotalKopecks(
	lines: readonly PlanMoneyLine[],
	storedTotalRub?: number | string | null,
): PlanTotal {
	if (lines.length === 0) {
		const stored = safeKopecks(storedTotalRub ?? 0, { allowEmptyAsZero: true });
		return { kopecks: stored, unreadableLines: stored === null ? 1 : 0 };
	}

	const totals: Kopecks[] = [];
	let unreadableLines = 0;
	for (const line of lines) {
		const lineTotal = planLineTotalKopecks(line);
		if (lineTotal === null) {
			unreadableLines += 1;
			continue;
		}
		totals.push(lineTotal);
	}
	if (unreadableLines > 0) return { kopecks: null, unreadableLines };
	return { kopecks: sumKopecks(totals), unreadableLines: 0 };
}

export interface InstallmentScheduleKopecks {
	readonly months: 3 | 6 | 12 | 24;
	readonly totalKopecks: Kopecks;
	readonly monthlyPaymentKopecks: Kopecks;
	readonly monthlyPaymentRub: number;
	readonly partsKopecks: readonly Kopecks[];
	readonly remainderKopecks: Kopecks;
}

/**
 * Точный копеечный расчет рассрочки 0% без переплат (Мандат 8b, 8e).
 * Сумма всех ежемесячных платежей гарантированно равна итогу плана до копейки (kopeck-exact).
 */
export function calculateInstallmentScheduleKopecks(
	totalKopecks: Kopecks,
	months: 3 | 6 | 12 | 24,
): InstallmentScheduleKopecks {
	if (!Number.isInteger(totalKopecks) || totalKopecks <= 0) {
		return {
			months,
			totalKopecks: 0 as Kopecks,
			monthlyPaymentKopecks: 0 as Kopecks,
			monthlyPaymentRub: 0,
			partsKopecks: Array(months).fill(0 as Kopecks),
			remainderKopecks: 0 as Kopecks,
		};
	}

	const parts = splitKopecks(totalKopecks, months);
	const monthlyPaymentKopecks = (parts[0] ?? 0) as Kopecks;
	const monthlyPaymentRub = Math.round(monthlyPaymentKopecks / 100);
	const basePart = Math.floor(totalKopecks / months);
	const remainder = (totalKopecks - basePart * months) as Kopecks;

	return {
		months,
		totalKopecks,
		monthlyPaymentKopecks,
		monthlyPaymentRub,
		partsKopecks: parts,
		remainderKopecks: remainder,
	};
}

export interface StagedPaymentBreakdownKopecks {
	readonly totalKopecks: Kopecks;
	readonly stage1Kopecks: Kopecks;
	readonly stage2Kopecks: Kopecks;
	readonly stage3Kopecks: Kopecks;
	readonly stage1Rub: number;
	readonly stage2Rub: number;
	readonly stage3Rub: number;
}

/**
 * Копеечный расчет поэтапной оплаты (по умолчанию 30% аванс / 40% хирургия / 30% ортопедия).
 * Сумма этапов точно сходится с итогом сметы без погрешностей округления.
 */
export function calculateStagedPaymentScheduleKopecks(
	totalKopecks: Kopecks,
	ratios: readonly [number, number, number] = [30, 40, 30],
): StagedPaymentBreakdownKopecks {
	if (!Number.isInteger(totalKopecks) || totalKopecks <= 0) {
		return {
			totalKopecks: 0 as Kopecks,
			stage1Kopecks: 0 as Kopecks,
			stage2Kopecks: 0 as Kopecks,
			stage3Kopecks: 0 as Kopecks,
			stage1Rub: 0,
			stage2Rub: 0,
			stage3Rub: 0,
		};
	}

	const stage1Kopecks = Math.round((totalKopecks * ratios[0]) / 100) as Kopecks;
	const stage2Kopecks = Math.round((totalKopecks * ratios[1]) / 100) as Kopecks;
	const stage3Kopecks = Math.max(0, totalKopecks - stage1Kopecks - stage2Kopecks) as Kopecks;

	return {
		totalKopecks,
		stage1Kopecks,
		stage2Kopecks,
		stage3Kopecks,
		stage1Rub: Math.round(stage1Kopecks / 100),
		stage2Rub: Math.round(stage2Kopecks / 100),
		stage3Rub: Math.round(stage3Kopecks / 100),
	};
}

/**
 * Форматирование суммы в рублях на понятном русском языке.
 * Запрет на сырые «NULL», «NaN ₽», «404 Not Found» или машинный мусор в UI.
 */
export function formatPlanPriceRub(
	amountRub: number | string | null | undefined,
	fallbackText = "Цена не указана",
): string {
	if (amountRub === null || amountRub === undefined || amountRub === "") {
		return fallbackText;
	}
	const num =
		typeof amountRub === "string"
			? Number(amountRub.replace(/\s+/g, "").replace(",", "."))
			: amountRub;
	if (!Number.isFinite(num)) {
		return fallbackText;
	}
	const formatted = Math.round(num)
		.toLocaleString("ru-RU")
		.replace(/[\u00A0\u202F]/g, " ");
	return `${formatted} ₽`;
}

/**
 * Форматирует сумму в рублях для отображения пациенту у кресла.
 */
export function formatChairsidePrice(amountRub: number | undefined | null): string {
	const safe = typeof amountRub === "number" && !Number.isNaN(amountRub) ? Math.round(amountRub) : 0;
	return `${safe.toLocaleString("ru-RU")} ₽`;
}

/**
 * Форматирует сумму в копейках в рублевую строку.
 */
export function formatKopecksToRubString(amountKopecks: Kopecks | number): string {
	const rub = Math.round(Number(amountKopecks) / 100);
	return formatChairsidePrice(rub);
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
	const availableBalanceKopecks = Math.max(0, parseKopecks(availablePatientBalanceRub)) as Kopecks;
	const requestedBonusKopecks = Math.max(0, parseKopecks(requestedBonusToSpendRub)) as Kopecks;

	// Бонусы нельзя списать больше, чем сумма после скидки (в копейках) и больше, чем доступный баланс
	const maxSpendableBonusKopecks = Math.min(
		availableBalanceKopecks,
		afterDiscountKopecks,
	) as Kopecks;
	const appliedBonusKopecks = Math.min(
		requestedBonusKopecks,
		maxSpendableBonusKopecks,
	) as Kopecks;
	const appliedBonusRub = Math.floor(appliedBonusKopecks / 100);

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
		: `Код 01 — Обычное медицинское лечение (терапия, гигиена, ортопедия) — налоговый вычет 13% с лимитом налоговой базы ${ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024.toLocaleString("ru-RU")} ₽ (макс. возврат 19 500 ₽)`;

	if (totalKopecks <= 0) {
		return {
			code,
			codeDescription,
			isHighCostCode02,
			isHighCostTreatment: isHighCostCode02,
			baseKopecks: 0 as Kopecks,
			refundKopecks: 0 as Kopecks,
			refundRub: 0,
			finalPriceWithRefundRub: 0,
			annualLimitRub: isHighCostCode02 ? undefined : ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
		};
	}

	let refundKopecks: Kopecks;
	let baseKopecks: Kopecks;
	if (isHighCostCode02) {
		baseKopecks = totalKopecks;
		refundKopecks = percentageOfKopecks(totalKopecks, 1300); // 13.00%
	} else {
		const cap = parseKopecks(ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024);
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
		isHighCostTreatment: isHighCostCode02,
		baseKopecks,
		refundKopecks,
		refundRub,
		finalPriceWithRefundRub,
		annualLimitRub: isHighCostCode02 ? undefined : ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	};
}

/**
 * Расчет рассрочки 0% без потерь копеек (Мандат 8b, 8e).
 * Сумма всех частей строго равна totalKopecks.
 */
export function computeTierInstallments(
	totalKopecks: Kopecks,
	options?: { distributeEvenly?: boolean },
): Record<3 | 6 | 12 | 24, TierInstallmentPlan> {
	const distributeEvenly = options?.distributeEvenly ?? false;
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
		if (distributeEvenly) {
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
		}

		// Каноническое распределение с остатком в первом платеже (Мандат 8e / 8n)
		const basePart = Math.floor(totalKopecks / months) as Kopecks;
		const remainder = (totalKopecks - basePart * months) as Kopecks;
		const parts: Kopecks[] = [];
		for (let i = 0; i < months; i++) {
			parts.push((i === 0 ? basePart + remainder : basePart) as Kopecks);
		}
		const monthlyPaymentRub = Math.round(basePart / 100);
		return {
			months,
			monthlyPaymentKopecks: basePart,
			monthlyPaymentRub,
			partsKopecks: parts,
			remainderKopecks: remainder,
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
