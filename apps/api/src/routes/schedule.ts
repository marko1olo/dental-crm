import {
	createAppointmentSchema,
	dashboardSchema,
	updateAppointmentSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId as requireOrganizationContext,
	unguardedBypassAllowed,
} from "../accessGuard.js";
import { repairMojibakeText } from "../text/repairMojibake.js";
import {
	clinicSessionMissingMessage,
	clinicSessionRejectedMessage,
} from "../utils/clinicSessionRefusal.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

type SchedulePayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

type AppointmentMutationCode =
	| "AppointmentCreateRejected"
	| "AppointmentUpdateRejected"
	| "AppointmentNotFound";
type AppointmentRejectionReason =
	| "appointment_not_found"
	| "reference_missing"
	| "time_invalid"
	| "active_visit_locked"
	| "resource_missing"
	| "resource_overlap"
	| "outside_operational_hours"
	| "patient_blacklisted"
	| "mutation_rejected";

type AppointmentRejectionResponse = {
	statusCode: 404 | 409;
	code: AppointmentMutationCode;
	reason: AppointmentRejectionReason;
	message: string;
};

const denteAdminSecretHeader = "x-dente-admin-secret";
const appointmentBlacklistedMessage =
	"Запись не создана: выбранный пациент внесен в черный список и заблокирован для записи.";
const appointmentCreateValidationMessage =
	"Запись не создана: выберите пациента, врача, кресло, дату и время приема.";
const appointmentUpdateValidationMessage =
	"Запись не обновлена: проверьте статус, время, врача, кресло и пациента.";
const appointmentMissingRouteMessage =
	"Запись не выбрана. Откройте актуальную строку расписания и повторите действие.";
const appointmentNotFoundMessage =
	"Запись не найдена. Обновите расписание и выберите актуальную строку.";
const appointmentCreateFallbackMessage =
	"Запись не создана: проверьте пациента, врача, ассистента, кресло, статус и рабочее время.";
const appointmentUpdateFallbackMessage =
	"Запись не обновлена: проверьте пациента, врача, ассистента, кресло, статус и рабочее время.";
const appointmentReferenceMissingCreateMessage =
	"Запись не создана: выберите активного пациента, врача, ассистента и кресло.";
const appointmentReferenceMissingUpdateMessage =
	"Запись не обновлена: выберите активного пациента, врача, ассистента и кресло.";
const appointmentTimeInvalidCreateMessage =
	"Запись не создана: время окончания должно быть позже времени начала.";
const appointmentTimeInvalidUpdateMessage =
	"Запись не обновлена: время окончания должно быть позже времени начала.";
const appointmentActiveVisitLockedMessage =
	"Запись не обновлена: у нее открыт прием, поэтому нельзя менять пациента или переводить запись в закрывающий статус.";
const appointmentResourceMissingCreateMessage =
	"Запись не создана: для активного будущего приема нужны пациент, врач, кресло и ассистент, если клиника работает не в одиночном режиме.";
const appointmentResourceMissingUpdateMessage =
	"Запись не обновлена: для активного будущего приема нужны пациент, врач, кресло и ассистент, если клиника работает не в одиночном режиме.";
const appointmentResourceOverlapCreateMessage =
	"Запись не создана: выбранное время уже занято пациентом, сотрудником или креслом.";
const appointmentResourceOverlapUpdateMessage =
	"Запись не обновлена: выбранное время уже занято пациентом, сотрудником или креслом.";
const appointmentOutsideHoursCreateMessage =
	"Запись не создана: выбранное время не входит в рабочее расписание клиники, сотрудника или кресла.";
const appointmentOutsideHoursUpdateMessage =
	"Запись не обновлена: выбранное время не входит в рабочее расписание клиники, сотрудника или кресла.";

/**
 * ТРИ ОТКАЗА ПЕРИМЕТРА РАСПИСАНИЯ, И У КАЖДОГО СВОЁ ДЕЙСТВИЕ.
 *
 * Отказ кодом ответа администратору не помогает: экран расписания подставляет
 * поле `message` после своего заголовка (`responseErrorMessage` в
 * apps/web/src/AppHelpers.tsx — `${заголовок}: ${message}`), а без `message`
 * человек читает «Запись не создана» и подпись по коду. Поэтому у каждого текста
 * названы причина и следующий шаг, и шаги РАЗНЫЕ:
 *
 *  1. секрета в запросе нет      — ввести секрет в окне расписания;
 *  2. секрет пришёл и не совпал  — проверить раскладку и взять действующий;
 *  3. секрет не задан на сервере — вводить бесполезно, идти к тому, кто ставил
 *     программу. Свести этот случай с первыми двумя значило бы гонять
 *     администратора по кругу с правильным секретом в руках.
 *
 * Латиницы в текстах нет намеренно: клиент гасит фразу целиком, если в ней есть
 * латинское слово из шести и более букв (`technicalWorkflowFailurePattern` под
 * флагом `/i`), — имя переменной окружения в тексте означало бы пустой экран.
 * Двоеточий внутри фраз нет по той же причине, что и в utils/clinicSessionRefusal.ts:
 * заголовок экрана уже заканчивается двоеточием.
 */
