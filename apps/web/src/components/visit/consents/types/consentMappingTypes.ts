/**
 * consentMappingTypes.ts
 * Clinical informed consent (ИДС) mappings, document kind bindings and resolver.
 */

import type { ConsentTemplateKey } from "../../../consents/consentTemplates";

export const CONSENT_KEY_TO_DOCUMENT_KIND: Partial<Record<ConsentTemplateKey, string>> = {
	CONSENT_INSPECTION_1051N: "informed_consent",
	CONSENT_ANESTHESIA: "anesthesia_consent_log",
	CONSENT_PERSONAL_DATA: "personal_data_processing_consent",
	CONSENT_THERAPY: "procedure_specific_consent_packet",
	CONSENT_SURGERY_IMPLANT: "procedure_specific_consent_packet",
	CONSENT_ORTHOPEDICS: "procedure_specific_consent_packet",
	CONSENT_ORTHODONTICS: "procedure_specific_consent_packet",
	CONSENT_HYGIENE_BLEACHING: "procedure_specific_consent_packet",
	CONSENT_PEDIATRIC: "procedure_specific_consent_packet",
	CONSENT_TREATMENT_REFUSAL: "medical_intervention_refusal",
	CONSENT_EGISZ_REFUSAL: "procedure_specific_consent_packet",
	CONSENT_WARRANTY_PASSPORT: "warranty_service_memo",
	CONSENT_WARRANTY_POLICY: "warranty_service_memo",
	CONSENT_SEDATION: "anesthesia_consent_log",
	CONSENT_PHOTOPROTOCOL: "photo_video_consent",
	CONSENT_HEALTH_QUESTIONNAIRE: "patient_intake_questionnaire",
	CONSENT_PAID_CONTRACT: "paid_medical_services_contract",
	CONSENT_SURGERY_EXTRACTION: "procedure_specific_consent_packet",
	CONSENT_IMPLANTOLOGY: "procedure_specific_consent_packet",
	CONSENT_SINUS_LIFT: "procedure_specific_consent_packet",
	CONSENT_OSTEOINTEGRATION_RISKS: "procedure_specific_consent_packet",
	CONSENT_ORTHO_HYGIENE: "procedure_specific_consent_packet",
};

export const DOCUMENT_KIND_TO_CONSENT_KEY: Record<string, ConsentTemplateKey> = {
	informed_consent: "CONSENT_INSPECTION_1051N",
	anesthesia_consent_log: "CONSENT_ANESTHESIA",
	personal_data_processing_consent: "CONSENT_PERSONAL_DATA",
	medical_intervention_refusal: "CONSENT_TREATMENT_REFUSAL",
	warranty_service_memo: "CONSENT_WARRANTY_PASSPORT",
	photo_video_consent: "CONSENT_PHOTOPROTOCOL",
	patient_intake_questionnaire: "CONSENT_HEALTH_QUESTIONNAIRE",
	paid_medical_services_contract: "CONSENT_PAID_CONTRACT",
};

export const PROCEDURE_TYPE_TO_CONSENT_KEY: Record<string, ConsentTemplateKey> = {
	therapy_endo_restoration: "CONSENT_THERAPY", deep_caries: "CONSENT_THERAPY",
	superficial_medium_caries: "CONSENT_THERAPY", pulpitis_endodontics: "CONSENT_THERAPY",
	periodontology: "CONSENT_THERAPY", surgery_extraction: "CONSENT_SURGERY_IMPLANT",
	surgical_extraction: "CONSENT_SURGERY_EXTRACTION", tooth_extraction: "CONSENT_SURGERY_EXTRACTION",
	implantation_bone_graft: "CONSENT_IMPLANTOLOGY", implantation: "CONSENT_IMPLANTOLOGY",
	sinus_lifting: "CONSENT_SINUS_LIFT", prosthetics: "CONSENT_ORTHOPEDICS",
	veneers: "CONSENT_ORTHOPEDICS", fixed_prosthetics: "CONSENT_ORTHOPEDICS",
	removable_prosthetics: "CONSENT_ORTHOPEDICS", orthodontics: "CONSENT_ORTHODONTICS",
	ortho_hygiene: "CONSENT_ORTHO_HYGIENE", hygiene_whitening: "CONSENT_HYGIENE_BLEACHING",
	professional_hygiene: "CONSENT_HYGIENE_BLEACHING", teeth_whitening: "CONSENT_HYGIENE_BLEACHING",
	minor_general: "CONSENT_PEDIATRIC", local_anesthesia: "CONSENT_ANESTHESIA",
	sedation: "CONSENT_SEDATION", photoprotocol: "CONSENT_PHOTOPROTOCOL",
	egisz_refusal: "CONSENT_EGISZ_REFUSAL", medical_intervention_refusal: "CONSENT_TREATMENT_REFUSAL",
	warranty_policy: "CONSENT_WARRANTY_POLICY", warranty_passport: "CONSENT_WARRANTY_PASSPORT",
	somatic_health_questionnaire: "CONSENT_HEALTH_QUESTIONNAIRE", paid_contract: "CONSENT_PAID_CONTRACT",
	osteo_risks: "CONSENT_OSTEOINTEGRATION_RISKS",
};

export const ALL_CONSENT_TEMPLATE_KEYS = new Set<ConsentTemplateKey>([
	"CONSENT_THERAPY", "CONSENT_SURGERY_IMPLANT", "CONSENT_ORTHODONTICS",
	"CONSENT_ORTHOPEDICS", "CONSENT_HYGIENE_BLEACHING", "CONSENT_ANESTHESIA",
	"CONSENT_PERSONAL_DATA", "CONSENT_INSPECTION_1051N", "CONSENT_PEDIATRIC",
	"CONSENT_EGISZ_REFUSAL", "CONSENT_TREATMENT_REFUSAL", "CONSENT_WARRANTY_PASSPORT",
	"CONSENT_WARRANTY_POLICY", "CONSENT_SEDATION", "CONSENT_PHOTOPROTOCOL",
	"CONSENT_HEALTH_QUESTIONNAIRE", "CONSENT_PAID_CONTRACT", "CONSENT_SURGERY_EXTRACTION",
	"CONSENT_IMPLANTOLOGY", "CONSENT_SINUS_LIFT", "CONSENT_OSTEOINTEGRATION_RISKS",
	"CONSENT_ORTHO_HYGIENE",
]);

export function isConsentTemplateKey(val: unknown): val is ConsentTemplateKey {
	return typeof val === "string" && ALL_CONSENT_TEMPLATE_KEYS.has(val as ConsentTemplateKey);
}

export function resolveConsentKeyFromDocument(doc: {
	kind?: string | undefined;
	payload?: Record<string, unknown> | null | undefined;
}): ConsentTemplateKey | null {
	const payloadConsentKey = doc.payload?.consentKey;
	if (isConsentTemplateKey(payloadConsentKey)) {
		return payloadConsentKey;
	}
	const procType =
		(doc.payload?.procedureType as string | undefined) ||
		((doc.payload?.procedureSpecificConsent as Record<string, unknown> | undefined)?.procedureType as string | undefined) ||
		((doc.payload?.procedureSpecific as Record<string, unknown> | undefined)?.procedureType as string | undefined);
	if (typeof procType === "string" && procType in PROCEDURE_TYPE_TO_CONSENT_KEY) {
		return PROCEDURE_TYPE_TO_CONSENT_KEY[procType] ?? null;
	}
	if (doc.kind && doc.kind in DOCUMENT_KIND_TO_CONSENT_KEY) {
		return DOCUMENT_KIND_TO_CONSENT_KEY[doc.kind] ?? null;
	}
	return null;
}
