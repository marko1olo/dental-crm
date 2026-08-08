/**
 * Журнал обращений пациента: звонки и сообщения, прошедшие через клинику.
 *
 * ЗАЧЕМ ЭТО КЛИНИКЕ. Самый частый вопрос регистратуры про конкретного человека —
 * «ему уже звонили? он ответил? его предупредили о переносе?». Без ответа
 * администратор либо звонит второй раз (пациент раздражается), либо не звонит
 * вовсе, считая, что коллега отработал (пациент не приходит). Ни то, ни другое
 * не восстанавливается потом по памяти.
 *
 * ЧТО БЫЛО. Карточка читала таблицу patient_communication_timelines. У неё две
 * беды, и обе не лечатся:
 *   1. Ни одного писателя во всём apps/api/src — только объявление схемы и
 *      модуль чтения. Значит панель отвечала «Записи звонков и сообщений с
 *      пациентом отсутствуют» ВСЕГДА, независимо от того, сколько раз клиника
 *      действительно писала и звонила пациенту.
 *   2. Колонки patient_id там нет вообще: связь с карточкой делалась сравнением
 *      ФИО строкой в db/patientCommunicationTimelinesQuery.ts — модуль удалён
 *      вместе с этой правкой, чтобы следующий агент не «починил» мёртвый
 *      источник вместо живого расчёта. Появись у таблицы писатель — два тёзки
 *      получили бы общую переписку, а смена фамилии после свадьбы оторвала бы
 *      всю историю от карточки.
 *
 * ЧТО ЗДЕСЬ. Живой источник, у которого есть и связь по uuid, и пять настоящих
 * писателей по пяти каналам: communication_events (patient_id uuid NOT NULL →
 * patients.id). Писатели: routes/communications.ts:43 (закрытие задачи связи),
 * services/messengerIngestion.ts:348 (входящие из мессенджеров),
 * routes/telephony.ts:168 (входящие SMS), routes/vk.ts:84, routes/whatsapp.ts:548.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ. Ссылки на запись разговора: в communication_events
 * поля записи не существует, а единственная таблица с расшифровками звонков
 * (uis_call_speech_transcripts, schema.ts:2061) писателя не имеет и связана с
 * пациентом полем patient_phone text. Джойн по телефону здесь запрещён: у семьи
 * номер общий, и запись разговора с матерью попала бы в карточку ребёнка.
 *
 * ГРАНИЦА УТВЕРЖДЕНИЯ. Здесь видно только то, что прошло через систему. Звонок с
 * личного мобильного врача и разговор в коридоре сюда не попадают, поэтому
 * пустой журнал НЕ означает «с пациентом не общались» — только «через клинику
 * обращений не записано». Интерфейс обязан говорить именно это; иначе мы меняем
 * одно вранье («записей нет» при мёртвой таблице) на другое.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { communicationEvents, patients, users } from "../../db/schema.js";

type CommunicationEventRow = typeof communicationEvents.$inferSelect;

/** Значения берутся из enum схемы, а не переписываются руками: schema.ts:102,119,130. */
type PatientCommunicationChannel = CommunicationEventRow["channel"];
type PatientCommunicationDirection = CommunicationEventRow["direction"];
type PatientCommunicationStatus = CommunicationEventRow["status"];

type PatientCommunicationEntry = {
	readonly id: string;
	readonly channel: PatientCommunicationChannel;
	readonly direction: PatientCommunicationDirection;
	readonly status: PatientCommunicationStatus;
	readonly message: string;
	/** ФИО сотрудника. null — событие записала машина: рассылка, бот, телефония. */
	readonly actorName: string | null;
	readonly createdAt: Date;
};

export type PatientCommunicationLog = {
	readonly entries: PatientCommunicationEntry[];
	/** Всего обращений по пациенту в базе, а не только показанных. */
	readonly totalEvents: number;
	readonly shownEvents: number;
	/** true — показана только часть журнала, остальное отрезано лимитом. */
	readonly truncated: boolean;
	/**
	 * Сколько обращений остались в состоянии needs_call: машина отправить не
	 * смогла, нужен звонок руками. Сейчас такие задачи не видны на карточке
	 * нигде, поэтому число считается по всему журналу, без окна по времени:
	 * окно было бы выдуманной политикой. Возраст показывает lastNeedsCallAt.
	 */
	readonly needsCallCount: number;
	readonly lastNeedsCallAt: Date | null;
	/** Границы периода. Счётчик обращений без периода — число без смысла. */
	readonly firstEventAt: Date | null;
	readonly lastEventAt: Date | null;
};

