/**
 * ПОЧЕМУ ЗДЕСЬ НЕ ОБЩИЕ ХЕЛПЕРЫ ИЗ accessGuard.ts.
 *
 * Отсюда были удалены импорты requireClinicalMutationAccess и
 * requireClinicalReadAccess: они не вызывались ни в одном обработчике, а по
 * строке импорта файл выглядел защищённым общим гейтом. Каждый обработчик ниже
 * проверяет подпись токена кабинета сам и берёт организацию ТОЛЬКО из
 * проверенной подписью полезной нагрузки.
 *
 * Свести это на общий путь нельзя, пока не закрыты два расхождения:
 *
 * 1. security/identity.ts:112-115 (unverifiedOrganizationUsable) для любого
 *    нечитающего метода возвращает true, поэтому requireOrganizationId на GET
 *    отдаёт организацию, названную самим клиентом в заголовке x-organization-id
 *    (identity.ts:174-180), если включён DENTE_DEV_ALLOW_HEADER_ORG=1. Запись
 *    этой дырой уже закрыта, чтение — нет. Здесь три GET-обработчика, и они
 *    отдают картотеку, историю звонков и переписки, запрет записи. Токен-only
 *    проверка ниже такой заголовок не принимает ни при какой переменной среды.
 *
 * 2. requireClinicalReadAccess/requireClinicalMutationAccess (accessGuard.ts:26,
 *    accessGuard.ts:56) — это гейт секрета администратора клиники
 *    (x-dente-admin-secret), а не гейт арендатора. Пока DENTE_CLINICAL_ADMIN_SECRET
 *    не задан, они пропускают всех; как только он задан, они отвечают 403. Ни один
 *    вызов карточки пациента этот заголовок не присылает: AppHelpers.tsx:6143-6156
 *    добавляет его только когда adminSecret передан явно, а все вызовы к
 *    /api/patients/** передают лишь токен кабинета. То есть переход на общий гейт
 *    отдал бы 403 на весь раздел «Пациенты» в первой же установке с секретом.
 *
 * Чинить нужно общий путь, а не эти обработчики: строгий код сносить нельзя.
 */

import {
	createPatientSchema,
	patientSchema,
	updatePatientAdministrativeProfileSchema,
	updatePatientSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

type PatientPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

const patientCreateValidationMessage =
	"Пациент не создан: заполните ФИО, дату рождения, контакты и обязательные поля карты.";
const patientUpdateValidationMessage =
	"Пациент не обновлен: проверьте ФИО, дату рождения, контакты и обязательные поля карты.";
const patientAdministrativeValidationMessage =
	"Административный профиль не сохранен: проверьте документы, согласия, страховку и данные представителя.";
const patientRepresentativeValidationMessage =
	"Данные представителя не сохранены: если указаны телефон, документ или получатель представителя, заполните ФИО и основание представительства.";
const patientMissingRouteMessage =
	"Пациент не выбран. Откройте актуальную карту пациента и повторите действие.";
const patientNotFoundMessage =
	"Пациент не найден. Обновите список пациентов и выберите актуальную карту.";
const patientDuplicateMessage =
	"Похожая карта пациента уже есть. Найдите пациента по ФИО или телефону и обновите существующую карточку.";
/**
 * Отказ для случая «заводят по одному ФИО, а карта с таким ФИО уже есть».
 * Текст обязан назвать и причину, и выход: иначе полного тёзку — а они в
 * картотеке настоящие — завести станет нельзя вовсе, и регистратор начнёт
 * дописывать к фамилии «2», что и есть дубль под другим именем.
 */
const patientNameOnlyDuplicateMessage =
	"Карта с таким ФИО уже есть в этой клинике. Откройте её вместо создания второй: приёмы, оплаты, снимки и документы одного человека должны лежать в одной карте, иначе справка для налогового вычета посчитается по половине платежей. Если это другой человек, добавьте телефон или дату рождения — с ними карта создастся.";

/**
 * Идентификатор карты пациента в адресе. Колонки patients.id и
 * communication_events.patient_id объявлены как uuid, поэтому строка вида
 * "undefined" или "null" — а интерфейс такие подставлял, когда пациент ещё не
 * выбран — доходит до PostgreSQL и возвращается ошибкой разбора типа. Оператор
 * видел «сбой чтения» там, где на самом деле не выбрана карта.
 */
const PATIENT_ID_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Тела рекламаций / задач / чёрного списка раньше читались bare cast'ом
 * `request.body as { … } | null | undefined`. Null body не ронял (optional chaining),
 * но цель кампании — единый Zod-gate: не-object / wrong-type → 400 с прежними RU
 * текстами, AUTH (requireClinicOrganizationId) остаётся первым.
 */
const patientReclamationCreateBodySchema = z.object({
	complicationDetails: z.unknown().optional(),
	proposedAction: z.unknown().optional(),
	doctorId: z.unknown().optional(),
});

const patientReclamationStatusBodySchema = z.object({
	status: z.unknown().optional(),
});

const patientTaskTicketCreateBodySchema = z.object({
	title: z.unknown().optional(),
	description: z.unknown().optional(),
	assignedToId: z.unknown().optional(),
	priority: z.unknown().optional(),
});

const patientTaskTicketStatusBodySchema = z.object({
	status: z.unknown().optional(),
});

const patientArchiveStatusBodySchema = z.object({
	isBlacklisted: z.unknown().optional(),
});

const patientArchiveBodySchema = z.object({
	archiveReason: z.string().min(1, "Укажите причину архивации"),
	isBlacklisted: z.boolean().default(false),
	blacklistReason: z.string().optional(),
});

type PatientDuplicateInput = {
	birthDate?: string | null | undefined;
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
};

type PatientRepresentativeInput = {
	legalRepresentativeFullName?: string | null | undefined;
	legalRepresentativeIdentityDocument?: string | null | undefined;
	legalRepresentativePhone?: string | null | undefined;
	legalRepresentativeRelationship?: string | null | undefined;
	preferredDocumentRecipient?: string | null | undefined;
};

function parsePatientPayload<T>(
	schema: PatientPayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) return null;
	return parsed.data;
}

function sendPatientRouteValidationError(reply: FastifyReply) {
	return reply.code(400).send({
		error: "PatientRouteValidationError",
		message: patientMissingRouteMessage,
	});
}

function sendPatientNotFound(reply: FastifyReply) {
	return reply.code(404).send({
		error: "PatientNotFound",
		message: patientNotFoundMessage,
	});
}

