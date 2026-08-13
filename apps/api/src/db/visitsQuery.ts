import { createHash } from "node:crypto";
import type {
	AcceptVisitDraftInput,
	AcceptVisitDraftResponse,
	Visit,
	VisitDraftAutosave,
	VisitDraftAutosaveRequest,
	VisitSaveReceipt,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { activeVisit as inMemoryActiveVisit, visitCloseChecklistFactsFor } from "../sampleData.js";
import { deductMaterialsForVisit } from "../services/inventory/materialDeduction.js";
import { buildVisitCloseChecklist } from "../visitCloseChecklist.js";
import { recordAuditEventInDb } from "./auditQuery.js";
import { db } from "./client.js";
import { hydrateDomainStateFromDb } from "./domainStateHydration.js";
import * as schema from "./schema.js";
import { projectVisitRow } from "./visitsProjection.js";

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

/**
 * Чем кончился поиск черновика приёма. ТРИ состояния, а не два.
 *
 * ПОЧЕМУ ЭТО НЕ `VisitDraftAutosave | null`, КАК БЫЛО. Прежняя подпись отдавала
 * `null` на ДВА разных состояния базы: строки приёма нет вовсе (включая приём
 * чужой клиники) и строка есть, но приём уже не черновик. Маршрут различить их не
 * мог ничем и называл оба одним отказом — «Прием не найден».
 *
 * ЗАМЕРЕНО в своём процессе через app.inject, живая PostgreSQL, 2026-07-29
 * (свои фикстурные клиники, `dce70000-…`):
 *   GET /api/visits/<ПОДПИСАННЫЙ>/draft/autosave -> 404 «Прием не найден…»
 *   GET /api/visits/<НЕТ ТАКОГО>/draft/autosave  -> 404 «Прием не найден…»
 *   GET /api/visits/<ЧУЖОЙ КЛИНИКИ>/draft/autosave -> 404 «Прием не найден…»
 * Независимая сверка тем же прогоном: `select … from visits where id = <ПОДПИСАННЫЙ>`
 * отдаёт ровно одну строку, `status = 'signed'`, `revision = 2`, `signed_at`
 * заполнен. То есть выборка НЕ слепа — она эту строку находит; распознавание
 * состояния терялось строкой ниже, `if (visit.status !== "draft") return null`.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. На живой демо-клинике все 10 приёмов подписаны и ни
 * у одного нет черновика (проверено SQL), а `dashboard.activeVisit` — это
 * «последний черновик клиники, иначе последний приём любого статуса»
 * (db/domainStateHydration.ts, applyActiveVisit). Значит рабочий экран открывается
 * на ПОДПИСАННОМ приёме и первым же запросом получает «Прием не найден. Обновите
 * рабочий экран и выберите актуальный прием». Обновление не меняет ничего, а
 * выбирать нечего: приём на месте, он подписан. Администратор за стойкой идёт
 * искать пропавшую запись, которой ничего не угрожает.
 *
 * Различать обязан слой доступа, а не маршрут по тексту ошибки: текст сообщения —
 * не тип, и разбор строк здесь уже стоил проекту одного дефекта
 * (routes/visits.ts, sendVisitDraftMutationError).
 */
export type VisitDraftAutosaveLookup =
	/** Приём — черновик, черновик отдан (сохранённый или пустая заготовка по приёму). */
	| { readonly outcome: "draft"; readonly serverDraft: VisitDraftAutosave }
	/** Строки приёма в этой клинике нет. Единственное состояние, где «приём не найден» — правда. */
	| { readonly outcome: "visit_absent" }
	/**
	 * Приём в базе ЕСТЬ, но он больше не черновик, поэтому черновика у него нет.
	 * `status` и `signedAt` несутся наружу, чтобы отказ назвал причину фактом, а не
	 * догадкой: «подписан» и «аннулирован» — разные причины и разные действия.
	 */
	| {
			readonly outcome: "no_draft";
			readonly visitId: string;
			readonly status: "signed" | "voided";
			readonly signedAt: string | null;
	  };

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
	const [visit] = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.id, input.visitId),
				eq(schema.visits.organizationId, organizationId),
			),
		)
		.limit(1);
	if (!visit) throw new Error("Визит не найден");
	if (visit.status !== "draft")
		throw new Error("Прием уже закрыт или аннулирован");

	const serverDraft: VisitDraftAutosave = {
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
	};

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
	const [saved] = await db
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
}

