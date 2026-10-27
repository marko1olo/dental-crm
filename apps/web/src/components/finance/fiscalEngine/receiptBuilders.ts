/**
 * apps/web/src/components/finance/fiscalEngine/receiptBuilders.ts
 *
 * Facade for mapping treatment items, generating fiscal receipts, and shift close Z-reports.
 * Mandate 8b: <= 120 lines.
 */

export { mapTreatmentItemsToFiscalReceipt } from "./receiptItemMapper";
export {
	generateFiscalReceipt,
	generateFiscalReceipt54Fz,
	type GenerateFiscalReceiptParams,
} from "./fiscalReceiptGenerator";
export {
	generateShiftCloseZReport,
	generateShiftCloseZReport54Fz,
	type GenerateShiftCloseZReportParams,
} from "./shiftCloseZReportGenerator";
