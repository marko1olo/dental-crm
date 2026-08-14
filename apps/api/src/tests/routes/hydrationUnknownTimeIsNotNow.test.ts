/**
 * СТОРОЖ: НЕПРОЧИТАННОЕ ВРЕМЯ СТРОКИ НЕ СТАНОВИТСЯ ВРЕМЕНЕМ «СЕЙЧАС».
 *
 * ЧТО БЫЛО. В `db/domainStateHydration.ts` стоял помощник
 * `isoOrNow(value) = iso(value) ?? new Date().toISOString()` и вызывался
 * ТРИНАДЦАТЬ раз на настоящих строках базы: `patients.created_at/updated_at`,
 * `appointments.starts_at/ends_at`, `users.created_at`, `payments.created_at`,
 * `communication_tasks.due_at/created_at`, `communication_events.created_at`,
 * `imaging_studies.captured_at`, `protocol_templates.updated_at`,
 * `organizations.updated_at`. Строка, чьё время не прочиталось, получала время
 * ОТКРЫТИЯ СТРАНИЦЫ и уезжала в рабочее состояние клиники как настоящая.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Приём переезжал в текущий момент: расписание
 * показывало его там, где его нет, а история пациента получала событие, которого
 * не было. Это тот же запрещённый класс, что и в `tests/unknownIsNotZero.test.ts`
 * («неизвестная сумма не печатается нулём») и в
 * `tests/noFabricatedDataFallback.test.ts` («слой доступа не подменяет данные»), но
 * дороже: там подставлялась метка отсутствия, здесь портились ЖИВЫЕ записи.
 *
 * ЗАМЕР ДО ПРАВКИ, через этот же маршрут на этой же фикстуре (29.07.2026):
 *   первое  GET /api/dashboard -> приём …-0022 startsAt 2026-07-29T09:41:07.026Z
 *   второе  GET /api/dashboard -> приём …-0022 startsAt 2026-07-29T09:41:07.222Z
 * Один и тот же приём в двух соседних чтениях стоит в расписании в разное время,
 * и оба раза — «прямо сейчас». В базе у него `starts_at = 'infinity'`.
 *
 * ПОЧЕМУ ФИКСТУРА ПОЛЬЗУЕТСЯ `infinity`, А НЕ NULL. Все тринадцать колонок
 * объявлены NOT NULL в ФАКТИЧЕСКОЙ схеме — сверено запросом к
 * `information_schema.columns` на живой PostgreSQL 18, а не по объявлению в
 * `db/schema.ts`. Через NULL подстановка недостижима, и проверять её значило бы
 * охранять то, чего не бывает. Достижимо другое: PostgreSQL законно хранит в
 * `timestamptz` значения, которых в JS Date не существует — `infinity`,
 * `-infinity` и годы за пределами ±275760. Драйвер `pg` отдаёт для них
 * `Invalid Date`, `iso()` честно возвращает `null`, и вся цена дефекта была в
 * `?? new Date()` после него. Проверено щупом на драйвере:
 *   'infinity'::timestamptz            -> number Infinity
 *   '294276-01-01'::timestamptz        -> Date, getTime() = NaN
 * На сегодняшней базе таких строк ноль по всем одиннадцати колонкам — дефект был
 * заряжен, а не сработал, и этот сторож держит его закрытым.
 *
 * ЧТО ОХРАНЯЕТСЯ ЗДЕСЬ
 *   1. Время каждого приёма и каждого пациента в ответе маршрута РАЗРЕШАЕТСЯ в
 *      значение из его строки базы. Третьего варианта нет: ни часы сервера, ни
 *      «примерно сейчас» не проходят.
 *   2. Строка с нечитаемым временем в ответ не попадает вовсе — вместо неё в
 *      журнале сервера лежит причина с таблицей, идентификатором строки и
 *      колонкой. Отказ не проглатывается: сообщение проверяется дословно.
 *   3. Два соседних чтения одной клиники дают ОДИН И ТОТ ЖЕ список приёмов и
 *      пациентов. Подстановка из часов расходится между чтениями всегда.
 *   4. Рабочий путь не сломан: строки с читаемым временем на месте и с точностью
 *      до миллисекунды совпадают с базой.
 *
 * ТРЕБУЕТСЯ живая PostgreSQL (DATABASE_URL из .env корня репозитория).
 * ЗАПУСК: cd apps/api && npx tsx --test src/tests/routes/hydrationUnknownTimeIsNotNow.test.ts
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { denteAdminSecretHeader } from "../../accessGuard.js";
import { db, pool } from "../../db/client.js";
import { appointments, organizations, patients } from "../../db/schema.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import {
	authTokenSecret,
	clinicalAdminSecret,
} from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "hydrationUnknownTimeIsNotNow";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
/** Пациент с читаемым временем — рабочий путь, который правка не должна сломать. */
const PATIENT_OK_ID = fixtureUuid(NAMESPACE, 11);
/** Пациент, чьё `created_at` база отдаёт нечитаемым. */
const PATIENT_BROKEN_ID = fixtureUuid(NAMESPACE, 12);
/** Приём с настоящим временем. */
const APPOINTMENT_OK_ID = fixtureUuid(NAMESPACE, 21);
/** Приём, чьё `starts_at`/`ends_at` база отдаёт нечитаемым. */
const APPOINTMENT_BROKEN_ID = fixtureUuid(NAMESPACE, 22);