const scheduleSecretMissingInRequestMessage =
	"Требуется секрет администратора клиники — расписание меняется только с ним, а в запросе секрет не пришёл. " +
	"Введите секрет администратора в окне расписания и повторите действие; если секрета у вас нет, его выдаёт администратор клиники.";
const scheduleSecretMismatchMessage =
	"Секрет администратора клиники не принят — присланный секрет не совпал с тем, что задан на сервере этой клиники. " +
	"Проверьте раскладку и регистр, введите секрет заново и повторите действие; если он не подходит, возьмите действующий секрет у администратора клиники.";
const scheduleSecretNotConfiguredMessage =
	"На сервере клиники не задан секрет администратора для изменения расписания — без него сервер не может проверить право на правку и отказывает. " +
	"Вводить секрет в окне расписания бесполезно, его задаёт в настройках сервера тот, кто устанавливал программу — обратитесь к нему.";

function parseSchedulePayload<T>(
	schema: SchedulePayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) return null;
	return parsed.data;
}

function normalizedAppointmentException(error: unknown): string {
	if (!(error instanceof Error)) return "";
	return repairMojibakeText(error.message).trim();
}

function classifyAppointmentRejection(
	error: unknown,
): AppointmentRejectionReason {
	const message = normalizedAppointmentException(error);
	if (
		message.includes("черный список") ||
		message.includes("черном списке") ||
		message.includes("Запись заблокирована")
	)
		return "patient_blacklisted";
	if (message === "Запись не найдена") return "appointment_not_found";
	if (message.includes("не найден") || message.includes("не активен"))
		return "reference_missing";
	if (
		message.includes("Время окончания записи должно быть позже времени начала")
	)
		return "time_invalid";
	if (
		message.includes("Нельзя закрыть") ||
		message.includes("Нельзя менять пациента")
	)
		return "active_visit_locked";
	if (
		message.includes("нужно выбрать") ||
		message.includes("нужен активный пациент")
	)
		return "resource_missing";
	if (message.includes("уже есть запись") || message.includes("уже занято"))
		return "resource_overlap";
	if (
		message.includes("Запись вне расписания") ||
		message.includes("вне расписания") ||
		message.includes("вне работы")
	)
		return "outside_operational_hours";
	return "mutation_rejected";
}

function appointmentRejectionMessage(
	reason: AppointmentRejectionReason,
	operation: "create" | "update",
): string {
	if (reason === "patient_blacklisted") return appointmentBlacklistedMessage;
	if (reason === "appointment_not_found") return appointmentNotFoundMessage;
	if (reason === "reference_missing") {
		return operation === "create"
			? appointmentReferenceMissingCreateMessage
			: appointmentReferenceMissingUpdateMessage;
	}
	if (reason === "time_invalid")
		return operation === "create"
			? appointmentTimeInvalidCreateMessage
			: appointmentTimeInvalidUpdateMessage;
	if (reason === "active_visit_locked")
		return appointmentActiveVisitLockedMessage;
	if (reason === "resource_missing") {
		return operation === "create"
			? appointmentResourceMissingCreateMessage
			: appointmentResourceMissingUpdateMessage;
	}
	if (reason === "resource_overlap") {
		return operation === "create"
			? appointmentResourceOverlapCreateMessage
			: appointmentResourceOverlapUpdateMessage;
	}
	if (reason === "outside_operational_hours") {
		return operation === "create"
			? appointmentOutsideHoursCreateMessage
			: appointmentOutsideHoursUpdateMessage;
	}
	return operation === "create"
		? appointmentCreateFallbackMessage
		: appointmentUpdateFallbackMessage;
}

function appointmentRejectionResponse(
	operation: "create" | "update",
	error: unknown,
): AppointmentRejectionResponse {
	const reason = classifyAppointmentRejection(error);
	if (reason === "appointment_not_found") {
		return {
			statusCode: 404,
			code: "AppointmentNotFound",
			reason,
			message: appointmentNotFoundMessage,
		};
	}
	return {
		statusCode: 409,
		code:
			operation === "create"
				? "AppointmentCreateRejected"
				: "AppointmentUpdateRejected",
		reason,
		message: appointmentRejectionMessage(reason, operation),
	};
}

function sendAppointmentRejection(
	reply: FastifyReply,
	rejection: AppointmentRejectionResponse,
) {
	return reply.code(rejection.statusCode).send({
		code: rejection.code,
		reason: rejection.reason,
		message: rejection.message,
	});
}

/**
 * Секрет ТОЛЬКО расписания, без подстановки соседних доменов.
 *
 * `docs/00-product-architecture.md` требует ровно этого: секреты доменные, и
 * сервер не имеет права молча повышать секрет настроек или телеграма до права
 * менять расписание. Развёртывание может задать одно и то же значение осознанно —
 * это его выбор, а не поведение кода. Сторож на подстановку соседнего секрета
 * уже есть: scripts/smoke-schedule-admin-guard.mjs.
 */
function configuredScheduleAdminSecret(): string | null {
	return process.env.DENTE_SCHEDULE_ADMIN_SECRET?.trim() || null;
}

