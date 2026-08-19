import { z } from "zod";

export const personNameSchema = z.object({
	first: z.string().min(1),
	last: z.string().min(1),
	middle: z.string().optional(),
});

export type PersonName = z.infer<typeof personNameSchema>;

export const dentalToothSurfaceSchema = z.enum([
	"V",
	"L",
	"O",
	"M",
	"D",
	"B",
	"P",
	"I",
	"R",
	"vestibular",
	"lingual",
	"palatal",
	"occlusal",
	"incisal",
	"mesial",
	"distal",
	"root",
	"buccal",
]);

export type DentalToothSurface = z.infer<typeof dentalToothSurfaceSchema>;

export const dentalStatusItemSchema = z.object({
	tooth: z.union([z.string(), z.number()]),
	surfaces: z
		.union([
			z.array(z.string()),
			z.string(),
		])
		.optional(),
	condition: z.string().min(1),
	conditionCode: z.string().optional(),
	conditionName: z.string().optional(),
	description: z.string().optional(),
});

export type DentalStatusItem = z.infer<typeof dentalStatusItemSchema>;

export const serviceRenderedItemSchema = z.object({
	code: z.string().min(1),
	name: z.string().min(1),
	quantity: z.number().positive().optional().default(1),
	tooth: z.union([z.string(), z.number()]).optional(),
});

export type ServiceRenderedItem = z.infer<typeof serviceRenderedItemSchema>;

export const legalAuthenticatorSchema = z.object({
	name: personNameSchema.optional(),
	snils: z.string().optional(),
	position: z.string().optional(),
	positionCode: z.string().optional(),
	time: z.preprocess((v) => {
		if (v === undefined || v === null || v === "") return undefined;
		const d = v instanceof Date ? v : new Date(String(v));
		return Number.isNaN(d.getTime()) ? undefined : d;
	}, z.date().optional()),
});

export type LegalAuthenticator = z.infer<typeof legalAuthenticatorSchema>;

/**
 * Zod schema for SEMD 108 (HL7 CDA R2 Dental Consultation Protocol) generator params.
 * Accepts Date instances or ISO strings for visitDate / documentTime.
 */
export const egiszCdaParamsSchema = z.object({
	patientId: z.string(),
	patientName: personNameSchema,
	patientSnils: z.string(),
	patientBirthDate: z.string().nullable(),
	patientGender: z.enum(["male", "female", "other"]).nullable(),
	/* Real patient contact model */
	patientAddress: z.string().nullable().optional(),
	patientPhone: z.string().nullable().optional(),
	patientEmail: z.string().nullable().optional(),
	clinicOid: z.string().optional(),
	clinicName: z.string().min(1),
	clinicOgrn: z.string().nullable().optional(),
	clinicInn: z.string().nullable().optional(),
	/* Real clinic (MO) contact model */
	clinicAddress: z.string().nullable().optional(),
	clinicPhone: z.string().nullable().optional(),
	clinicEmail: z.string().nullable().optional(),
	clinicLegalAddress: z.string().nullable().optional(),
	doctorName: personNameSchema,
	doctorSnils: z.string().optional(),
	doctorPosition: z.string().optional(),
	doctorPositionCode: z.string().optional(), // NSI 1.2.643.5.1.13.13.11.1002
	doctorPhone: z.string().nullable().optional(),
	doctorEmail: z.string().nullable().optional(),
	icd10Code: z.string().min(1),
	diagnosisText: z.string().min(1),
	diagnosisTooth: z.string().nullable().optional(),
	// Section 1: Anamnesis and Complaints (LOINC 10164-2)
	anamnesis: z.string().optional(),
	// Section 2: Dental Status / Odontogram (LOINC 29545-1)
	dentalStatus: z.array(dentalStatusItemSchema).optional(),
	odontogram: z.array(dentalStatusItemSchema).optional(),
	objectiveStatus: z.string().optional(),
	// Section 3: ICD-10 is formed from icd10Code, diagnosisText, diagnosisTooth
	// Section 4: Services Rendered under Order 804n (LOINC 47519-4)
	services: z.array(serviceRenderedItemSchema).optional(),
	servicesRendered: z.array(serviceRenderedItemSchema).optional(),
	treatmentDescription: z.string().optional(),
	// Section 5: Recommendations (LOINC 18776-5)
	recommendations: z.union([z.string(), z.array(z.string())]).optional(),
	// Optional clinical metadata
	complications: z.string().optional(),
	comorbidities: z.string().optional(),
	instrumentTrayBarcode: z.string().optional(),
	legalAuthenticator: legalAuthenticatorSchema.optional(),
	visitDate: z.coerce.date(),
	documentId: z.string().min(1),
	encounterId: z.string().optional(),
	documentSetId: z.string().optional(),
	documentVersion: z.number().int().positive().optional(),
	replacesDocumentId: z.string().optional(),
	documentTime: z.preprocess((v) => {
		if (v === undefined || v === null || v === "") return undefined;
		const d = v instanceof Date ? v : new Date(String(v));
		return Number.isNaN(d.getTime()) ? new Date() : d;
	}, z.date().optional()),
});

export type EgiszCdaParams = z.infer<typeof egiszCdaParamsSchema>;
