import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { appointmentActionCodes } from "../../db/communicationsSchema.js";
import {
	appointments,
	clinics,
	communicationOutbox,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import {
	dayBoundsInTimeZone,
	registerDayConfirmationRoutes,
	tomorrowInTimeZone,
} from "../../routes/dayConfirmations.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * Утренний обзвон.
 *
 * ЗАЧЕМ ЭТОТ ЭКРАН. Подтверждение приёма по ссылке уже работает, но его
 * результата администратор нигде не видел — и продолжал обзванивать всех
 * подряд: половину звонков зря, половину нужных пропуская, потому что не знал,
 * до кого напоминание не дошло.
 *
 * ГЛАВНОЕ, ЧТО ПРОВЕРЯЕТСЯ — поле needsCall. Звонить нужно тому, кто не
 * подтвердил И до кого напоминание не дошло. Доставленное напоминание без
 * ответа поводом для звонка не является: у пациента был выбор.
 */

/*
 * БЛОК ИДЕНТИФИКАТОРОВ ВЫВЕДЕН ИЗ ИМЕНИ ФАЙЛА.
 *
 * Прежде он был выписан руками как `dce70000-…-07xx` — и тот же блок держал
 * patientRecall.test.ts: организация `…-701` у обоих одна, пациенты `…-711`,
 * `…-712` и `…-713` тоже одни. `node --test` запускает файлы параллельно, каждый
 * в своём процессе, поэтому `after` соседа удалял приёмы посреди этого теста, а
 * onConflictDoNothing при совпадении первичного ключа молча оставлял ЧУЖОГО
 * пациента. Замерено на этой паре файлов в одном прогоне: 4 упавших теста, среди
 * них «в дне с четырьмя приёмами не вернулось ни одной строки» — то есть обзвон
 * оставался БЕЗ ЕДИНОЙ СТРОКИ на верном ответе маршрута. По отдельности каждый
 * файл зелёный, поэтому набор краснел «через прогон» без единой правки в коде.
 *
 * fixtureUuid выводит блок из имени пространства, поэтому выдать его второму
 * файлу нельзя — для этого файлам пришлось бы совпасть именем. Реестра блоков
 * не нужно, см. tests/support/fixtureOrganizations.ts.
 */
const FIXTURE = "dayConfirmations";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);
const ORG_HEADERS = { "x-organization-id": ORG_ID };

// Четыре пациента под четыре разных случая.
const CONFIRMED_PATIENT = fixtureUuid(FIXTURE, 0x11);
const DELIVERED_PATIENT = fixtureUuid(FIXTURE, 0x12);
const FAILED_PATIENT = fixtureUuid(FIXTURE, 0x13);
const NO_REMINDER_PATIENT = fixtureUuid(FIXTURE, 0x14);

const CONFIRMED_APPOINTMENT = fixtureUuid(FIXTURE, 0x21);
const DELIVERED_APPOINTMENT = fixtureUuid(FIXTURE, 0x22);
const FAILED_APPOINTMENT = fixtureUuid(FIXTURE, 0x23);
const NO_REMINDER_APPOINTMENT = fixtureUuid(FIXTURE, 0x24);

/** Чужая организация для проверки изоляции: своя же, но с другим слотом. */
const FOREIGN_ORG = fixtureUuid(FIXTURE, 0xff);

/*
 * Ответ маршрута в том виде, в каком его читают проверки ниже. Без этого
 * описания `JSON.parse` даёт any, Map по строкам выводится как
 * Map<unknown, unknown>, а `?.needsCall` сужает unknown до `{}` — то есть до
 * типа без единого свойства. Именно так главное поле этого экрана оставалось
 * непроверяемым: опечатка в его имени не поймалась бы ничем.
 */
type DayConfirmationsRow = {
	appointmentId: string;
	startsAt: string;
	status: string;
	patientId: string;
	patientName: string;
	phone: string | null;
	doctorName: string | null;
	needsCall: boolean;
	patientClickedAt: string | null;
	reminder: { state: string; detail: string | null };
};

