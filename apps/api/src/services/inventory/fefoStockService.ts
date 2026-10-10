// fefoStockService.ts — тонкий канонический фасад FEFO-учета (Мандат 8b).
export type {
	DbTransaction,
	DeductFefoParams,
	DeductForProcedureParams,
	DeductForProcedureResult,
	FefoBatchUsage,
	FefoDeductionResult,
	ReceiveBatchInput,
	WriteOffResult,
	WriteOffScrapInput,
} from "./fefo/types.js";
export {
	getDefaultExpirationDate,
	normalizeDateToIso,
} from "./fefo/dateUtils.js";
export {
	findNextActiveBatchInfo,
	selectActiveBatchesForFefo,
	sortBatchesByFefo,
} from "./fefo/batchSelector.js";
export {
	FefoStockService,
	deductFefo,
	deductForProcedure,
	fefoStockService,
	receiveBatch,
	writeOffExpiredOrScrap,
} from "./fefo/deductionEngine.js";