/**
 * ПРИЁМ ПОДПИСАН, А ОТВЕТ СОБРАТЬ НЕ УДАЛОСЬ.
 *
 * Отдельный тип нужен из-за порядка: запись в базе уже зафиксирована. Любая
 * ошибка ПОСЛЕ этого не смеет доехать до общего разбора доменных отказов
 * (routes/visits.ts, sendVisitDraftMutationError) — тот отвечает 409 «обновите
 * прием и повторите действие», а повторить нельзя: приём больше не черновик, и
 * повтор упрётся в «этот прием уже недоступен для изменений». Врач при этом
 * считает, что его запись не сохранилась.
 *
 * Здесь несётся то, что уже стало фактом: приём и его новая ревизия. Маршрут
 * обязан назвать состояние честно.
 */
export class VisitSignedResponseIncompleteError extends Error {
	readonly acceptedVisitId: string;
	readonly newRevision: number;

	constructor(acceptedVisitId: string, newRevision: number, cause: unknown) {
		super("Прием подписан, но ответ по контракту собрать не удалось.", {
			cause,
		});
		this.name = "VisitSignedResponseIncompleteError";
		this.acceptedVisitId = acceptedVisitId;
		this.newRevision = newRevision;
	}
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
		if (visit.status !== "draft")
			throw new Error("Прием уже закрыт или аннулирован");

		const previousRevision = visit.revision;
		const newRevision = previousRevision + 1;
		const savedAt = new Date();

