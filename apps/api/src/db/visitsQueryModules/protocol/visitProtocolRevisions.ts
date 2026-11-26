import type {
	AcceptVisitDraftInput,
	AcceptVisitDraftResponse,
	Visit,
	VisitSaveReceipt,
} from "@dental/shared";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { visitCloseChecklistFactsFor } from "../../../sampleData.js";
import { TreatmentConsumablesService } from "../../../services/treatmentConsumables/index.js";
import { buildVisitCloseChecklist } from "../../../visitCloseChecklist.js";
import { recordAuditEventInDb } from "../../auditQuery.js";
import { hydrateDomainStateFromDb } from "../../domainStateHydration.js";
import { withSavepoint, withTenantCtx, type TenantDb } from "../../rls.js";
import * as schema from "../../schema.js";
import { projectVisitRow } from "../../visitsProjection.js";
import { computeDiaryHash } from "../../../services/clinical/signingModules/diaryHashCalculator.js";
import { VisitSignedResponseIncompleteError } from "../types.js";

const logger = createApiLogger("visitProtocolRevisions");

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
	tx?: TenantDb,
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

	await recordAuditEventInDb(
		organizationId,
		{
			entityType: "visit",
			entityId: signedVisit.id,
			action: VISIT_DRAFT_ACCEPTED_AUDIT_ACTION,
			actorUserId: null,
			reason,
		},
		tx,
	).catch((error: unknown) => {
		logger.error(
			{
				err: safeLogError(error),
				visitId: signedVisit.id,
				organizationId,
				previousRevision,
				newRevision: signedVisit.revision,
				action: VISIT_DRAFT_ACCEPTED_AUDIT_ACTION,
			},
			"Приём ПОДПИСАН, но событие не записано в audit_events",
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
	const txResult = await withTenantCtx(organizationId, async (tx) => {
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

			return {
				signedVisit,
				saveReceipt,
				isReplay: true as const,
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

		const targetTooth =
			input.draft.diagnosisTooth != null && String(input.draft.diagnosisTooth).trim() !== ""
				? String(input.draft.diagnosisTooth).trim()
				: input.draft.toothNumber != null && String(input.draft.toothNumber).trim() !== ""
					? String(input.draft.toothNumber).trim()
					: null;

		const toothCondition = targetTooth
			? eq(schema.visitDiaries.diagnosisTooth, targetTooth)
			: isNull(schema.visitDiaries.diagnosisTooth);

		// Синхронизация SSOT с таблицей visitDiaries и фиксация ревизии «Исправленному верить»
		const [existingDiary] = await tx
			.select()
			.from(schema.visitDiaries)
			.where(
				and(
					eq(schema.visitDiaries.visitId, input.visitId),
					eq(schema.visitDiaries.organizationId, organizationId),
					toothCondition,
				),
			)
			.limit(1);

		if (existingDiary) {
			if (isAmendingSigned) {
				await tx.insert(schema.visitDiaryRevisions).values({
					organizationId,
					diaryId: existingDiary.id,
					previousComplaint: existingDiary.complaint,
					previousAnamnesis: existingDiary.anamnesis,
					previousStatusLocalis: existingDiary.statusLocalis,
					previousDiagnosisIcd10: existingDiary.diagnosisIcd10,
					previousTreatmentDescription: existingDiary.treatmentDescription,
					previousDiagnosisTooth: existingDiary.diagnosisTooth,
					previousComplications: existingDiary.complications,
					previousComorbidities: existingDiary.comorbidities,
					previousInstrumentTrayBarcode: null,
					revisionReason: "Исправленному верить",
					revisedByUserId: existingDiary.authorId ?? null,
					revisedAt: savedAt,
				});
			}

			const nextComplaint = input.draft.complaint ?? existingDiary.complaint;
			const nextAnamnesis = input.draft.anamnesis;
			const nextStatusLocalis = input.draft.objectiveStatus;
			const nextTreatmentDescription = input.draft.treatmentPlan;
			const nextDiagnosisIcd10 = input.draft.diagnosis;
			const nextTooth = targetTooth ?? (existingDiary.diagnosisTooth ? String(existingDiary.diagnosisTooth) : null);

			const newHash = computeDiaryHash(
				input.visitId,
				visit.patientId,
				nextComplaint,
				nextAnamnesis,
				nextStatusLocalis,
				nextTreatmentDescription,
				nextDiagnosisIcd10,
				nextTooth,
				existingDiary.complications,
				existingDiary.comorbidities,
			);

			await tx
				.update(schema.visitDiaries)
				.set({
					complaint: nextComplaint,
					anamnesis: nextAnamnesis,
					statusLocalis: nextStatusLocalis,
					treatmentDescription: nextTreatmentDescription,
					diagnosisIcd10: nextDiagnosisIcd10,
					diagnosisTooth: nextTooth,
					diaryHash: newHash,
					version: (existingDiary.version ?? 1) + 1,
					updatedAt: savedAt,
				})
				.where(
					and(
						eq(schema.visitDiaries.id, existingDiary.id),
						eq(schema.visitDiaries.organizationId, organizationId),
					),
				);
		} else {
			const newHash = computeDiaryHash(
				input.visitId,
				visit.patientId,
				input.draft.complaint ?? null,
				input.draft.anamnesis,
				input.draft.objectiveStatus,
				input.draft.treatmentPlan,
				input.draft.diagnosis,
				targetTooth,
				null,
				null,
			);

			await tx.insert(schema.visitDiaries).values({
				organizationId,
				visitId: input.visitId,
				patientId: visit.patientId,
				complaint: input.draft.complaint ?? null,
				anamnesis: input.draft.anamnesis,
				statusLocalis: input.draft.objectiveStatus,
				diagnosisIcd10: input.draft.diagnosis,
				diagnosisTooth: targetTooth,
				treatmentDescription: input.draft.treatmentPlan,
				diaryHash: newHash,
				content: "",
				isLocked: false,
				version: 1,
				createdAt: savedAt,
				updatedAt: savedAt,
			});
		}

		let deductionWarning: string | null = null;

		// Списание расходников и блокировка дневника только при первичной подписи
		if (!isAmendingSigned) {
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

			let signingDoctorId: string | null = null;
			if (visit.appointmentId) {
				const [appRow] = await tx
					.select({ doctorUserId: schema.appointments.doctorUserId })
					.from(schema.appointments)
					.where(
						and(
							eq(schema.appointments.id, visit.appointmentId),
							eq(schema.appointments.organizationId, organizationId),
						),
					)
					.limit(1);
				if (appRow?.doctorUserId) {
					signingDoctorId = appRow.doctorUserId;
				}
			}

			await withSavepoint(tx, async (subTx) => {
				const deductionResult = await TreatmentConsumablesService.deductForVisit(subTx, {
					organizationId,
					visitId: input.visitId,
					userId: signingDoctorId,
					transactionType: "auto_deduct",
				});
				if (deductionResult?.isOverdraft) {
					deductionWarning =
						"Мягкий овердрафт склада: часть расходников списана с отрицательным остатком";
				}
			});
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

		await withSavepoint(tx, (spTx) =>
			recordVisitDraftAcceptedAuditEvent(
				organizationId,
				signedVisit,
				input,
				previousRevision,
				saveReceipt.warning ?? null,
				spTx,
			),
		).catch((auditErr: unknown) => {
			logger.error(
				{
					err: safeLogError(auditErr),
					visitId: signedVisit.id,
					organizationId,
				},
				"Сбой savepoint при записи audit_events не блокирует подписание визита",
			);
		});

		return {
			signedVisit,
			saveReceipt,
			isReplay: false as const,
		};
	});

	try {
		const { state: clinicState } =
			await hydrateDomainStateFromDb(organizationId);

		const visitCloseChecklist = buildVisitCloseChecklist(
			visitCloseChecklistFactsFor(txResult.signedVisit, clinicState),
		);

		return {
			visit: txResult.signedVisit,
			visitCloseChecklist,
			saveReceipt: txResult.saveReceipt,
		};
	} catch (error) {
		if (txResult.isReplay) {
			throw error;
		}
		throw new VisitSignedResponseIncompleteError(
			txResult.signedVisit.id,
			txResult.signedVisit.revision,
			error,
		);
	}
}

/** Семантический алиас для медицинской карты приёма (Мандат 8ap) */
export const acceptVisitDiaryInDb = acceptVisitDraftInDb;
export const acceptOutpatientRecordInDb = acceptVisitDraftInDb;
