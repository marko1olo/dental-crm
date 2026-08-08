import {
	acceptVisitDraftResponseSchema,
	acceptVisitDraftSchema,
	visitDraftAutosaveRequestSchema,
	visitDraftAutosaveResponseSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
/*
 * ОДНА ИДИОМА ДОСТУПА НА ФАЙЛ, И ОНА ВЫПОЛНЯЕТСЯ.
 *
 * БЫЛО: этот импорт назывался `requireClinicalMutationAccess,
 * requireClinicalReadAccess` — и НИ ОДИН из двух охранников не вызывался в файле
 * ни разу. Все четыре маршрута проверяли только подпись токена кабинета вручную
 * (`verifyToken` + `TOKEN_SECRET`), а гейт секрета администратора клиники,
 * который стоит на каждом другом клиническом маршрутном файле (imaging.ts,
 * clinical.ts, diary.ts, templates.ts, xray.ts, speech.ts, smartImports.ts),
 * здесь отсутствовал — включая POST /draft/accept, ПОДПИСЫВАЮЩИЙ карту приёма.
 *
 * Мёртвый импорт был хуже отсутствующего: и рецензент, и поиск по имени
 * охранника находили его в файле, а комментарий теста прямо утверждал, что
 * охранник работает «перед проверкой токена». Проверка по исходнику показывала
 * гейт, которого в работе не было.
 *
 * ЗАМЕРЕНО ЧЕРЕЗ app.inject, а не прочитано: при заданном
 * DENTE_CLINICAL_ADMIN_SECRET и БЕЗ заголовка x-dente-admin-secret маршруты
 * отвечали 404 / 200 / 400 / 400 — то есть запрос доходил до базы и до разбора
 * тела. Любой другой клинический маршрут отвечает на это 403.
 *
 * Клиент всё это время свою часть договора выполнял:
 * apps/web/src/hooks/domains/useVisitLogic.ts зовёт эти самые маршруты через
 * `auth.denteClinicalMutationHeaders()` / `auth.denteClinicalReadHeaders()`,
 * которые секрет ПРИСЫЛАЮТ (apps/web/src/lib/denteRequestHeaders.ts). Сервер его
 * не читал. Поэтому включение гейта не ломает экран врача — оно возвращает тот
 * договор, который клиент уже соблюдает.
 *
 * Взяты именно `*Context`-формы: две идиомы в этом файле решали РАЗНЫЕ вопросы —
 * ручная проверка отвечала «какая это клиника» (даёт organizationId), охранник
 * отвечает «есть ли секрет администратора» (возвращает boolean, организацию не
 * даёт). Заменить одно другим значило бы удалить слой. `*Context` выполняет оба
 * шага и возвращает готовый organizationId либо null (ответ уже отправлен).
 */
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";

type VisitPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};
type VisitDraftMutationOperation = "autosave" | "accept";

const visitDraftAutosaveValidationMessage =
	"Черновик приема не сохранен: передайте пациента, специальность, текст приема или заполненные поля черновика.";
const visitDraftAcceptValidationMessage =
	"Черновик приема не принят: передайте текст приема, заполненные поля черновика и данные сохранения врача.";
const visitDraftNotFoundMessage =
	"Прием не найден. Обновите рабочий экран и выберите актуальный прием.";
/*
 * ПРИЁМ ЕСТЬ, ЧЕРНОВИКА У НЕГО НЕТ — И ЭТО НЕ «ПРИЁМ НЕ НАЙДЕН».
 *
 * БЫЛО, замерено через app.inject на живой PostgreSQL 2026-07-29: три РАЗНЫХ
 * состояния базы получали один и тот же отказ «VisitNotFound / Прием не найден.
 * Обновите рабочий экран и выберите актуальный прием» — приёма нет вовсе, приём
 * подписан, приём чужой клиники. Первое утверждение было правдой, второе — ложью:
 * строка в базе есть, `status = 'signed'`, `signed_at` заполнен (сверено SQL в том
 * же прогоне). Разбор причины — в db/visitsQuery.ts, VisitDraftAutosaveLookup.
 *
 * ЧЕМ ЛОЖЬ ХУЖЕ МОЛЧАНИЯ. Отказ не просто называл неверную причину, он давал
 * невыполнимое действие: «выберите актуальный прием». На демо-клинике все приёмы
 * подписаны, черновиков нет ни одного, и выбрать нечего — обновление рабочего
 * экрана возвращает тот же подписанный приём. Человек за стойкой читает это как
 * «приём потерялся» и идёт искать запись, с которой всё в порядке.
 *
 * Причины две, и действия у них разные, поэтому и текста два: подписанный приём
 * дописывают новым приёмом по записи расписания, аннулированный не дописывают
 * вовсе. Латиницы и двоеточий внутри фразы нет по той же причине, что и в
 * utils/clinicSessionRefusal.ts: клиент гасит текст отказа целиком, если находит в
 * нём латинское слово из шести и более букв.
 */
