import type {
	AcceptVisitDraftInput,
	AcceptVisitDraftResponse,
	Visit,
	VisitSaveReceipt,
} from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import { visitCloseChecklistFactsFor } from "../../../sampleData.js";
import { deductMaterialsForVisit } from "../../../services/inventory/materialDeduction.js";
import { buildVisitCloseChecklist } from "../../../visitCloseChecklist.js";
import { recordAuditEventInDb } from "../../auditQuery.js";
import { db } from "../../client.js";
import { hydrateDomainStateFromDb } from "../../domainStateHydration.js";
import * as schema from "../../schema.js";
import { projectVisitRow } from "../../visitsProjection.js";
import { VisitSignedResponseIncompleteError } from "../types.js";

/**
 * Действие в журнале для подписания медицинской карты приёма.
 * Строка строго синхронизирована с sampleData.ts для целостности аудит-лога.
 */
export const VISIT_DRAFT_ACCEPTED_AUDIT_ACTION = "visit_draft_accepted";
export const VISIT_DIARY_ACCEPTED_AUDIT_ACTION = VISIT_DRAFT_ACCEPTED_AUDIT_ACTION;

/**
 * Квитанция сохранения — по фактически сохранённой строке приёма.
 * Поддерживает автономию врача и фиксацию конфликтов ревизий (conflict_accepted).
 */
export function buildVisitSaveReceipt(
	input: AcceptVisitDraftInput,
	signedVisit: Visit,
	previousRevision: number,
): VisitSaveReceipt {
	const baseRevision = input.baseRevision ?? null;
	const conflictWarning =
		baseRevision !== null && baseRevision < previousRevision
			? `На сервере уже была ревизия ${previousRevision}, сохранение пришло с ревизии ${baseRevision}. ` +
				"Правки врача приняты и подписаны; сверьте запись, если приём правили с двух рабочих мест."
			: null;

	return {
		visitId: signedVisit.id,
		clientMutationId: input.clientMutationId?.trim() || null,
		status: conflictWarning ? "conflict_accepted" : "accepted",
		serverRevision: signedVisit.revision,
		savedAt: signedVisit.updatedAt,
		warning: conflictWarning,
	};
}

/**
 * Запись юридически значимого факта закрытия/подписания карты приёма в audit_events.
 * Отказ записи в журнал не отменяет подписание клинического визита (Мандат 8e).
 */
export async function recordVisitDraftAcceptedAuditEvent(
	organizationId: string,
	signedVisit: Visit,
	input: AcceptVisitDraftInput,
	previousRevision: number,
	conflictWarning: string | null,
): Promise<void> {
	const clientMutationId = input.clientMutationId?.trim() || null;
	const reason = [
		"Врач подписал карту приёма: дневник закрыт, статус приёма draft -> signed.",
		`Ревизия ${previousRevision} -> ${signedVisit.revision}.`,
		clientMutationId ? `Клиентская операция ${clientMutationId}.` : null,
		conflictWarning,
		"Сотрудник в событии не указан: маршрут подписания не передаёт его в слой доступа.",
	]
		.filter(Boolean)
		.join(" ");

	await recordAuditEventInDb(organizationId, {
		entityType: "visit",
		entityId: signedVisit.id,
		action: VISIT_DRAFT_ACCEPTED_AUDIT_ACTION,
		actorUserId: null,
		reason,
	}).catch((error: unknown) => {
		console.error(
			`[visitsQuery] Приём ${signedVisit.id} ПОДПИСАН (клиника ${organizationId}, ревизия ` +
				`${previousRevision} -> ${signedVisit.revision}), но событие ${VISIT_DRAFT_ACCEPTED_AUDIT_ACTION} ` +
				"не записано в audit_events: юридического следа закрытия дневника за этот приём нет. " +
				"Подписание отменять нельзя, событие восстанавливается по этой строке. Причина отказа:",
			error,
		);
	});
}

/**
 * Подписать медицинскую карту приёма и отдать полный контрактный ответ:
 * подписанный визит, чек-лист закрытия приёма и квитанцию сохранения.
 *
 * Версионирование протоколов приёма («Исправленному верить», аудит-лог изменений врача).
 * В частной стоматологии исключена принудительная бюрократическая блокировка через 24h
 * и стационарные комиссии начмедов. Любые исправления фиксируются в visit_diary_revisions без дедлайнов и замков.
 */
