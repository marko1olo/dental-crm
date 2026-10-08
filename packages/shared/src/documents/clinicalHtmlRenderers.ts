/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — CANONICAL FACADE
 * Backwards-compatible canonical facade re-exporting modular renderers.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	CLINICAL_DOCUMENT_PRINT_STYLES,
	escapeHtml,
	renderFdiToothFormulaTable,
	renderUkepDigitalSignatureBlock,
} from "./renderers/sharedStyles.js";

export {
	renderForm043uHtml,
	renderForm043_1uHtml,
	renderRadiationDoseSheetHtml,
	renderRadiologyReferralHtml,
} from "./renderers/examinationRenderers.js";

export {
	renderForm037uHtml,
	renderForm039uHtml,
} from "./renderers/financialAndTaxRenderers.js";

export {
	renderForm003vuHtml,
} from "./renderers/treatmentPlanRenderers.js";

export {
	renderForm107_1uHtml,
	renderForm148_1u88Html,
	renderForm148_1u04lHtml,
	renderPrescriptionUniversalHtml,
} from "./renderers/prescriptionRenderers.js";

export * from "./renderers/types.js";
export * from "./renderers/consentRenderers.js";
export * from "./renderers/index.js";