const visitDraftSignedNoDraftMessage =
	"Черновик приема не открыт: этот прием уже подписан, поэтому черновика у него нет. Запись приема осталась в карте пациента — " +
	"чтобы дописать лечение, откройте новый прием по записи в расписании.";
const visitDraftVoidedNoDraftMessage =
	"Черновик приема не открыт: этот прием аннулирован, поэтому черновика у него нет. Аннулированный прием не дописывают — " +
	"создайте запись в расписании и откройте по ней новый прием.";
const visitDraftAutosaveClosedMessage =
	"Черновик приема не сохранен: этот прием уже недоступен для изменений.";
const visitDraftAcceptClosedMessage =
	"Черновик приема не принят: этот прием уже недоступен для изменений.";
const visitDraftMutationRejectedMessage =
	"Черновик приема не изменен: обновите прием и повторите действие.";

/**
 * Метка «открытого приёма нет», которую сводка главного экрана ставит в
 * `activeVisit.id`, когда в клинике не открыто ни одного приёма
 * (`db/domainStateHydration.ts`, applyActiveVisit — там же разбор, почему её пока
 * нельзя заменить на `null`).
 *
 * ПОЧЕМУ ЭТО ПРОВЕРЯЕТСЯ ЗДЕСЬ, А НЕ ТОЛЬКО В ЧТЕНИИ. Метка — непустая строка, то
 * есть ПРАВДИВАЯ в булевом смысле, и клиентские сторожа вида
 * `if (!dashboard?.activeVisit?.id) return;` её пропускают: замерено на
 * `useVisitLogic.ts` — так поступают и `syncVisitDraftAutosave`, и
 * `acceptDraftToVisit`. Поэтому обе изменяющие ветки уходили на сервер с этой
 * меткой в адресе, база честно не находила строку, и врач получал «Прием не
 * найден. Обновите рабочий экран и выберите актуальный прием» — про приём, который
 * никто не открывал. Обновление рабочего экрана возвращало ту же метку, и выбирать
 * было нечего: в клинике нет ни одного приёма.
 *
 * Отказ обязан назвать это состояние как оно есть, и назвать выполнимое действие —
 * открыть приём по записи расписания (POST /api/appointments/:id/visit, тот самый
 * маршрут выше в этом файле).
 */
const noActiveVisitId = "00000000-0000-0000-0000-000000000000";
const visitDraftAutosaveNoActiveVisitMessage =
	"Черновик приема не сохранен: в клинике сейчас не открыт ни один прием, поэтому записывать некуда. Набранный текст остался на экране — " +
	"откройте прием по записи в расписании и повторите сохранение.";
const visitDraftAcceptNoActiveVisitMessage =
	"Черновик приема не принят: в клинике сейчас не открыт ни один прием, поэтому подписывать нечего. Набранный текст остался на экране — " +
	"откройте прием по записи в расписании и повторите сохранение.";

/**
 * Отказ на метку «открытого приёма нет».
 *
 * Код 409, а не 404: строки с таким идентификатором не существует и существовать
 * не может, значит «не найден» здесь означало бы, что приём когда-то был и
 * потерялся. Состояние другое — действие невозможно в текущем состоянии клиники, и
 * это ровно та же семья, в которой уже стоит отказ закрытого приёма (409
 * `visit_closed`). Машинное поле `error` взято прежнее, чтобы интерфейс, который по
 * нему ветвится, не увидел незнакомого класса.
 */