export async function acceptVisitDraftInDb(
	organizationId: string,
	input: AcceptVisitDraftInput,
): Promise<AcceptVisitDraftResponse> {
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
		if (visit.status === "voided") {
			throw new Error("Прием уже закрыт или аннулирован");
		}

		const previousRevision = visit.revision;
		const newRevision = previousRevision + 1;
		const savedAt = new Date();
		const isAmendingSigned = visit.status === "signed";
		const existingDraftAutosave =
			(visit.draftAutosave as Record<string, unknown> | null) ?? {};
		const lastAcceptedMutationId =
			typeof existingDraftAutosave.lastAcceptedMutationId === "string"
				? existingDraftAutosave.lastAcceptedMutationId
				: null;

		// Защита от манки-кликинга: если приём уже подписан и пришёл тот же mutationId
		// или идентичный черновик в течение 10 секунд — возвращаем подписанную запись без раздувания ревизий
		const isIdenticalDraft =
			visit.complaint === input.draft.complaint &&
			visit.anamnesis === input.draft.anamnesis &&
			visit.objectiveStatus === input.draft.objectiveStatus &&
			visit.diagnosis === input.draft.diagnosis &&
			visit.treatmentPlan === input.draft.treatmentPlan;

		const isDuplicateMutation = Boolean(
			input.clientMutationId &&
				lastAcceptedMutationId === input.clientMutationId,
		);

		const isRecentConcurrentReplay =
			isAmendingSigned &&
			(isDuplicateMutation ||
				(isIdenticalDraft &&
					Date.now() - new Date(visit.updatedAt).getTime() < 10000));

		if (isRecentConcurrentReplay) {
			const signedVisit = projectVisitRow(visit);
			const saveReceipt: VisitSaveReceipt = {
				visitId: signedVisit.id,
				clientMutationId: input.clientMutationId?.trim() || null,
				status: "duplicate",
				serverRevision: signedVisit.revision,
				savedAt: signedVisit.updatedAt,
				warning:
					"Повторный запрос: карта приёма уже подписана (дубликат предотвращён).",
			};

			const { state: clinicState } =
				await hydrateDomainStateFromDb(organizationId);

			const visitCloseChecklist = buildVisitCloseChecklist(
				visitCloseChecklistFactsFor(signedVisit, clinicState),
			);

			return {
				visit: signedVisit,
				visitCloseChecklist,
				saveReceipt,
			};
		}

		const updatedDraftAutosave = {
			...existingDraftAutosave,
			lastAcceptedMutationId: input.clientMutationId?.trim() || null,
			lastAcceptedAt: savedAt.toISOString(),
		};

		const [signedRow] = await tx
			.update(schema.visits)
			.set({
				status: "signed",
				revision: newRevision,
				complaint: input.draft.complaint,
				anamnesis: input.draft.anamnesis,
				objectiveStatus: input.draft.objectiveStatus,
				diagnosis: input.draft.diagnosis,
				treatmentPlan: input.draft.treatmentPlan,
				doctorSummary: isAmendingSigned
					? input.doctorSummary
						? `${input.doctorSummary} (Исправленному верить: ред. ${newRevision})`
						: `Исправленному верить: ред. ${newRevision} от ${savedAt.toLocaleString("ru-RU")}`
					: input.doctorSummary,
				draftAutosave: updatedDraftAutosave,
				hygieneIndices:
					input.hygieneIndices ??
					(input.draft as { hygieneIndices?: unknown })?.hygieneIndices ??
					visit.hygieneIndices ??
					null,
				signedAt: visit.signedAt ?? savedAt,
				updatedAt: savedAt,
			})
			.where(
				and(
					eq(schema.visits.organizationId, organizationId),
					eq(schema.visits.id, input.visitId),
					inArray(schema.visits.status, ["draft", "signed"]),
				),
			)
			.returning();

		if (!signedRow) throw new Error("Прием не подписан");

		// Синхронизация SSOT с таблицей visitDiaries и фиксация ревизии «Исправленному верить»
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

		if (existingDiary) {
			if (isAmendingSigned) {
				await tx.insert(schema.visitDiaryRevisions).values({
					organizationId,
					diaryId: existingDiary.id,
					previousAnamnesis: existingDiary.anamnesis,
					previousStatusLocalis: existingDiary.statusLocalis,
					previousDiagnosisIcd10: existingDiary.diagnosisIcd10,
					previousTreatmentDescription: existingDiary.treatmentDescription,
					previousComplications: existingDiary.complications,
					previousComorbidities: existingDiary.comorbidities,
					previousInstrumentTrayBarcode: existingDiary.instrumentTrayBarcode,
					revisionReason: "Исправленному верить",
					revisedByUserId: existingDiary.authorId ?? null,
					revisedAt: savedAt,
				});
			}
			await tx
				.update(schema.visitDiaries)
				.set({
					anamnesis: input.draft.anamnesis,
					statusLocalis: input.draft.objectiveStatus,
					treatmentDescription: input.draft.treatmentPlan,
					diagnosisIcd10: input.draft.diagnosis,
					version: (existingDiary.version ?? 1) + 1,
					updatedAt: savedAt,
				})
				.where(eq(schema.visitDiaries.id, existingDiary.id));
		} else {
			await tx.insert(schema.visitDiaries).values({
				organizationId,
				visitId: input.visitId,
				patientId: visit.patientId,
				anamnesis: input.draft.anamnesis,
				statusLocalis: input.draft.objectiveStatus,
				diagnosisIcd10: input.draft.diagnosis,
				treatmentDescription: input.draft.treatmentPlan,
				content: "",
				isLocked: false,
				version: 1,
				createdAt: savedAt,
				updatedAt: savedAt,
			});
		}

		let deductionWarning: string | null = null;

		// Списание расходников только при первичной подписи
		if (!isAmendingSigned) {
			let signingDoctorId: string | null = null;
			if (visit.appointmentId) {
				const [appRow] = await tx
					.select({ doctorUserId: schema.appointments.doctorUserId })
					.from(schema.appointments)
					.where(eq(schema.appointments.id, visit.appointmentId))
					.limit(1);
				if (appRow?.doctorUserId) {
					signingDoctorId = appRow.doctorUserId;
				}
			}

			try {
				const deductionResult = await deductMaterialsForVisit(tx, {
					organizationId,
					visitId: input.visitId,
					userId: signingDoctorId,
					transactionType: "auto_deduct",
				});
				if (deductionResult?.hasOverdraft) {
					deductionWarning =
						"Мягкий овердрафт склада: часть расходников списана с отрицательным остатком";
				}
			} catch (deductionError) {
				deductionWarning =
					"Предупреждение: автоматическое списание расходников со склада завершилось с ошибкой, карта сохранена";
				console.warn(
					`[visitsQuery] Предупреждение: списание материалов для визита ${input.visitId} (клиника ${organizationId}) ` +
						"завершилось с ошибкой, но подписание карты приёма продолжено:",
					deductionError,
				);
			}

			// Блокировка записи в visitDiaries
			await tx
				.update(schema.visitDiaries)
				.set({
					isLocked: true,
					lockedAt: savedAt,
					updatedAt: savedAt,
				})
				.where(
					and(
						eq(schema.visitDiaries.visitId, input.visitId),
						eq(schema.visitDiaries.organizationId, organizationId),
						eq(schema.visitDiaries.isLocked, false),
					),
				);
		}

		const signedVisit = projectVisitRow(signedRow);
		const baseReceipt = buildVisitSaveReceipt(
			input,
			signedVisit,
			previousRevision,
		);
		const amendWarning = isAmendingSigned
			? "Исправленному верить: внесена версионная правка в закрытый приём"
			: null;
		const combinedWarning = [baseReceipt.warning, amendWarning, deductionWarning]
			.filter(Boolean)
			.join(". ");

		const saveReceipt: VisitSaveReceipt = {
			...baseReceipt,
			warning: combinedWarning || null,
		};

		await recordVisitDraftAcceptedAuditEvent(
			organizationId,
			signedVisit,
			input,
			previousRevision,
			saveReceipt.warning ?? null,
		);

		try {
			const { state: clinicState } =
				await hydrateDomainStateFromDb(organizationId);

			const visitCloseChecklist = buildVisitCloseChecklist(
				visitCloseChecklistFactsFor(signedVisit, clinicState),
			);

			return {
				visit: signedVisit,
				visitCloseChecklist,
				saveReceipt,
			};
		} catch (error) {
			throw new VisitSignedResponseIncompleteError(
				signedVisit.id,
				signedVisit.revision,
				error,
			);
		}
	});
}

/** Семантический алиас для медицинской карты приёма (Мандат 8ap) */
export const acceptVisitDiaryInDb = acceptVisitDraftInDb;
export const acceptOutpatientRecordInDb = acceptVisitDraftInDb;
