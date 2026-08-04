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
	/*
	 * Real patient contact model (patients table + administrativeProfile).
	 * Wired so the generator emits real <addr>/<telecom> instead of
	 * nullFlavor="NI" spam when the chart actually has this data.
	 */
	patientAddress: z.string().nullable().optional(),
	patientPhone: z.string().nullable().optional(),
	patientEmail: z.string().nullable().optional(),
	clinicOid: z.string().optional(),
	clinicName: z.string().min(1),
	/*
	 * Real clinic (MO) contact model (organizations.legalAddress/email +
	 * clinics.address/phone). Fall back to nullFlavor only when absent.
	 */
	clinicAddress: z.string().nullable().optional(),
	clinicPhone: z.string().nullable().optional(),
	clinicEmail: z.string().nullable().optional(),
	clinicLegalAddress: z.string().nullable().optional(),
	doctorName: personNameSchema,
	doctorSnils: z.string().optional(),
	doctorPosition: z.string().optional(),
	/*
	 * Real doctor contact model (users.phone/email). Doctor has no address
	 * column, so only telecom is wired.
	 */
	doctorPhone: z.string().nullable().optional(),
	doctorEmail: z.string().nullable().optional(),
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
	/*
	 * documentTime: invalid timestamps (e.g. Date("not-a-date") from a
	 * partially-written chart) gracefully fall back to "now" so the generated
	 * document is never rejected for a bogus clock value. Real wall-clock
	 * values are preserved verbatim.
	 */
	documentTime: z
		.preprocess(
			(v) => {
				if (v === undefined || v === null || v === "") return undefined;
				const d = v instanceof Date ? v : new Date(String(v));
				return Number.isNaN(d.getTime()) ? new Date() : d;
			},
			z.date().optional(),
		),
});

export type EgiszCdaParams = z.infer<typeof egiszCdaParamsSchema>;