function sendNoActiveVisitRefusal(
	reply: FastifyReply,
	operation: VisitDraftMutationOperation,
) {
	reply.code(409);
	return {
		error: "VisitDraftMutationRejected",
		reason: "no_active_visit",
		message:
			operation === "accept"
				? visitDraftAcceptNoActiveVisitMessage
				: visitDraftAutosaveNoActiveVisitMessage,
	};
}
/*
 * ЭТОТ ОТВЕТ — ПОСЛЕДНЯЯ ЛИНИЯ, А НЕ РАБОЧИЙ РЕЖИМ. ИСТОРИЯ ВАЖНА.
 *
 * БЫЛО, и это измерено (apps/api/src/tests/routes/chainWeldProof.ts, шаг 9, свой
 * процесс, живая база): POST /api/visits/:id/draft/accept подписывал прием в базе
 * (visits.status становился 'signed'), после чего сборка ответа падала —
 * acceptVisitDraftInDb возвращала {acceptedVisitId, newRevision}, а
 * acceptVisitDraftResponseSchema требует {visit, visitCloseChecklist,
 * saveReceipt}. Разбор не сходился НИКОГДА, и врач на своем главном действии
 * получал ошибку при подписанной карте. До этого было еще хуже: исключение
 * попадало в общий catch и превращалось в 409 «обновите прием и повторите
 * действие», а повтор упирался в «этот прием уже недоступен для изменений».
 *
 * СТАЛО: слой доступа собирает полный ответ сам (db/visitsQuery.ts) — подписанную
 * строку приема из RETURNING, карточку закрытия ЭТОГО приема единственным на
 * проект расчетом (apps/api/src/visitCloseChecklist.ts, приём передается
 * аргументом) и квитанцию по фактически сохраненной ревизии.
 *
 * Текст ниже остается для случая, когда приём подписан, а ответ собрать не
 * удалось (VisitSignedResponseIncompleteError или расхождение с контрактом). На
 * зафиксированную в базе подпись нельзя отвечать «повторите»: он говорит
 * фактическое состояние и единственное полезное действие.
 */
const visitDraftAcceptResponseIncompleteMessage =
	"Прием подписан и сохранен в карте пациента, но рабочий экран не получил карточку закрытия приема. " +
	"Повторно подписывать не нужно: обновите рабочий экран, чтобы увидеть подписанный прием.";

function visitRequestBody(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

/**
 * Разбор тела запроса приёма.
 *
 * ВОЗВРАЩАЕТ РЕЗУЛЬТАТ, А НЕ ОТПРАВЛЯЕТ ОТКАЗ САМ. Прежняя форма звала
 * `reply.code(400).send(...)` внутри и отдавала `null`, а обработчик выходил
 * пустым `return`. Отправка при этом происходила ВНУТРИ транзакции, которую
 * server.ts (хук onRoute) держит открытой вокруг каждого обработчика: ответ
 * уходил до COMMIT. Здесь это ещё безобидно (тело не прошло проверку, писать
 * нечего), но форма одна на весь файл, и держать в нём две разные — значит
 * оставить следующему читателю вопрос, какая правильная.
 */
type VisitPayloadOutcome<T> =
	| { readonly ok: true; readonly data: T }
	| {
			readonly ok: false;
			readonly refusal: { readonly error: string; readonly message: string };
	  };

function parseVisitPayload<T>(
	schema: VisitPayloadSchema<T>,
	value: unknown,
	message: string,
	reply: FastifyReply,
): VisitPayloadOutcome<T> {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		reply.code(400);
		return {
			ok: false,
			refusal: { error: "VisitDraftValidationError", message },
		};
	}
	return { ok: true, data: parsed.data };
}

function visitDraftDomainMessage(error: unknown): string {
	if (!(error instanceof Error)) return "";
	return error.message.trim();
}

