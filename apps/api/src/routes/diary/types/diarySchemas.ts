import { z } from "zod";

export const diaryUpsertSchema = z.object({
	visitId: z.string().uuid(),
	patientId: z.string().uuid(),
	anamnesis: z.string().max(65536, "Анамнез не должен превышать 64 КБ").optional(),
	statusLocalis: z.string().max(65536, "Status localis не должен превышать 64 КБ").optional(),
	diagnosisIcd10: z.string().max(200).optional(),
	diagnosisTooth: z.string().max(100).optional(),
	treatmentDescription: z.string().max(65536, "Описание лечения не должно превышать 64 КБ").optional(),
	complications: z.string().max(10000).optional(),
	comorbidities: z.string().max(10000).optional(),
	organizationId: z.string().uuid().optional(),
	status: z.enum(["draft", "signed"]).optional(),
	instrumentTrayBarcode: z.string().max(200).optional(),
	pkcs7Signature: z.string().optional(),
});

export const diaryLockBodySchema = z.object({
	pkcs7Signature: z.unknown().optional(),
});

export const diaryReviseBodySchema = z.object({
	anamnesis: z.string().max(65536, "Анамнез не должен превышать 64 КБ").optional(),
	statusLocalis: z.string().max(65536, "Status localis не должен превышать 64 КБ").optional(),
	diagnosisIcd10: z.string().max(200).optional(),
	diagnosisTooth: z.string().max(100).optional(),
	treatmentDescription: z.string().max(65536, "Описание лечения не должно превышать 64 КБ").optional(),
	complications: z.string().max(10000).optional(),
	comorbidities: z.string().max(10000).optional(),
	instrumentTrayBarcode: z.string().max(200).optional(),
	revisionReason: z.string().max(1000).optional(),
});

export const chiefReviewBodySchema = z.object({
	verdict: z.enum(["approved", "deficiencies_found", "critical_violation"]),
	notes: z.string().optional().nullable(),
	criteriaEvaluation: z
		.object({
			informedConsentPresent: z.boolean().optional(),
			anamnesisComplete: z.boolean().optional(),
			statusLocalisComplete: z.boolean().optional(),
			icd10DiagnosisValid: z.boolean().optional(),
			treatmentPlanAdequate: z.boolean().optional(),
			instrumentTraceabilityValid: z.boolean().optional(),
		})
		.optional()
		.nullable(),
});

export const diaryVisitParamsSchema = z.object({
	visitId: z.string().uuid(),
});

export const diaryIdParamsSchema = z.object({
	id: z.string().uuid(),
});

export const shiftsPayloadSchema = z.object({
	shifts: z.array(
		z
			.object({
				id: z.string(),
				doctorId: z.string(),
				doctorName: z.string(),
				cabinetId: z.string(),
				chairId: z.string(),
				dateIso: z.string(),
				startTime: z.string(),
				endTime: z.string(),
			})
			.passthrough(),
	),
});
