import { z } from "zod";
import {
	DEFAULT_CLINIC_LICENSE_DATE,
	DEFAULT_CLINIC_LICENSE_NUMBER,
} from "./constants.js";

/**
 * Схема типов информированного добровольного согласия.
 */
export const informedConsentTypeSchema = z.enum([
	"general_primary",
	"local_anesthesia",
	"therapy_endo_restoration",
	"surgery_extraction",
	"implantation_bone_graft",
	"prosthetics",
	"orthodontics",
	"hygiene_whitening",
	"periodontology",
	"custom",
]);

/**
 * Схема полезной нагрузки ИДС по Приказу Минздрава РФ № 1051н.
 */
export const informedConsent1051nPayloadSchema = z.object({
	consentType: informedConsentTypeSchema.default("general_primary"),
	consentTitle: z.string().trim().min(1).max(240).default("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО"),
	clinicLegalName: z.string().trim().min(1).max(240).default('ООО "Денте Клиник"'),
	clinicAddress: z.string().trim().max(240).default(""),
	clinicOgrn: z.string().trim().max(32).default(""),
	clinicInn: z.string().trim().max(16).default(""),
	medicalLicenseNumber: z.string().trim().max(64).default(DEFAULT_CLINIC_LICENSE_NUMBER),
	medicalLicenseDate: z.string().trim().max(32).default(DEFAULT_CLINIC_LICENSE_DATE),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientPassport: z.string().trim().max(120).default(""),
	patientAddress: z.string().trim().max(240).default(""),
	patientPhone: z.string().trim().max(64).default(""),
	patientSnils: z.string().trim().max(32).nullable().optional(),
	representativeFullName: z.string().trim().max(160).nullable().optional(),
	representativePassport: z.string().trim().max(120).nullable().optional(),
	representativeRelation: z.string().trim().max(80).nullable().optional(),
	attendingDoctorFullName: z.string().trim().max(160).default(""),
	attendingDoctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог-терапевт"),
	diagnosisOrIndication: z.string().trim().min(1).max(300),
	interventionName: z.string().trim().min(1).max(300),
	plannedAnesthesia: z.string().trim().max(300).nullable().optional(),
	materialsAndSystems: z.string().trim().max(500).nullable().optional(),
	explainedRisks: z.array(z.string().trim()).min(1),
	alternatives: z.array(z.string().trim()).min(1),
	aftercareRequirements: z.array(z.string().trim()).min(1),
	confirmedVoluntary: z.boolean().default(true),
	questionsAnswered: z.boolean().default(true),
	consentDate: z.string().trim().min(10).max(32).default(() => new Date().toISOString().slice(0, 10)),
	isClosed: z.boolean().optional(),
	isDraft: z.boolean().optional(),
	isSigned: z.boolean().optional(),
	watermarkText: z.string().optional(),
});