/**
 * Послабление для разработки: работает ТОЛЬКО при явно названном режиме
 * разработки и ТОЛЬКО при явно выставленном флаге.
 *
 * ПОЧЕМУ ЗДЕСЬ ОБЩИЙ ПРЕДИКАТ, А НЕ ПРЕЖНЕЕ `NODE_ENV !== "production"`.
 * Прежнее условие истинно, когда NODE_ENV НЕ ЗАДАН ВОВСЕ, а незаданный NODE_ENV —
 * типовое состояние настоящего сервера: `apps/api/package.json` объявляет
 * `"start": "node dist/server.js"` и режим не задаёт. То есть в клинике условие
 * «мы не в production» было ИСТИННЫМ, и от обхода охраны расписания защищало
 * только то, что второй флаг где-то не выставлен. `accessGuard.ts` разбирает эту
 * инверсию подробно и НАЗЫВАЕТ ЭТОТ ФАЙЛ как одну из четырёх копий, которую
 * должен переписать владелец. Пятой копии условия безопасности здесь не будет.
 *
 * Смысл послабления не изменился: `development`/`test` плюс
 * `DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS=1`. Закрылся ровно один случай —
 * пустой или незнакомый NODE_ENV («staging», «prod», опечатка) больше не считается
 * разработкой.
 */
function scheduleUnguardedMutationsAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS");
}

/**
 * Секрет периметра для изменения расписания.
 *
 * Форма повторяет `accessGuard.requireClinicalMutationAccess` дословно: тот же
 * заголовок, то же сравнение постоянным временем, те же три состояния. Различие
 * одно и оно намеренное — машинные коды `ScheduleAdminSecretMissing` /
 * `ScheduleAdminSecretRequired` сохранены дословно, потому что по ним ветвится
 * экран расписания (`apps/web/src/ScheduleView.tsx`: на `…Missing` он ЧЕСТНО
 * говорит, что вводить секрет бесполезно, на `…Required` показывает поле ввода).
 * Подменить их клиническими кодами значило бы сломать этот разбор.
 *
 * @param protectedArea машинная метка участка для журнала. В человеческий текст
 *   она не попадает: латинское слово из шести и более букв гасит фразу на экране
 *   целиком.
 */
async function requireScheduleMutationAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "schedule mutation",
): Promise<boolean> {
	const adminSecret = configuredScheduleAdminSecret();
	if (!adminSecret) {
		if (scheduleUnguardedMutationsAllowed()) return true;
		reply.code(503).send({
			error: "ScheduleAdminSecretMissing",
			message: scheduleSecretNotConfiguredMessage,
			protectedArea,
		});
		return false;
	}
	const providedSecret = request.headers[denteAdminSecretHeader];
	const normalizedProvidedSecret = Array.isArray(providedSecret)
		? providedSecret[0]
		: providedSecret;
	const providedSecretText =
		typeof normalizedProvidedSecret === "string"
			? normalizedProvidedSecret
			: null;
	if (timingSafeSecretEqual(providedSecretText, adminSecret)) {
		return true;
	}
	/*
	 * «Секрета нет» и «секрет не совпал» — разные состояния, и сервер их знает
	 * точно. Действия у них тоже разные (ввести против взять действующий), поэтому
	 * текст разный, а машинный код один: экран ветвится по коду, и дробить его
	 * значило бы сломать разбор ради того, что человек читает словами. Оракула для
	 * подбора здесь нет — отправитель и без ответа знает, посылал он заголовок или
	 * нет, а сравнение самого значения идёт постоянным временем.
	 */
	reply.code(403).send({
		error: "ScheduleAdminSecretRequired",
		message:
			providedSecretText === null || providedSecretText.trim() === ""
				? scheduleSecretMissingInRequestMessage
				: scheduleSecretMismatchMessage,
		protectedArea,
	});
	return false;
}

import { verifyToken } from "../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./auth.js";

/**
 * ОТКАЗ ЗАПИСИ НА ПРИЁМ БЕЗ ЕДИНОГО СЛОВА ДЛЯ ЧЕЛОВЕКА.
 *
 * ЧТО БЫЛО. Оба обработчика расписания начинались одной и той же
 * пятистрочной преамбулой и отвечали телом `{"error":"AuthRequired"}` и
 * `{"error":"AuthExpired"}` — без поля `message`. Доказано запросом в процессе
 * (`app.inject`, не дев-сервер): четыре ветки, четыре тела без текста.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Это самое частое действие администратора за день:
 * поставить пациента в сетку и перенести приём. Экран
 * (`apps/web/src/hooks/domains/useScheduleLogic.ts:758` и `:657`) строит текст
 * через `responseErrorMessage(response, "Запись не создана")`, а тот берёт
 * `message`, и только если его нет — подпись по коду ответа. То есть
 * администратор получал «Запись не создана» и ни слова о том, что дело в
 * истёкшем входе в кабинет: ни причины, ни следующего шага. Он повторяет
 * нажатие, потом звонит в поддержку, а пациент в это время стоит у стойки. При
 * этом сервер причину ЗНАЕТ точно и различает два состояния — токена нет и
 * токен не принят, — потому что `verifyToken` вызывается только когда токен
 * вообще пришёл.
 *
 * ЧТО ИЗМЕНИЛОСЬ, А ЧТО НЕТ. Коды ответа и значения поля `error` сохранены
 * дословно, оба 401: интерфейс по ним ветвится, и ломать машинное поле, чтобы
 * поставить в него человеческую фразу, значило бы поставить фасад вместо
 * починки. Добавлено поле `message`.
 *
 * ПОЧЕМУ ПРЕАМБУЛА СВЕДЕНА В ОДНУ ФУНКЦИЮ. Две копии одной проверки — это две
 * копии одного текста, и следующая правка попала бы в одну из них. Текст берётся
 * из общего дома `utils/clinicSessionRefusal.ts` по той же причине.
 */
