/**
 * paidContract/money.ts
 * Facade re-exporting money calculations and words formatting (Mandate 8b <= 120 lines)
 */

export { pluralizeRu } from "../../../lib/russianPlural";
export { numberToWordsRu } from "./numberToWordsRu";
export {
	formatKopecksToRubAndKop,
	parseRublesToKopecks,
	calculatePaidContractServiceTotalKopecks,
	calculatePaidContractGrandTotalKopecks,
} from "./moneyFormatting";