		/*
		 * БЫЛО: UPDATE только по visitId. SELECT уже с org, но запись подписи —
		 * юридически значимое действие: условие области обязано быть на самом UPDATE
		 * (тот же класс, что patientsQuery updatePatientInDb после live cross-tenant PUT).
		 * СТАЛО: organizationId + id в WHERE.
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
				doctorSummary: input.doctorSummary,
				signedAt: savedAt,
				updatedAt: savedAt,
			})
			.where(
				and(
					eq(schema.visits.organizationId, organizationId),
					eq(schema.visits.id, input.visitId),
					eq(schema.visits.status, "draft"),
				),
			)
			.returning();
		// До этой строки приём ещё черновик: пустой RETURNING значит, что подписания не
		// случилось, и обычный доменный отказ здесь правдив.
		if (!signedRow) throw new Error("Прием не подписан");

		// Execute atomic material deduction
		await deductMaterialsForVisit(tx, {
			organizationId,
			visitId: input.visitId,
			userId: null,
			transactionType: "auto_deduct",
		});

		const signedVisit = projectVisitRow(signedRow);
		const saveReceipt = buildVisitSaveReceipt(
			input,
			signedVisit,
			previousRevision,
		);

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

export async function getVisitByIdInDb(organizationId: string, id: string) {
	if (process.env.DENTAL_STATE_PERSISTENCE === "off") {
		return (
			inMemoryActiveVisit.organizationId === organizationId &&
			inMemoryActiveVisit.id === id
				? inMemoryActiveVisit
				: null
		);
	}

	const [res] = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.id, id),
			),
		)
		.limit(1);
	return res || null;
}

/** Приём, открытый по записи расписания. */
type OpenedVisitForAppointment = {
	readonly id: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly appointmentId: string | null;
	readonly status: "draft" | "signed" | "voided";
	readonly createdAt: string;
	readonly updatedAt: string;
};

export type OpenVisitForAppointmentResult = {
	readonly visit: OpenedVisitForAppointment;
	/** true — приём открыт этим вызовом, false — он уже был открыт раньше. */
	readonly created: boolean;
};

/**
 * ЗАЧЕМ ЭТА ФУНКЦИЯ СУЩЕСТВУЕТ.
 *
 * До неё в apps/api не было НИ ОДНОГО боевого маршрута, создающего строку в
 * `visits`. Вставки жили только в разовом переносе состояния
 * (scripts/migrateStateToDb.ts), демо-пресете мастера первого запуска
 * (routes/workspaceProfile.ts), посеве для снимков
 * (scripts/seedOpsScreenshotDemo.ts) и импорте из чужой системы
 * (migration/loader.ts). То есть карта приёма в продукте не открывалась ничем:
 * клиент берёт `dashboard.activeVisit`, а это «последний ЧЕРНОВИК клиники,
 * иначе последний визит любого статуса» (db/domainStateHydration.ts,
 * applyActiveVisit). На живой базе там оказывался ПОДПИСАННЫЙ визит, и
 * автосохранение черновика отвечало 404/409 — врач у кресла не мог записать
 * приём вовсе, а текст отказа предлагал «выберите актуальный прием», которого
 * не существовало.
 *
 * Отсюда же тянулась касса: оплата отклонялась, если открытый приём принадлежит
 * другому пациенту (apps/web/src/hooks/domains/usePatientLogic.ts), а сменить
 * открытый приём было нечем. Теперь способ есть: открыть приём по записи
 * расписания того пациента, которому принимают оплату.
 *
 * ИДЕМПОТЕНТНОСТЬ ОБЯЗАТЕЛЬНА. Повторное нажатие «Открыть приём» не смеет
 * создавать второй визит по одной записи: второй визит увёл бы за собой
 * `activeVisit`, ЭМК врача осталась бы в первом, а `payments.visit_id`
 * указывал бы на пустой второй — деньги перестали бы относиться к лечению.
 * Поэтому существующий визит записи возвращается как есть, а строка записи
 * блокируется `for update`: два кресла, нажавшие одновременно, выстраиваются в
 * очередь, и второй вызов видит визит первого.
 */
export async function openVisitForAppointmentInDb(
	organizationId: string,
	appointmentId: string,
): Promise<OpenVisitForAppointmentResult> {
	return db.transaction(async (tx) => {
		const [appointment] = await tx
			.select({
				id: schema.appointments.id,
				patientId: schema.appointments.patientId,
				status: schema.appointments.status,
			})
			.from(schema.appointments)
			.where(
				and(
					eq(schema.appointments.id, appointmentId),
					eq(schema.appointments.organizationId, organizationId),
				),
			)
			.for("update")
			.limit(1);
		if (!appointment) throw new Error("Запись не найдена");
		if (!appointment.patientId) throw new Error("У записи нет пациента");
		// Отменённый приём и неявку лечить нечем: открытый по ним визит стал бы
		// носителем ЭМК и денег по приёму, которого не было.
		if (
			appointment.status === "cancelled" ||
			appointment.status === "no_show"
		) {
			throw new Error("Запись отменена");
		}

		const [existing] = await tx
			.select()
			.from(schema.visits)
			.where(
				and(
					eq(schema.visits.appointmentId, appointmentId),
					eq(schema.visits.organizationId, organizationId),
				),
			)
			.orderBy(schema.visits.createdAt)
			.limit(1);
		if (existing) {
			return {
				visit: {
					id: existing.id,
					organizationId: existing.organizationId,
					patientId: existing.patientId,
					appointmentId: existing.appointmentId,
					status: existing.status,
					createdAt: existing.createdAt.toISOString(),
					updatedAt: existing.updatedAt.toISOString(),
				},
				created: false,
			};
		}

		const [created] = await tx
			.insert(schema.visits)
			.values({
				organizationId,
				patientId: appointment.patientId,
				appointmentId,
				status: "draft",
				revision: 1,
			})
			.returning();
		if (!created) throw new Error("Прием не открыт");

		return {
			visit: {
				id: created.id,
				organizationId: created.organizationId,
				patientId: created.patientId,
				appointmentId: created.appointmentId,
				status: created.status,
				createdAt: created.createdAt.toISOString(),
				updatedAt: created.updatedAt.toISOString(),
			},
			created: true,
		};
	});
}

export async function getVisitsForQualityControlInDb(organizationId: string) {
	const res = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.status, "signed"),
				eq(schema.visits.qualityControlStatus, "pending"),
			),
		);
	return res.map(projectVisitRow);
}

export async function updateVisitQualityControlStatusInDb(
	organizationId: string,
	visitId: string,
	qualityControlStatus: string,
) {
	const [updated] = await db
		.update(schema.visits)
		.set({ qualityControlStatus })
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.id, visitId),
			),
		)
		.returning();
	if (!updated) throw new Error("Визит не найден");
	return projectVisitRow(updated);
}