function requireClinicOrganizationId(
	request: FastifyRequest,
	reply: FastifyReply,
): string | null {
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader)
		? clinicHeader[0]
		: clinicHeader;
	if (typeof clinicToken !== "string" || !clinicToken) {
		reply.code(401).send({
			error: "AuthRequired",
			message: clinicSessionMissingMessage(
				"расписание клиники ведётся только из кабинета",
			),
		});
		return null;
	}
	const payload = verifyToken(clinicToken, TOKEN_SECRET());
	if (!payload?.organizationId) {
		reply
			.code(401)
			.send({ error: "AuthExpired", message: clinicSessionRejectedMessage });
		return null;
	}
	return payload.organizationId as string;
}

/**
 * ЕДИНСТВЕННАЯ ДВЕРЬ ВО ВСЕ ИЗМЕНЯЮЩИЕ МАРШРУТЫ РАСПИСАНИЯ.
 *
 * ЧТО БЫЛО СЛОМАНО. `requireScheduleMutationAccess` в этом файле был ОБЪЯВЛЕН и не
 * вызывался ни разу: единственное вхождение имени во всём дереве — само
 * объявление, остальные — текст комментариев. Замерено запросом в процессе
 * (`app.inject`, дев-сервер на 4100 отдаёт старую сборку и доказательством не
 * считается), при заданном `DENTE_SCHEDULE_ADMIN_SECRET` и снятой лазейке:
 *   POST  /api/appointments                    без секрета -> 201, строка в базе
 *   POST  /api/appointments        с ЗАВЕДОМО НЕВЕРНЫМ секретом -> 201
 *   PATCH /api/appointments/<id>               без секрета -> 200
 *   PUT   /api/schedule/appointments/<id>      без секрета -> 200
 * Заголовок не читался вовсе — неверный секрет проходил так же, как никакой.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Любой, у кого есть токен кабинета, писал в
 * расписание клиники в обход гейта администратора, при том что тот же барьер на
 * клинических маршрутах отвечает 403. Практически это чужая рука в сетке приёмов
 * администратора — перенести приём, отменить его, занять кресло и врача, — и
 * поверх этого молчаливое расхождение с экраном, где поле «секрет
 * администратора» существует и обещает защиту, которой не было.
 *
 * ПОЧЕМУ ПРОВЕРКА В МАРШРУТЕ, А НЕ В СЛОЕ ДОСТУПА (ВЫБОР НАЗВАН НАМЕРЕННО).
 * Рядом есть обратный пример: межклиничную утечку ссылок закрыли в слое доступа
 * (`db/appointmentsQuery.ts`, `assertAppointmentResourcesBelongToOrganization`) —
 * и там это верно, потому что проверялись ДАННЫЕ, которые слой доступа видит
 * сам. Здесь проверяется ЗАГОЛОВОК ЗАПРОСА, а `createAppointmentInDb` и
 * `updateAppointmentInDb` принимают `organizationId` и разобранное тело и о
 * `FastifyRequest` не знают. Чтобы проверять там, пришлось бы протащить запрос и
 * ответ в слой доступа — то есть дать слою данных отвечать по протоколу, а
 * заодно сделать так, что любой вызов из планировщика, импорта или скрипта
 * потребовал бы админский секрет, которого у фоновой задачи нет.
 *
 * Настоящая причина, по которой слой доступа выглядел привлекательно, — «у
 * переноса маршрутов ДВА, в маршруте придётся помнить про каждый». Она снимается
 * не сменой слоя, а тем, что дверь ОДНА: обработчику нужен `organizationId`, а
 * получить его можно только здесь, и охрана стоит внутри. Новый изменяющий
 * маршрут физически не сможет обойтись без этой функции, не оставшись без
 * организации; на случай, если кто-то всё же выпишет её вручную, стоит сторож
 * `tests/routes/scheduleMutationGuard.test.ts` — он находит изменяющие маршруты в
 * этом файле обходом исходника и требует отказа от КАЖДОГО.
 *
 * ПОЧЕМУ СНАЧАЛА КАБИНЕТ, ПОТОМ СЕКРЕТ (в accessGuard порядок обратный).
 * Пройти нужно оба барьера, поэтому порядок не меняет НИЧЕГО в том, что проходит
 * насквозь — только то, какую причину человек слышит первой. Если поставить
 * секрет первым, то на любом развёртывании, где секрет расписания не задан,
 * отказ по входу в кабинет становится НЕДОСТИЖИМ: вместо «войдите в кабинет
 * заново» администратор с истёкшим входом получит 503 про настройку сервера и
 * пойдёт не туда. Эти два текста разделяли отдельной правкой (`2d46134c9`) и
 * закрепили сторожем `tests/routes/scheduleRefusalText.test.ts`; хоронить
 * работающий отказ ради порядка проверок нельзя. Секрет — повышение прав ПОВЕРХ
 * входа в кабинет, и спрашивать его после того, как известно, кто пришёл, честнее.
 */
