/**
 * Журнал обращений пациента: GET /api/patients/:patientId/communication-timelines.
 *
 * ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ И ПОЧЕМУ ИМЕННО ЭТО.
 *
 * 1. ПУСТОЙ ОТВЕТ НА НЕПУСТОЙ БАЗЕ. Главный дефект, который этот маршрут уже
 *    имел в двух разных видах: панель отвечала «звонков и сообщений нет» при
 *    живых обращениях. Тест засевает четыре события и требует ровно четыре
 *    строки, сверяя число с прямым count(*) по базе. Ноль строк здесь означает,
 *    что связь по пациенту снова сломана.
 *
 * 2. ЛОВУШКА DRIZZLE, на которой в этом проекте дважды теряли данные: внутри
 *    sql`` подстановка ${table.column} рендерится ГОЛЫМ именем колонки, и в
 *    коррелированном подзапросе оно связывается с внутренней таблицей —
 *    a.patient_id = a.id. Валидный SQL, всегда ложь, ошибки нет, экран пуст.
 *    Проверяется по сгенерированному тексту запроса, а не глазами.
 *
 * 3. ИЗОЛЯЦИЯ. Карточка чужой клиники и чужого пациента не отдаёт ни строки, а
 *    отсутствие пациента отвечает 404, а не пустым журналом: пустой журнал
 *    оператор читает как «мы с человеком не связывались».
 *
 * 4. РАЗБОР ВХОДА. ?limit= ломается незаметно: мусор не должен уносить журнал
 *    целиком, а верхняя граница обязана держать ответ в разумном размере.
 *
 * База одна на всех агентов, поэтому тест работает в собственной организации и
 * удаляет за собой всё в after(). При недоступной базе проверки, которым база
 * нужна, пропускаются, а разбор входа и текст SQL проверяются всё равно.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { communicationEvents, organizations, patients, users } from "../../db/schema.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import {
	PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT,
	PATIENT_COMMUNICATION_LOG_MAX_LIMIT,
	buildPatientCommunicationEntriesQuery,
	buildPatientCommunicationTotalsQuery,
	parsePatientCommunicationLogLimit,
} from "../../services/patients/patientCommunicationLog.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_MINE = "cc110000-0000-4000-8000-0000000000a1";
const ORG_FOREIGN = "cc110000-0000-4000-8000-0000000000a2";
const DOCTOR_ID = "cc110000-0000-4000-8000-0000000000c1";
const PATIENT_MAIN = "cc110000-0000-4000-8000-0000000000b1";
const PATIENT_NEIGHBOUR = "cc110000-0000-4000-8000-0000000000b2";
const PATIENT_FOREIGN = "cc110000-0000-4000-8000-0000000000b3";
const PATIENT_UNKNOWN = "cc110000-0000-4000-8000-0000000000b9";
const PATIENT_EMPTY = "cc110000-0000-4000-8000-0000000000b4";
const TEST_SECRET = "x7-patient-communication-log-secret-".padEnd(48, "z");

/*
 * Идентификаторы обращений ЗАДАНЫ ЯВНО, и это не косметика.
 *
 * Прежний засев не указывал id и не имел onConflictDoNothing вообще. У
 * communication_events первичный ключ — defaultRandom(), других уникальных
 * ограничений нет, поэтому каждая вставка создавала НОВЫЕ строки, а конфликта не
 * возникало никогда. Прогон, упавший до after(), оставлял четыре обращения в
 * базе, следующий досеивал поверх — и тест требовал ровно 4, а маршрут честно
 * отдавал 8. Замерено: `actual: 8, expected: 4`. Тест краснел на верном ответе.
 *
 * С явными id вторая вставка отсекается по первичному ключу, а purgeFixtures()
 * перед засевом снимает и остаток от ПРЕЖНЕЙ версии фикстуры, чьи id уже
 * поменялись.
 */
