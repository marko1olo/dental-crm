/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL FORMS ENGINE — DENTE DENTAL CRM
 * Form 043/u, 043-1/u, 037/u-88, 039/u-88, 003-V/u, Radiation Dose Sheet
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from "./documentKind.js";
export * from "./forms043u.js";
export * from "./forms043_1u.js";
export * from "./forms003vu.js";
export * from "./radiationDoseSheet.js";
export * from "./informedConsent1051n.js";
export * from "./forms107_1u.js";
export * from "./prescriptions/index.js";
export * from "./formsRadiologyReferral.js";
export * from "./clinicalHtmlRenderers.js";
export * from "./dentalFormulaRenderer.js";
export * from "./formsContractAndConsents.js";
export * from "./fnsSchema1151156.js";
export * from "./ndflXmlGenerator.js";
export {
	FNS_IDENTITY_DOC_TYPES,
	FNS_KINSHIP_PRESETS,
	FNS_SERVICE_CODE_PRESETS,
	type FnsKinshipCode,
	type FnsServiceDeductionCode,
	NDFL_LIMITS,
	SUPPORTED_TAX_YEARS,
	type SupportedTaxYear,
} from "./fnsSchema1151156.js";
export * from "./templateEngine.js";
export * from "./templateVariablesRegistry.js";
export * from "./templates/index.js";
export * from "./professionalA4Types.js";

