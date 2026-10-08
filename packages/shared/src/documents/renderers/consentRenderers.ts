/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — CONSENTS & CONTRACTS (Layer 2)
 * Renderers and re-exports for Statutory Informed Voluntary Consent (1051n),
 * Refusal of Medical Intervention, Paid Medical Contracts (PP RF 736), and Acts.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	renderInformedConsent1051nHtml,
	renderMedicalInterventionRefusal1051nHtml,
	generateInformedConsent1051nHtml,
	generateMedicalInterventionRefusal1051nHtml,
	generateStatutoryConsent1051nPayload,
	generateStatutoryRefusal1051nPayload,
	generateInformedConsent1051nText,
	generateMedicalInterventionRefusal1051nText,
	informedConsentTypeSchema,
	informedConsent1051nPayloadSchema,
	DEFAULT_CLINIC_LICENSE_NUMBER,
	DEFAULT_CLINIC_LICENSE_DATE,
	DEFAULT_CLINIC_LICENSE_ISSUER,
	type InformedConsentType,
	type InformedConsent1051nPayload,
	type InformedConsent1051nOptions,
	type MedicalRefusalPresetKey,
	type MedicalInterventionRefusal1051nOptions,
} from "../informedConsent1051n.js";

export {
	renderPaidServiceContract736Html,
	renderActOfCompletedWorksHtml,
	paidServiceContract736PayloadSchema,
	actOfCompletedWorksPayloadSchema,
	actOfCompletedWorksItemSchema,
	type PaidServiceContract736Payload,
	type ActOfCompletedWorksPayload,
	type ActOfCompletedWorksItem,
} from "../formsContractAndConsents.js";
