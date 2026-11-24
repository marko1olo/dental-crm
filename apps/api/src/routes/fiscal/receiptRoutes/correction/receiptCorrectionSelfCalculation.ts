/**
 * receiptCorrectionSelfCalculation.ts — Facade for 54-FZ Refund & Self-Initiated Correction Handlers.
 * Delegates implementation to ./receiptRefundHandler.ts and ./receiptSelfCorrectionHandler.ts.
 */

export {
	applyCashBoxFiscalRefund,
	handleFiscalRefund,
} from "./receiptRefundHandler.js";
export { handleFiscalSelfCorrection } from "./receiptSelfCorrectionHandler.js";
