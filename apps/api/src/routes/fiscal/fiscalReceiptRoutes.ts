/**
 * fiscalReceiptRoutes.ts — Canonical Facade for Statutory 54-FZ Fiscal Receipt Routes.
 *
 * Decomposed into modular DAG structure under `./receiptRoutes/`:
 * - `constants.ts`: Layer 0 Constants & Tags
 * - `types.ts`: Layer 0 Schemas, DTOs & Fiscal Types
 * - `receiptDraftHandlers.ts`: Layer 1 Line Items & Pre-flight Validator
 * - `receiptFiscalizeHandlers.ts`: Layer 2 LAN KKT Print & Cash Register Ledger
 * - `receiptCorrectionHandlers.ts`: Layer 2 Refund & Correction Receipts
 * - `receiptQueryHandlers.ts`: Layer 3 Queue Queries, Telemetry & Retries
 * - `index.ts`: Layer 5 Master Fastify Plugin Coordinator
 */

export { registerFiscalReceiptRoutes } from "./receiptRoutes/index.js";
export * from "./receiptRoutes/index.js";
