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
export const patientReclamationCreateBodySchema = z.object({
	complicationDetails: z.unknown().optional(),
	proposedAction: z.unknown().optional(),
	doctorId: z.unknown().optional(),
});

export const patientReclamationStatusBodySchema = z.object({
	status: z.unknown().optional(),
});

export const patientTaskTicketCreateBodySchema = z.object({
	title: z.unknown().optional(),
	description: z.unknown().optional(),
	assignedToId: z.unknown().optional(),
	priority: z.unknown().optional(),
});

export const patientTaskTicketStatusBodySchema = z.object({
	status: z.unknown().optional(),
});

export const patientArchiveStatusBodySchema = z.object({
	isBlacklisted: z.unknown().optional(),
});

export const patientArchiveBodySchema = z
	.object({
		reasonCode: z.string().optional(),
		archiveReason: z.string().optional(),
		isBlacklisted: z.boolean().default(false),
		blacklistReason: z.string().optional(),
		notes: z.string().optional(),
	})
	.refine((data) => Boolean(data.reasonCode || data.archiveReason), {
		message:
			"Укажите причину архивации (код из справочника 323-ФЗ или текстовое описание)",
		path: ["archiveReason"],
	});
