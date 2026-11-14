/**
 * warehouseOperations.ts — Layer 5: Canonical Facade for warehouse operations.
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

export {
	quickCarpuleDisposalSchema,
	softOverdraftDeductSchema,
	warehouseDeductBatchBodySchema,
	warehouseDeductItemSchema,
} from "./warehouseSchemas.js";

export { executeQuickCarpuleDisposal } from "./quickCarpuleDisposal.js";
