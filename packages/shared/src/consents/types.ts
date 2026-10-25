/**
 * packages/shared/src/consents/types.ts
 *
 * Canonical shared domain contracts for Informed Voluntary Consents (ИДС)
 * and Legal Agreements in DENTE CRM (Mandate 8b, 8e, 8n).
 */

import { z } from "zod";

export const consentVerificationMethodSchema = z.enum([
	"tablet_stylus",
	"sms_otp",
	"paper_physical",
]);
export type ConsentVerificationMethod = z.infer<typeof consentVerificationMethodSchema>;

export const consentSigningStatusSchema = z.enum([
	"not_signed",
	"signed",
	"required_today",
	"pending_verification",
]);
export type ConsentSigningStatus = z.infer<typeof consentSigningStatusSchema>;

export const consentCategorySchema = z.enum([
	"therapy",
	"surgery",
	"orthodontics",
	"orthopedics",
	"hygiene",
	"anesthesia",
	"legal",
	"pediatric",
]);
export type ConsentCategory = z.infer<typeof consentCategorySchema>;

export interface SharedConsentContext {
	patientName?: string | null | undefined;
	birthDate?: string | null | undefined;
	passport?: string | null | undefined;
	doctorName?: string | null | undefined;
	clinicName?: string | null | undefined;
	diagnosisIcd?: string | null | undefined;
	toothNumbers?: string | null | undefined;
	date?: string | null | undefined;
}
