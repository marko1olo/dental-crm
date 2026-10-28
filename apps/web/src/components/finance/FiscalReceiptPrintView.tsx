/**
 * apps/web/src/components/finance/FiscalReceiptPrintView.tsx
 *
 * Фасад обратной совместимости с каноническим ServiceReceiptPrintDocument.tsx («Товарный чек / Акт услуг»).
 * Mandate 8b & 8ap: <10 lines facade.
 */

export * from "./ServiceReceiptPrintDocument.js";
export { ServiceReceiptPrintDocument as default, ServiceReceiptPrintDocument as FiscalReceiptPrintView, ServiceReceiptPrintDocument as Order804nFiscalReceiptPrint } from "./ServiceReceiptPrintDocument.js";
