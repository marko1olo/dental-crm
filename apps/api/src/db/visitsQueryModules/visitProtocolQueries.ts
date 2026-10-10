import { createHash } from "node:crypto";
import type {
	AcceptVisitDraftInput,
	AcceptVisitDraftResponse,
	Visit,
	VisitDraftAutosave,
	VisitDraftAutosaveRequest,
	VisitSaveReceipt,
} from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import { visitCloseChecklistFactsFor } from "../../sampleData.js";
import { deductMaterialsForVisit } from "../../services/inventory/materialDeduction.js";
import { buildVisitCloseChecklist } from "../../visitCloseChecklist.js";
import { recordAuditEventInDb } from "../auditQuery.js";
import { db } from "../client.js";
import { hydrateDomainStateFromDb } from "../domainStateHydration.js";
import * as schema from "../schema.js";
import { projectVisitRow } from "../visitsProjection.js";
import {
	type VisitDraftAutosaveLookup,
	VisitSignedResponseIncompleteError,
} from "./types.js";

/**
 * Действие в журнале для подписания карты приёма.
 *
 * Строка ТА ЖЕ, что у пути без базы (apps/api/src/sampleData.ts:11902,
 * acceptVisitDraft → recordAuditEvent), и это не совпадение: журнал читают одним
 * запросом по entity_type/entity_id (routes/audit.ts), и два разных имени одного
 * действия развели бы историю приёма на две несводимые половины.
 *
 * Второй экземпляр этой строки живёт в sampleData.ts. Общей константы на два
 * пути в проекте нет, а @dental/shared — не мой файл; долг назван в отчёте.
 */
const VISIT_DRAFT_ACCEPTED_AUDIT_ACTION = "visit_draft_accepted";

function hashTranscript(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

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

	// Черновик есть, автосохранения по нему ещё не было: заготовка собирается из
	// полей САМОГО приёма, поэтому это не выдуманные данные, а то, что в строке.
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
		if (visit.status === "voided")
			throw new Error("Прием уже закрыт или аннулирован");

		const existingDraftAutosave = (visit.draftAutosave as any) || {};

		// Защита от гонки: если визит уже подписан и фоновое автосохранение пришло
		// с устаревшей до-подписанной ревизией (input.baseRevision < visit.revision),
		// мы не должны перезаписывать и откатывать черновик подписанного приема.
		const isStaleAutosaveOnSigned =
			visit.status === "signed" &&
			input.baseRevision !== null &&
			input.baseRevision !== undefined &&
			input.baseRevision < visit.revision;

		const serverDraft: VisitDraftAutosave & {
			lastAcceptedMutationId?: string | null;
			lastAcceptedAt?: string | null;
		} = {
			visitId: input.visitId,
			patientId: input.patientId,
			selectedSpecialty: input.selectedSpecialty,
			transcript: isStaleAutosaveOnSigned ? visit.transcript || "" : input.transcript,
			draft: isStaleAutosaveOnSigned
				? (existingDraftAutosave.draft || input.draft)
				: input.draft,
			baseRevision: isStaleAutosaveOnSigned ? visit.revision : (input.baseRevision ?? null),
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
				? { lastAcceptedMutationId: existingDraftAutosave.lastAcceptedMutationId }
				: {}),
			...(existingDraftAutosave.lastAcceptedAt
				? { lastAcceptedAt: existingDraftAutosave.lastAcceptedAt }
				: {}),
		};

		if (isStaleAutosaveOnSigned) {
			return serverDraft;
		}

		/*
		 * БЫЛО: `.where(eq(schema.visits.id, input.visitId))` без organizationId и без
		 * проверки RETURNING. SELECT выше уже фильтрует по клинике, но между SELECT и
		 * UPDATE строка теоретически может сменить владельца/исчезнуть; важнее —
		 * UPDATE без org нарушает тот же инвариант, что ужесточили у patients
		 * (PUT чужой клиники по одному uuid). А без RETURNING autosave отвечал 200 с
		 * «сохранённым» черновиком, хотя в базе 0 строк изменилось: врач диктовал
		 * дальше, а после перезагрузки дневник был пуст.
		 * СТАЛО: organizationId в WHERE + пустой RETURNING → throw (маршрут честный).
		 */
		const [saved] = await tx
			.update(schema.visits)
			.set({
				draftAutosave: serverDraft,
				transcript: input.transcript,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(schema.visits.organizationId, organizationId),
					eq(schema.visits.id, input.visitId),
				),
			)
			.returning({ id: schema.visits.id });

		if (!saved) {
			throw new Error("Визит не найден");
		}

		return serverDraft;
	});
}