const EVENT_NEWEST = "cc110000-0000-4000-8000-0000000000e1";
const EVENT_INBOUND = "cc110000-0000-4000-8000-0000000000e2";
const EVENT_NEEDS_CALL = "cc110000-0000-4000-8000-0000000000e3";
const EVENT_SKIPPED = "cc110000-0000-4000-8000-0000000000e4";
const EVENT_NEIGHBOUR = "cc110000-0000-4000-8000-0000000000e5";
const EVENT_FOREIGN = "cc110000-0000-4000-8000-0000000000e6";

const DOCTOR_NAME = "Иванова Анна Петровна";
const MESSAGE_NEWEST = "Напомнили о приёме 14 июля в 10:00.";
const MESSAGE_INBOUND = "Спасибо, буду.";
const MESSAGE_NEEDS_CALL = "Автоматический дозвон не удался, нужен звонок администратора.";
const MESSAGE_SKIPPED = "Не отправляли: согласие на сообщения отозвано.";
const MESSAGE_NEIGHBOUR = "Это обращение соседней карты, в чужом журнале его быть не должно.";
const MESSAGE_FOREIGN = "Это обращение чужой клиники.";

/** Метки времени фиксированные: порядок строк — часть договорённости с экраном. */
const AT_SKIPPED = new Date("2026-01-10T08:15:00.000Z");
const AT_NEEDS_CALL = new Date("2026-02-20T09:30:00.000Z");
const AT_INBOUND = new Date("2026-03-05T11:45:00.000Z");
const AT_NEWEST = new Date("2026-04-01T07:05:00.000Z");

type LogResponse = {
	entries: {
		id: string;
		channel: string;
		direction: string;
		status: string;
		message: string;
		actorName: string | null;
		createdAt: string;
	}[];
	totalEvents: number;
	shownEvents: number;
	truncated: boolean;
	needsCallCount: number;
	lastNeedsCallAt: string | null;
	firstEventAt: string | null;
	lastEventAt: string | null;
};

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|does not exist|password authentication|ENOTFOUND/i.test(message);
}