export const PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT = 100;
export const PATIENT_COMMUNICATION_LOG_MAX_LIMIT = 500;

/**
 * Разбор параметра ?limit=.
 *
 * Журнал не листается постранично: карточка показывает последние обращения.
 * Поэтому мусор и пропуск значения дают значение по умолчанию, а не отказ —
 * из-за опечатки в адресе оператор не должен терять журнал целиком. Верхняя
 * граница обязательна: без неё ?limit=1000000 тянет в память всю переписку
 * клиники по пациенту одним ответом.
 */
export function parsePatientCommunicationLogLimit(raw: unknown): number {
	const candidate = Array.isArray(raw) ? raw[0] : raw;
	if (candidate === undefined || candidate === null || candidate === "") {
		return PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT;
	}
	// Number("") === 0 и Number(" ") === 0, поэтому пустая строка отсеяна выше,
	// а пробелы обрезаются до преобразования.
	const numeric =
		typeof candidate === "string"
			? Number(candidate.trim())
			: Number(candidate);
	if (!Number.isFinite(numeric)) return PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT;
	const whole = Math.floor(numeric);
	if (whole < 1) return 1;
	if (whole > PATIENT_COMMUNICATION_LOG_MAX_LIMIT)
		return PATIENT_COMMUNICATION_LOG_MAX_LIMIT;
	return whole;
}

/**
 * Строки журнала. Вынесено в отдельную функцию, чтобы проверять СГЕНЕРИРОВАННЫЙ
 * SQL тестом (tests/routes/patientCommunicationLog.test.ts), а не глазами.
 *
 * ФИО сотрудника берётся обычным leftJoin, а не коррелированным подзапросом.
 * Это не стилистика: в этом проекте дважды теряли данные на том, что внутри
 * sql`` подстановка ${table.column} рендерится голым именем колонки, и в
 * подзапросе оно связывается с ВНУТРЕННЕЙ таблицей — получалось
 * a.patient_id = a.id: валидный SQL, всегда ложь, пустой экран без ошибки.
 * leftJoin такой возможности не даёт: drizzle сам квалифицирует колонки именем
 * таблицы. Где sql`` всё же нужен (агрегаты ниже), таблица пишется явно —
 * ${communicationEvents}."status".
 */
export function buildPatientCommunicationEntriesQuery(
	organizationId: string,
	patientId: string,
	limit: number,
) {
	return (
		db
			.select({
				id: communicationEvents.id,
				channel: communicationEvents.channel,
				direction: communicationEvents.direction,
				status: communicationEvents.status,
				message: communicationEvents.message,
				createdAt: communicationEvents.createdAt,
				actorName: users.fullName,
			})
			.from(communicationEvents)
			.leftJoin(users, eq(users.id, communicationEvents.actorUserId))
			.where(
				and(
					// Изоляция по организации стоит в самом запросе, а не в маршруте:
					// иначе следующий вызывающий про неё забудет.
					eq(communicationEvents.organizationId, organizationId),
					eq(communicationEvents.patientId, patientId),
				),
			)
			// Второй ключ сортировки нужен для устойчивого порядка: у событий одной
			// рассылки created_at совпадает до микросекунды.
			.orderBy(
				desc(communicationEvents.createdAt),
				desc(communicationEvents.id),
			)
			.limit(limit)
	);
}

/**
 * Итоги по всему журналу пациента. Отдельным запросом, а не подсчётом по
 * выбранным строкам: иначе «12 обращений» превратилось бы в «100 обращений» у
 * любого, у кого их больше сотни, и период тоже соврал бы.
 */
