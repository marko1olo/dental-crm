/**
 * Живое доказательство того, что часы работы клиники, заданные в достижимых
 * настройках, управляют публичным виджетом записи.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Настройки → «Клиника» уже давали задать начало и
 * окончание рабочего дня и отметить рабочие дни недели
 * (`SettingsClinicTab.tsx:353-370`). Значение доходило до базы и читалось
 * обратно, поэтому в интерфейсе выглядело сохранённым. А публичный виджет записи
 * его НЕ ВИДЕЛ: `resolveDaySchedule` в `routes/publicBooking.ts` знал два
 * формата колонки `organizations.clinic_schedule` — раскладку по дням недели
 * (`{ monday: { startsAt, endsAt } }`) и формат мёртвого мастера первого запуска
 * (`{ workHours: [8, 20] }`), — и НЕ знал того, который пишет единственный
 * достижимый писатель (`db/settingsQuery.ts:176`):
 * `{ workdayStart, workdayEnd, workingDays, appointmentBufferMinutes }`.
 *
 * Цена ошибки для клиники в двух местах, и оба про деньги и репутацию:
 *   1. Клиника с графиком 08:00–20:00 отдавала пациентам только 09:00–18:00 —
 *      утренние и вечерние слоты, самые востребованные у работающих людей,
 *      просто не показывались. Пациент видел «нет свободного времени» там, где
 *      клиника открыта.
 *   2. Список рабочих дней игнорировался целиком, а запас считал рабочими все
 *      дни кроме воскресенья. Клиника, закрытая по субботам, получала запись на
 *      субботу — пациент приезжал к закрытой двери.
 *
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает): нужна
 * живая база и настоящий проход настройки через маршрут настроек. Дев-сервер на
 * 4100 не годится — он отдаёт устаревший код.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/routes/publicBookingWorkHoursProof.ts
 *
 * Создаёт СВОЮ организацию и удаляет её целиком в finally.
 */

import { eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { db, pool } from "../../db/client.js";
import {
	appointments,
	clinics,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { registerPublicBookingRoutes } from "../../routes/publicBooking.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const PROOF_ORGANIZATION_NAME = "Проверка часов работы — клиника";
const PROOF_ADMIN_SECRET = `proof-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Часовой пояс без перехода на летнее время — иначе смещение зависит от даты. */
const PROOF_TIMEZONE = "Europe/Samara";

/**
 * График клиники: 08:00–20:00, суббота и воскресенье выходные. Ровно то, что
 * администратор может отметить в Настройках → «Клиника».
 */
const WORKDAY_START = "08:00";
const WORKDAY_END = "20:00";
const WORKING_DAYS = [1, 2, 3, 4, 5];

/**
 * Даты проверки заведомо в будущем: маршнут слотов не предлагает время, которое
 * уже прошло, и на сегодняшней дате утренние слоты исчезали бы по другой,
 * законной причине.
 */
const FUTURE_MONDAY = "2026-11-02";
const FUTURE_SATURDAY = "2026-11-07";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) failures += 1;
	console.log(
		`${ok ? "OK  " : "ПРОВАЛ"} ${label}: получено ${JSON.stringify(actual)}, ожидалось ${JSON.stringify(expected)}`,
	);
}

function seeded<Row>(rows: Row[], what: string): Row {
	const row = rows[0];
	if (!row)
		throw new Error(
			`Посев не состоялся: вставка «${what}» не вернула ни одной строки.`,
		);
	return row;
}

/** День недели календарной даты YYYY-MM-DD, 0 — воскресенье. */
function weekdayOf(date: string): number {
	const [y, m, d] = date
		.split("-")
		.map((part) => Number.parseInt(part, 10)) as [number, number, number];
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerSettingsRoutes(app);
	await app.register(registerPublicBookingRoutes, {
		prefix: "/api/public/booking",
	});
	await app.ready();
	return app;
}

type Slot = { time: string; startsAt: string; endsAt: string };

/**
 * Ответ маршрута слотов КАК ЕСТЬ, вместе с кодом.
 *
 * Отказ здесь не считается провалом проверки: закрытый день — это законный 409
 * («В этот день клиника не работает»), а не поломка. Раньше эта функция сама
 * записывала любой не-200 в расхождения, и когда соседний инженер заменил пустой
 * массив на честный 409 с причиной и действием, проверка покраснела на УЛУЧШЕНИИ
 * чужого кода. Решает вызывающий, а не читатель ответа.
 */
async function readSlots(
	app: FastifyInstance,
	organizationId: string,
	doctorId: string,
	date: string,
): Promise<{ status: number; slots: Slot[] | null; error: string | null }> {
	const response = await app.inject({
		method: "GET",
		url: `/api/public/booking/${organizationId}/slots/${doctorId}?date=${date}`,
	});
	if (response.statusCode !== 200) {
		const parsed = JSON.parse(response.body) as { error?: string };
		return {
			status: response.statusCode,
			slots: null,
			error: parsed.error ?? null,
		};
	}
	return {
		status: 200,
		slots: JSON.parse(response.body) as Slot[],
		error: null,
	};
}

function describe(answer: {
	status: number;
	slots: Slot[] | null;
	error: string | null;
}): string {
	if (!answer.slots)
		return `HTTP ${answer.status} ${answer.error ?? ""}`.trim();
	if (answer.slots.length === 0) return "слотов нет";
	const first = answer.slots[0]?.time;
	const last = answer.slots[answer.slots.length - 1]?.time;
	return `${answer.slots.length} шт., с ${first} по ${last}`;
}

async function prove(app: FastifyInstance, created: string[]): Promise<void> {
	const organization = seeded(
		await db
			.insert(organizations)
			.values({ name: PROOF_ORGANIZATION_NAME })
			.returning({ id: organizations.id }),
		PROOF_ORGANIZATION_NAME,
	);
	created.push(organization.id);
	const organizationId = organization.id;

	await db.insert(clinics).values({
		organizationId,
		name: PROOF_ORGANIZATION_NAME,
		timezone: PROOF_TIMEZONE,
	});
	const doctorId = seeded(
		await db
			.insert(users)
			.values({
				organizationId,
				fullName: "Врач проверки часов",
				role: "doctor",
				isActive: true,
			})
			.returning({ id: users.id }),
		"врач",
	).id;

	const clinicToken = signToken({ organizationId }, authTokenSecret());
	const ownerToken = signToken(
		{ organizationId, role: "owner" },
		authTokenSecret(),
	);

	console.log(
		`Понедельник ${FUTURE_MONDAY} (день недели ${weekdayOf(FUTURE_MONDAY)}), суббота ${FUTURE_SATURDAY} (${weekdayOf(FUTURE_SATURDAY)})`,
	);

	console.log(
		"\n=== 1. ГРАФИК НЕ ЗАДАН: маршрут уходит в запас 09:00–18:00 ===",
	);
	const beforeMonday = await readSlots(
		app,
		organizationId,
		doctorId,
		FUTURE_MONDAY,
	);
	const beforeSaturday = await readSlots(
		app,
		organizationId,
		doctorId,
		FUTURE_SATURDAY,
	);
	console.log(`  понедельник: ${describe(beforeMonday)}`);
	console.log(`  суббота:     ${describe(beforeSaturday)}`);
	check(
		"без графика первый слот понедельника",
		beforeMonday.slots?.[0]?.time,
		"09:00",
	);
	// Запас считает рабочими все дни кроме воскресенья — суббота открыта.
	check(
		"без графика суббота считается рабочей",
		(beforeSaturday.slots?.length ?? 0) > 0,
		true,
	);

	console.log(
		"\n=== 2. АДМИНИСТРАТОР ЗАДАЁТ 08:00–20:00, ПН–ПТ ЧЕРЕЗ НАСТРОЙКИ ===",
	);
	const saved = await app.inject({
		method: "PUT",
		url: "/api/settings/clinic/profile",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": ownerToken,
			"x-dente-admin-secret": PROOF_ADMIN_SECRET,
		},
		payload: {
			clinicName: PROOF_ORGANIZATION_NAME,
			legalName: PROOF_ORGANIZATION_NAME,
			timezone: PROOF_TIMEZONE,
			defaultVisitMinutes: 60,
			scheduleDefaults: {
				workdayStart: WORKDAY_START,
				workdayEnd: WORKDAY_END,
				workingDays: WORKING_DAYS,
				appointmentBufferMinutes: 15,
			},
			egiszEnabled: false,
		},
	});
	check("профиль клиники сохранён", saved.statusCode, 200);
	if (saved.statusCode !== 200)
		console.log(`  тело: ${saved.body.slice(0, 400)}`);

	// Настройка обязана лежать в колонке, которую читает виджет.
	const [stored] = await db
		.select({ clinicSchedule: organizations.clinicSchedule })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);
	console.log(
		`  organizations.clinic_schedule = ${JSON.stringify(stored?.clinicSchedule)}`,
	);
	check(
		"в колонке лежит заданное начало дня",
		(stored?.clinicSchedule as { workdayStart?: string } | null)?.workdayStart,
		WORKDAY_START,
	);

	// И читается обратно тем же маршрутом настроек — интерфейс покажет сохранённое.
	const readBack = await app.inject({
		method: "GET",
		url: "/api/settings/clinic",
		headers: {
			"x-dente-clinic-token": clinicToken,
			"x-dente-admin-secret": PROOF_ADMIN_SECRET,
		},
	});
	const profile = JSON.parse(readBack.body) as {
		profile: {
			scheduleDefaults: {
				workdayStart: string;
				workdayEnd: string;
				workingDays: number[];
			};
		};
	};
	check(
		"настройки отдают заданный график",
		profile.profile.scheduleDefaults.workdayStart,
		WORKDAY_START,
	);
	check(
		"и заданные рабочие дни",
		profile.profile.scheduleDefaults.workingDays,
		WORKING_DAYS,
	);

	console.log("\n=== 3. ВИДИТ ЛИ ЭТОТ ГРАФИК ПУБЛИЧНЫЙ ВИДЖЕТ ЗАПИСИ ===");
	const afterMonday = await readSlots(
		app,
		organizationId,
		doctorId,
		FUTURE_MONDAY,
	);
	const afterSaturday = await readSlots(
		app,
		organizationId,
		doctorId,
		FUTURE_SATURDAY,
	);
	console.log(`  понедельник: ${describe(afterMonday)}`);
	console.log(`  суббота:     ${describe(afterSaturday)}`);

	check(
		"первый слот понедельника — начало рабочего дня клиники",
		afterMonday.slots?.[0]?.time,
		"08:00",
	);
	// Шаг слота — DEFAULT_SLOT_MINUTES = 30 мин, окно закрывается в 20:00,
	// значит последний старт — 19:30, а всего слотов 12 ч / 30 мин = 24.
	check(
		"последний слот понедельника укладывается в окончание дня",
		afterMonday.slots?.[(afterMonday.slots?.length ?? 0) - 1]?.time,
		"19:30",
	);
	check(
		"слотов за 12-часовой день с шагом 30 минут",
		afterMonday.slots?.length,
		24,
	);
	/*
	 * Суббота отмечена выходной, и маршрут обязан сказать это ВСЛУХ. Пустой список
	 * пациент читает как «всё занято» и ждёт освобождения времени, которого не
	 * будет; 409 с причиной и действием отправляет его выбрать другой день.
	 * Сработать эта ветка может только если список рабочих дней из формата
	 * настроек прочитан — до правки читателя суббота отдавала 18 слотов.
	 */
	check(
		"в выходную субботу маршрут отказывает, а не молчит",
		afterSaturday.status,
		409,
	);
	check(
		"и называет причину отказа",
		afterSaturday.error,
		"ClinicClosedThatDay",
	);

	console.log(
		"\n=== 4. ЗАНЯТОЕ ВРЕМЯ ИСКЛЮЧАЕТСЯ, ГРАНИЦЫ ДНЯ СОХРАНЯЮТСЯ ===",
	);
	const patientId = seeded(
		await db
			.insert(patients)
			.values({ organizationId, fullName: "Пациент проверки часов" })
			.returning({ id: patients.id }),
		"пациент",
	).id;
	// 08:00 по местному времени клиники — первый слот дня.
	const busyStart = new Date(`${FUTURE_MONDAY}T08:00:00.000+04:00`);
	await db.insert(appointments).values({
		organizationId,
		patientId,
		doctorUserId: doctorId,
		status: "planned",
		startsAt: busyStart,
		endsAt: new Date(busyStart.getTime() + 3_600_000),
	});
	const withBusy = await readSlots(
		app,
		organizationId,
		doctorId,
		FUTURE_MONDAY,
	);
	console.log(`  понедельник с занятым 08:00: ${describe(withBusy)}`);
	// Приём занимает час, поэтому исчезают ОБА получасовых слота: 08:00 и 08:30.
	check(
		"занятый слот 08:00 исчез",
		withBusy.slots?.some((slot) => slot.time === "08:00"),
		false,
	);
	check(
		"перекрытый слот 08:30 тоже исчез",
		withBusy.slots?.some((slot) => slot.time === "08:30"),
		false,
	);
	check(
		"день по-прежнему начинается раньше девяти",
		withBusy.slots?.[0]?.time,
		"09:00",
	);
	check(
		"и по-прежнему кончается в девятнадцать тридцать",
		withBusy.slots?.[(withBusy.slots?.length ?? 0) - 1]?.time,
		"19:30",
	);
	check("слотов стало на два меньше", withBusy.slots?.length, 22);
}

async function cleanup(organizationIds: string[]): Promise<void> {
	for (const organizationId of organizationIds) {
		await db
			.delete(appointments)
			.where(eq(appointments.organizationId, organizationId));
		await db
			.delete(patients)
			.where(eq(patients.organizationId, organizationId));
		await db.delete(users).where(eq(users.organizationId, organizationId));
		await db.delete(clinics).where(eq(clinics.organizationId, organizationId));
		await db.delete(organizations).where(eq(organizations.id, organizationId));
	}
}

async function sweepStale(): Promise<void> {
	const stale = await db
		.select({ id: organizations.id })
		.from(organizations)
		.where(inArray(organizations.name, [PROOF_ORGANIZATION_NAME]));
	if (stale.length === 0) return;
	console.log(
		`Следы прерванного прогона: организаций ${stale.length} — удаляю до начала проверки.`,
	);
	await cleanup(stale.map((row) => row.id));
}

async function main(): Promise<void> {
	process.env.DENTE_SETTINGS_ADMIN_SECRET = PROOF_ADMIN_SECRET;
	process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS = "0";

	const app = await buildApp();
	const created: string[] = [];
	try {
		await sweepStale();
		await prove(app, created);
	} finally {
		await app.close();
		await cleanup(created);
		const leftovers = await db.execute(
			sql`select (select count(*)::int from organizations) as organizations`,
		);
		console.log(`\nПОСЛЕ УБОРКИ ${JSON.stringify(leftovers.rows[0])}`);
		console.log(
			failures === 0 ? "\nВСЕ СВЕРКИ СОШЛИСЬ" : `\nРАСХОЖДЕНИЙ: ${failures}`,
		);
		await pool.end();
	}
	if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
