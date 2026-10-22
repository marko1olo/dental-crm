/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ SEMD CDA VALIDATOR & CLIENT EXPORT BUILDER FACADE
 * Canonical SSOT delegated to @dental/shared/cda & cdaValidator engine
 * Mandate 8s: Single source of truth, elimination of duplicated logic.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	EGISZ_SEMD_DOC_TYPES,
	type EgiszSemdDocTypeCode,
	EGISZ_STANDARD_OIDS,
	type CdaExportData,
	type SemanticValidationRuleResult,
	type SemanticValidationReport,
	canonicalizeXml,
} from "./cdaValidator/validatorTypes";

export { buildCdaXml } from "./cdaValidator/validatorXmlGenerator";
export { validateCdaSemanticRules } from "./cdaValidator/semanticRulesEngine";
