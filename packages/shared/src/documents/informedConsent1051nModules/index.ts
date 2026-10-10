/**
 * ═══════════════════════════════════════════════════════════════════════════
 * МОДУЛИ ИДС И ОТКАЗА ОТ МЕДВМЕШАТЕЛЬСТВА (ПРИКАЗ МЗ РФ № 1051н)
 * Decomposed Modules for Minzdrav Order 1051n Statutory Documents
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	DEFAULT_CLINIC_LICENSE_NUMBER,
	DEFAULT_CLINIC_LICENSE_DATE,
	DEFAULT_CLINIC_LICENSE_ISSUER,
	STATUTORY_DENTAL_INTERVENTIONS_1051N,
	DEFAULT_REFUSAL_RISKS,
	DEFAULT_REFUSAL_ALTERNATIVES,
	DEFAULT_REFUSAL_WARNING_SIGNS,
} from "./constants.js";
export * from "./schemas.js";
export * from "./types.js";
export * from "./consentPayloadGenerator.js";
export * from "./consentTextRenderer.js";
export * from "./refusalRenderer.js";