export function buildPatientCommunicationTotalsQuery(
	organizationId: string,
	patientId: string,
) {
	return db
		.select({
			// count(*) отдаёт bigint, драйвер вернул бы его строкой: '12' + 1 = '121'.
			totalEvents: sql<number>`count(*)::int`.as("total_events"),
			needsCallCount:
				sql<number>`(count(*) filter (where ${communicationEvents}."status" = 'needs_call'))::int`.as(
					"needs_call_count",
				),
			lastNeedsCallAt:
				sql<Date | null>`max(${communicationEvents}."created_at") filter (where ${communicationEvents}."status" = 'needs_call')`.as(
					"last_needs_call_at",
				),
			firstEventAt:
				sql<Date | null>`min(${communicationEvents}."created_at")`.as(
					"first_event_at",
				),
			lastEventAt:
				sql<Date | null>`max(${communicationEvents}."created_at")`.as(
					"last_event_at",
				),
		})
		.from(communicationEvents)
		.where(
			and(
				eq(communicationEvents.organizationId, organizationId),
				eq(communicationEvents.patientId, patientId),
			),
		);
}

/**
 * Дата из ответа драйвера. timestamptz приходит объектом Date, но агрегаты
 * min/max в разных версиях node-postgres отдавали и строку; молча превратить
 * строку в null означало бы потерять период на экране.
 */
function toDate(value: unknown): Date | null {
	if (value instanceof Date)
		return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}
	return null;
}

/**
 * Есть ли такой пациент в этой клинике.
 *
 * Своим запросом, а не через db/patientsQuery.ts:getPatientByIdFromDb: та
 * функция гасит любую ошибку базы и возвращает пациента из образцовых данных в
 * памяти (patientsQuery.ts:81-83). На проверке существования это худший из
 * возможных ответов — при сбое базы она сказала бы «пациент есть».
 */
async function patientBelongsToOrganization(
	organizationId: string,
	patientId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ id: patients.id })
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				eq(patients.id, patientId),
			),
		)
		.limit(1);
	return Boolean(row);
}

export type PatientCommunicationLogOptions = {
	/**
	 * Сырое значение из строки запроса. Тип unknown намеренно: нормализацией
	 * занимается parsePatientCommunicationLogLimit, и маршрут не должен решать
	 * это второй раз по-своему.
	 */
	readonly limit?: unknown;
};

/**
 * Журнал обращений одного пациента.
 *
 * null означает «такого пациента в этой клинике нет» — маршрут обязан ответить
 * 404, а не пустым журналом. Пустой журнал читается оператором как «мы с ним не
 * связывались», и это ровно та подмена, из-за которой панель переписывалась.
 *
 * Ошибки базы НЕ гасятся: они должны дойти до маршрута и до экрана как отказ.
 */
export async function findPatientCommunicationLog(
	organizationId: string,
	patientId: string,
	options: PatientCommunicationLogOptions = {},
): Promise<PatientCommunicationLog | null> {
	const limit = parsePatientCommunicationLogLimit(options.limit);

	if (!(await patientBelongsToOrganization(organizationId, patientId)))
		return null;

	const [rows, totals] = await Promise.all([
		buildPatientCommunicationEntriesQuery(organizationId, patientId, limit),
		buildPatientCommunicationTotalsQuery(organizationId, patientId),
	]);

	const summary = totals[0];
	const entries: PatientCommunicationEntry[] = rows.map((row) => ({
		id: row.id,
		channel: row.channel,
		direction: row.direction,
		status: row.status,
		message: row.message,
		// Пустое ФИО сотрудника равносильно его отсутствию: пустая строка на
		// экране выглядела бы как автор без имени.
		actorName:
			row.actorName && row.actorName.trim() !== "" ? row.actorName : null,
		createdAt: toDate(row.createdAt) ?? new Date(0),
	}));

	const totalEvents = Number(summary?.totalEvents ?? 0);

	return {
		entries,
		totalEvents,
		shownEvents: entries.length,
		truncated: totalEvents > entries.length,
		needsCallCount: Number(summary?.needsCallCount ?? 0),
		lastNeedsCallAt: toDate(summary?.lastNeedsCallAt),
		firstEventAt: toDate(summary?.firstEventAt),
		lastEventAt: toDate(summary?.lastEventAt),
	};
}
