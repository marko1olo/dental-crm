/**
 * apps/api/src/utils/money.ts
 * Re-export facade to @dental/shared canonical money helpers per Mandate 8s.
 */
export {
	parseKopecks,
	rublesToKopecks,
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
	moneyRub,
	moneyRubSchema,
	positiveMoneyRubSchema,
	nonNegativeMoneyRubSchema,
	type Kopecks,
} from "@dental/shared";

