/**
 * @file fefoServiceClass.ts
 * Класс FefoStockService и синглтон fefoStockService (Мандат 8b).
 */

import type {
	DbTransaction,
	DeductFefoParams,
	DeductForProcedureParams,
	DeductForProcedureResult,
	FefoDeductionResult,
	ReceiveBatchInput,
	WriteOffResult,
	WriteOffScrapInput,
} from "./types.js";
import { deductFefo } from "./fefoDeductionCore.js";
import { receiveBatch } from "./batchReceiving.js";
import { writeOffExpiredOrScrap } from "./scrapWriteOff.js";
import { deductForProcedure } from "./procedureDeduction.js";
import { stockBatches } from "../../../db/schema/inventory.js";

export class FefoStockService {
	public deductFefo(
		tx: DbTransaction,
		params: DeductFefoParams,
	): Promise<FefoDeductionResult> {
		return deductFefo(tx, params);
	}

	public receiveBatch(
		tx: DbTransaction,
		input: ReceiveBatchInput,
	): Promise<typeof stockBatches.$inferSelect> {
		return receiveBatch(tx, input);
	}

	public writeOffExpiredOrScrap(
		tx: DbTransaction,
		input: WriteOffScrapInput,
	): Promise<WriteOffResult> {
		return writeOffExpiredOrScrap(tx, input);
	}

	public deductForProcedure(
		tx: DbTransaction,
		params: DeductForProcedureParams,
	): Promise<DeductForProcedureResult> {
		return deductForProcedure(tx, params);
	}
}

export const fefoStockService = new FefoStockService();
