/**
 * packages/shared/src/finance/types.ts
 *
 * DENTE Dental CRM — Canonical Financial Types & Exact Kopeck Precision SSOT.
 * Mandate 8b (Money and legal documents are exact to the kopeck).
 * Mandate 8s (Law of the Single Indivisible Authority).
 */

export type { Kopecks } from "../money.js";

export {
	moneyRubSchema,
	positiveMoneyRubSchema,
	nonNegativeMoneyRubSchema,
	parseKopecks,
	rublesToKopecks,
	kopecksToRubles,
	kopecksToNumericString,
	kopecksToWholeRubles,
	sumKopecks,
	multiplyKopecks,
	multiplyKopecksFractional,
	percentageOfKopecks,
	splitKopecks,
	formatKopecksRu,
	formatKopecksToRubles,
	formatKopecksToRubExact,
	formatRublesExactRu,
	formatCurrency,
	formatRubles,
	allocateGlobalDiscountCents,
} from "../money.js";

export {
	rubToKopecks,
	kopecksToRub,
	roundHalfEven,
} from "../fiscal/kopecksArithmetic.js";