/**
 * Экспортируется ради тестов: разбор доменной ошибки в код ответа — это вся
 * логика, которую здесь стоит проверять, а дотянуться до неё через HTTP нельзя.
 * upsertVisitDraftAutosaveInDb импортируется деструктуризацией, подменить его
 * в тесте невозможно, и тесты вместо этого выставляли переменные окружения
 * DENTAL_MOCK_*_ERROR, которых в коде не существует, — ошибка не подставлялась
 * никогда, запрос уходил в живую базу и все ветки отвечали одинаково.
 *
 * ЭТА ФУНКЦИЯ ОСТАЛАСЬ НА `reply.send`, В ОТЛИЧИЕ ОТ ОСТАЛЬНОГО ФАЙЛА, И ЭТО
 * НЕ НЕДОСМОТР. Её поведение закреплено юнит-тестами в
 * apps/api/src/tests/routes/visits.test.ts: тамошняя заглушка ответа снимает
 * тело ИМЕННО из вызова `send()` (`captureReply`), и перевод на возврат
 * значения обрушил бы девять проверок в файле, править который этой задаче
 * запрещено. Дефекта «ответ раньше COMMIT» здесь при этом нет по существу:
 * функция вызывается только из блоков catch, где записи не произошло и
 * транзакции всё равно откатываться. Долг назван, а не замаскирован — вместе с
 * `sendVisitOpenError` ниже, у которой ровно та же причина.
 */
export function sendVisitDraftMutationError(
	error: unknown,
	reply: FastifyReply,
	operation: VisitDraftMutationOperation,
) {
	const message = visitDraftDomainMessage(error);
	if (message === "Визит не найден") {
		return reply.code(404).send({
			error: "VisitNotFound",
			reason: "visit_not_found",
			message: visitDraftNotFoundMessage,
		});
	}
	if (message === "Прием уже закрыт или аннулирован") {
		return reply.code(409).send({
			error: "VisitDraftMutationRejected",
			reason: "visit_closed",
			message:
				operation === "accept"
					? visitDraftAcceptClosedMessage
					: visitDraftAutosaveClosedMessage,
		});
	}
	return reply.code(409).send({
		error: "VisitDraftMutationRejected",
		reason: "visit_draft_rejected",
		message: visitDraftMutationRejectedMessage,
	});
}

import {
	acceptVisitDraftInDb,
	getVisitDraftAutosaveFromDb,
	getVisitsForQualityControlInDb,
	openVisitForAppointmentInDb,
	updateVisitQualityControlStatusInDb,
	upsertVisitDraftAutosaveInDb,
	VisitSignedResponseIncompleteError,
} from "../db/visitsQuery.js";
import { wsBroker } from "../services/websocketBroker.js";

const visitOpenAppointmentNotFoundMessage =
	"Прием не открыт: запись не найдена в этой клинике. Обновите расписание и выберите актуальную строку.";
const visitOpenPatientMissingMessage =
	"Прием не открыт: в записи не указан пациент. Откройте запись в расписании, выберите пациента и повторите.";
const visitOpenAppointmentClosedMessage =
	"Прием не открыт: запись отменена или отмечена как неявка. Создайте новую запись в расписании.";
const visitOpenFailedMessage =
	"Прием не открыт: повторите действие, а если не поможет — обновите рабочий экран.";

/**
 * Отказы открытия приёма — коды и тексты в одном месте.
 *
 * Тексты называют причину И действие: «обновите расписание» без причины
 * заставляло врача у кресла нажимать одно и то же, пока не позовут
 * администратора.
 *
 * ОСТАЁТСЯ НА `reply.send` ПО ТОЙ ЖЕ ПРИЧИНЕ, ЧТО И
 * `sendVisitDraftMutationError` выше: заглушка ответа в
 * apps/api/src/tests/routes/visits.test.ts снимает тело из вызова `send()`.
 * Вызывается только из catch, где записи не было, — отложенного COMMIT на
 * успешной записи здесь возникнуть не может.
 */
export function sendVisitOpenError(error: unknown, reply: FastifyReply) {
	const message = error instanceof Error ? error.message.trim() : "";
	if (message === "Запись не найдена") {
		return reply.code(404).send({
			error: "AppointmentNotFound",
			reason: "appointment_not_found",
			message: visitOpenAppointmentNotFoundMessage,
		});
	}
	if (message === "У записи нет пациента") {
		return reply.code(409).send({
			error: "VisitOpenRejected",
			reason: "appointment_without_patient",
			message: visitOpenPatientMissingMessage,
		});
	}
	if (message === "Запись отменена") {
		return reply.code(409).send({
			error: "VisitOpenRejected",
			reason: "appointment_closed",
			message: visitOpenAppointmentClosedMessage,
		});
	}
	return reply.code(409).send({
		error: "VisitOpenRejected",
		reason: "visit_open_rejected",
		message: visitOpenFailedMessage,
	});
}