describe("журнал обращений пациента", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";
	let foreignToken = "";
	let databaseAvailable = true;

	/** Одна и та же уборка до засева и после прогона — иначе она не уборка. */
	async function purgeFixtures(): Promise<void> {
		await db.delete(communicationEvents).where(eq(communicationEvents.organizationId, ORG_MINE));
		await db.delete(communicationEvents).where(eq(communicationEvents.organizationId, ORG_FOREIGN));
		await db.delete(patients).where(eq(patients.organizationId, ORG_MINE));
		await db.delete(patients).where(eq(patients.organizationId, ORG_FOREIGN));
		await db.delete(users).where(eq(users.organizationId, ORG_MINE));
		await db.delete(organizations).where(eq(organizations.id, ORG_MINE));
		await db.delete(organizations).where(eq(organizations.id, ORG_FOREIGN));
	}

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		clinicToken = signToken({ organizationId: ORG_MINE }, TEST_SECRET, 3600);
		foreignToken = signToken({ organizationId: ORG_FOREIGN }, TEST_SECRET, 3600);

		app = Fastify({ logger: false });
		await registerPatientRoutes(app);
		await app.ready();

		try {
			// Уборка ПЕРЕД засевом, а не только после: прогон, упавший до after(),
			// иначе оставляет обращения, и следующий прогон считает их своими.
			await purgeFixtures();

			await db
				.insert(organizations)
				.values([
					{ id: ORG_MINE, name: "Клиника журнала обращений" },
					{ id: ORG_FOREIGN, name: "Клиника соседа" },
				])
				.onConflictDoNothing();
			await db
				.insert(users)
				.values({ id: DOCTOR_ID, organizationId: ORG_MINE, fullName: DOCTOR_NAME, role: "doctor" })
				.onConflictDoNothing();
			await db
				.insert(patients)
				.values([
					{ id: PATIENT_MAIN, organizationId: ORG_MINE, fullName: "Основной Пациент" },
					{ id: PATIENT_NEIGHBOUR, organizationId: ORG_MINE, fullName: "Соседняя Карта" },
					{ id: PATIENT_FOREIGN, organizationId: ORG_FOREIGN, fullName: "Пациент Соседней Клиники" },
				])
				.onConflictDoNothing();

			await db
				.insert(communicationEvents)
				.values([
					{
						id: EVENT_NEWEST,
						organizationId: ORG_MINE,
						patientId: PATIENT_MAIN,
						actorUserId: DOCTOR_ID,
						channel: "sms",
						direction: "outbound",
						status: "delivered",
						message: MESSAGE_NEWEST,
						createdAt: AT_NEWEST,
					},
					{
						id: EVENT_INBOUND,
						organizationId: ORG_MINE,
						patientId: PATIENT_MAIN,
						channel: "telegram",
						direction: "inbound",
						status: "completed",
						message: MESSAGE_INBOUND,
						createdAt: AT_INBOUND,
					},
					{
						id: EVENT_NEEDS_CALL,
						organizationId: ORG_MINE,
						patientId: PATIENT_MAIN,
						channel: "phone",
						direction: "outbound",
						status: "needs_call",
						message: MESSAGE_NEEDS_CALL,
						createdAt: AT_NEEDS_CALL,
					},
					{
						id: EVENT_SKIPPED,
						organizationId: ORG_MINE,
						patientId: PATIENT_MAIN,
						channel: "sms",
						direction: "outbound",
						status: "skipped",
						message: MESSAGE_SKIPPED,
						createdAt: AT_SKIPPED,
					},
					{
						id: EVENT_NEIGHBOUR,
						organizationId: ORG_MINE,
						patientId: PATIENT_NEIGHBOUR,
						channel: "sms",
						direction: "outbound",
						status: "delivered",
						message: MESSAGE_NEIGHBOUR,
						createdAt: AT_INBOUND,
					},
					{
						id: EVENT_FOREIGN,
						organizationId: ORG_FOREIGN,
						patientId: PATIENT_FOREIGN,
						channel: "sms",
						direction: "outbound",
						status: "delivered",
						message: MESSAGE_FOREIGN,
						createdAt: AT_INBOUND,
					},
				])
				.onConflictDoNothing();
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtures();
		}
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	async function readLog(token: string, patientId: string, query = ""): Promise<{ status: number; body: string }> {
		const response = await app.inject({
			method: "GET",
			url: `/api/patients/${patientId}/communication-timelines${query}`,
			headers: { [CLINIC_TOKEN_HEADER]: token },
		});
		return { status: response.statusCode, body: response.body };
	}

	test("запрос строк не связывает пациента с самим собой: колонки квалифицированы таблицей", () => {
		const entriesSql = buildPatientCommunicationEntriesQuery(ORG_MINE, PATIENT_MAIN, 100).toSQL().sql;

		// Отбор по пациенту обязан идти по колонке ВНЕШНЕЙ таблицы. Голое
		// "patient_id" = "id" — это и есть та ловушка: всегда ложь, пустой экран.
		assert.match(entriesSql, /"communication_events"\."patient_id"/);
		assert.match(entriesSql, /"communication_events"\."organization_id"/);
		assert.doesNotMatch(entriesSql, /"patient_id"\s*=\s*"id"/);
		// ФИО сотрудника берётся join-ом, а не подзапросом по голому "id".
		assert.match(entriesSql, /left join "users"/i);
		assert.match(entriesSql, /"users"\."id"\s*=\s*"communication_events"\."actor_user_id"/);

		const totalsSql = buildPatientCommunicationTotalsQuery(ORG_MINE, PATIENT_MAIN).toSQL().sql;
		assert.match(totalsSql, /"communication_events"\."status"/);
		assert.match(totalsSql, /"communication_events"\."created_at"/);
		// Без ::int count(*) приходит строкой, и «12» + 1 стало бы «121».
		assert.match(totalsSql, /count\(\*\)::int/);
	});

	test("разбор ?limit=: мусор не уносит журнал, потолок держит размер ответа", () => {
		assert.equal(parsePatientCommunicationLogLimit(undefined), PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT);
		assert.equal(parsePatientCommunicationLogLimit(null), PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT);
		assert.equal(parsePatientCommunicationLogLimit(""), PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT);
		assert.equal(parsePatientCommunicationLogLimit("не число"), PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT);
		assert.equal(parsePatientCommunicationLogLimit(Number.NaN), PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT);
		assert.equal(parsePatientCommunicationLogLimit(" 25 "), 25);
		assert.equal(parsePatientCommunicationLogLimit("7.9"), 7);
		assert.equal(parsePatientCommunicationLogLimit(1), 1);
		// Ноль и отрицательное значение — не «показать всё» и не ошибка базы.
		assert.equal(parsePatientCommunicationLogLimit(0), 1);
		assert.equal(parsePatientCommunicationLogLimit(-40), 1);
		assert.equal(parsePatientCommunicationLogLimit(Number.POSITIVE_INFINITY), PATIENT_COMMUNICATION_LOG_DEFAULT_LIMIT);
		assert.equal(parsePatientCommunicationLogLimit(1_000_000), PATIENT_COMMUNICATION_LOG_MAX_LIMIT);
		// Fastify отдаёт повторённый параметр массивом: ?limit=5&limit=9.
		assert.equal(parsePatientCommunicationLogLimit(["5", "9"]), 5);
	});

	test("журнал отдаёт живые обращения, и число совпадает с базой", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const { status, body } = await readLog(clinicToken, PATIENT_MAIN);
		assert.equal(status, 200, body);
		const log = JSON.parse(body) as LogResponse;

		// Пустой список при засеянных четырёх обращениях = связь по пациенту снова
		// сломана. Это ровно то, что дважды доходило до экрана.
		assert.equal(log.entries.length, 4, body);
		assert.equal(log.shownEvents, 4);
		assert.equal(log.truncated, false);

		const counted = await db.execute(
			sql`select count(*)::int as n from communication_events
			     where organization_id = ${ORG_MINE} and patient_id = ${PATIENT_MAIN}`,
		);
		const inDatabase = (counted.rows[0] as { n: number }).n;
		assert.equal(log.totalEvents, inDatabase, `маршрут ${log.totalEvents}, база ${inDatabase}`);

		// Порядок: сначала самое свежее — карточку читают сверху.
		assert.deepEqual(
			log.entries.map((entry) => entry.message),
			[MESSAGE_NEWEST, MESSAGE_INBOUND, MESSAGE_NEEDS_CALL, MESSAGE_SKIPPED],
		);

		// Канал и направление приходят как есть: из них экран собирает заголовок
		// строки, и «неизвестного» случая не бывает — оба поля enum.
		assert.equal(log.entries[0]?.channel, "sms");
		assert.equal(log.entries[0]?.direction, "outbound");
		assert.equal(log.entries[0]?.status, "delivered");
		// Автор события: ФИО сотрудника, а не его uuid.
		assert.equal(log.entries[0]?.actorName, DOCTOR_NAME);
		// Событие без сотрудника — это машина, и экран скажет «автоматически».
		assert.equal(log.entries[1]?.actorName, null);

		// needs_call обязан быть видим: это «позвонить руками», и больше нигде на
		// карточке такие задачи не показываются.
		assert.equal(log.needsCallCount, 1);
		assert.equal(new Date(String(log.lastNeedsCallAt)).toISOString(), AT_NEEDS_CALL.toISOString());

		// Период нужен счётчику: «4 обращения» без срока — число без смысла.
		assert.equal(new Date(String(log.firstEventAt)).toISOString(), AT_SKIPPED.toISOString());
		assert.equal(new Date(String(log.lastEventAt)).toISOString(), AT_NEWEST.toISOString());
	});

	test("обращения соседней карты в журнал не попадают", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const { status, body } = await readLog(clinicToken, PATIENT_MAIN);
		assert.equal(status, 200, body);
		assert.ok(!body.includes(MESSAGE_NEIGHBOUR), "переписка другого пациента показана в этой карте");
		assert.ok(!body.includes(MESSAGE_FOREIGN), "переписка другой клиники показана в этой карте");

		const neighbour = JSON.parse((await readLog(clinicToken, PATIENT_NEIGHBOUR)).body) as LogResponse;
		assert.equal(neighbour.totalEvents, 1);
		assert.equal(neighbour.entries[0]?.message, MESSAGE_NEIGHBOUR);
	});

	test("чужая клиника не читает журнал по карте этой клиники", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const { status, body } = await readLog(foreignToken, PATIENT_MAIN);
		// Не пустой журнал: пустой журнал сказал бы «обращений не было», а карта
		// вообще не принадлежит этой клинике.
		assert.equal(status, 404, body);
		assert.equal(JSON.parse(body).error, "PatientNotFound");
		assert.ok(!body.includes(MESSAGE_NEWEST));
	});

	test("несуществующая карта отвечает 404, а не пустым журналом", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const { status, body } = await readLog(clinicToken, PATIENT_UNKNOWN);
		assert.equal(status, 404, body);
		assert.equal(JSON.parse(body).error, "PatientNotFound");
	});

	test("?limit= обрезает показанное, но не итог: обрезка видна отдельно", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const { status, body } = await readLog(clinicToken, PATIENT_MAIN, "?limit=2");
		assert.equal(status, 200, body);
		const log = JSON.parse(body) as LogResponse;

		assert.equal(log.entries.length, 2);
		assert.equal(log.shownEvents, 2);
		// Итог считается по всему журналу: иначе «2 обращения» соврало бы вдвое.
		assert.equal(log.totalEvents, 4);
		assert.equal(log.truncated, true);
		// Период тоже по всему журналу, а не по показанным двум строкам.
		assert.equal(new Date(String(log.firstEventAt)).toISOString(), AT_SKIPPED.toISOString());
	});

	test("адрес без карты пациента отвечает человеческим текстом, а не ошибкой типа uuid", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		for (const brokenId of ["undefined", "null", "не-uuid"]) {
			const { status, body } = await readLog(clinicToken, brokenId);
			assert.equal(status, 400, `${brokenId}: ${body}`);
			const parsed = JSON.parse(body) as { error?: string; message?: string };
			assert.equal(parsed.error, "PatientRouteValidationError");
			assert.match(String(parsed.message), /Пациент не выбран/);
			// Ни имени колонки, ни типа базы в тексте для администратора.
			assert.ok(!/uuid|patient_id|syntax/i.test(String(parsed.message)), body);
		}
	});

	test("без токена кабинета журнал не отдаётся", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_MAIN}/communication-timelines`,
		});
		assert.equal(response.statusCode, 401, response.body);
		assert.equal(response.json().error, "AuthRequired");
	});

	test("журнал пациента без обращений — это пустой список, а не отказ", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Заводим карту без единого обращения: экран обязан отличать «через
		// систему не обращались» от «прочитать не удалось».
		await db
			.insert(patients)
			.values({ id: PATIENT_EMPTY, organizationId: ORG_MINE, fullName: "Без Обращений" })
			.onConflictDoNothing();

		const { status, body } = await readLog(clinicToken, PATIENT_EMPTY);
		assert.equal(status, 200, body);
		const log = JSON.parse(body) as LogResponse;
		assert.deepEqual(log.entries, []);
		assert.equal(log.totalEvents, 0);
		assert.equal(log.truncated, false);
		assert.equal(log.needsCallCount, 0);
		assert.equal(log.firstEventAt, null);
		assert.equal(log.lastEventAt, null);
	});
});
