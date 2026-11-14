/**
 * apps/web/src/components/finance/fiscalEngine/receiptBuilders.ts
 *
 * Facade for mapping treatment items and generating fiscal receipts.
 * Mandate 8b: <= 120 lines.
 */

export { mapTreatmentItemsToFiscalReceipt } from "./receiptItemMapper";
export {
	generateFiscalReceipt,
	generateFiscalReceipt54Fz,
	type GenerateFiscalReceiptParams,
} from "./fiscalReceiptGenerator";
