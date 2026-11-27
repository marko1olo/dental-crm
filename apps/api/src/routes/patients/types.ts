import { z } from "zod";
import type {
	PatientCandidateData,
	PatientDuplicateCandidate,
	PatientDuplicateInput,
	PatientDuplicateOptions,
	PatientDuplicateResult,
	PatientMatchEvaluation,
} from "../../services/patients/duplicateDetection.js";

export type {
	PatientCandidateData,
	PatientDuplicateCandidate,
	PatientDuplicateInput,
	PatientDuplicateOptions,
	PatientDuplicateResult,
	PatientMatchEvaluation,
};

export type PatientPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

export type PatientRepresentativeInput = {
	legalRepresentativeFullName?: string | null | undefined;
	legalRepresentativeIdentityDocument?: string | null | undefined;
	legalRepresentativePhone?: string | null | undefined;
	legalRepresentativeRelationship?: string | null | undefined;
	preferredDocumentRecipient?: string | null | undefined;
};

/**
 * Строка таблицы patient_archive_reasons_and_blacklists в том минимуме, который
 * нужен для отбора по пациенту. patient_id пустой у строк, созданных до
 * миграции drizzle/0136_patient_archive_patient_id.sql: колонка там объявлена
 * nullable намеренно, потому что старым строкам связь с пациентом взять негде.
 */
export type PatientArchiveRowLike = {
	isBookingBlocked: boolean;
	patientId: string | null;
	patientName: string | null;
};

/**
 * Тела рекламаций / задач / чёрного списка раньше читались bare cast'ом
 * `request.body as { … } | null | undefined`. Null body не ронял (optional chaining),
 * но цель кампании — единый Zod-gate: не-object / wrong-type → 400 с прежними RU
 * текстами, AUTH (requireClinicOrganizationId) остаётся первым.
 */
export const patientReclamationCreateBodySchema = z
	.object({
		complicationDetails: z.string().optional(),
		proposedAction: z.string().max(2000).nullable().optional(),
		doctorId: z.string().uuid().nullable().optional(),
		toothNumber: z
			.union([
				z.number().int().min(11).max(85),
				z.string().trim().regex(/^\d{2}$/),
			])
			.nullable()
			.optional(),
		warrantyCertificateId: z.string().uuid().nullable().optional(),
		certificateNumber: z.string().trim().max(128).nullable().optional(),
		defectType: z.string().max(128).nullable().optional(),
	})
	.strict();

export const patientReclamationStatusBodySchema = z
	.object({
		status: z.enum(["resolved", "under_review"]).optional(),
	})
	.strict();

export const patientTaskTicketCreateBodySchema = z
	.object({
		title: z.string().optional(),
		description: z.string().nullable().optional(),
		assignedToId: z.string().nullable().optional(),
		priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
	})
	.strict();

export const patientTaskTicketStatusBodySchema = z
	.object({
		status: z.string().optional(),
	})
	.strict();

export const patientArchiveStatusBodySchema = z
	.object({
		isBlacklisted: z.boolean().optional(),
	})
	.strict();

export const patientArchiveBodySchema = z
	.object({
		reasonCode: z.string().optional(),
		archiveReason: z.string().optional(),
		isBlacklisted: z.boolean().default(false),
		blacklistReason: z.string().optional(),
		notes: z.string().optional(),
	})
	.strict()
	.refine((data) => Boolean(data.reasonCode || data.archiveReason), {
		message:
			"Укажите причину архивации (код из справочника 323-ФЗ или текстовое описание)",
		path: ["archiveReason"],
	});