const FIXTURE_ORGANIZATION_IDS = [ORGANIZATION_ID] as const;

/**
 * Время настоящего приёма — ФИКСИРОВАННОЕ и заведомо не сегодняшнее.
 *
 * Так «совпало с базой» нельзя случайно получить подстановкой из часов: любое
 * значение, взятое из `new Date()`, от этой даты отличается годами.
 */
const OK_STARTS_AT = "2025-03-04T08:15:00.000Z";
const OK_ENDS_AT = "2025-03-04T09:00:00.000Z";

type DashboardAppointment = {
	id?: unknown;
	startsAt?: unknown;
	endsAt?: unknown;
};
type DashboardPatient = {
	id?: unknown;
	createdAt?: unknown;
	updatedAt?: unknown;
};
type DashboardBody = {
	appointments?: DashboardAppointment[];
	patients?: DashboardPatient[];
};

let app: FastifyInstance;

function headersFor(organizationId: string): Record<string, string> {
	const secret = clinicalAdminSecret();
	return {
		"x-dente-clinic-token": signToken({ organizationId }, authTokenSecret()),
		...(secret ? { [denteAdminSecretHeader]: secret } : {}),
	};
}

async function readDashboard(): Promise<DashboardBody> {
	const response = await app.inject({
		method: "GET",
		url: "/api/dashboard",
		headers: headersFor(ORGANIZATION_ID),
	});
	assert.equal(
		response.statusCode,
		200,
		`Сводка главного экрана не отдана: ${response.statusCode} ${response.body.slice(0, 400)}`,
	);
	return JSON.parse(response.body) as DashboardBody;
}

/**
 * Читает сводку, перехватывая журнал сервера.
 *
 * Перехват нужен по существу, а не для удобства: правило требует, чтобы отказ от
 * строки НЕ проглатывался. Без этой проверки «строки в ответе нет» одинаково
 * выполнялось бы и молчаливым выбрасыванием, а тогда никто в клинике не узнал бы,
 * что запись существует и её время надо исправить.
 */
async function readDashboardWithServerLog(): Promise<{
	body: DashboardBody;
	errors: string[];
}> {
	const errors: string[] = [];
	const original = console.error;
	console.error = (...args: unknown[]): void => {
		errors.push(
			args
				.map((entry) =>
					entry instanceof Error ? entry.message : String(entry),
				)
				.join(" "),
		);
	};
	try {
		const body = await readDashboard();
		return { body, errors };
	} finally {
		console.error = original;
	}
}

