/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS STATUTORY MEDICAL TAX DEDUCTION XML GENERATOR & EDI ENGINE
 * Form KND 1151156 / Electronic XML Format KND 1184043 (UT_SVOPLMEDUSL 5.01)
 * ═══════════════════════════════════════════════════════════════════════════
 * Canonical backward-compatible facade delegating to modular DAG in ./ndfl/
 */

export * from "./ndfl/index.js";
export type * from "./ndfl/index.js";

export {
	type FnsTaxPayload,
	type SupportedTaxYear,
	type FnsNdflXmlResult,
	escapeXmlAttr,
	cleanDigits,
	type FnsNdflPrintSigningOptions,
	type FnsReceiptsChecksumValidationResult,
	rublesFromKopecks,
	formatFnsRuDate,
	formatFnsDate,
	classifyNdflServiceCode,
	isNonMedicalGood,
	isDmsInsurancePayment,
	generateFnsFileNameAndId,
	parseFio,
	validateFnsFiscalReceiptsChecksums,
	preflightValidatePayload,
	buildFnsKnd1151156Xml,
	generateFnsNdflXml,
	validateFnsNdflXmlStructure,
	generateFnsNdflPrintHtml,
} from "./ndfl/index.js";
