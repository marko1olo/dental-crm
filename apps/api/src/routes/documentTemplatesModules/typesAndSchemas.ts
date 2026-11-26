import { z } from "zod";

/**
 * Валидация UUID
 */
export const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ParsedPassportFields {
	series?: string | undefined;
	number?: string | undefined;
	issuedDate?: string | undefined;
	issuedBy?: string | undefined;
	divisionCode?: string | undefined;
}

export const documentTemplatesCatalogQuerySchema = z
	.object({
		categoryId: z.string().trim().max(100).optional(),
		systemAlias: z.string().trim().max(100).optional(),
		search: z.string().trim().max(200).optional(),
		type: z.string().trim().max(50).optional(),
		isEgisz: z.enum(["true", "false"]).optional(),
	})
	.strict();

export type DocumentTemplatesCatalogQuery = z.infer<
	typeof documentTemplatesCatalogQuerySchema
>;

export const documentTemplateIdParamsSchema = z
	.object({
		id: z.string().trim().min(1).max(120),
	})
	.strict();

export type DocumentTemplateIdParams = z.infer<
	typeof documentTemplateIdParamsSchema
>;

export const renderDocumentBodySchema = z.object({
	patientId: z.string().trim().optional(),
	appointmentId: z.string().trim().optional(),
	visitId: z.string().trim().optional(),
	doctorId: z.string().trim().optional(),
	administratorId: z.string().trim().optional(),
	representative: z
		.object({
			fullName: z.string().trim().optional(),
			relationType: z.string().trim().optional(),
			phone: z.string().trim().optional(),
			passport: z
				.object({
					series: z.string().trim().optional(),
					number: z.string().trim().optional(),
					issuedDate: z.string().trim().optional(),
					issuedBy: z.string().trim().optional(),
					divisionCode: z.string().trim().optional(),
				})
				.strict()
				.optional(),
			birthDate: z.string().trim().optional(),
			address: z.string().trim().optional(),
			basis: z.string().trim().optional(),
			snils: z.string().trim().optional(),
		})
		.strict()
		.optional(),
	authorizedPerson: z
		.object({
			fullName: z.string().trim().optional(),
			phone: z.string().trim().optional(),
			passport: z
				.object({
					series: z.string().trim().optional(),
					number: z.string().trim().optional(),
					issuedDate: z.string().trim().optional(),
					issuedBy: z.string().trim().optional(),
					divisionCode: z.string().trim().optional(),
				})
				.strict()
				.optional(),
			birthDate: z.string().trim().optional(),
			address: z.string().trim().optional(),
			snils: z.string().trim().optional(),
		})
		.strict()
		.optional(),
	financial: z
		.object({
			amountKopecks: z.number().int().optional(),
			amountRubles: z.number().optional(),
			invoiceNumber: z.string().optional(),
			invoiceDate: z.union([z.string(), z.date()]).optional(),
			contractNumber: z.string().optional(),
			contractDate: z.union([z.string(), z.date()]).optional(),
			actNumber: z.string().optional(),
			actDate: z.union([z.string(), z.date()]).optional(),
			comment: z.string().optional(),
		})
		.strict()
		.optional(),
	clinicalExamination: z
		.object({
			examinationDate: z.union([z.string(), z.date()]).optional(),
			doctorFullName: z.string().optional(),
			doctorInitials: z.string().optional(),
			complaints: z.string().optional(),
			anamnesis: z.string().optional(),
			pastDiseases: z.string().optional(),
			diseaseHistory: z.string().optional(),
			externalExam: z.string().optional(),
			bite: z.string().optional(),
			mucousCondition: z.string().optional(),
			xray: z.string().optional(),
			objective: z.string().optional(),
			diagnosis: z.string().optional(),
			treatment: z.string().optional(),
			recommendations: z.string().optional(),
			treatmentDateTime: z.union([z.string(), z.date()]).optional(),
		})
		.strict()
		.optional(),
	dentalFormula: z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
	currentUser: z
		.object({
			fullName: z.string().optional(),
			initials: z.string().optional(),
			position: z.string().optional(),
			specialty: z.string().optional(),
		})
		.strict()
		.optional(),
	overrides: z
		.object({
			clinic: z.record(z.unknown()).optional(),
			patient: z.record(z.unknown()).optional(),
			doctor: z.record(z.unknown()).optional(),
			representative: z.record(z.unknown()).optional(),
			authorizedPerson: z.record(z.unknown()).optional(),
			administrator: z.record(z.unknown()).optional(),
			appointment: z.record(z.unknown()).optional(),
			clinicalExamination: z.record(z.unknown()).optional(),
			dentalFormula: z.record(z.unknown()).optional(),
		})
		.strict()
		.optional(),
	emptyPlaceholder: z.string().optional().default(""),
}).strict();

export type RenderDocumentBody = z.infer<typeof renderDocumentBodySchema>;