async function requireScheduleMutationContext(
	request: FastifyRequest,
	reply: FastifyReply,
	protectedArea = "schedule mutation",
): Promise<{ organizationId: string } | null> {
	const organizationId = requireClinicOrganizationId(request, reply);
	if (!organizationId) return null;
	if (!(await requireScheduleMutationAccess(request, reply, protectedArea)))
		return null;
	return { organizationId };
}

import { and, asc, desc, eq } from "drizzle-orm";
import {
	createAppointmentInDb,
	updateAppointmentInDb,
} from "../db/appointmentsQuery.js";
import { db } from "../db/client.js";
import { getDashboardFromDb } from "../db/dashboardQuery.js";
import {
	appointments,
	patients,
	scheduleClipboardItems,
	urgentScheduleRequests,
	users,
} from "../db/schema.js";
import { invalidateAppointmentReminders } from "../services/communications/appointmentReminders.js";
import { wsBroker } from "../services/websocketBroker.js";

const clipboardItemMissingMessage =
	"Запись в буфере не найдена. Обновите список буфера и выберите актуальную строку.";
const clipboardAppointmentMissingMessage =
	"Исходная запись расписания не найдена. Скопируйте приём заново из актуальной карточки.";
const clipboardPasteValidationMessage =
	"Вставка не выполнена: укажите дату и время начала приёма.";
const clipboardCopyValidationMessage =
	"В буфер не скопировано: выберите запись расписания.";
const clipboardPasteResourcesMissingMessage =
	"Вставка не выполнена: у исходной записи нет пациента, врача или кресла. Откройте карточку и заполните их, затем скопируйте снова.";