type DayConfirmationsBody = {
	date: string;
	timeZone: string;
	isEmpty: boolean;
	rows: DayConfirmationsRow[];
	summary: {
		total: number;
		confirmed: number;
		awaiting: number;
		cancelled: number;
		noShow: number;
		needsCall: number;
		withoutPhone: number;
	};
};

/** Строки по идентификатору приёма: ключ типизирован, значение — строка ответа. */
function rowsByAppointment(
	body: DayConfirmationsBody,
): Map<string, DayConfirmationsRow> {
	return new Map<string, DayConfirmationsRow>(
		body.rows.map((row) => [row.appointmentId, row]),
	);
}

describe("границы дня в часовом поясе клиники", () => {
	test("сутки начинаются по местному времени, а не по серверному", () => {
		// В клинике на востоке страны «завтра» наступает раньше: считать по
		// серверному поясу значит съехать списком приёмов на сутки.
		const moscow = dayBoundsInTimeZone("2026-07-28", "Europe/Moscow");
		assert.equal(moscow?.from.toISOString(), "2026-07-27T21:00:00.000Z");

		const yekaterinburg = dayBoundsInTimeZone(
			"2026-07-28",
			"Asia/Yekaterinburg",
		);
		assert.equal(yekaterinburg?.from.toISOString(), "2026-07-27T19:00:00.000Z");

		const utc = dayBoundsInTimeZone("2026-07-28", "UTC");
		assert.equal(utc?.from.toISOString(), "2026-07-28T00:00:00.000Z");
	});

	test("сутки длятся сутки", () => {
		const bounds = dayBoundsInTimeZone("2026-07-28", "Europe/Moscow");
		assert.ok(bounds);
		assert.equal(
			bounds.to.getTime() - bounds.from.getTime(),
			24 * 60 * 60 * 1000 - 1,
		);
	});

	/*
	 * ДЕНЬ ПЕРЕХОДА НА ЗИМНЕЕ ВРЕМЯ — 25 ЧАСОВ, И ИМЕННО ОН ЛОМАЛ ОБЗВОН.
	 *
	 * Прежний расчёт прибавлял к текущему моменту 24 часа и форматировал
	 * результат в поясе клиники. В сутки длиной 25 часов прибавленные 24 часа не
	 * доводят до следующей календарной даты, и список «на завтра» молча
	 * становился списком на СЕГОДНЯ: администратор обзванивал не тот день, а
	 * завтрашние приёмы оставались без подтверждения. Один раз в год, тихо, без
	 * ошибки на экране.
	 *
	 * Момент выбран проверяемый: 2026-11-01T04:30:00Z в America/New_York — это
	 * 1 ноября 00:30 по местному времени, а переход происходит в 02:00 того же
	 * дня. Прежний расчёт давал здесь 2026-11-01.
	 */
	test("в сутках длиной 25 часов завтра всё равно завтра", () => {
		const beforeFallBack = new Date("2026-11-01T04:30:00.000Z");
		assert.equal(
			tomorrowInTimeZone("America/New_York", beforeFallBack),
			"2026-11-02",
		);

		// Тот же момент прежним способом — чтобы разница была видна, а не
		// принималась на слово.
		const shiftedByDay = new Intl.DateTimeFormat("en-CA", {
			timeZone: "America/New_York",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date(beforeFallBack.getTime() + 24 * 60 * 60 * 1000));
		assert.equal(
			shiftedByDay,
			"2026-11-01",
			"проверяемый пример перестал быть примером: 24 часа больше не отстают",
		);
	});

	test("переход через конец месяца и года не теряет день", () => {
		// 31 июля в Москве: завтра — август, а не «32 июля» и не сегодня.
		assert.equal(
			tomorrowInTimeZone("Europe/Moscow", new Date("2026-07-31T20:00:00.000Z")),
			"2026-08-01",
		);
		// 23:30 по Москве 31 декабря: в UTC ещё старый год.
		assert.equal(
			tomorrowInTimeZone("Europe/Moscow", new Date("2026-12-31T20:30:00.000Z")),
			"2027-01-01",
		);
	});

	test("неизвестный пояс не роняет обзвон, а отвечает сутками вперёд по UTC", () => {
		assert.equal(
			tomorrowInTimeZone("Марс/Олимп", new Date("2026-07-28T10:00:00.000Z")),
			"2026-07-29",
		);
	});

	test("испорченная дата и неизвестный пояс не роняют разбор", () => {
		assert.equal(dayBoundsInTimeZone("не дата", "Europe/Moscow"), null);
		assert.equal(dayBoundsInTimeZone("2026-07-28", "Марс/Олимп"), null);
	});
});

describe("список подтверждений на день", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = { ...process.env };
	/*
	 * Приёмы ставятся на завтра: обзвон делают накануне, и это же значение по
	 * умолчанию у маршрута.
	 *
	 * ЧЕМ БЫЛА ПЛОХА ПРЕЖНЯЯ ФИКСТУРА. Она брала `Date.now() + 24 ч` и добивала
	 * момент до 09:00 ПО UTC. Это откатывало момент назад, и когда дата в UTC
	 * отстаёт от даты в Москве — то есть каждый день с 21:00 до 24:00 UTC — тест
	 * ждал СЕГОДНЯШНЮЮ дату и падал на верном ответе маршрута. Три часа в сутки
	 * набор был красным без единой правки в коде: ровно тот случайно красный
	 * сторож, который обесценивает весь набор.
	 *
	 * Дата считается КАЛЕНДАРНО и НЕЗАВИСИМО от маршрута: своё форматирование,
	 * своё прибавление дня. Позвать `tomorrowInTimeZone` было бы проще, но тогда
	 * утверждение «по умолчанию берётся завтрашний день» проверяло бы функцию
	 * сама на себя и не заметило бы её поломки.
	 */
	const moscowToday = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Moscow",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
	const [moscowYear, moscowMonth, moscowDay] = moscowToday
		.split("-")
		.map((value) => Number.parseInt(value, 10));
	const isoDate = new Date(
		Date.UTC(moscowYear!, moscowMonth! - 1, moscowDay! + 1),
	)
		.toISOString()
		.slice(0, 10);

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		/*
		 * Приложение собирается с теми же двумя хуками изоляции, что вешает боевой
		 * server.ts: без обёртки `withTenantCtx` вокруг обработчика запрос к базе
		 * под принудительным RLS возвращает НОЛЬ строк без ошибки, и обзвон отвечал
		 * бы пустым списком на засеянный день.
		 */
		app = createTenantTestApp();
		await registerDayConfirmationRoutes(app);

		try {
			/*
			 * Уборка ПЕРЕД засевом, по каталогу базы, а не только в after(): прогон,
			 * убитый снаружи, до after не доходит и оставляет свою клинику в живой
			 * базе. Здесь все места засева ключевые (явные id, unique(organization_id,
			 * dedupe_key) у очереди сообщений, code как первичный ключ у кодов
			 * действий), поэтому досева поверх остатка не было — но остаток прежнего
			 * блока `…-07xx`, общего с patientRecall, снять всё равно нужно.
			 */
			await purgeFixtureOrganizations([ORG_ID, FOREIGN_ORG]);

			/*
			 * Сев идёт под тенант-контекстом клиники. У всех тенант-таблиц, кроме
			 * `organizations`, в WITH CHECK стоит только `organization_id =
			 * current_tenant`, без дизъюнкта обхода: вставка без контекста отвергается
			 * кодом 42501, и обход RLS её не спасает.
			 */
			await withFixtureTenant(ORG_ID, async () => {
				// Без onConflictDoNothing: место расчищено выше, и конфликт первичного
				// ключа здесь означал бы, что фикстура сеет не туда, куда думает.
				await db
					.insert(organizations)
					.values({ id: ORG_ID, name: "Клиника обзвона" });
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главная",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Смирнов Сергей Сергеевич",
					role: "doctor",
				});
				await db.insert(patients).values([
					{
						id: CONFIRMED_PATIENT,
						organizationId: ORG_ID,
						fullName: "Подтвердил Пётр",
						phone: "+7 916 000-07-01",
					},
					{
						id: DELIVERED_PATIENT,
						organizationId: ORG_ID,
						fullName: "Получил Павел",
						phone: "+7 916 000-07-02",
					},
					{
						id: FAILED_PATIENT,
						organizationId: ORG_ID,
						fullName: "Недоставлен Дмитрий",
						phone: "+7 916 000-07-03",
					},
					// Без телефона: напоминание отправить некуда, звонить тоже.
					{
						id: NO_REMINDER_PATIENT,
						organizationId: ORG_ID,
						fullName: "Безномера Николай",
						phone: null,
					},
				]);

				/*
				 * Приёмы привязываются К САМОЙ ДАТЕ, а не к «сейчас плюс сутки»: 09:00
				 * UTC — это 12:00 по Москве того же календарного дня, и четыре приёма со
				 * сдвигом 0-3 часа заведомо попадают в московские сутки isoDate. Прежний
				 * якорь считался от текущего момента и в трёх часах суток уезжал на
				 * предыдущий день вместе с ожидаемой датой.
				 */
				const dayAnchor = new Date(`${isoDate}T09:00:00.000Z`);
				const slot = (offsetHours: number) => ({
					startsAt: new Date(dayAnchor.getTime() + offsetHours * 3_600_000),
					endsAt: new Date(
						dayAnchor.getTime() + offsetHours * 3_600_000 + 3_600_000,
					),
				});

				await db.insert(appointments).values([
					{
						id: CONFIRMED_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: CONFIRMED_PATIENT,
						doctorUserId: DOCTOR_ID,
						status: "confirmed",
						...slot(0),
					},
					{
						id: DELIVERED_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: DELIVERED_PATIENT,
						doctorUserId: DOCTOR_ID,
						status: "planned",
						...slot(1),
					},
					{
						id: FAILED_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: FAILED_PATIENT,
						doctorUserId: DOCTOR_ID,
						status: "planned",
						...slot(2),
					},
					{
						id: NO_REMINDER_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: NO_REMINDER_PATIENT,
						doctorUserId: DOCTOR_ID,
						status: "planned",
						...slot(3),
					},
				]);

				await db.insert(communicationOutbox).values([
					{
						organizationId: ORG_ID,
						patientId: CONFIRMED_PATIENT,
						channel: "sms",
						intent: "appointment_confirmation",
						recipientAddress: "79160000701",
						body: "Напоминание",
						status: "delivered",
						sentAt: new Date(),
						deliveredAt: new Date(),
						receiptDetail: "SMS.RU 103: Доставлено",
						dedupeKey: `reminder:${CONFIRMED_APPOINTMENT}:24`,
					},
					{
						organizationId: ORG_ID,
						patientId: DELIVERED_PATIENT,
						channel: "sms",
						intent: "appointment_confirmation",
						recipientAddress: "79160000702",
						body: "Напоминание",
						status: "delivered",
						sentAt: new Date(),
						deliveredAt: new Date(),
						receiptDetail: "SMS.RU 103: Доставлено",
						dedupeKey: `reminder:${DELIVERED_APPOINTMENT}:24`,
					},
					{
						organizationId: ORG_ID,
						patientId: FAILED_PATIENT,
						channel: "sms",
						intent: "appointment_confirmation",
						recipientAddress: "79160000703",
						body: "Напоминание",
						status: "failed",
						lastErrorMessage: "Не доставлено: истёк срок жизни сообщения",
						dedupeKey: `reminder:${FAILED_APPOINTMENT}:24`,
					},
				]);

				// Пациент нажал ссылку — это видно отдельно от статуса записи.
				await db
					.insert(appointmentActionCodes)
					.values({
						code: "ConfirmAA1",
						organizationId: ORG_ID,
						appointmentId: CONFIRMED_APPOINTMENT,
						action: "confirm",
						expiresAt: new Date(Date.now() + 86_400_000),
						usedAt: new Date(),
					})
					.onConflictDoNothing();
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			/*
			 * Уборка тоже идёт под тенант-контекстом. DELETE без него не ошибается —
			 * политика просто не показывает ни одной строки, и удаляется ноль: хук
			 * отчитался бы об успехе, оставив клинику в общей базе.
			 */
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.delete(appointmentActionCodes)
					.where(eq(appointmentActionCodes.organizationId, ORG_ID));
				await db
					.delete(communicationOutbox)
					.where(eq(communicationOutbox.organizationId, ORG_ID));
				await db
					.delete(appointments)
					.where(eq(appointments.organizationId, ORG_ID));
				await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
				await db.delete(users).where(eq(users.organizationId, ORG_ID));
				await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
				await db.delete(organizations).where(eq(organizations.id, ORG_ID));
			});
		}
		await app.close();
		process.env = originalEnv;
	});

	test("по умолчанию берётся завтрашний день в поясе клиники", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/schedule/day-confirmations",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as DayConfirmationsBody;
		assert.equal(body.date, isoDate, `ожидалась дата ${isoDate}`);
		assert.equal(body.timeZone, "Europe/Moscow");
		assert.equal(body.summary.total, 4, JSON.stringify(body.summary));
	});

	test("звонить нужно только тем, до кого напоминание не дошло", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: ORG_HEADERS,
		});
		const body = JSON.parse(response.body) as DayConfirmationsBody;
		const byId = rowsByAppointment(body);

		// Подтвердил — звонить не нужно.
		assert.equal(byId.get(CONFIRMED_APPOINTMENT)?.needsCall, false);
		// Напоминание доставлено, ответа нет: выбор у пациента был, звонок не нужен.
		assert.equal(byId.get(DELIVERED_APPOINTMENT)?.needsCall, false);
		// Напоминание не доставлено — человек просто ничего не знает.
		assert.equal(byId.get(FAILED_APPOINTMENT)?.needsCall, true);
		// Напоминание вообще не ставилось.
		assert.equal(byId.get(NO_REMINDER_APPOINTMENT)?.needsCall, true);

		assert.equal(body.summary.needsCall, 2, JSON.stringify(body.summary));
		assert.equal(body.summary.confirmed, 1);
		assert.equal(body.summary.awaiting, 3);
		assert.equal(body.summary.withoutPhone, 1);
	});

	test("состояние напоминания и причина отказа видны в строке", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: ORG_HEADERS,
		});
		const body = JSON.parse(response.body) as DayConfirmationsBody;
		const byId = rowsByAppointment(body);

		assert.equal(byId.get(DELIVERED_APPOINTMENT)?.reminder.state, "delivered");
		assert.equal(byId.get(FAILED_APPOINTMENT)?.reminder.state, "failed");
		assert.ok(
			byId.get(FAILED_APPOINTMENT)?.reminder.detail?.includes("истёк срок"),
		);
		assert.equal(
			byId.get(NO_REMINDER_APPOINTMENT)?.reminder.state,
			"not_queued",
		);
	});

	test("нажатие ссылки видно отдельно от статуса записи", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: ORG_HEADERS,
		});
		const body = JSON.parse(response.body) as DayConfirmationsBody;
		const byId = rowsByAppointment(body);

		assert.notEqual(byId.get(CONFIRMED_APPOINTMENT)?.patientClickedAt, null);
		assert.equal(byId.get(DELIVERED_APPOINTMENT)?.patientClickedAt, null);
	});

	test("строки идут по времени приёма", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: ORG_HEADERS,
		});
		const body = JSON.parse(response.body) as DayConfirmationsBody;
		const times = body.rows.map((row) => new Date(row.startsAt).getTime());
		assert.deepEqual(
			times,
			[...times].sort((left, right) => left - right),
		);
		// Врач подставлен по идентификатору, а не «Врач клиники».
		const earliest = body.rows[0];
		assert.ok(
			earliest,
			"в дне с четырьмя приёмами не вернулось ни одной строки",
		);
		assert.equal(earliest.doctorName, "Смирнов Сергей Сергеевич");
	});

	test("день без приёмов помечен явно", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/schedule/day-confirmations?date=2020-01-01",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as DayConfirmationsBody;
		assert.equal(body.isEmpty, true);
		assert.equal(body.summary.total, 0);
		assert.deepEqual(body.rows, []);
	});

	test("испорченная дата отклоняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/schedule/day-confirmations?date=28.07.2026",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 400, response.body);
	});

	test("данные чужой организации не видны", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: { "x-organization-id": "dce70000-0000-4000-8000-0000000007ff" },
		});
		assert.equal(response.statusCode, 200, response.body);
		assert.equal(JSON.parse(response.body).summary.total, 0);
	});
});
