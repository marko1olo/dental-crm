/**
 * receiptCorrectionHandlers.ts — Layer 2 Facade: 54-FZ Refund & Correction Receipts.
 *
 * Provides backward-compatible exports for modular correction handlers:
 * - receiptCorrectionValidation: kopecks, taxation, prescription validation & patient contact.
 * - receiptCorrectionSelfCalculation: self-initiated correction, refunds & cash register ledger reversals.
 * - receiptCorrectionPrescription: tax authority prescription correction receipts & unified dispatcher.
 */

export * from "./correction/receiptCorrectionValidation.js";
export * from "./correction/receiptCorrectionSelfCalculation.js";
export * from "./correction/receiptCorrectionPrescription.js";
