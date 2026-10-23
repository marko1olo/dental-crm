/**
 * apps/api/src/routes/sanpin/sterilizationModules/sterilizationLogHandlers.ts
 *
 * Канонический фасад обработчиков журнала автоклавирования и стерилизации.
 * Мандат 8b: строго <= 80 строк.
 */

export {
	handleGetDailyTests,
	handleCreateDailyTest,
} from "./handlers/dailyAutoclaveTestHandlers.js";
export {
	handleGetPsoTests,
	handleCreatePsoTest,
	handlePsoQuickNorm,
} from "./handlers/psoLogHandlers.js";
export {
	handleGetSterilizationLogs,
	handleGetSanpinCycles,
} from "./handlers/getSterilizationLogsHandler.js";
export {
	handleCreateSterilizationLog,
	handleCreateSanpinCycle,
} from "./handlers/createSterilizationLogHandler.js";
export {
	handleQuickNormCycle,
} from "./handlers/createAutoclaveBatchCycleHandler.js";
export {
	handleSterilizationShiftBatch,
} from "./handlers/sterilizationShiftBatchHandler.js";
export {
	handleScanSterilization,
} from "./handlers/sterilizationBarcodeHandler.js";
export {
	executeSterilizationConsumablesDeduction,
	type SterilizationDeductionParams,
	type SterilizationDeductionResult,
} from "./handlers/sterilizationConsumablesDeduction.js";
