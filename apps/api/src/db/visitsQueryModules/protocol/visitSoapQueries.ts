import { createHash } from "node:crypto";
import type {
	VisitDraftAutosave,
	VisitDraftAutosaveRequest,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../client.js";
import * as schema from "../../schema.js";
import type { VisitDraftAutosaveLookup } from "../types.js";

/**
 * Хэш текстового содержимого дневника SOAP для быстрой детекции изменений.
 */
export function hashTranscript(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/**
 * Получение текущего автосохранения дневника SOAP из базы данных.
 * Семантический интерфейс электронной карты приёма (Мандат 8x, Мандат 8ap).
 */
export async function getVisitDraftAutosaveFromDb(
	organizationId: string,
	visitId: string,
): Promise<VisitDraftAutosaveLookup> {
	const [visit] = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.id, visitId),
				eq(schema.visits.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!visit) return { outcome: "visit_absent" };
	if (visit.status !== "draft") {
		return {
			outcome: "no_draft",
			visitId: visit.id,
			status: visit.status,
			signedAt: visit.signedAt ? visit.signedAt.toISOString() : null,
		};
	}

	if (visit.draftAutosave) {
		return {
			outcome: "draft",
			serverDraft: visit.draftAutosave as VisitDraftAutosave,
		};
	}

	// Черновик есть, автосохранения по нему ещё не было: заготовка собирается из полей самого визита
	return {
		outcome: "draft",
		serverDraft: {
			visitId: visit.id,
			patientId: visit.patientId,
			selectedSpecialty: "therapist", // default fallback
			transcript: visit.transcript || "",
			draft: {
				warnings: [],
				complaint: visit.complaint || "",
				anamnesis: visit.anamnesis || "",
				objectiveStatus: visit.objectiveStatus || "",
				diagnosis: visit.diagnosis || "",
				treatmentPlan: visit.treatmentPlan || "",
			},
			baseRevision: visit.revision,
			clientDraftId: null,
			clientSavedAt: null,
			serverSavedAt: visit.updatedAt.toISOString(),
			transcriptHash: "",
		},
	};
}

/** Семантический алиас для медицинской карты приёма (Мандат 8ap) */
export const getVisitDiaryAutosaveFromDb = getVisitDraftAutosaveFromDb;

/**
 * Атомарное обновление и автосохранение SOAP-протокола дневника визита.
 * Поддерживает автономию врача у кресла (Мандат 8e): мгновенный debounced autosave,
 * отсутствие блокировок и мягкая синхронизация с таблицей visit_diaries.
 */
export async function upsertVisitDraftAutosaveInDb(
	organizationId: string,
	input: VisitDraftAutosaveRequest,
): Promise<VisitDraftAutosave> {
	return await db.transaction(async (tx) => {
		const [visit] = await tx
			.select()
			.from(schema.visits)
			.where(
				and(
					eq(schema.visits.id, input.visitId),
					eq(schema.visits.organizationId, organizationId),
				),
			)
			.for("update")
			.limit(1);

		if (!visit) throw new Error("Визит не найден");
		if (visit.status === "voided" || visit.status === "signed") {
			throw new Error("Прием уже закрыт или аннулирован");
		}

		const existingDraftAutosave =
			(visit.draftAutosave as Record<string, unknown> | null) || {};

		const serverDraft: VisitDraftAutosave & {
			lastAcceptedMutationId?: string | null;
			lastAcceptedAt?: string | null;
		} = {
			visitId: input.visitId,
			patientId: input.patientId,
			selectedSpecialty: input.selectedSpecialty,
			transcript: input.transcript,
			draft: input.draft,
			baseRevision: input.baseRevision ?? null,
			clientDraftId: input.clientDraftId?.trim() || null,
			clientSavedAt: input.clientSavedAt ?? null,
			serverSavedAt: new Date().toISOString(),
			transcriptHash: hashTranscript(
				[
					input.transcript,
					input.draft.complaint,
					input.draft.anamnesis,
					input.draft.objectiveStatus,
					input.draft.diagnosis,
					input.draft.treatmentPlan,
				]
					.filter(Boolean)
					.join("|"),
			),
			...(existingDraftAutosave.lastAcceptedMutationId
				? {
						lastAcceptedMutationId: existingDraftAutosave.lastAcceptedMutationId as string,
					}
				: {}),
			...(existingDraftAutosave.lastAcceptedAt
				? { lastAcceptedAt: existingDraftAutosave.lastAcceptedAt as string }
				: {}),
		};

		const now = new Date();
		const nextComplaint = input.draft.complaint?.trim() || visit.complaint || null;
		const nextAnamnesis = input.draft.anamnesis?.trim() || visit.anamnesis || null;
		const nextObjectiveStatus =
			input.draft.objectiveStatus?.trim() || visit.objectiveStatus || null;
		const nextDiagnosis = input.draft.diagnosis?.trim() || visit.diagnosis || null;
		const nextTreatmentPlan =
			input.draft.treatmentPlan?.trim() || visit.treatmentPlan || null;

		const [saved] = await tx
			.update(schema.visits)
			.set({
				draftAutosave: serverDraft,
				transcript: input.transcript,
				complaint: nextComplaint,
				anamnesis: nextAnamnesis,
				objectiveStatus: nextObjectiveStatus,
				diagnosis: nextDiagnosis,
				treatmentPlan: nextTreatmentPlan,
				hygieneIndices:
					(input as any).hygieneIndices ??
					(input.draft as any).hygieneIndices ??
					visit.hygieneIndices ??
					null,
				updatedAt: now,
			})
			.where(
				and(
					eq(schema.visits.organizationId, organizationId),
					eq(schema.visits.id, input.visitId),
				),
			)
			.returning({ id: schema.visits.id });

		if (!saved) throw new Error("Визит не найден");

		// Синхронизация с таблицей visitDiaries (дневники приёма)
		if (
			nextComplaint ||
			nextAnamnesis ||
			nextObjectiveStatus ||
			nextDiagnosis ||
			nextTreatmentPlan
		) {
			const [existingDiary] = await tx
				.select()
				.from(schema.visitDiaries)
				.where(
					and(
						eq(schema.visitDiaries.visitId, input.visitId),
						eq(schema.visitDiaries.organizationId, organizationId),
					),
				)
				.limit(1);

			const combinedAnamnesis = [nextComplaint, nextAnamnesis]
				.filter(Boolean)
				.join("\n\n");

			if (existingDiary && !existingDiary.isLocked) {
				await tx
					.update(schema.visitDiaries)
					.set({
						anamnesis: combinedAnamnesis || existingDiary.anamnesis,
						statusLocalis: nextObjectiveStatus || existingDiary.statusLocalis,
						diagnosisIcd10: nextDiagnosis || existingDiary.diagnosisIcd10,
						treatmentDescription:
							nextTreatmentPlan || existingDiary.treatmentDescription,
						updatedAt: now,
					})
					.where(
						and(
							eq(schema.visitDiaries.id, existingDiary.id),
							eq(schema.visitDiaries.organizationId, organizationId),
							eq(schema.visitDiaries.isLocked, false),
						),
					);
			} else if (!existingDiary) {
				await tx.insert(schema.visitDiaries).values({
					organizationId,
					visitId: input.visitId,
					patientId: visit.patientId,
					anamnesis: combinedAnamnesis || "",
					statusLocalis: nextObjectiveStatus || "",
					diagnosisIcd10: nextDiagnosis || "",
					treatmentDescription: nextTreatmentPlan || "",
					content: "",
					isLocked: false,
					version: 1,
					createdAt: now,
					updatedAt: now,
				});
			}
		}

		return serverDraft;
	});
}

/** Семантический алиас для медицинской карты приёма (Мандат 8ap) */
export const upsertVisitDiaryAutosaveInDb = upsertVisitDraftAutosaveInDb;
