/**
 * invoiceEngine.ts — Dental Invoice, Completed Works Act & Warranty Certificate Engine (A4).
 * Decomposed under Mandate 8b into atomic sub-components <= 120 lines in ./invoiceEngineModules/.
 */

export { pluralizeRu } from "../../lib/russianPlural";

export * from "./invoiceEngineModules/invoiceTypes";
export * from "./invoiceEngineModules/invoiceWarrantyRules";
export * from "./invoiceEngineModules/invoiceActCompiler";
export * from "./invoiceEngineModules/invoiceHtmlStyles";
export * from "./invoiceEngineModules/invoiceHtmlTemplates";
