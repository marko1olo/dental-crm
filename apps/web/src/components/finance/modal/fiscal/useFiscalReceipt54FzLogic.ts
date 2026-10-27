/**
 * useFiscalReceipt54FzLogic.ts — Обратная совместимость с каноническим useFiscalReceiptLogic.ts.
 * Mandate 8b: <10 lines facade.
 */

import { useFiscalReceiptLogic } from "./useFiscalReceiptLogic.js";
export * from "./useFiscalReceiptLogic.js";
export { useFiscalReceiptLogic as useFiscalReceipt54FzLogic } from "./useFiscalReceiptLogic.js";
export default useFiscalReceiptLogic;