function normalizePatientNameForDuplicate(
	value: string | null | undefined,
): string {
	return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function normalizePatientPhoneForDuplicate(
	value: string | null | undefined,
): string {
	const digits = (value ?? "").replace(/\D/g, "");
	return digits.length >= 5 ? digits : "";
}

/**
 * ЗАПРЕТ ДУБЛЕЙ ВЫКЛЮЧАЛСЯ САМ, КОГДА ОН НУЖЕН БОЛЬШЕ ВСЕГО.
 *
 * Предикат ниже требовал совпадения имени И (даты рождения ИЛИ телефона).
 * Но карточку в картотеке заводят одним ФИО: поля телефона и даты рождения в
 * шапке экрана скрыты (`display: none`, apps/web/src/PatientsView.tsx), и в
 * запрос уходят `phone: null`, `birthDate: null` — createPatientSchema обоих
 * пускает как `.nullable().optional()`. Тогда `sameBirthDate = false` и
 * `samePhone = false`, значит `false || false = false`: сравнивать было нечем,
 * и сервер отвечал 201 Created на вторую карту того же человека.
 *
 * Цена ровно эта: регистратор, попавший в поле создания вместо поля поиска,
 * получает второго «того же» пациента без предупреждения. Дальше приёмы,
 * оплаты, снимки и документы расходятся по двум картам, а справка для
 * налогового вычета считается по половине платежей.
 *
 * `requireDistinguishingData` включается ТОЛЬКО на создании (POST). На
 * обновлении (PUT) его включать нельзя: у карты, где ни телефона, ни даты
 * рождения нет, а в клинике есть тёзка, стало бы невозможно сохранить даже
 * заметку — сервер отвечал бы 409 на собственные же данные.
 *
 * Полные тёзки остаются заводимыми: как только в запросе есть телефон ИЛИ дата
 * рождения, работает прежнее правило, и человек с другим номером или другой
 * датой рождения проходит. Это то же разделение, что закреплено в
 * src/tests/routes/patientDuplicates.test.ts: «полные тёзки с разными датами
 * рождения — разные люди».
 */
type PatientDuplicateOptions = {
	requireDistinguishingData?: boolean;
};

function findPatientDuplicate(
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	patientsList: any[],
	input: PatientDuplicateInput,
	ignoredPatientId?: string,
	options: PatientDuplicateOptions = {},
) {
	const inputName = normalizePatientNameForDuplicate(input.fullName);
	const inputBirthDate = (input.birthDate ?? "").trim();
	const inputPhone = normalizePatientPhoneForDuplicate(input.phone);
	if (!inputName && !inputBirthDate && !inputPhone) return null;

	// Отличить нового человека от уже заведённого нечем: в запросе только имя.
	const nothingToDistinguishBy = !inputBirthDate && !inputPhone;
	const nameAloneIsDuplicate =
		options.requireDistinguishingData === true && nothingToDistinguishBy;

	return (
		patientsList.find((patient) => {
			if (patient.id === ignoredPatientId || patient.status !== "active")
				return false;
			const sameName =
				Boolean(inputName) &&
				inputName === normalizePatientNameForDuplicate(patient.fullName);
			const sameBirthDate =
				Boolean(inputBirthDate) && inputBirthDate === (patient.birthDate ?? "");
			const samePhone =
				Boolean(inputPhone) &&
				inputPhone === normalizePatientPhoneForDuplicate(patient.phone);
			// БЫЛО: пара «дата рождения + телефон» БЕЗ сравнения имени считалась
			// дублем. Близнецы с телефоном матери и супруги с одной датой рождения
			// на общем номере получали жёсткий отказ при регистрации без возможности
			// подтвердить, что это разные люди. Совпадение имени теперь обязательно:
			// это оставляет защиту от настоящих дублей (один человек заведён дважды),
			// но перестаёт блокировать разных людей одной семьи.
			if (nameAloneIsDuplicate && sameName) return true;
			return (sameName && sameBirthDate) || (sameName && samePhone);
		}) ?? null
	);
}

/**
 * Отказ по дублю. Когда сравнивать было нечем кроме имени, объяснение другое:
 * общий текст «найдите пациента по ФИО или телефону» здесь читается как «ищите
 * сами, чем — не скажем», а регистратору нужно знать, что делать с настоящим
 * тёзкой.
 */
function sendPatientNameOnlyDuplicate(reply: FastifyReply) {
	return reply.code(409).send({
		error: "PatientNameDuplicateError",
		message: patientNameOnlyDuplicateMessage,
	});
}

function sendPatientDuplicate(reply: FastifyReply) {
	return reply.code(409).send({
		error: "PatientDuplicateError",
		message: patientDuplicateMessage,
	});
}

function hasText(value: string | null | undefined): boolean {
	return Boolean(value?.trim());
}

function hasIncompleteRepresentativeIdentity(
	value: PatientRepresentativeInput,
): boolean {
	const hasRepresentativeFact =
		hasText(value.legalRepresentativeFullName) ||
		hasText(value.legalRepresentativeRelationship) ||
		hasText(value.legalRepresentativeIdentityDocument) ||
		hasText(value.legalRepresentativePhone) ||
		/представител|опекун|родител|довер/i.test(
			value.preferredDocumentRecipient ?? "",
		);

	if (!hasRepresentativeFact) return false;
	return (
		!hasText(value.legalRepresentativeFullName) ||
		!hasText(value.legalRepresentativeRelationship)
	);
}

/**
 * Строка таблицы patient_archive_reasons_and_blacklists в том минимуме, который
 * нужен для отбора по пациенту. patient_id пустой у строк, созданных до
 * миграции drizzle/0136_patient_archive_patient_id.sql: колонка там объявлена
 * nullable намеренно, потому что старым строкам связь с пациентом взять негде.
 */
type PatientArchiveRowLike = {
	isBookingBlocked: boolean;
	patientId: string | null;
	patientName: string | null;
};

/**
 * Оставляет из строк архива и черного списка клиники только те, что относятся к
 * указанному пациенту.
 *
 * БЫЛО: GET /api/patients/:patientId/archive-status отдавал строки ВСЕЙ клиники.
 * db/patientArchiveReasonsAndBlacklistsQuery.ts:7 принимает пациента под именем
 * `_patientId` и не использует его вовсе, а маршрут отправлял результат как есть.
 * Оба виджета карточки читают ответ как статус выбранного пациента:
 * components/patients/PatientArchiveAndBlacklistWidget.tsx:86 берёт
 * reasons[0].isBookingBlocked, а components/crm/PatientArchiveReasonsAndBlacklistsWidget.tsx:106
 * печатает каждую строку с ФИО и причиной. Достаточно одного человека в черном
 * списке, чтобы карточка КАЖДОГО пациента клиники показала «Запись на прием
 * заблокирована», предложила кнопку «Восстановить из черного списка» — и заодно
 * показала ФИО и причину блокировки посторонних людей. Это ровно тот же дефект,
 * что уже был исправлен ниже для communication-timelines.
 *
 * Связь по имени применяется ТОЛЬКО к строкам без patient_id. Строку с чужим
 * patient_id тезка не забирает: иначе снятие блокировки у однофамильца снимало
 * бы её у настоящего нарушителя.
 */
export function selectPatientArchiveRows<T extends PatientArchiveRowLike>(
	rows: readonly T[],
	patientId: string,
	patientFullName: string | null | undefined,
): T[] {
	const normalizedPatientName =
		normalizePatientNameForDuplicate(patientFullName);
	return rows.filter((row) => {
		if (row.patientId) return row.patientId === patientId;
		if (!normalizedPatientName) return false;
		return (
			normalizePatientNameForDuplicate(row.patientName) ===
			normalizedPatientName
		);
	});
}

/**
 * Запрещена ли пациенту запись по его строкам архива. Учитывается флаг
 * is_booking_blocked, а не сам факт наличия строки — так же, как в
 * db/patientArchiveReasonsAndBlacklistsQuery.ts:isPatientBookingBlocked,
 * который решает запрет при записи на приём. Иначе карточка утверждала бы одно,
 * а расписание делало другое.
 */
export function patientArchiveRowsBlockBooking(
	rows: readonly PatientArchiveRowLike[],
): boolean {
	return rows.some((row) => row.isBookingBlocked === true);
}

import {
	createPatientSafeInDb,
	getPatientByIdFromDb,
	getPatientsFromDb,
	updatePatientAdministrativeProfileInDb,
	updatePatientInDb,
} from "../db/patientsQuery.js";
import {
	clinicSessionMissingMessage,
	clinicSessionRejectedMessage,
} from "../utils/clinicSessionRefusal.js";
import { verifyToken } from "../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./auth.js";

/**
 * ОТКАЗЫ КАРТОТЕКИ БЕЗ ЕДИНОГО СЛОВА ДЛЯ ЧЕЛОВЕКА.
 *
 * Семь обработчиков этого файла начинались одной и той же шестистрочной
 * преамбулой и отвечали `{ error: "AuthRequired" }` и
 * `{ error: "AuthExpired" }` — телом без поля `message`. Клиенту нечего
 * показать, поэтому он строит фразу по коду 401
 * (`apps/web/src/lib/panelStateText.ts`): «у вашей смены нет доступа к этим
 * данным — войдите в смену заново или попросите администратора открыть доступ».
 * Для «нет входа вовсе» и «вход больше не принимается» это один и тот же совет,
 * и в половине случаев он ложный: администратору предлагают идти к
 * администратору, хотя достаточно войти в кабинет.
 *
 * Разница между двумя состояниями сервер ЗНАЕТ и теперь её называет. Коды ответа
 * сохранены дословно: на них стоит tests/routes/patientArchiveStatusScope.test.ts
 * и смоук scripts/smoke-clinical-mutation-guard.mjs.
 *
 * ЧЕГО СЕРВЕР НЕ ЗНАЕТ, ТОГО И НЕ УТВЕРЖДАЕТ. `verifyToken` возвращает `null` и
 * на истёкшем сроке, и на неверной подписи, и на токене без организации
 * (utils/cryptoHelper.ts) — различить их нельзя. Поэтому текст называет обе
 * возможные причины и одно действие, которое лечит любую из них.
 */
/*
 * Двоеточия внутри фраз нет намеренно: клиент подставляет текст после своего
 * заголовка («Пациенты не загружены: …»), и второе двоеточие в одном
 * предложении читается как обрывок.
 */
/*
 * ТЕКСТ ЭТИХ ДВУХ ОТКАЗОВ ЗДЕСЬ БОЛЬШЕ НЕ ЖИВЁТ, И ЭТО НЕ КОСМЕТИКА.
 *
 * Это была ПЕРВАЯ копия отказа «запрос пришёл без рабочего кабинета клиники». К
 * моменту правки в дереве завелась третья (`routes/diary.ts`, ветка подписания
 * дневника, своя формулировка того же состояния), а расписание, дневник и
 * протоколы приёма отвечали на него вообще без текста. В этом продукте уже
 * выросли четыре разных расчёта долга ровно так — каждый раз заводили ещё одно
 * место. Формулировка переехала в единственный дом,
 * `utils/clinicSessionRefusal.ts`, и все они собирают фразу там.
 *
 * Сами строки не изменились ни на знак: на них стоит
 * tests/routes/patientsRefusalText.test.ts.
 */
const clinicAuthRequiredMessage = clinicSessionMissingMessage(
	"картотека пациентов открывается только из кабинета",
);
const clinicAuthRejectedMessage = clinicSessionRejectedMessage;

/**
 * Организация из ПОДПИСАННОГО токена кабинета, либо 401 с причиной и действием.
 * Возвращает null, когда ответ клиенту уже отправлен. Единственная проверка
 * доступа в этом файле: на ней стоят все пятнадцать обработчиков.
 *
 * ПРОВЕРОК БЫЛО ДВЕ. Второй помощник, readClinicOrgId, возвращал null и на
 * отсутствие токена, и на негодный, поэтому восемь маршрутов рекламаций и задач
 * отвечали одной и той же фразой «Требуется авторизация рабочего кабинета
 * клиники.» в обоих состояниях. Человеку с истёкшим входом это читается как
 * «доступа вам не давали»: клиент, не получив различия причин, строит совет по
 * коду 401 (apps/web/src/lib/panelStateText.ts) и отправляет к администратору,
 * хотя достаточно войти в кабинет заново. Врач с оборвавшейся смены бросал
 * фиксацию рекламации, а рекламация — основание для гарантии, возврата и
 * переделки, её не записывают «потом».
 *
 * Код ответа сохранён дословно: 401 в обоих состояниях, как и было, поэтому
 * поведенческий гейт scripts/smoke-clinical-mutation-guard.mjs видит то же
 * самое. Изменились поле error (AuthExpired вместо AuthRequired на негодном
 * токене) и текст, который называет причину и следующий шаг.
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
		reply
			.code(401)
			.send({ error: "AuthRequired", message: clinicAuthRequiredMessage });
		return null;
	}
	const payload = verifyToken(clinicToken, TOKEN_SECRET());
	if (!payload?.organizationId) {
		reply
			.code(401)
			.send({ error: "AuthExpired", message: clinicAuthRejectedMessage });
		return null;
	}
	return payload.organizationId as string;
}

export async function registerPatientRoutes(app: FastifyInstance) {
	app.get("/api/patients", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		try {
			const dbPatients = await getPatientsFromDb(orgId);
			return dbPatients.map((patient) => patientSchema.parse(patient));
		} catch (e) {
			console.error("[Patients] Error fetching from DB:", e);
			// Пустой список вместо отказа читается как «пациентов нет», а картотека —
			// это первый экран смены: администратор решит, что база пуста, и начнёт
			// заводить карты заново.
			return reply.code(500).send({
				error: "DatabaseError",
				message:
					"Сервер клиники не смог прочитать список пациентов. Не считайте, что картотека пуста — повторите через минуту, а если повторится, сообщите администратору.",
			});
		}
	});

	app.post("/api/patients", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const input = parsePatientPayload(createPatientSchema, request.body);
		if (!input) {
			return reply.code(400).send({
				error: "PatientValidationError",
				message: patientCreateValidationMessage,
			});
		}
		try {
			const safeResult = await createPatientSafeInDb(
				orgId,
				input,
				(patients, inp) => {
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					return findPatientDuplicate(patients, inp as any, undefined, {
						requireDistinguishingData: true,
					});
				},
			);

			if (safeResult.type === "duplicate") {
				const nothingButName =
					!(input.birthDate ?? "").trim() &&
					!normalizePatientPhoneForDuplicate(input.phone);
				return nothingButName
					? sendPatientNameOnlyDuplicate(reply)
					: sendPatientDuplicate(reply);
			}

			return reply.code(201).send(patientSchema.parse(safeResult.patient));
		} catch (e) {
			console.error("[Patients] Create error:", e);
			/*
			 * «Мог не сохраниться», а не «не сохранён», и это точность, а не
			 * осторожность: в try стоят и вставка в базу, и разбор ответа
			 * patientSchema.parse ПОСЛЕ успешной вставки. Тот же промах на соседнем
			 * PUT уже приводил к дублям карт (см. комментарий ниже, ветка catch у
			 * обновления). Поэтому текст велит проверить список, а не создавать
			 * вторую карту того же человека.
			 */
			return reply.code(500).send({
				error: "DatabaseError",
				message:
					"Сервер клиники не подтвердил запись — пациент мог не сохраниться. Найдите его в списке перед повторным созданием, иначе на одного человека появятся две карты.",
			});
		}
	});

	app.put("/api/patients/:patientId", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const params = request.params as { patientId?: string };
		if (!params.patientId) return sendPatientRouteValidationError(reply);
		const input = parsePatientPayload(updatePatientSchema, request.body);
		if (!input) {
			return reply.code(400).send({
				error: "PatientValidationError",
				message: patientUpdateValidationMessage,
			});
		}

		try {
			const dbPatients = await getPatientsFromDb(orgId);
			const duplicate = findPatientDuplicate(
				dbPatients,
				input,
				params.patientId,
			);
			if (duplicate) return sendPatientDuplicate(reply);

			const patient = await updatePatientInDb(orgId, params.patientId, input);
			if (!patient) return sendPatientNotFound(reply);
			return patientSchema.parse(patient);
		} catch (e) {
			// БЫЛО: любой сбой внутри try отвечал 404 «Пациент не найден» — включая
			// ошибку разбора ответа patientSchema.parse ПОСЛЕ успешной записи в базу.
			// Оператор видел «пациент не найден», считал, что данные не сохранились,
			// и заводил карточку заново — появлялись дубли уже сохранённых пациентов.
			//
			// familyGroupId: привязка к несуществующей/чужой группе — бизнес-ошибка
			// 400, не 500. Иначе UI показывает «не удалось сохранить» при опечатке
			// UUID семьи, хотя валидация отклонила запрос до записи.
			const msg = e instanceof Error ? e.message : "";
			if (
				msg.includes("семейная группа не найдена") ||
				msg.includes("уже состоит в другой семейной группе")
			) {
				return reply.code(400).send({
					error: "PatientValidationError",
					message: msg,
				});
			}

			request.log.error({ err: e }, "[Patients] Ошибка обновления пациента");
			return reply.code(500).send({
				error: "PatientUpdateFailed",
				message:
					"Не удалось сохранить изменения. Данные могли быть записаны — обновите карточку перед повторным вводом.",
			});
		}
	});

	app.put(
		"/api/patients/:patientId/administrative-profile",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;

			const params = request.params as { patientId?: string };
			if (!params.patientId) return sendPatientRouteValidationError(reply);
			const input = parsePatientPayload(
				updatePatientAdministrativeProfileSchema,
				request.body,
			);
			if (!input) {
				return reply.code(400).send({
					error: "PatientValidationError",
					message: patientAdministrativeValidationMessage,
				});
			}

			const sanitizeDigitsAndSpaces = (
				val?: string | null,
				maxLen: number = 80,
			) => {
				if (val === undefined) return undefined;
				if (val === null) return null;
				const cleaned = val.trim().replace(/[^\d\s\-.]/g, "");
				return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
			};

			if (input.snils !== undefined && input.snils !== null) {
				input.snils = sanitizeDigitsAndSpaces(input.snils, 20);
			}
			if (
				input.identityDocument !== undefined &&
				input.identityDocument !== null
			) {
				input.identityDocument = input.identityDocument.trim().slice(0, 240);
			}

			try {
				const existingPatient = await getPatientByIdFromDb(
					orgId,
					params.patientId,
				);
				if (!existingPatient) return sendPatientNotFound(reply);
				const existingProfile =
					(existingPatient.administrativeProfile as Record<string, unknown>) ??
					{};
				const mergedProfile = { ...existingProfile, ...input };

				if (hasIncompleteRepresentativeIdentity(mergedProfile)) {
					return reply.code(400).send({
						error: "PatientValidationError",
						message: patientRepresentativeValidationMessage,
					});
				}

				/*
				 * БЫЛО: mergedProfile считали только для hasIncompleteRepresentativeIdentity,
				 * а в updatePatientAdministrativeProfileInDb уходил partial input.
				 * DB-путь пишет administrative_profile JSONB целиком (= input), без merge
				 * (patientsQuery.ts). Частичный PUT (loyaltyTier / snils) затирал
				 * остальные ключи: orthodonticProgress, адреса, представителя.
				 * In-memory путь мержит сам; Postgres — нет. После F5 tier и каппы
				 * пропадали при HTTP 200.
				 * СТАЛО: на диск уходит полный merge existing ∪ input.
				 */
				const patient = await updatePatientAdministrativeProfileInDb(
					orgId,
					params.patientId,
					mergedProfile as typeof input,
				);
				if (!patient) return sendPatientNotFound(reply);
				return patientSchema.parse(patient);
			} catch (e) {
				// См. комментарий выше: 404 после успешной записи вводил оператора в
				// заблуждение и приводил к повторному вводу тех же данных.
				request.log.error(
					{ err: e },
					"[Patients] Ошибка обновления профиля пациента",
				);
				return reply.code(500).send({
					error: "PatientProfileUpdateFailed",
					message:
						"Не удалось сохранить профиль. Данные могли быть записаны — обновите карточку перед повторным вводом.",
				});
			}
		},
	);

	/**
	 * Журнал обращений пациента: звонки и сообщения, прошедшие через клинику.
	 *
	 * БЫЛО ДВА ДЕФЕКТА, ОБА ИСПРАВЛЕНЫ ЗДЕСЬ.
	 *
	 * 1. Параметр :patientId сначала не читался вовсе — в карточке КАЖДОГО
	 *    пациента показывалась переписка ВСЕХ пациентов клиники. Это раскрытие
	 *    персональных данных внутри интерфейса.
	 * 2. Затем он читался, но источником была patient_communication_timelines —
	 *    таблица без единого писателя в проекте и без колонки patient_id: связь с
	 *    карточкой делалась сравнением ФИО строкой. То есть обе панели карточки
	 *    отвечали «звонков и сообщений нет» ВСЕГДА. Администратор звонил второй
	 *    раз или не звонил вовсе, считая, что коллега отработал.
	 *
	 * Теперь читается communication_events — единственный живой источник со
	 * связью по uuid и пятью настоящими писателями по пяти каналам. Подробности и
	 * границы утверждения — в services/patients/patientCommunicationLog.ts.
	 */
	app.get(
		"/api/patients/:patientId/communication-timelines",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;

			const { patientId } = request.params as { patientId?: string };
			// Проверка формата до обращения к базе: patients.id и
			// communication_events.patient_id — колонки типа uuid, и на строке
			// «undefined» PostgreSQL отвечает ошибкой разбора. Она превратилась бы в 500
			// «сбой чтения» вместо понятного «карта не выбрана».
			if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
				return sendPatientRouteValidationError(reply);
			}

			const requestedLimit = (
				request.query as { limit?: unknown } | null | undefined
			)?.limit;

			try {
				const { findPatientCommunicationLog } = await import(
					"../services/patients/patientCommunicationLog.js"
				);
				const log = await findPatientCommunicationLog(orgId, patientId.trim(), {
					limit: requestedLimit,
				});
				// Пациента нет в этой клинике — это 404, а не пустой журнал. Пустой журнал
				// оператор читает как «с человеком не связывались»; отсутствие карты и
				// отсутствие обращений — разные ответы, и путать их нельзя (тот же приём,
				// что в archive-status ниже).
				if (!log) return sendPatientNotFound(reply);
				return reply.status(200).send(log);
			} catch (e) {
				// Отказ базы не выдаётся за пустой журнал: это самая дорогая ошибка на
				// этом экране. Сообщение обязано назвать и причину, и что делать.
				//
				// ЗДЕСЬ СТОЯЛ РАЗДЕЛ «Общение» — пункта меню с таким именем в программе нет
				// ни в одном режиме клиники. Реестр разделов один, apps/web/src/workspaceShell.tsx,
				// viewLabels: связь называется «Связь», а «Обращения» — это другой раздел
				// (leads, заявки до записи). Тот же дефект на экранной части уже исправлен и
				// закреплён стражем apps/web/src/tests/patientCommunicationLogPanel.test.ts,
				// а здесь остался: администратора отправляли искать несуществующий пункт
				// меню в момент, когда журнал не прочитался и решение принимается вслепую.
				request.log.error(
					{ err: e },
					"[Patients] Ошибка чтения журнала обращений пациента",
				);
				return reply.code(500).send({
					error: "PatientCommunicationLogUnavailable",
					message:
						"Не удалось прочитать звонки и сообщения по этой карте. Не считайте, что обращений не было: повторите чтение, а до этого проверьте раздел «Связь».",
				});
			}
		},
	);

	/**
	 * РЕКЛАМАЦИИ И ОСЛОЖНЕНИЯ ПО КАРТЕ. Четыре маршрута.
	 *
	 * ЧЕГО НЕ БЫЛО. Экран карточки (PatientReclamationsWidget, 588 строк) умел
	 * фиксировать жалобу, назначать врача-автора работы, помечать инцидент
	 * урегулированным и удалять запись — а сервера под ним не существовало. Живая
	 * проверка сети (scratch/probe-failed-requests.mjs) показала на карточке
	 * пациента 404 на GET .../reclamations. Врач нажимал «Зафиксировать в карту»,
	 * получал отказ и не имел ни одного способа сохранить претензию. Рекламация —
	 * основание для гарантии, возврата и переделки, то есть деньги и разбор.
	 *
	 * Долг был записан в tests/webCallsExistingRoutes.test.ts со словами «таблицы
	 * есть, маршрутов нет» — неправда: не было ни таблицы, ни маршрута. Таблица
	 * создана в drizzle/0143_patient_reclamations.sql.
	 *
	 * ИМЕНА ПОЛЕЙ взяты из того, что экран уже отправляет и читает. Свой контракт
	 * поверх работающего клиента сломал бы его молча.
	 */
	app.get("/api/patients/:patientId/reclamations", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
			return sendPatientRouteValidationError(reply);
		}

		try {
			// Карта чужой клиники и карта без осложнений — разные ответы. Пустой список
			// на несуществующей карте врач прочитает как «осложнений не было».
			const patient = await getPatientByIdFromDb(orgId, patientId.trim());
			if (!patient) return sendPatientNotFound(reply);

			const { getPatientReclamationsFromDb } = await import(
				"../db/patientReclamationsQuery.js"
			);
			return reply
				.status(200)
				.send(await getPatientReclamationsFromDb(orgId, patientId.trim()));
		} catch (e) {
			// Отказ базы НЕ выдаём за пустой журнал: экран умеет показать отказ отдельно
			// от пустоты, и эта способность держится на коде ответа.
			request.log.error(
				{ err: e },
				"[Patients] Ошибка чтения рекламаций пациента",
			);
			return reply.code(500).send({
				error: "PatientReclamationsUnavailable",
				message:
					"Не удалось прочитать рекламации и осложнения по этой карте. Не считайте, что их нет: повторите чтение перед разговором с пациентом.",
			});
		}
	});

	app.post("/api/patients/:patientId/reclamations", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
			return sendPatientRouteValidationError(reply);
		}

		const parsedBody = patientReclamationCreateBodySchema.safeParse(
			request.body ?? {},
		);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не описана суть жалобы или осложнения — без этого запись в карте бесполезна.",
			});
		}
		const body = parsedBody.data;
		const details =
			typeof body.complicationDetails === "string"
				? body.complicationDetails.trim()
				: "";
		if (!details) {
			// Сообщение называет то, что требуется от человека, а не имя поля запроса.
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не описана суть жалобы или осложнения — без этого запись в карте бесполезна.",
			});
		}
		const doctorId =
			typeof body.doctorId === "string" &&
			PATIENT_ID_UUID_PATTERN.test(body.doctorId.trim())
				? body.doctorId.trim()
				: null;
		if (!doctorId) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не выбран врач — автор работы. Без него разобрать рекламацию будет не с кем.",
			});
		}
		const proposedAction =
			typeof body.proposedAction === "string" && body.proposedAction.trim()
				? body.proposedAction.trim()
				: null;

		try {
			const patient = await getPatientByIdFromDb(orgId, patientId.trim());
			if (!patient) return sendPatientNotFound(reply);

			const { createPatientReclamationInDb } = await import(
				"../db/patientReclamationsQuery.js"
			);
			const created = await createPatientReclamationInDb(
				orgId,
				patientId.trim(),
				{
					complicationDetails: details,
					proposedAction,
					doctorId,
				},
			);
			return reply.status(201).send(created);
		} catch (e) {
			request.log.error({ err: e }, "[Patients] Ошибка фиксации рекламации");
			return reply.code(500).send({
				error: "PatientReclamationCreateFailed",
				message:
					"Не удалось зафиксировать рекламацию. Запись могла не сохраниться — откройте журнал и проверьте перед повторным вводом.",
			});
		}
	});

	app.put(
		"/api/patients/:patientId/reclamations/:reclamationId",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId, reclamationId } = request.params as {
				patientId?: string;
				reclamationId?: string;
			};
			if (
				!patientId ||
				!PATIENT_ID_UUID_PATTERN.test(patientId.trim()) ||
				!reclamationId ||
				!PATIENT_ID_UUID_PATTERN.test(reclamationId.trim())
			) {
				return sendPatientRouteValidationError(reply);
			}

			const parsedBody = patientReclamationStatusBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не указано новое состояние инцидента: урегулирован или возвращён в работу.",
				});
			}
			const body = parsedBody.data;
			const status =
				body.status === "resolved"
					? "resolved"
					: body.status === "under_review"
						? "under_review"
						: null;
			if (!status) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не указано новое состояние инцидента: урегулирован или возвращён в работу.",
				});
			}

			try {
				const { setPatientReclamationStatusInDb } = await import(
					"../db/patientReclamationsQuery.js"
				);
				const updated = await setPatientReclamationStatusInDb(
					orgId,
					patientId.trim(),
					reclamationId.trim(),
					status,
				);
				// Записи нет — 404, а не тихий успех: экран красит строку оптимистично до
				// ответа и вернёт прежнее значение только по отказу.
				if (!updated) {
					return reply.code(404).send({
						error: "PatientReclamationNotFound",
						message:
							"Запись об инциденте не найдена в этой карте — возможно, её удалил кто-то другой. Обновите журнал.",
					});
				}
				return reply.status(200).send(updated);
			} catch (e) {
				request.log.error(
					{ err: e },
					"[Patients] Ошибка смены состояния рекламации",
				);
				return reply.code(500).send({
					error: "PatientReclamationUpdateFailed",
					message:
						"Не удалось изменить состояние инцидента. Показанное значение может не совпадать с сохранённым — обновите журнал.",
				});
			}
		},
	);

	app.delete(
		"/api/patients/:patientId/reclamations/:reclamationId",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId, reclamationId } = request.params as {
				patientId?: string;
				reclamationId?: string;
			};
			if (
				!patientId ||
				!PATIENT_ID_UUID_PATTERN.test(patientId.trim()) ||
				!reclamationId ||
				!PATIENT_ID_UUID_PATTERN.test(reclamationId.trim())
			) {
				return sendPatientRouteValidationError(reply);
			}

			try {
				const { deletePatientReclamationFromDb } = await import(
					"../db/patientReclamationsQuery.js"
				);
				const removed = await deletePatientReclamationFromDb(
					orgId,
					patientId.trim(),
					reclamationId.trim(),
				);
				// Экран по успеху убирает строку из списка. «Удалено» без удаления вернуло бы
				// инцидент при следующем открытии карты, и человек решил бы, что программа
				// его обманула, — а он был бы прав.
				if (!removed) {
					return reply.code(404).send({
						error: "PatientReclamationNotFound",
						message:
							"Запись об инциденте не найдена в этой карте — возможно, её уже удалили. Обновите журнал.",
					});
				}
				return reply.status(200).send({ success: true });
			} catch (e) {
				request.log.error({ err: e }, "[Patients] Ошибка удаления рекламации");
				return reply.code(500).send({
					error: "PatientReclamationDeleteFailed",
					message:
						"Не удалось удалить запись об инциденте. Она осталась в карте — повторите попытку.",
				});
			}
		},
	);

	/**
	 * ЗАДАЧИ (ПОРУЧЕНИЯ) ПО КАРТЕ. Четыре маршрута.
	 *
	 * ЧЕГО НЕ БЫЛО. Экран карточки (PatientTaskTicketsWidget) умел создать
	 * поручение, отметить его выполненным, вернуть в работу и удалить — а сервера
	 * под ним не существовало. Живая проверка сети показала 404 на
	 * GET .../tickets. Администратор нажимал «Создать задачу», получал отказ и не
	 * имел ни одного способа поручить «перезвонить по отёку, дослать снимок».
	 * Потерянное поручение — это несделанный звонок больному человеку.
	 *
	 * ИМЕНА ПОЛЕЙ взяты из того, что экран уже отправляет и читает (title,
	 * description, assignedToId, status). Таблица —
	 * drizzle/0144_patient_task_tickets.sql.
	 */
	app.get("/api/patients/:patientId/tickets", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
			return sendPatientRouteValidationError(reply);
		}

		try {
			// Карта чужой клиники и карта без поручений — разные ответы. Пустой список
			// на несуществующей карте администратор прочитает как «дел по ней нет».
			const patient = await getPatientByIdFromDb(orgId, patientId.trim());
			if (!patient) return sendPatientNotFound(reply);

			const { getPatientTaskTicketsFromDb } = await import(
				"../db/patientTaskTicketsQuery.js"
			);
			return reply
				.status(200)
				.send(await getPatientTaskTicketsFromDb(orgId, patientId.trim()));
		} catch (e) {
			// Отказ базы НЕ выдаём за пустой список: экран умеет показать отказ отдельно
			// от пустоты, и эта способность держится на коде ответа.
			request.log.error(
				{ err: e },
				"[Patients] Ошибка чтения задач по пациенту",
			);
			return reply.code(500).send({
				error: "PatientTaskTicketsUnavailable",
				message:
					"Не удалось прочитать задачи по этой карте. Не считайте, что их нет: повторите чтение и не планируйте день по этому списку.",
			});
		}
	});

	app.post("/api/patients/:patientId/tickets", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
			return sendPatientRouteValidationError(reply);
		}

		const parsedBody = patientTaskTicketCreateBodySchema.safeParse(
			request.body ?? {},
		);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не указано, что нужно сделать — без названия задачи поручение никому ничего не говорит.",
			});
		}
		const body = parsedBody.data;
		const title = typeof body.title === "string" ? body.title.trim() : "";
		if (!title) {
			// Сообщение называет то, что требуется от человека, а не имя поля запроса.
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не указано, что нужно сделать — без названия задачи поручение никому ничего не говорит.",
			});
		}
		/*
		 * Ответственный обязателен. Экран не даёт отправить форму без выбранного
		 * сотрудника (поле required), но проверка на сервере всё равно нужна:
		 * поручение без ответственного не появится ни в чьём списке дел и будет
		 * выглядеть созданным, оставаясь ничьим.
		 */
		const assignedToId =
			typeof body.assignedToId === "string" &&
			PATIENT_ID_UUID_PATTERN.test(body.assignedToId.trim())
				? body.assignedToId.trim()
				: null;
		if (!assignedToId) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Не выбран ответственный сотрудник. Задача без исполнителя не попадёт ни в чей список дел.",
			});
		}
		const description =
			typeof body.description === "string" && body.description.trim()
				? body.description.trim()
				: null;
		// Важность экран отправляет всегда ('normal'), но на всякий случай не
		// доверяем: чужое значение не должно попасть в базу мимо смысла.
		const priority =
			typeof body.priority === "string" && body.priority.trim()
				? body.priority.trim()
				: "normal";

		try {
			const patient = await getPatientByIdFromDb(orgId, patientId.trim());
			if (!patient) return sendPatientNotFound(reply);

			const { createPatientTaskTicketInDb } = await import(
				"../db/patientTaskTicketsQuery.js"
			);
			const created = await createPatientTaskTicketInDb(
				orgId,
				patientId.trim(),
				{
					title,
					description,
					assignedToId,
					priority,
				},
			);
			return reply.status(201).send(created);
		} catch (e) {
			request.log.error(
				{ err: e },
				"[Patients] Ошибка создания задачи по пациенту",
			);
			return reply.code(500).send({
				error: "PatientTaskTicketCreateFailed",
				message:
					"Не удалось создать задачу. Она могла не сохраниться — обновите список перед повторным вводом.",
			});
		}
	});

	app.put(
		"/api/patients/:patientId/tickets/:ticketId",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId, ticketId } = request.params as {
				patientId?: string;
				ticketId?: string;
			};
			if (
				!patientId ||
				!PATIENT_ID_UUID_PATTERN.test(patientId.trim()) ||
				!ticketId ||
				!PATIENT_ID_UUID_PATTERN.test(ticketId.trim())
			) {
				return sendPatientRouteValidationError(reply);
			}

			const parsedBody = patientTaskTicketStatusBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не указано новое состояние задачи: выполнена или возвращена в работу.",
				});
			}
			const body = parsedBody.data;
			const status =
				body.status === "completed"
					? "completed"
					: body.status === "pending"
						? "pending"
						: null;
			if (!status) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не указано новое состояние задачи: выполнена или возвращена в работу.",
				});
			}

			try {
				const { setPatientTaskTicketStatusInDb } = await import(
					"../db/patientTaskTicketsQuery.js"
				);
				const updated = await setPatientTaskTicketStatusInDb(
					orgId,
					patientId.trim(),
					ticketId.trim(),
					status,
				);
				// Записи нет — 404, а не тихий успех: экран переставляет галочку
				// оптимистично и вернёт прежнее значение только по отказу.
				if (!updated) {
					return reply.code(404).send({
						error: "PatientTaskTicketNotFound",
						message:
							"Задача не найдена в этой карте — возможно, её удалил кто-то другой. Обновите список.",
					});
				}
				return reply.status(200).send(updated);
			} catch (e) {
				request.log.error(
					{ err: e },
					"[Patients] Ошибка смены состояния задачи по пациенту",
				);
				return reply.code(500).send({
					error: "PatientTaskTicketUpdateFailed",
					message:
						"Не удалось изменить состояние задачи. Показанная отметка может не совпадать с сохранённой — обновите список.",
				});
			}
		},
	);

	app.delete(
		"/api/patients/:patientId/tickets/:ticketId",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId, ticketId } = request.params as {
				patientId?: string;
				ticketId?: string;
			};
			if (
				!patientId ||
				!PATIENT_ID_UUID_PATTERN.test(patientId.trim()) ||
				!ticketId ||
				!PATIENT_ID_UUID_PATTERN.test(ticketId.trim())
			) {
				return sendPatientRouteValidationError(reply);
			}

			try {
				const { deletePatientTaskTicketFromDb } = await import(
					"../db/patientTaskTicketsQuery.js"
				);
				const removed = await deletePatientTaskTicketFromDb(
					orgId,
					patientId.trim(),
					ticketId.trim(),
				);
				// Экран по успеху убирает строку из списка. «Удалено» без удаления вернуло бы
				// задачу при следующем открытии карты.
				if (!removed) {
					return reply.code(404).send({
						error: "PatientTaskTicketNotFound",
						message:
							"Задача не найдена в этой карте — возможно, её уже удалили. Обновите список.",
					});
				}
				return reply.status(200).send({ success: true });
			} catch (e) {
				request.log.error(
					{ err: e },
					"[Patients] Ошибка удаления задачи по пациенту",
				);
				return reply.code(500).send({
					error: "PatientTaskTicketDeleteFailed",
					message:
						"Не удалось удалить задачу. Она осталась в карте — повторите попытку.",
				});
			}
		},
	);

	// COMPETITOR FEATURE #20: пациенты::архив_причин_и_черный_список
	app.get("/api/patients/:patientId/archive-status", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId) return sendPatientRouteValidationError(reply);

		try {
			// Карточка чужого или удалённого пациента раньше отвечала пустым списком,
			// то есть «этот человек не заблокирован». Отсутствие пациента и отсутствие
			// блокировки — разные ответы, и путать их нельзя.
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) return sendPatientNotFound(reply);

			const { getPatientArchiveReasonsAndBlacklistsFromDb } = await import(
				"../db/patientArchiveReasonsAndBlacklistsQuery.js"
			);
			const clinicRows = await getPatientArchiveReasonsAndBlacklistsFromDb(
				orgId,
				patientId,
			);
			return reply
				.status(200)
				.send(
					selectPatientArchiveRows(clinicRows, patientId, patient.fullName),
				);
		} catch (e) {
			// Пустой список вместо отказа читается виджетом как «пациент чист», и
			// администратор запишет на приём того, кому запись запрещена.
			request.log.error(
				{ err: e },
				"[Patients] Ошибка чтения архива и черного списка",
			);
			return reply.code(500).send({
				error: "PatientArchiveStatusUnavailable",
				message:
					"Не удалось прочитать запрет записи по этой карте. Не считайте пациента разрешённым к записи: повторите чтение перед записью на приём.",
			});
		}
	});

	app.post(
		"/api/patients/:patientId/archive-status",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;
			const { patientId } = request.params as { patientId?: string };
			if (!patientId) return sendPatientRouteValidationError(reply);

			const parsedBody = patientArchiveStatusBodySchema.safeParse(
				request.body ?? {},
			);
			if (
				!parsedBody.success ||
				typeof parsedBody.data.isBlacklisted !== "boolean"
			) {
				// БЫЛО: «isBlacklisted boolean is required» — имя поля запроса на экране
				// администратора вместо того, что от него требуется.
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Не указано действие: запретить пациенту запись на приём или снять запрет.",
				});
			}
			const requestedBlacklisted = parsedBody.data.isBlacklisted;

			try {
				const {
					getPatientArchiveReasonsAndBlacklistsFromDb,
					setPatientArchiveStatusInDb,
				} = await import("../db/patientArchiveReasonsAndBlacklistsQuery.js");
				const patient = await getPatientByIdFromDb(orgId, patientId);
				if (!patient) return sendPatientNotFound(reply);

				const rowsBefore = selectPatientArchiveRows(
					await getPatientArchiveReasonsAndBlacklistsFromDb(orgId, patientId),
					patientId,
					patient.fullName,
				);
				// Повторное нажатие кнопки не должно плодить строки: setPatientArchiveStatusInDb
				// вставляет запись безусловно, а карточка после отправки перечитывает статус
				// и снова показывает ту же кнопку.
				if (
					patientArchiveRowsBlockBooking(rowsBefore) === requestedBlacklisted
				) {
					return reply
						.status(200)
						.send({ success: true, isBlacklisted: requestedBlacklisted });
				}

				await setPatientArchiveStatusInDb(
					orgId,
					patientId,
					requestedBlacklisted,
					patient.fullName,
				);

				// БЫЛО: маршрут отвечал { success: true } сразу после вызова записи, а
				// setPatientArchiveStatusInDb гасит ЛЮБУЮ ошибку базы в пустой catch и
				// оставляет запрет только в памяти процесса. Карточка показывала «Пациент
				// добавлен в черный список. Запись на прием заблокирована», запрет исчезал
				// при перезапуске сервера, и никто об этом не узнавал. Отвечаем успехом
				// только после того, как база подтвердила новое состояние.
				const rowsAfter = selectPatientArchiveRows(
					await getPatientArchiveReasonsAndBlacklistsFromDb(orgId, patientId),
					patientId,
					patient.fullName,
				);
				if (
					patientArchiveRowsBlockBooking(rowsAfter) !== requestedBlacklisted
				) {
					return reply.code(500).send({
						error: "PatientArchiveStatusNotSaved",
						message: requestedBlacklisted
							? "Запрет записи не сохранён в базе. Пациент по-прежнему доступен для записи на приём — повторите действие."
							: "Снятие запрета не сохранено в базе. Пациенту по-прежнему запрещена запись на приём — повторите действие.",
					});
				}

				return reply
					.status(200)
					.send({ success: true, isBlacklisted: requestedBlacklisted });
			} catch (e) {
				request.log.error(
					{ err: e },
					"[Patients] Ошибка сохранения запрета записи",
				);
				return reply.code(500).send({
					error: "PatientArchiveStatusNotSaved",
					message:
						"Не удалось сохранить запрет записи. Откройте карту заново и проверьте текущий запрет перед повторной попыткой.",
				});
			}
		},
	);

	app.post("/api/patients/:patientId/archive", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { patientId } = request.params as { patientId?: string };
		if (!patientId) return sendPatientRouteValidationError(reply);

		const parsedBody = patientArchiveBodySchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте правильность заполнения формы архивации.",
				issues: parsedBody.error.issues,
			});
		}
		const { archiveReason, isBlacklisted, blacklistReason } = parsedBody.data;

		const userId = null; // Removed requireUserId

		try {
			const { getPatientByIdFromDb } = await import("../db/patientsQuery.js");
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) return sendPatientNotFound(reply);

			const { archivePatientInDb } = await import(
				"../db/patientArchiveReasonsAndBlacklistsQuery.js"
			);
			await archivePatientInDb(
				orgId,
				patientId,
				patient.fullName,
				archiveReason,
				isBlacklisted,
				blacklistReason || "",
				userId,
			);

			return reply.status(200).send({ success: true });
		} catch (e) {
			request.log.error({ err: e }, "[Patients] Ошибка при архивации пациента");
			return reply.code(500).send({
				error: "PatientArchiveError",
				message:
					"Не удалось архивировать пациента. Пожалуйста, попробуйте еще раз.",
			});
		}
	});
}
