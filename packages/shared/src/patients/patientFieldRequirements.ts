/**
 * patientFieldRequirements.ts — Single Source of Truth (SSOT) for patient card field requirements (Фича №35).
 * Harmonizes marketing routes, patient validation schemas, and web settings.
 */

import { z } from "zod";

export const patientFieldRequirementsSchema = z.object({
	requirePhone: z.boolean().default(true),
	requireAdvertisingSource: z.boolean().default(false),
	requireSnils: z.boolean().default(false),
	requireBirthDate: z.boolean().default(false),
	requireIdentityDocument: z.boolean().default(false),
});

export type PatientFieldRequirements = z.infer<
	typeof patientFieldRequirementsSchema
>;

export const DEFAULT_PATIENT_FIELD_REQUIREMENTS: PatientFieldRequirements = {
	requirePhone: true,
	requireAdvertisingSource: false,
	requireSnils: false,
	requireBirthDate: false,
	requireIdentityDocument: false,
};

export const PATIENT_FIELD_REQUIREMENTS_STORAGE_KEY =
	"dental_crm_patient_field_requirements_v1";
