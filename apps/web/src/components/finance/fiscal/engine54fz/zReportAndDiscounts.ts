/**
 * zReportAndDiscounts.ts — Facade for Z-Reports, Returns, Installments & Loyalty Discounts (Mandate 8b: <= 15 lines).
 */
export { compile54FzShiftCloseZReport } from "./zReportCompiler";
export { generate54FzZReportReceiptTapeText } from "./zReportTape";
export { calculateIncomeReturnDraft } from "./incomeReturnDraft";
export { calculateInstallmentPlanSchedule } from "./installmentSchedule";
export { buildFnsFiscalReceiptQrString } from "./fnsReceiptQr";
export { calculateRoundToHundredsDiscountRub, roundToHundredsRub } from "./roundToHundreds";
export { distributeLoyaltyDiscountAcrossItems } from "./loyaltyDiscountDistribution";
export { buildReceptionQuickContactMessage } from "./receptionQuickContact";