export async function registerVisitRoutes(app: FastifyInstance) {
	/**
	 * Открыть приём по записи расписания — недостающее звено цепочки.
	 *
	 * Барьер тот же, что у автосохранения и подписания карты приёма в этом файле,
	 * и теперь он действительно один: токен рабочего кабинета клиники ПЛЮС гейт
	 * клинических изменений. Этот маршрут создаёт строку в `visits`, поэтому он
	 * относится к изменениям, а не к чтению.
	 *
	 * Повторный вызов возвращает тот же приём с `created: false` — см.
	 * db/visitsQuery.ts, почему второй визит по одной записи недопустим.
	 */
	app.post("/api/appointments/:appointmentId/visit", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit open",
		);
		if (!context) return;
		const orgId = context.organizationId;

		const { appointmentId } = request.params as { appointmentId?: string };
		if (!appointmentId) {
			reply.code(400);
			return {
				error: "VisitOpenValidationError",
				message:
					"Прием не открыт: не передана запись расписания. Откройте строку расписания и повторите.",
			};
		}

		try {
			const result = await openVisitForAppointmentInDb(orgId, appointmentId);
			if (result.created) {
				/*
				 * Рассылаем APPOINTMENT_UPDATED, а не новый тип события: клиент
				 * фильтрует сообщения множеством SCHEDULE_EVENTS
				 * (apps/web/src/hooks/useScheduleRealtime.ts), поэтому неизвестный тип
				 * молча отбросился бы. У записи появился открытый приём — расписание
				 * коллеги должно это увидеть, не дожидаясь перезагрузки страницы.
				 */
				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_UPDATED",
					payload: { appointmentId, visitId: result.visit.id },
				});
			}
			reply.code(result.created ? 201 : 200);
			return {
				success: true,
				created: result.created,
				visit: result.visit,
			};
		} catch (error) {
			return sendVisitOpenError(error, reply);
		}
	});

	app.get("/api/visits/:visitId/draft/autosave", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"visit draft read",
		);
		if (!context) return;
		const orgId = context.organizationId;

		const { visitId } = request.params as { visitId: string };
		// Метка «открытого приёма нет» (см. noActiveVisitId): читать черновик не у
		// чего, и это не отказ — пустой ответ 200 без обращения к базе.
		if (!visitId || visitId === noActiveVisitId) {
			return visitDraftAutosaveResponseSchema.parse({ serverDraft: null });
		}
		const lookup = await getVisitDraftAutosaveFromDb(orgId, visitId);
		if (lookup.outcome === "visit_absent") {
			// Единственное состояние, где «приём не найден» — правда: строки с этим
			// идентификатором в этой клинике нет. Чужой приём попадает сюда же, и это
			// сознательно: подтвердить существование приёма другой клиники нельзя.
			reply.code(404);
			return {
				error: "VisitNotFound",
				reason: "visit_not_found",
				message: visitDraftNotFoundMessage,
			};
		}
		if (lookup.outcome === "no_draft") {
			/*
			 * Код остаётся 404: запрошенный ресурс — ЧЕРНОВИК этого приёма, и его
			 * действительно нет. Меняются машинный код и текст, потому что врали именно
			 * они. 200 с `serverDraft: null` здесь не годится: этим ответом маршрут уже
			 * отвечает на «приёма нет вовсе» (нулевая заготовка выше), и слить два
			 * состояния в один ответ значило бы вернуть ту же потерю различия, только с
			 * другой стороны.
			 */
			reply.code(404);
			return {
				error: "VisitDraftAbsent",
				reason: lookup.status === "signed" ? "visit_signed" : "visit_voided",
				visitId: lookup.visitId,
				visitStatus: lookup.status,
				signedAt: lookup.signedAt,
				message:
					lookup.status === "signed"
						? visitDraftSignedNoDraftMessage
						: visitDraftVoidedNoDraftMessage,
			};
		}
		return visitDraftAutosaveResponseSchema.parse({
			serverDraft: lookup.serverDraft,
		});
	});

	app.put("/api/visits/:visitId/draft/autosave", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit draft autosave",
		);
		if (!context) return;
		const orgId = context.organizationId;

		const { visitId } = request.params as { visitId: string };
		// Проверка стоит ДО разбора тела: иначе врач получил бы отказ по форме запроса
		// там, где дело не в форме — приёма нет вовсе.
		if (visitId === noActiveVisitId)
			return sendNoActiveVisitRefusal(reply, "autosave");
		const outcome = parseVisitPayload(
			visitDraftAutosaveRequestSchema,
			{ ...visitRequestBody(request.body), visitId },
			visitDraftAutosaveValidationMessage,
			reply,
		);
		if (!outcome.ok) return outcome.refusal;
		const input = outcome.data;

		try {
			const serverDraft = await upsertVisitDraftAutosaveInDb(orgId, input);
			return visitDraftAutosaveResponseSchema.parse({ serverDraft });
		} catch (error) {
			return sendVisitDraftMutationError(error, reply, "autosave");
		}
	});

	app.post("/api/visits/:visitId/draft/accept", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit draft accept",
		);
		if (!context) return;
		const orgId = context.organizationId;

		const { visitId } = request.params as { visitId: string };
		// Подписание — юридически значимое действие, и подписывать нечего: приём не
		// открыт. Причина названа до разбора тела, чтобы врач не искал ошибку в тексте.
		if (visitId === noActiveVisitId)
			return sendNoActiveVisitRefusal(reply, "accept");
		const outcome = parseVisitPayload(
			acceptVisitDraftSchema,
			{ ...visitRequestBody(request.body), visitId },
			visitDraftAcceptValidationMessage,
			reply,
		);
		if (!outcome.ok) return outcome.refusal;
		const input = outcome.data;

		let result: Awaited<ReturnType<typeof acceptVisitDraftInDb>>;
		try {
			result = await acceptVisitDraftInDb(orgId, input);
		} catch (error) {
			/*
			 * Отказ ПОСЛЕ подписания разбирается отдельно от доменных отказов. Общий
			 * разбор отвечает 409 «обновите прием и повторите действие» — на уже
			 * зафиксированную подпись это ложь, и предложенный повтор невозможен.
			 */
			if (error instanceof VisitSignedResponseIncompleteError) {
				request.log.error(
					{
						visitId: error.acceptedVisitId,
						revision: error.newRevision,
						cause: error.cause,
					},
					"Прием подписан, но слой доступа не собрал ответ по контракту acceptVisitDraftResponseSchema",
				);
				reply.code(500);
				return {
					error: "VisitDraftAcceptResponseIncomplete",
					reason: "visit_signed_response_incomplete",
					visitId: error.acceptedVisitId,
					revision: error.newRevision,
					message: visitDraftAcceptResponseIncompleteMessage,
				};
			}
			return sendVisitDraftMutationError(error, reply, "accept");
		}

		/*
		 * Проверка контракта остается сторожем, хотя слой доступа теперь собирает
		 * ответ полностью: разойдутся контракт и сборка — врач узнает фактическое
		 * состояние приема, а не «повторите действие» на подписанной карте.
		 */
		const response = acceptVisitDraftResponseSchema.safeParse(result);
		if (!response.success) {
			request.log.error(
				{
					visitId: result.visit.id,
					revision: result.visit.revision,
					issues: response.error.issues,
				},
				"Прием подписан, но ответ маршрута не собран по контракту acceptVisitDraftResponseSchema",
			);
			reply.code(500);
			return {
				error: "VisitDraftAcceptResponseIncomplete",
				reason: "visit_signed_response_incomplete",
				visitId: result.visit.id,
				revision: result.visit.revision,
				message: visitDraftAcceptResponseIncompleteMessage,
			};
		}
		return response.data;
	});

	app.get("/api/visits/quality-control", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"visit quality control read",
		);
		if (!context) return;

		const visits = await getVisitsForQualityControlInDb(context.organizationId);
		return { visits };
	});

	app.put("/api/visits/:visitId/quality-control", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit quality control mutate",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		const body = request.body as { status: string };
		if (!body || !body.status) {
			reply.code(400);
			return { error: "ValidationError", message: "Missing status" };
		}

		try {
			const updated = await updateVisitQualityControlStatusInDb(
				context.organizationId,
				visitId,
				body.status,
			);
			return { visit: updated };
		} catch (error) {
			reply.code(404);
			return { error: "NotFound", message: "Visit not found" };
		}
	});
}