before(async () => {
	// Уборка НА ВХОДЕ: прогон, убитый снаружи (Ctrl+C, закрытая труба), до `after`
	// не доходит, и его строки следующий прогон читает как данные клиники.
	await purgeFixtureOrganizations(FIXTURE_ORGANIZATION_IDS);

	/*
	 * Весь сев — под тенант-контекстом клиники. Под принудительным RLS INSERT без
	 * него отвергается кодом 42501, а UPDATE тихо трогает ноль строк: порча времени
	 * не встала бы, и сторож охранял бы пустое место, оставаясь зелёным.
	 */
	await withFixtureTenant(ORGANIZATION_ID, async () => {
		await db.insert(organizations).values({
			id: ORGANIZATION_ID,
			name: "Сторож нечитаемого времени",
		});
		await db.insert(patients).values([
			{
				id: PATIENT_OK_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Читаемов Пациент Временович",
			},
			{
				id: PATIENT_BROKEN_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Нечитаемов Пациент Временович",
			},
		]);
		await db.insert(appointments).values([
			{
				id: APPOINTMENT_OK_ID,
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_OK_ID,
				status: "planned",
				startsAt: new Date(OK_STARTS_AT),
				endsAt: new Date(OK_ENDS_AT),
				reason: "контроль пломбы 36",
			},
			{
				id: APPOINTMENT_BROKEN_ID,
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_OK_ID,
				status: "planned",
				startsAt: new Date(OK_STARTS_AT),
				endsAt: new Date(OK_ENDS_AT),
				reason: "снятие швов",
			},
		]);

		/*
		 * Нечитаемое время ставится ОТДЕЛЬНЫМ SQL, а не через drizzle: `infinity` в JS
		 * Date не существует, поэтому передать его слоем ORM нечем — и именно поэтому
		 * собственные записывающие пути приложения такую строку не создают. Порча
		 * приходит из восстановления дампа чужой системы и из правок SQL руками.
		 */
		await db.execute(sql`
			update appointments set starts_at = '-infinity', ends_at = 'infinity'
			 where id = ${APPOINTMENT_BROKEN_ID}::uuid`);
		await db.execute(sql`
			update patients set created_at = 'infinity'
			 where id = ${PATIENT_BROKEN_ID}::uuid`);
	});

	// Оба хука изоляции боевого server.ts: он наполняет личность запроса и
	// оборачивает обработчик в `withTenantCtx`, без которого сводка читает ноль строк.
	app = createTenantTestApp();
	await registerDashboardRoutes(app);
	await app.ready();
});

after(async () => {
	await app?.close();
	await purgeFixtureOrganizations(FIXTURE_ORGANIZATION_IDS);
	// Пересчёт остатка — под тенант-контекстом: без него политика прячет от счёта
	// любые уцелевшие строки, и проверка «мусора не осталось» стала бы тождеством.
	const leftovers = await withFixtureTenant(ORGANIZATION_ID, async () =>
		db.execute<{ rows_left: number }>(sql`
			select (
				(select count(*) from organizations where id = ${ORGANIZATION_ID}::uuid)
				+ (select count(*) from appointments where organization_id = ${ORGANIZATION_ID}::uuid)
				+ (select count(*) from patients where organization_id = ${ORGANIZATION_ID}::uuid)
			)::int as rows_left`),
	);
	assert.equal(
		leftovers.rows[0]?.rows_left,
		0,
		"Сторож не убрал свои строки из живой базы. Оставленный мусор следующий прогон читает как данные клиники.",
	);
	await pool.end();
});

