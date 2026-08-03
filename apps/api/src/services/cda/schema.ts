import { z } from "zod";

const personNameSchema = z.object({
	first: z.string().min(1),
	last: z.string().min(1),
	middle: z.string().optional(),
});

/**
 * Zod schema for EGISZ CDA Form 043/u generator params.
 * Accepts Date instances or ISO strings for visitDate / documentTime
 * (JSON transport may stringify dates).
 */
export const egiszCdaParamsSchema = z.object({
	patientId: z.string(),
	patientName: personNameSchema,
	patientSnils: z.string(),
	patientBirthDate: z.string().nullable(),
	patientGender: z.enum(["male", "female", "other"]).nullable(),
	clinicOid: z.string().optional(),
	clinicName: z.string().min(1),
	doctorName: personNameSchema,
	doctorSnils: z.string().optional(),
	doctorPosition: z.string().optional(),
	icd10Code: z.string().min(1),
	diagnosisText: z.string().min(1),
	diagnosisTooth: z.string().nullable().optional(),
	anamnesis: z.string().optional(),
	objectiveStatus: z.string().optional(),
	complications: z.string().optional(),
	comorbidities: z.string().optional(),
	instrumentTrayBarcode: z.string().optional(),
	treatmentDescription: z.string().optional(),
	visitDate: z.coerce.date(),
	documentId: z.string().min(1),
	encounterId: z.string().optional(),
	documentSetId: z.string().optional(),
	documentVersion: z.number().int().positive().optional(),
	replacesDocumentId: z.string().optional(),
	documentTime: z.coerce.date().optional(),
});

export type EgiszCdaParams = z.infer<typeof egiszCdaParamsSchema>;
