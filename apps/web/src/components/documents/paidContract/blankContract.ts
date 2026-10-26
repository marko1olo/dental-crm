/**
 * blankContract.ts — Канонический SSOT генерации и печати бланков договоров и ИДС со строками «_______»
 * (Постановление Правительства РФ № 736, ст. 20 и 84 323-ФЗ, Мандаты 8b, 8e, 8n).
 *
 * Facade module strictly <= 120 lines.
 */

export type { BlankContractPatientInfo, BlankContractOptions } from "./blankContractTypes";
export { LEGAL_CLAUSES } from "./blankContractTypes";
export { generateBlankContractFallbackHtml } from "./blankContractHtml";
export { generateBlankConsentFallbackHtml } from "./blankConsentHtml";
export { printBlankMedicalContract, printBlankMedicalConsent } from "./blankPrintActions";
export { generateBlankConsentHtml } from "./blankConsentGenerator";
export { generatePrimaryVisitPackageHtml } from "./primaryVisitPackageGenerator";
