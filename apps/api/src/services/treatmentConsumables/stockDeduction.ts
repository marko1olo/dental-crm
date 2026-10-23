/**
 * stockDeduction.ts — Layer 5: Canonical Facade for transactional stock deduction.
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

export type {
	DeductForToothTreatmentParams,
	DeductForVisitParams,
	StockDeductionRecord,
	StockDeductionResult,
	StockDeductionWarning,
} from "./stockDeductionModules/stockDeductionTypes.js";

export { deductForVisit } from "./stockDeductionModules/visitDeductionHandler.js";
export { deductForToothTreatment } from "./stockDeductionModules/toothDeductionHandler.js";
