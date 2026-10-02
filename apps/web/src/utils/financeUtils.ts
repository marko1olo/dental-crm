/**
 * apps/web/src/utils/financeUtils.ts
 * Re-export facade to formatters.ts per Mandate 8s (SSOT: formatters.ts).
 */
export {
	money,
	moneyUnknownLabel,
	formatRubles,
	formatCurrency,
	formatCurrencyRu,
	formatKopecksRu,
	formatKopecksToRubles,
	formatRublesExactRu,
	rublesToKopecks,
	kopecksToRubles,
} from "./formatters.js";
