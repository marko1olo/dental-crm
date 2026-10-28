/**
 * FiscalReceiptModal.tsx — Фасад обратной совместимости с каноническим CashReceiptModal.tsx («Кассовый чек»).
 * Clean Orchestrator Facade (<10 lines) per Mandates 8b, 8ap, 8x.
 */

export * from "./CashReceiptModal.js";
export { CashReceiptModal as default, CashReceiptModal as FiscalReceiptModal, CashReceiptModal as FiscalReceipt54FzModal } from "./CashReceiptModal.js";
