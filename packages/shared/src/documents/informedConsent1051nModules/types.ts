import type { z } from "zod";
import type {
	MEDICAL_REFUSAL_COMPLICATIONS_PRESET,
} from "../../legal/legalContractsAndConsents.js";
import type {
	informedConsent1051nPayloadSchema,
	informedConsentTypeSchema,
} from "./schemas.js";

export type InformedConsentType = z.infer<typeof informedConsentTypeSchema>;

export type InformedConsent1051nPayload = z.infer<typeof informedConsent1051nPayloadSchema>;

/**
 * Опции для формирования Информированного добровольного согласия (ИДС) по Приказу Минздрава РФ № 1051н.
 */
export interface InformedConsent1051nOptions {
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientPassport?: string | null | undefined;
	readonly patientAddress?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly patientSnils?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicLicense?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicPhone?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined;
	readonly clinicInn?: string | null | undefined;
	readonly interventionType?: "therapy" | "surgery" | "anesthesia" | "general" | string | undefined;
	readonly toothNumbers?: string | null | undefined;
	readonly diagnosisIcd?: string | null | undefined;
	readonly consentDate?: string | null | undefined;
	readonly isClosed?: boolean | undefined;
	readonly isDraft?: boolean | undefined;
	readonly isSigned?: boolean | undefined;
	readonly status?: string | undefined;
	readonly watermarkText?: string | undefined;
}

export type MedicalRefusalPresetKey = keyof typeof MEDICAL_REFUSAL_COMPLICATIONS_PRESET;

export interface MedicalInterventionRefusal1051nOptions {
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientPassport?: string | null | undefined;
	readonly patientAddress?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly patientSnils?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicLicense?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined;
	readonly clinicInn?: string | null | undefined;
	readonly refusedIntervention?: string | null | undefined;
	readonly clinicalIndication?: string | null | undefined;
	readonly toothNumbers?: string | null | undefined;
	readonly patientReason?: string | null | undefined;
	readonly explainedRisks?: readonly string[] | undefined;
	readonly alternativesOffered?: readonly string[] | undefined;
	readonly urgentWarningSigns?: readonly string[] | undefined;
	readonly refusalDate?: string | null | undefined;
	readonly isClosed?: boolean | undefined;
	readonly isDraft?: boolean | undefined;
	readonly isSigned?: boolean | undefined;
	readonly status?: string | undefined;
	readonly watermarkText?: string | undefined;
	readonly representativeFullName?: string | null | undefined;
	readonly representativePassport?: string | null | undefined;
	readonly representativeRelation?: string | null | undefined;
}
