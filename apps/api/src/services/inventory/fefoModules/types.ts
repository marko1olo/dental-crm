/**
 * @file types.ts
 * Доменные типы FEFO-списания, оприходования партий и мягкого овердрафта (Мандат 8b).
 */

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
} from "../fefo/types.js";