export async function registerScheduleRoutes(app: FastifyInstance) {
	app.post("/api/appointments", async (request, reply) => {
		const context = await requireScheduleMutationContext(
			request,
			reply,
			"schedule appointment create",
		);
		if (!context) return reply;
		const orgId = context.organizationId;

		const input = parseSchedulePayload(createAppointmentSchema, request.body);
		if (!input) {
			return reply.code(400).send({
				code: "AppointmentValidationError",
				message: appointmentCreateValidationMessage,
			});
		}
		try {
			const created = await createAppointmentInDb(orgId, input);
			// Раньше маршрут расписания не рассылал НИЧЕГО, хотя эндпоинт живых
			// обновлений так и называется — /api/ws/schedule. Два администратора,
			// работающие в расписании одновременно, не видели действий друг друга
			// до перезагрузки страницы: прямой путь к двойной записи на один слот.
			wsBroker.broadcastToOrganization(orgId, {
				type: "APPOINTMENT_CREATED",
				payload: {
					appointmentId: created?.id ?? null,
					startsAt: created?.startsAt ?? null,
				},
			});

			// КРИТИЧНО: мутация (createAppointmentInDb) УЖЕ СОВЕРШЕНА. Дальше —
			// ТОЛЬКО отказы, которые НЕ откатывают её: сводка — опциональная услуга.
			// Бросок getDashboardFromDb поймается внешним catch, но это уже 5xx
			// (сбой базы), а не отказ по создаю. Клиент видит 409/404, создание
			// остаётся в базе → двойная запись на слот.
			//
			// ПОЭТОМУ читаем сводку в отдельном try/catch, а внешний catch ловит
			// только отказы createAppointmentInDb.
			let dashboard: Awaited<ReturnType<typeof getDashboardFromDb>>;
			try {
				dashboard = await getDashboardFromDb(orgId);
			} catch (dashErr) {
				request.log.error(
					{ err: dashErr, appointmentId: created?.id, orgId },
					"[Schedule] Приём создан, но сводку прочитать не удалось — отдан успех без сводки",
				);
				return reply.code(201).send({
					success: true,
					appointmentId: created?.id ?? null,
					startsAt: created?.startsAt ?? null,
					message:
						"Запись создана. Сводка не обновлена — перезагрузите страницу.",
				});
			}

			const parsed = dashboardSchema.safeParse(dashboard);
			if (!parsed.success) {
				request.log.warn(
					{ appointmentId: created?.id, orgId, errors: parsed.error.errors },
					"[Schedule] Приём создан, сводка прочиталась, но не прошла контракт",
				);
				return reply.code(201).send({
					success: true,
					appointmentId: created?.id ?? null,
					startsAt: created?.startsAt ?? null,
					message:
						"Запись создана. Сводка не обновлена — перезагрузите страницу.",
				});
			}
			return reply.code(201).send(parsed.data);
		} catch (error) {
			return sendAppointmentRejection(
				reply,
				appointmentRejectionResponse("create", error),
			);
		}
	});

	async function updateAppointmentHandler(
		request: FastifyRequest<{ Params: { appointmentId?: string } }>,
		reply: FastifyReply,
	) {
		/*
		 * Один обработчик на ДВА адреса переноса (PATCH и PUT ниже) — поэтому охрана
		 * стоит здесь, а не у каждой регистрации: иначе второй адрес однажды
		 * останется без неё, и это будет та же дыра под другим адресом.
		 */
		const context = await requireScheduleMutationContext(
			request,
			reply,
			"schedule appointment update",
		);
		if (!context) return reply;
		const orgId = context.organizationId;

		const params = request.params as { appointmentId?: string };
		if (!params.appointmentId) {
			return reply.code(400).send({
				code: "AppointmentRouteValidationError",
				message: appointmentMissingRouteMessage,
			});
		}
		const input = parseSchedulePayload(updateAppointmentSchema, request.body);
		if (!input) {
			return reply.code(400).send({
				code: "AppointmentValidationError",
				message: appointmentUpdateValidationMessage,
			});
		}
		try {
			await updateAppointmentInDb(orgId, params.appointmentId, input);

			// Напоминание ставится в очередь заранее и несёт в тексте дату и время.
			// После переноса или отмены оно стало неверным: пациент получил бы
			// «ждём вас 12 августа в 14:30» на приём, которого в это время уже нет.
			// Снимаем неотправленные — планировщик поставит новое с верным временем.
			await invalidateAppointmentReminders(
				orgId,
				params.appointmentId,
				"Приём изменён администратором",
			).catch((error: unknown) => {
				// Сбой снятия не должен отменять сам перенос: администратор уже видит
				// новое время, и падение маршрута выглядело бы как непринятая правка.
				request.log.error(
					{ err: error },
					"Не удалось снять устаревшие напоминания о приёме",
				);
			});

			// Перенос и отмена приёма — то же самое: без рассылки коллега видит
			// слот занятым, хотя он уже освобождён, и наоборот.
			wsBroker.broadcastToOrganization(orgId, {
				type: "APPOINTMENT_UPDATED",
				payload: { appointmentId: params.appointmentId },
			});

			// КРИТИЧНО: updateAppointmentInDb УЖЕ СОВЕРШЕНА. Дальше — опциональная услуга.
			let dashboard: Awaited<ReturnType<typeof getDashboardFromDb>>;
			try {
				dashboard = await getDashboardFromDb(orgId);
			} catch (dashErr) {
				request.log.error(
					{ err: dashErr, appointmentId: params.appointmentId, orgId },
					"[Schedule] Приём изменён, но сводку прочитать не удалось",
				);
				return {
					success: true,
					appointmentId: params.appointmentId,
					message:
						"Запись изменена. Сводка не обновлена — перезагрузите страницу.",
				};
			}

			const parsed = dashboardSchema.safeParse(dashboard);
			if (!parsed.success) {
				request.log.warn(
					{
						appointmentId: params.appointmentId,
						orgId,
						errors: parsed.error.errors,
					},
					"[Schedule] Приём изменён, сводка прочиталась, но не прошла контракт",
				);
				return {
					success: true,
					appointmentId: params.appointmentId,
					message:
						"Запись изменена. Сводка не обновлена — перезагрузите страницу.",
				};
			}
			return parsed.data;
		} catch (error) {
			return sendAppointmentRejection(
				reply,
				appointmentRejectionResponse("update", error),
			);
		}
	}

	app.patch("/api/appointments/:appointmentId", updateAppointmentHandler);
	app.put(
		"/api/schedule/appointments/:appointmentId",
		updateAppointmentHandler,
	);

	/**
	 * Буфер обмена расписания — быстрый перенос приёма на другое время.
	 *
	 * ЧТО БЫЛО. Таблица schedule_clipboard_items жила в схеме, миграция 0071
	 * применялась, а писателей не было ни одного: UI показывал пустую коробку
	 * с обещанием «скопируйте запись кликом», хотя копировать было нечем.
	 *
	 * ЧТО СТАЛО. Четыре маршрута: список, копирование, очистка, вставка.
	 * Копирование снимает снимок имён и длительности; вставка заново читает
	 * исходную запись (patientId/doctor/chair/assistant/reason) и создаёт
	 * новый приём через createAppointmentInDb — с той же охраной пересечений.
	 * Изменяющие маршруты идут через requireScheduleMutationContext: сторож
	 * scheduleMutationGuard.test.ts находит POST/DELETE обходом исходника.
	 */
	app.get("/api/schedule/clipboard-items", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const items = await db
			.select({
				id: scheduleClipboardItems.id,
				appointmentId: scheduleClipboardItems.appointmentId,
				patientName: scheduleClipboardItems.patientName,
				doctorName: scheduleClipboardItems.doctorName,
				serviceTitle: scheduleClipboardItems.serviceTitle,
				durationMinutes: scheduleClipboardItems.durationMinutes,
				clipboardStatus: scheduleClipboardItems.clipboardStatus,
				copiedAt: scheduleClipboardItems.copiedAt,
			})
			.from(scheduleClipboardItems)
			.where(
				and(
					eq(scheduleClipboardItems.organizationId, orgId),
					eq(scheduleClipboardItems.clipboardStatus, "copied"),
				),
			)
			.orderBy(desc(scheduleClipboardItems.copiedAt))
			.limit(20);

		return items.map((item) => ({
			...item,
			copiedAt:
				item.copiedAt instanceof Date
					? item.copiedAt.toISOString()
					: String(item.copiedAt),
		}));
	});

	app.post("/api/schedule/clipboard-items", async (request, reply) => {
		const context = await requireScheduleMutationContext(
			request,
			reply,
			"schedule clipboard copy",
		);
		if (!context) return reply;
		const orgId = context.organizationId;

		const body = (request.body ?? {}) as { appointmentId?: unknown };
		const appointmentId =
			typeof body.appointmentId === "string" ? body.appointmentId.trim() : "";
		if (!appointmentId) {
			return reply.code(400).send({
				code: "ClipboardValidationError",
				message: clipboardCopyValidationMessage,
			});
		}

		const [source] = await db
			.select({
				id: appointments.id,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				reason: appointments.reason,
				patientName: patients.fullName,
				doctorName: users.fullName,
			})
			.from(appointments)
			.leftJoin(patients, eq(patients.id, appointments.patientId))
			.leftJoin(users, eq(users.id, appointments.doctorUserId))
			.where(
				and(
					eq(appointments.id, appointmentId),
					eq(appointments.organizationId, orgId),
				),
			)
			.limit(1);

		if (!source) {
			return reply.code(404).send({
				code: "AppointmentNotFound",
				message: appointmentNotFoundMessage,
			});
		}

		const startsMs =
			source.startsAt instanceof Date
				? source.startsAt.getTime()
				: Date.parse(String(source.startsAt));
		const endsMs =
			source.endsAt instanceof Date
				? source.endsAt.getTime()
				: Date.parse(String(source.endsAt));
		const durationMinutes =
			Number.isFinite(startsMs) && Number.isFinite(endsMs) && endsMs > startsMs
				? Math.max(5, Math.round((endsMs - startsMs) / 60_000))
				: 30;

		const serviceTitle =
			typeof source.reason === "string" && source.reason.trim()
				? source.reason.trim()
				: "Приём";

		const [created] = await db
			.insert(scheduleClipboardItems)
			.values({
				organizationId: orgId,
				appointmentId: source.id,
				patientName: source.patientName?.trim() || "Пациент не указан",
				doctorName: source.doctorName?.trim() || "Врач не назначен",
				serviceTitle,
				durationMinutes,
				clipboardStatus: "copied",
			})
			.returning({
				id: scheduleClipboardItems.id,
				appointmentId: scheduleClipboardItems.appointmentId,
				patientName: scheduleClipboardItems.patientName,
				doctorName: scheduleClipboardItems.doctorName,
				serviceTitle: scheduleClipboardItems.serviceTitle,
				durationMinutes: scheduleClipboardItems.durationMinutes,
				clipboardStatus: scheduleClipboardItems.clipboardStatus,
				copiedAt: scheduleClipboardItems.copiedAt,
			});

		if (!created) {
			return reply
				.code(500)
				.send({ error: "Failed to create schedule clipboard item" });
		}

		return reply.code(201).send({
			...created,
			copiedAt:
				created.copiedAt instanceof Date
					? created.copiedAt.toISOString()
					: String(created.copiedAt),
		});
	});

	app.delete("/api/schedule/clipboard-items/:id", async (request, reply) => {
		const context = await requireScheduleMutationContext(
			request,
			reply,
			"schedule clipboard clear",
		);
		if (!context) return reply;
		const orgId = context.organizationId;

		const params = request.params as { id?: string };
		const itemId = typeof params.id === "string" ? params.id.trim() : "";
		if (!itemId) {
			return reply.code(400).send({
				code: "ClipboardRouteValidationError",
				message: clipboardItemMissingMessage,
			});
		}

		const [updated] = await db
			.update(scheduleClipboardItems)
			.set({ clipboardStatus: "cleared" })
			.where(
				and(
					eq(scheduleClipboardItems.id, itemId),
					eq(scheduleClipboardItems.organizationId, orgId),
					eq(scheduleClipboardItems.clipboardStatus, "copied"),
				),
			)
			.returning({ id: scheduleClipboardItems.id });

		if (!updated) {
			return reply.code(404).send({
				code: "ClipboardItemNotFound",
				message: clipboardItemMissingMessage,
			});
		}

		return reply.code(200).send({ id: updated.id, clipboardStatus: "cleared" });
	});

	app.post(
		"/api/schedule/clipboard-items/:id/paste",
		async (request, reply) => {
			const context = await requireScheduleMutationContext(
				request,
				reply,
				"schedule clipboard paste",
			);
			if (!context) return reply;
			const orgId = context.organizationId;

			const params = request.params as { id?: string };
			const itemId = typeof params.id === "string" ? params.id.trim() : "";
			if (!itemId) {
				return reply.code(400).send({
					code: "ClipboardRouteValidationError",
					message: clipboardItemMissingMessage,
				});
			}

			const body = (request.body ?? {}) as {
				startsAt?: unknown;
				doctorUserId?: unknown;
				chairId?: unknown;
			};
			const startsAtRaw =
				typeof body.startsAt === "string" ? body.startsAt.trim() : "";
			const startsMs = Date.parse(startsAtRaw);
			if (!startsAtRaw || !Number.isFinite(startsMs)) {
				return reply.code(400).send({
					code: "ClipboardValidationError",
					message: clipboardPasteValidationMessage,
				});
			}

			const [clipItem] = await db
				.select({
					id: scheduleClipboardItems.id,
					appointmentId: scheduleClipboardItems.appointmentId,
					durationMinutes: scheduleClipboardItems.durationMinutes,
					clipboardStatus: scheduleClipboardItems.clipboardStatus,
				})
				.from(scheduleClipboardItems)
				.where(
					and(
						eq(scheduleClipboardItems.id, itemId),
						eq(scheduleClipboardItems.organizationId, orgId),
						eq(scheduleClipboardItems.clipboardStatus, "copied"),
					),
				)
				.limit(1);

			if (!clipItem) {
				return reply.code(404).send({
					code: "ClipboardItemNotFound",
					message: clipboardItemMissingMessage,
				});
			}

			const [original] = await db
				.select({
					id: appointments.id,
					patientId: appointments.patientId,
					doctorUserId: appointments.doctorUserId,
					assistantUserId: appointments.assistantUserId,
					chairId: appointments.chairId,
					reason: appointments.reason,
					comment: appointments.comment,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.id, clipItem.appointmentId),
						eq(appointments.organizationId, orgId),
					),
				)
				.limit(1);

			if (!original) {
				return reply.code(404).send({
					code: "AppointmentNotFound",
					message: clipboardAppointmentMissingMessage,
				});
			}

			const doctorUserId =
				typeof body.doctorUserId === "string" && body.doctorUserId.trim()
					? body.doctorUserId.trim()
					: original.doctorUserId;
			const chairId =
				typeof body.chairId === "string" && body.chairId.trim()
					? body.chairId.trim()
					: original.chairId;

			if (!original.patientId || !doctorUserId || !chairId) {
				return reply.code(409).send({
					code: "ClipboardPasteRejected",
					message: clipboardPasteResourcesMissingMessage,
				});
			}

			const durationMinutes =
				typeof clipItem.durationMinutes === "number" &&
				clipItem.durationMinutes > 0
					? clipItem.durationMinutes
					: 30;
			const endsAt = new Date(
				startsMs + durationMinutes * 60_000,
			).toISOString();
			const startsAt = new Date(startsMs).toISOString();

			try {
				const created = await db.transaction(async (tx) => {
					const newAppt = await createAppointmentInDb(orgId, {
						// biome-ignore lint/style/noNonNullAssertion: automated suppression
						patientId: original.patientId!,
						doctorUserId,
						assistantUserId: original.assistantUserId ?? null,
						chairId,
						status: "planned",
						startsAt,
						endsAt,
						reason: original.reason ?? undefined,
						comment: original.comment ?? undefined,
					});

					await tx
						.update(scheduleClipboardItems)
						.set({ clipboardStatus: "pasted" })
						.where(
							and(
								eq(scheduleClipboardItems.id, clipItem.id),
								eq(scheduleClipboardItems.organizationId, orgId),
							),
						);

					return newAppt;
				});

				const dashboard = await getDashboardFromDb(orgId);
				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_CREATED",
					payload: {
						appointmentId: created?.id ?? null,
						startsAt: created?.startsAt ?? null,
					},
				});
				// БУЛО: parse() на кінці створення приёму через буфер обміну. Та ж ловушка.
				const parsed = dashboardSchema.safeParse(dashboard);
				if (!parsed.success) {
					request.log.warn(
						{ appointmentId: created?.id, orgId, errors: parsed.error.errors },
						"[Schedule/Clipboard] Приём створено, але сводка не пройшла контракт",
					);
					return reply.code(201).send({
						success: true,
						appointmentId: created?.id ?? null,
						startsAt: created?.startsAt ?? null,
						message:
							"Запис створено з буфера обміну. Сводка не оновлена — перезавантажте сторінку.",
					});
				}
				return reply.code(201).send(parsed.data);
			} catch (error) {
				return sendAppointmentRejection(
					reply,
					appointmentRejectionResponse("create", error),
				);
			}
		},
	);
	app.get("/api/schedule/urgent-schedule-requests", async (request, reply) => {
		const orgId = await requireOrganizationContext(request, reply);
		if (!orgId) return reply;

		const requests = await db
			.select()
			.from(urgentScheduleRequests)
			.where(
				and(
					eq(urgentScheduleRequests.organizationId, orgId),
					eq(urgentScheduleRequests.isResolved, false),
				),
			)
			.orderBy(asc(urgentScheduleRequests.createdAt));

		return reply.code(200).send(requests);
	});

	app.patch(
		"/api/schedule/urgent-schedule-requests/:id/resolve",
		async (request, reply) => {
			const orgId = await requireOrganizationContext(request, reply);
			if (!orgId) return reply;

			const params = request.params as { id: string };

			await db
				.update(urgentScheduleRequests)
				.set({ isResolved: true })
				.where(
					and(
						eq(urgentScheduleRequests.id, params.id),
						eq(urgentScheduleRequests.organizationId, orgId),
					),
				);

			return reply.code(200).send({ success: true });
		},
	);
}