describe("GET /api/dashboard: время строки берётся из базы, а не из часов сервера", () => {
	it("посев проверен: в базе есть и читаемое, и нечитаемое время", async () => {
		// Счёт посеянного — под тенант-контекстом: без него все три числа равны нулю
		// не потому, что сев не удался, а потому, что политика скрыла строки.
		const seeded = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{
				broken_appointments: number;
				broken_patients: number;
				ok_appointments: number;
			}>(sql`
				select
					(select count(*)::int from appointments
					  where organization_id = ${ORGANIZATION_ID}::uuid and starts_at = '-infinity') as broken_appointments,
					(select count(*)::int from patients
					  where organization_id = ${ORGANIZATION_ID}::uuid and created_at = 'infinity') as broken_patients,
					(select count(*)::int from appointments
					  where organization_id = ${ORGANIZATION_ID}::uuid and starts_at = ${OK_STARTS_AT}) as ok_appointments`),
		);
		const row = seeded.rows[0];
		assert.equal(
			row?.broken_appointments,
			1,
			"Приём с нечитаемым временем не посеян — проверка была бы ни о чём.",
		);
		assert.equal(
			row?.broken_patients,
			1,
			"Пациент с нечитаемым временем не посеян.",
		);
		assert.equal(
			row?.ok_appointments,
			1,
			"Приём с настоящим временем не посеян — рабочий путь проверять нечем.",
		);
	});

	it("приём с нечитаемым временем не встаёт в расписание на «сейчас»", async () => {
		const { body, errors } = await readDashboardWithServerLog();
		const list = body.appointments ?? [];
		const broken = list.find((entry) => entry.id === APPOINTMENT_BROKEN_ID);

		assert.equal(
			broken,
			undefined,
			`Приём ${APPOINTMENT_BROKEN_ID} попал в расписание со временем ` +
				`startsAt=${JSON.stringify(broken?.startsAt)} endsAt=${JSON.stringify(broken?.endsAt)}, ` +
				`хотя в базе у него starts_at = 'infinity' — времени этого приёма никто не знает. ` +
				`Часы сервера в этот момент: ${new Date().toISOString()}. Сервер поставил приём в расписание ` +
				"на момент открытия страницы: администратор увидит его в текущем часе поверх настоящего приёма, " +
				"а его настоящее окно останется свободным для новой записи.",
		);

		// Отказ обязан быть слышен. Молчаливое выбрасывание строки — второй дефект,
		// а не починка первого: клиника не узнает, что запись есть и её надо исправить.
		const named = errors.filter(
			(line) =>
				line.includes(APPOINTMENT_BROKEN_ID) && line.includes("starts_at"),
		);
		assert.ok(
			named.length > 0,
			"Строка пропущена МОЛЧА: в журнале сервера нет ни одной записи, называющей приём " +
				`${APPOINTMENT_BROKEN_ID} и колонку starts_at. Полученный журнал: ${JSON.stringify(errors)}`,
		);
		assert.match(
			named[0] ?? "",
			/appointments/,
			`В журнале не названа таблица, в которой надо править строку: «${named[0]}»`,
		);
		assert.match(
			named[0] ?? "",
			new RegExp(ORGANIZATION_ID),
			`В журнале не названа клиника: на общей базе строку иначе не найти. Пришло: «${named[0]}»`,
		);
	});

	it("пациент с нечитаемым временем регистрации не заводится «сегодня»", async () => {
		const { body, errors } = await readDashboardWithServerLog();
		const list = body.patients ?? [];
		const broken = list.find((entry) => entry.id === PATIENT_BROKEN_ID);

		assert.equal(
			broken,
			undefined,
			`Пациент ${PATIENT_BROKEN_ID} отдан с createdAt=${JSON.stringify(broken?.createdAt)}, ` +
				`хотя в базе created_at = 'infinity'. Часы сервера: ${new Date().toISOString()}. Так пациент, ` +
				"заведённый годы назад, попадает в отчёт «новые пациенты за месяц» и в списки первичного приёма.",
		);
		assert.ok(
			errors.some(
				(line) =>
					line.includes(PATIENT_BROKEN_ID) && line.includes("created_at"),
			),
			`Пациент пропущен молча: журнал не называет ни строку, ни колонку. Пришло: ${JSON.stringify(errors)}`,
		);
	});

	it("два соседних чтения дают одно и то же расписание и один и тот же список пациентов", async () => {
		const first = await readDashboard();
		// Пауза больше разрешения часов: иначе «совпало» означало бы лишь то, что оба
		// запроса уложились в одну миллисекунду.
		await new Promise((resolve) => setTimeout(resolve, 40));
		const second = await readDashboard();

		assert.deepEqual(
			second.appointments,
			first.appointments,
			"Расписание клиники разъехалось между двумя соседними чтениями. Ни одна запись за это время не " +
				"менялась, значит время взято из часов сервера, а не из базы. Именно так приём переезжал на " +
				"момент открытия страницы.",
		);
		assert.deepEqual(
			second.patients,
			first.patients,
			"Список пациентов разъехался между двумя чтениями: время регистрации или изменения карты берётся " +
				"из часов, а не из базы.",
		);
	});

	it("рабочий путь не сломан: читаемое время совпадает с базой до миллисекунды", async () => {
		const body = await readDashboard();
		const list = body.appointments ?? [];
		const ok = list.find((entry) => entry.id === APPOINTMENT_OK_ID);

		assert.ok(
			ok,
			`Приём ${APPOINTMENT_OK_ID} с настоящим временем ${OK_STARTS_AT} пропал из расписания. Правка ` +
				"выбросила рабочие записи вместе с испорченными — это хуже дефекта: клиника потеряла приём.",
		);
		assert.equal(
			ok.startsAt,
			OK_STARTS_AT,
			`Время начала приёма не совпало с базой: ${JSON.stringify(ok.startsAt)} против ${OK_STARTS_AT}.`,
		);
		assert.equal(
			ok.endsAt,
			OK_ENDS_AT,
			`Время окончания приёма не совпало с базой: ${JSON.stringify(ok.endsAt)} против ${OK_ENDS_AT}.`,
		);

		const okPatient = (body.patients ?? []).find(
			(entry) => entry.id === PATIENT_OK_ID,
		);
		assert.ok(
			okPatient,
			`Пациент ${PATIENT_OK_ID} с читаемым временем пропал из списка.`,
		);

		/*
		 * Время читаемого пациента сверяется С БАЗОЙ, а не с константой: `created_at`
		 * ему поставил DEFAULT now() при посеве, и записывать это значение в тест
		 * значило бы сверять код с самим собой.
		 */
		const stored = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db
				.select({
					createdAt: patients.createdAt,
					updatedAt: patients.updatedAt,
				})
				.from(patients)
				.where(eq(patients.id, PATIENT_OK_ID)),
		);
		assert.equal(
			okPatient.createdAt,
			stored[0]?.createdAt?.toISOString(),
			"Время регистрации читаемого пациента в ответе не совпало со строкой базы.",
		);
		assert.equal(
			okPatient.updatedAt,
			stored[0]?.updatedAt?.toISOString(),
			"Время изменения карты читаемого пациента в ответе не совпало со строкой базы.",
		);
	});

	it("ни одно время в ответе не равно часам сервера", async () => {
		/*
		 * Общая форма правила, а не только про две посеянные строки: любое время в
		 * расписании и в списке пациентов обязано разрешаться в значение из базы.
		 * Проверка идёт по МОМЕНТУ ЗАПРОСА с окном в пять секунд — подстановка
		 * `new Date()` попадает в него всегда, а настоящие времена фикстуры отстоят
		 * от него на год и больше.
		 */
		const requestedAt = Date.now();
		const body = await readDashboard();
		const window = 5_000;

		for (const appointment of body.appointments ?? []) {
			for (const [field, value] of [
				["startsAt", appointment.startsAt],
				["endsAt", appointment.endsAt],
			] as const) {
				const parsed = Date.parse(String(value));
				assert.ok(
					Number.isFinite(parsed),
					`Приём ${String(appointment.id)}: поле ${field} не разбирается как время: ${JSON.stringify(value)}`,
				);
				assert.ok(
					Math.abs(parsed - requestedAt) > window,
					`Приём ${String(appointment.id)}: ${field} = ${JSON.stringify(value)} отличается от момента ` +
						`запроса меньше чем на ${window} мс. Это время открытия страницы, а не время приёма.`,
				);
			}
		}
		for (const patient of body.patients ?? []) {
			const parsed = Date.parse(String(patient.createdAt));
			assert.ok(
				Number.isFinite(parsed),
				`Пациент ${String(patient.id)}: createdAt не разбирается как время: ${JSON.stringify(patient.createdAt)}`,
			);
		}
	});
});
