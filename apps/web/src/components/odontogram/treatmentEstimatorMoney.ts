/*
 * treatmentEstimatorMoney.ts — Точные расчеты денег сметы в целых копейках (Kopecks), ДМС и итоги.
 * Мандаты 8b, 8e: <= 800 строк, модульность, исключение ошибок округления IEEE 754.
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	percentageOfKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	basisPointsFromPercent,
	coveragePercentForCategory,
	type InsuranceCoveragePercents,
} from "../treatment-plans/planPricing";
import type { PlanItem } from "./treatmentEstimatorCatalogMatching";

/** Договор ДМС в том виде, в каком его читает расчёт. */
export type EstimatorContract = InsuranceCoveragePercents | null;

/**
 * Четыре процента договора из ответа сервера.
 */
export function estimatorContractFrom(raw: unknown): EstimatorContract {
	if (!raw || typeof raw !== "object") return null;
	const source = raw as Record<string, unknown>;
	const pct = (value: unknown): number =>
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= 0 &&
		value <= 100
			? value
			: 0;
	return {
		coverageTherapyPct: pct(source.coverageTherapyPct),
		coverageOrthoPct: pct(source.coverageOrthoPct),
		coverageHygienePct: pct(source.coverageHygienePct),
		coverageSurgeryPct: pct(source.coverageSurgeryPct),
	};
}

/**
 * Раздел прайса, по которому считается покрытие ДМС.
 */
export function estimatorCoverageCategory(item: PlanItem): string | null {
	if (item.category) return item.category;
	const nameLower = item.name.toLowerCase();
	if (nameLower.includes("гигиен") || nameLower.includes("чистк")) {
		return "hygiene";
	}
	if (item.phase === 1) return "therapy";
	if (item.phase === 2) return "surgery";
	if (item.phase === 3) return "prosthetics";
	return null;
}

/** Деньги одной строки. `known: false` — цены нет, и числа не будет. */
export type EstimatorRowMoney =
	| { known: false }
	| {
			known: true;
			unitKopecks: Kopecks;
			unitPayableKopecks: Kopecks;
			lineKopecks: Kopecks;
			payableKopecks: Kopecks;
			coveragePct: number;
			copayPct: number;
			hasContract: boolean;
	  };

/**
 * Разбор денежного значения без исключения посреди отрисовки.
 */
export function safeKopecks(
	value: number | string | null | undefined,
): Kopecks | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "number" && !Number.isFinite(value)) return null;
	try {
		return parseKopecks(value);
	} catch {
		return null;
	}
}

/**
 * Деньги строки — целыми копейками.
 */
export function estimatorRowMoney(
	item: PlanItem,
	contract: EstimatorContract,
): EstimatorRowMoney {
	const unitKopecks = safeKopecks(item.price);
	if (unitKopecks === null || unitKopecks < 0) return { known: false };
	if (!Number.isInteger(item.quantity) || item.quantity < 0) {
		return { known: false };
	}
	const discountKopecks = safeKopecks(item.discount) ?? 0;
	if (discountKopecks < 0) return { known: false };

	const lineKopecks = Math.max(
		0,
		multiplyKopecks(unitKopecks, item.quantity) - discountKopecks,
	);

	if (!contract) {
		return {
			known: true,
			unitKopecks,
			unitPayableKopecks: unitKopecks,
			lineKopecks,
			payableKopecks: lineKopecks,
			coveragePct: 0,
			copayPct: 100,
			hasContract: false,
		};
	}

	const coveragePct = coveragePercentForCategory(
		estimatorCoverageCategory(item),
		contract,
	);
	const basisPoints = basisPointsFromPercent(coveragePct);
	if (basisPoints === null || basisPoints === 0) {
		return {
			known: true,
			unitKopecks,
			unitPayableKopecks: unitKopecks,
			lineKopecks,
			payableKopecks: lineKopecks,
			coveragePct: 0,
			copayPct: 100,
			hasContract: true,
		};
	}
	const unitPayable =
		unitKopecks - percentageOfKopecks(unitKopecks, basisPoints);
	return {
		known: true,
		unitKopecks,
		unitPayableKopecks: unitPayable,
		lineKopecks,
		payableKopecks: Math.max(
			0,
			multiplyKopecks(unitPayable, item.quantity) - discountKopecks,
		),
		coveragePct,
		copayPct: 100 - coveragePct,
		hasContract: true,
	};
}

export interface EstimatorTotals {
	payableKopecks: Kopecks;
	incompleteRows: number;
	pricedRows: number;
}

/**
 * Итог плана.
 */
export function estimatorTotals(
	items: readonly PlanItem[],
	contract: EstimatorContract,
): EstimatorTotals {
	const payable: Kopecks[] = [];
	let incompleteRows = 0;
	for (const item of items) {
		const money = estimatorRowMoney(item, contract);
		if (!money.known) {
			incompleteRows += 1;
			continue;
		}
		payable.push(money.payableKopecks);
	}
	return {
		payableKopecks: sumKopecks(payable),
		incompleteRows,
		pricedRows: payable.length,
	};
}

export type EstimatorPlanReadPhase = "loading" | "ready" | "failed";

export type EstimatorTotalView = {
	readonly caption: string;
	readonly note: string | null;
} & (
	| { readonly kind: "sum"; readonly payableKopecks: Kopecks }
	| { readonly kind: "instead"; readonly instead: string }
);

/**
 * Строка итога сметы.
 */
export function estimatorTotalView(
	totals: EstimatorTotals,
	rowCount: number,
	phase: EstimatorPlanReadPhase,
): EstimatorTotalView {
	if (phase === "loading") {
		return {
			kind: "instead",
			caption: "Итого по плану:",
			instead: "План ещё читается",
			note: null,
		};
	}
	if (phase === "failed") {
		return {
			kind: "instead",
			caption: "Итого по плану:",
			instead: "План не прочитан",
			note: null,
		};
	}
	if (totals.pricedRows === 0) {
		return rowCount === 0
			? {
					kind: "instead",
					caption: "Итого по плану:",
					instead: "Пока ничего не добавлено",
					note: null,
				}
			: {
					kind: "instead",
					caption: "Итого по плану:",
					instead: "Считать пока нечего",
					note: "Ни у одной строки плана нет цены из вашего прайса",
				};
	}
	return {
		kind: "sum",
		caption:
			totals.incompleteRows > 0
				? "Итого, без непосчитанного:"
				: "Итого по плану:",
		payableKopecks: totals.payableKopecks,
		note:
			totals.incompleteRows > 0
				? "Итог неполный: в плане есть лечение без цены из прайса"
				: null,
	};
}