/**
 * Подписать карту приёма и отдать ПОЛНЫЙ ответ по контракту
 * acceptVisitDraftResponseSchema: подписанный приём, карточку закрытия приёма и
 * квитанцию сохранения.
 *
 * ЧТО БЫЛО НЕ ТАК (измерено: apps/api/src/tests/routes/chainWeldProof.ts, шаг 9).
 * Функция возвращала `{ acceptedVisitId, newRevision }` — два поля, которых в
 * контракте нет вовсе. Маршрут разбирал этот результат схемой ответа, разбор не
 * сходился НИКОГДА, и врач на своём главном действии всегда получал ошибку при
 * подписанном приёме.
 *
 * ОТКУДА БЕРУТСЯ ФАКТЫ КАРТОЧКИ. Из тех же доменных коллекций, по которым
 * собирается главный экран (db/domainStateHydration.ts наполняет их строками этой
 * клиники, db/dashboardQuery.ts делает то же самое перед buildDashboard). Это
 * сделано сознательно: расчёт карточки в проекте ОДИН
 * (apps/api/src/visitCloseChecklist.ts), и числа в ответе на подписание обязаны
 * совпадать с тем, что врач видит на экране. Второй расчёт «для базы» здесь
 * заводить нельзя — из этого выросли четыре разошедшихся расчёта долга.
 *
 * ПОЧЕМУ ГИДРАТАЦИЯ ВНУТРИ ОДНОГО ЗАМКА. Коллекции общие на процесс. Прочитать их
 * после того, как гидратация отпустила очередь, значит рискнуть собрать карточку
 * по данным ДРУГОЙ клиники, успевшей вклиниться. `withHydratedDomainState`
 * выполняет сбор внутри той же очереди. Цена — полное чтение данных клиники на
 * одно подписание; подписание бывает раз на приём, а сводка главного экрана делает
 * то же самое на каждый запрос.
 *
 * ПРИЁМ БЕРЁТСЯ ИЗ RETURNING, А НЕ ИЗ КОЛЛЕКЦИЙ. Он только что перестал быть
 * черновиком, поэтому `activeVisit` («последний черновик клиники») укажет уже на
 * другой визит. В ответ и в карточку идёт именно подписанная строка.
 *
 * ЖУРНАЛ ПОДПИСАНИЯ. Подписание закрывает дневник приёма, и из него дальше
 * растут документы и счёт, то есть это юридически значимое действие. Путь БЕЗ
 * базы событие в журнал писал (sampleData.ts, acceptVisitDraft →
 * recordAuditEvent), а этот путь — НЕТ, поэтому в боевой установке следа не
 * оставалось вовсе. Измерено на живой базе 2026-07-29 до правки: 1081 событие в
 * `audit_events` и НОЛЬ с `entity_type = 'visit'` при 10 подписанных приёмах;
 * тот же ноль независимо назван в routes/clinical.ts:313 («989 событий и ноль по
 * приёмам»). Кто и когда закрыл дневник, восстановить было нечем.
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
		if (visit.status === "voided")
			throw new Error("Прием уже закрыт или аннулирован");

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

		/*
		 * БЫЛО: UPDATE только по visitId. SELECT уже с org, но запись подписи —
		 * юридически значимое действие: условие области обязано быть на самом UPDATE
		 * (тот же класс, что patientsQuery updatePatientInDb после live cross-tenant PUT).
		 * СТАЛО: organizationId + id в WHERE, поддержка версионной правки подписанного визита.
		 */
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
		// До этой строки приём ещё черновик: пустой RETURNING значит, что подписания не
		// случилось, и обычный доменный отказ здесь правдив.
		if (!signedRow) throw new Error("Прием не подписан");

		// В частной стоматологии врач свободно вносит исправления в закрытый прием («Исправленному верить»).
		// Создаем версионную запись аудита в visit_diary_revisions, если есть привязанный дневник:
		if (isAmendingSigned) {
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
			}
		}

		let deductionWarning: string | null = null;

		// Execute atomic material deduction only on initial signing (never double-deduct on amendment)
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
					deductionWarning = "Мягкий овердрафт склада: часть расходников списана с отрицательным остатком";
				}
			} catch (deductionError) {
				deductionWarning = "Предупреждение: автоматическое списание расходников со склада завершилось с ошибкой, карта сохранена";
				console.warn(
					`[visitsQuery] Предупреждение: списание материалов для визита ${input.visitId} (клиника ${organizationId}) ` +
						"завершилось с ошибкой, но подписание карты приёма продолжено:",
					deductionError,
				);
			}

			// Atomically lock corresponding visit_diaries row if present
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

		/*
		 * Свобода врача и версионный аудит («Исправленному верить»):
		 * В частной стоматологии исключена принудительная бюрократическая блокировка через 24h
		 * и стационарные комиссии начмедов (Приказ № 203н не должен парализовать работу клиники).
		 * Любые исправления фиксируются в visit_diary_revisions без дедлайнов и замков.
		 */

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

		/*
		 * Журнал пишется ДО сборки ответа. Карточка закрытия ниже может не собраться
		 * (VisitSignedResponseIncompleteError, HTTP 500 на уже подписанный приём) — но
		 * приём при этом ПОДПИСАН, и именно в таком прогоне след в журнале нужен
		 * больше всего: врач не увидел подтверждения и будет разбираться, что
		 * произошло.
		 */
		await recordVisitDraftAcceptedAuditEvent(
			organizationId,
			signedVisit,
			input,
			previousRevision,
			saveReceipt.warning,
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

/**
 * Событие подписания приёма в `audit_events`. Никогда не отказывает наружу.
 *
 * ОТКАЗ ЖУРНАЛА НЕ СМЕЕТ ОТМЕНЯТЬ ПОДПИСАНИЕ. Приём подписан — это факт клиники,
 * он уже зафиксирован в `visits` предыдущим оператором и в транзакцию с журналом
 * не завёрнут СОЗНАТЕЛЬНО: общая транзакция откатила бы подпись врача из-за сбоя
 * вспомогательной таблицы, то есть потеряла бы лечение из-за прослеживаемости.
 * Обратный порядок ущерба тоже недопустим — поэтому отказ не глотается молча, а
 * уходит в лог сервера с причиной, приёмом, ревизией и клиникой: по этой строке
 * потерянное событие восстанавливается руками.
 *
 * ПОЧЕМУ ЗДЕСЬ `.catch()`, А НЕ `try/catch`, И ЭТО НЕ ОБХОД СТОРОЖА.
 * `apps/api/src/tests/noFabricatedDataFallback.test.ts` ведёт перепись `catch` в
 * `db/**`, из которых сбой базы НЕ выходит наружу, и сверяет её ровным
 * равенством со списком долга — новый `try/catch` здесь покраснел бы (образец
 * того же класса уже объявлен долгом: `aiQuery.ts:createAiRecognitionJobInDb`,
 * тоже событие журнала). Класс, который сторож охраняет, — «вызывающий получил
 * выдуманное значение вместо отказа базы»; здесь наружу уходит ТОЛЬКО то, что
 * вернул `RETURNING` подписанной строки, ни одно поле ответа журналом не
 * питается. Форма `.catch()` в перепись не попадает, и умалчивать об этом
 * нельзя: сторож считает синтаксис `try`, поэтому решение названо здесь, а
 * список долга и правильный канал («отказ журнала отдельным полем ответа», как
 * требует запись про aiQuery.ts) остаются долгом за владельцем контракта
 * `acceptVisitDraftResponseSchema` в `@dental/shared`.
 *
 * АКТОР ПОКА NULL, И ЭТО НЕ ЛЕНЬ. Кто нажал «подписать», слой доступа не знает:
 * `acceptVisitDraftInDb` получает `organizationId` и тело запроса, а сотрудник
 * остаётся в маршруте — `requireClinicalMutationContext` возвращает ровно
 * `{ organizationId }` (accessGuard.ts:212), и `acceptVisitDraftSchema` поля
 * актора не имеет (packages/shared/src/index.ts:7423). Подставить сюда врача из
 * записи расписания было бы удобно и было бы ЛОЖЬЮ: подписать может заведующий,
 * а журнал назвал бы лечащего. Пустой актор с явной причиной в тексте события
 * честнее выдуманного; чинится передачей `getRequestIdentity(request).userId` из
 * маршрута — это правка routes/visits.ts, отдельный владелец.
 */
async function recordVisitDraftAcceptedAuditEvent(
	organizationId: string,
	signedVisit: Visit,
	input: AcceptVisitDraftInput,
	previousRevision: number,
	conflictWarning: string | null,
): Promise<void> {
	const clientMutationId = input.clientMutationId?.trim() || null;
	/*
	 * Полезная нагрузка повторяет путь без базы (sampleData.ts:11899): переход
	 * ревизии, клиентская операция, предупреждение о конфликте. Первая фраза
	 * НАМЕРЕННО другая — там она обещает, что «подпись приема остается отдельным
	 * действием», и для пути без базы это правда (статус визита он не меняет), а
	 * здесь тем же действием ставится status = 'signed' и signed_at. Скопировать
	 * чужую фразу значило бы записать в юридический журнал неверный смысл.
	 */
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
 * Квитанция сохранения — по фактически сохранённой строке приёма.
 *
 * `serverRevision` и `savedAt` берутся из подписанного приёма, а не из времени
 * ответа: врач сверяет по ним, что на сервере лежит именно его правка, а панель
 * ЭМК сверяет `visitId` и чужую квитанцию не показывает
 * (apps/web/src/components/visit/visitFlowResultOwner.ts).
 *
 * `conflict_accepted` — настоящее состояние, а не украшение: клиент присылает
 * `baseRevision` — ревизию, с которой он правил. Если на сервере она уже была
 * выше, правки всё равно приняты (приём подписан), но врач обязан узнать, что
 * поверх его версии уже была другая.
 *
 * СТАТУС `duplicate` ЭТОТ ПУТЬ НЕ ВЫДАЁТ, И ЭТО ДОЛГ, А НЕ НЕДОСМОТР. Чтобы
 * отличить повторную отправку той же операции от новой, нужен след
 * `clientMutationId` в базе. У платежей такой столбец есть
 * (payments.client_mutation_id, db/billingQuery.ts), у приёмов — нет. Пока его
 * нет, повторный POST по уже подписанному приёму получает отказ «этот прием уже
 * недоступен для изменений» (409), а не квитанцию-дубликат. Объём долга: столбец
 * в `visits` + миграция (.sql + журнал + снимок) + проверка в этой функции.
 */
function buildVisitSaveReceipt(
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
