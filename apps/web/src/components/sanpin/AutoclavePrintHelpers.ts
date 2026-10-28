/**
 * ============================================================================
 * AUTOCLAVE PRINT HELPERS (Журнал автоклавирования & Thermal Labels)
 * Фасад вспомогательных функций печати этикеток и официального Журнала автоклавирования
 * ============================================================================
 */

export { handlePrintBatchPouches } from "./autoclaveBatchPouchesPrint.js";
export {
	handleGenerateMonthlySterilizationLog,
	handleGenerateMonthlySterilizationLog as handleGenerateMonthlyForm257,
} from "./autoclaveMonthlyJournalPrint.js";

