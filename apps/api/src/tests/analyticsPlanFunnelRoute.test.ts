import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	appointments,
	organizations,
	patients,
	treatmentPlans,
} from "../db/schema.js";
import { registerAnalyticsRoutes } from "../routes/analytics.js";
import { buildPlanFunnel } from "../services/biAnalyticsWorker.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

/**
 * «ВОРОНКА ПЛАНОВ ЛЕЧЕНИЯ» НА ЖИВОМ ЭКРАНЕ АНАЛИТИКИ СЧИТАЛА ПРИЁМЫ.
 *
 * ЧТО БЫЛО СЛОМАНО. `routes/analytics.ts` собирал поле `planFunnelJson` из
 * `appointments` по колонке `status`: четыре ветви `planned / confirmed /
 * completed / cancelled` и подписи «Запланированы, Подтверждены, Завершены,
 * Отменены». Планов лечения этот расчёт не касался вовсе. ЗАМЕР ДО ПРАВКИ на
 * живой базе (демонстрационная клиника `d0000000-…-d001`, 27 приёмов, 0 планов
 * лечения):
 *
 *     planFunnelJson: [{"name":"Запланированы","value":8},
 *                      {"name":"Подтверждены","value":2},
 *                      {"name":"Завершены","value":13},
 *                      {"name":"Отменены","value":4}]
 *     сумма ветвей: 27 == kpis.totalAppointments: 27
 *
 * То есть под заголовком «Воронка планов лечения» владельцу клиники
 * предъявлялось 27 «планов», из них 13 «завершённых», при полном отсутствии
 * планов лечения в базе. Подсказка графика подписывает эти числа склонением
 * «план / плана / планов» (`AnalyticsDashboardView.tsx:66-69`), а пустое
 * состояние — «Планов лечения ещё нет. Составьте план в карточке пациента» — не
 * показывалось НИКОГДА, пока в клинике есть хоть один приём. Указание, которое
 * оператору и надо было выполнить, оказалось недостижимо.
 *
 * ВТОРАЯ ПОЛОВИНА ДЕФЕКТА — ветка `else`. Карта знала четыре статуса приёма из
 * семи (`appointment_status`: planned, confirmed, arrived, in_treatment,
 * completed, cancelled, no_show), а незнакомые молча прибавлялись к
 * «Запланированы». В том же замере 8 = 5 `planned` + 3 `no_show`: три
 * неявившихся пациента предъявлялись как приёмы, которые ещё состоятся. Так же
 * в соседнем дефекте (`d1ff7ab21`) стратегии `phased` и `maintenance` уходили в
 * `else` и объявлялись завершёнными планами лечения.
 *
 * ЧТО ПРОВЕРЯЕТСЯ ЗДЕСЬ, по маршруту через `app.inject`, а не по внутренней
 * функции:
 *   1. сумма ветвей равна числу планов лечения в базе — считанному отдельным
 *      запросом, а не сверенному с константой этого файла;
 *   2. каждая ветвь равна числу планов своего состояния поимённо (сумма
 *      сошлась бы и при перепутанных ветвях);
 *   3. состояния воронки совпадают с живым `pg_enum` МНОЖЕСТВАМИ в обе стороны
 *      — в соседнем дефекте сверка длин прошла на неисправленном коде: пять
 *      ветвей против пяти значений при трёх совпавших;
 *   4. приёмы в воронку не попадают: у клиники фикстуры их 22 против 17 планов,
 *      и числа выбраны несовпадающими нарочно;
 *   5. арендатор берётся из `treatment_plans.organization_id`, то есть план не
 *      уходит в воронку соседней клиники и не исчезает из своей;
 *   6. период экрана воронку сужает: план, созданный год назад, в «последний
 *      месяц» не входит.
 */

const NAMESPACE = "analyticsPlanFunnelRoute";
/** Клиника с планами во всех пяти состояниях и с приёмами, которых воронка касаться не должна. */
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
/** Соседняя клиника: её воронка обязана остаться пустой. */
const OTHER_ORG_ID = fixtureUuid(NAMESPACE, 3);
const OTHER_PATIENT_ID = fixtureUuid(NAMESPACE, 4);

const ORG_HEADERS = { "x-organization-id": ORG_ID };
const OTHER_ORG_HEADERS = { "x-organization-id": OTHER_ORG_ID };

/**
 * Планы, посеянные текущей датой. Ключи — значения `treatment_plan_status`
 * дословно: значение, которого в `pg_enum` нет, отвергнет сама база, а не
 * разойдётся с ней молча. Числа разные, чтобы перестановка ветвей была видна.
 */
const PLANS_BY_STATUS = {
	Draft: 1,
	Active: 2,
	Approved: 3,
	Completed: 4,
	Rejected: 5,
};

/**
 * План, у которого `treatment_plans.organization_id` — клиника фикстуры, а
 * пациент принадлежит СОСЕДНЕЙ клинике. Правило аренды маршрута — собственная
 * колонка таблицы, поэтому этот план обязан считаться у своей клиники и не
 * появиться у соседней. Через соединение с `patients` (как в
 * `scripts/cronAnalyticsWorker.ts`) он ушёл бы к соседям, а из своей воронки
 * пропал бы — и сумма ветвей перестала бы сходиться с числом планов.
 */
const CROSS_TENANT_PLAN_STATUS = "Approved";

/** План годичной давности: он проверяет, что воронка сужается периодом экрана. */
const OLD_PLAN_STATUS = "Draft";
const OLD_PLAN_AGE_DAYS = 400;

/** Ожидания за всё время: посеянное плюс план соседского пациента плюс годичной давности. */
const EXPECTED_ALL_TIME = {
	Draft: PLANS_BY_STATUS.Draft + 1,
	Active: PLANS_BY_STATUS.Active,
	Approved: PLANS_BY_STATUS.Approved + 1,
	Completed: PLANS_BY_STATUS.Completed,
	Rejected: PLANS_BY_STATUS.Rejected,
};

/** Ожидания за последний месяц: без плана годичной давности. */
const EXPECTED_LAST_MONTH = {
	...EXPECTED_ALL_TIME,
	Draft: PLANS_BY_STATUS.Draft,
};

function totalOf(counts: Readonly<Record<string, number>>): number {
	return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

/**
 * Приёмы клиники фикстуры. Числа НЕ совпадают ни с одним числом планов: если
 * воронка снова начнёт считать приёмы, это будет видно по значению ветви, а не
 * только по сумме. `no_show` здесь потому, что прежняя карта его не знала и
 * молча прибавляла к «Запланированы».
 */
const APPOINTMENTS_BY_STATUS: Readonly<Record<string, number>> = {
	planned: 7,
	no_show: 6,
	completed: 9,
};

/** Подписи, которые может дать только раскладка ПРИЁМОВ, но не состояния плана. */
const APPOINTMENT_ONLY_LABELS = ["Запланированы", "Подтверждены", "Отменены"];

interface FunnelStage {
	readonly status?: string;
	readonly name: string;
	readonly value: number;
	readonly fill?: string;
}

/** Значения перечисления `treatment_plan_status` из живой базы. */
async function liveEnumLabels(): Promise<string[]> {
	const rows = await db.execute<{ enumlabel: string }>(sql`
		SELECT e.enumlabel
		FROM pg_type AS t
		JOIN pg_enum AS e ON e.enumtypid = t.oid
		WHERE t.typname = 'treatment_plan_status'
		ORDER BY e.enumsortorder
	`);
	return rows.rows.map((row) => row.enumlabel);
}

/**
 * Число планов клиники — независимым запросом, а не константой этого файла.
 *
 * Запрос идёт под тенант-контекстом: под принудительным RLS счёт без
 * `app.current_tenant` вернул бы ноль и ошибки не дал бы, то есть «независимая»
 * проверка молча сверяла бы воронку с нулём.
 */
async function countPlansInDatabase(organizationId: string): Promise<number> {
	const rows = await withFixtureTenant(organizationId, async () =>
		db.execute<{ count: number }>(
			sql`SELECT count(*)::int AS count FROM treatment_plans WHERE organization_id = ${organizationId}`,
		),
	);
	return Number(rows.rows[0]?.count ?? 0);
}

describe("воронка планов лечения на экране аналитики считает планы, а не приёмы", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	const oldPlanCreatedAt = new Date(
		Date.now() - OLD_PLAN_AGE_DAYS * 24 * 60 * 60 * 1000,
	);

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		// Те же два хука, что боевой `server.ts` вешает на настоящее приложение:
		// без них маршрут идёт в базу без `app.current_tenant`, читает НОЛЬ строк и
		// отвечает пустой воронкой на только что засеянные планы.
		app = createTenantTestApp();
		await registerAnalyticsRoutes(app);

		try {
			// Уборка НА ВХОДЕ: прогон, убитый снаружи, до `after` не доходит и
			// оставляет свои планы в живой базе — тогда числа перестают сходиться.
			await purgeFixtureOrganizations([ORG_ID, OTHER_ORG_ID]);
			// `app.current_tenant` хранит РОВНО одного арендатора, а `WITH CHECK`
			// тенант-таблиц сверяет с ним `organization_id` и обхода не допускает:
			// две клиники — два вызова, иначе вставка отвергается кодом 42501.
			await withFixtureTenant(OTHER_ORG_ID, async () => {
				await db.insert(organizations).values({
					id: OTHER_ORG_ID,
					name: "Соседняя клиника воронки планов",
				});
				await db.insert(patients).values({
					id: OTHER_PATIENT_ID,
					organizationId: OTHER_ORG_ID,
					fullName: "Соседов Пациент Чужович",
				});
			});
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID, name: "Клиника воронки планов маршрута" });
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Сметин План Черновикович",
				});

				type PlanStatus = (typeof treatmentPlans.status)["_"]["data"];
				await db.insert(treatmentPlans).values([
					...Object.entries(PLANS_BY_STATUS).flatMap(([status, count]) =>
						Array.from({ length: count }, (_unused, index) => ({
							organizationId: ORG_ID,
							patientId: PATIENT_ID,
							name: `План ${status} №${index + 1}`,
							status: status as PlanStatus,
						})),
					),
					{
						organizationId: ORG_ID,
						patientId: OTHER_PATIENT_ID,
						name: "План с пациентом соседней клиники",
						status: CROSS_TENANT_PLAN_STATUS as PlanStatus,
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						name: "План годичной давности",
						status: OLD_PLAN_STATUS as PlanStatus,
						createdAt: oldPlanCreatedAt,
					},
				]);

				type AppointmentStatus = (typeof appointments.status)["_"]["data"];
				const startsAt = new Date();
				await db.insert(appointments).values(
					Object.entries(APPOINTMENTS_BY_STATUS).flatMap(([status, count]) =>
						Array.from({ length: count }, () => ({
							organizationId: ORG_ID,
							patientId: PATIENT_ID,
							status: status as AppointmentStatus,
							startsAt,
							endsAt: new Date(startsAt.getTime() + 30 * 60_000),
						})),
					),
				);
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (app) await app.close();
		if (!databaseAvailable) return;
		await purgeFixtureOrganizations([ORG_ID, OTHER_ORG_ID]);
	});

	async function funnelOf(
		headers: Record<string, string>,
		range?: string,
	): Promise<FunnelStage[]> {
		const response = await app.inject({
			method: "GET",
			url: range
				? `/api/analytics/dashboard?range=${range}`
				: "/api/analytics/dashboard",
			headers,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as {
			data?: { planFunnelJson?: FunnelStage[] };
		};
		return body.data?.planFunnelJson ?? [];
	}

	test("сумма ветвей равна числу планов лечения в базе", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const funnel = await funnelOf(ORG_HEADERS);
		const inDatabase = await countPlansInDatabase(ORG_ID);
		const total = funnel.reduce((sum, stage) => sum + stage.value, 0);

		assert.equal(
			inDatabase,
			totalOf(EXPECTED_ALL_TIME),
			`засеяно ${totalOf(EXPECTED_ALL_TIME)} планов, в базе ${inDatabase} — фикстура разошлась с базой`,
		);
		assert.equal(
			total,
			inDatabase,
			`В базе ${inDatabase} планов лечения, воронка насчитала ${total}: ${JSON.stringify(funnel)}. ` +
				`У клиники фикстуры ${totalOf(APPOINTMENTS_BY_STATUS)} приёмов — если сумма равна их числу, ` +
				"воронка снова считает приёмы под заголовком «Воронка планов лечения». Разница в любую " +
				"сторону означает, что планы теряются в ветке `else`, как терялись `no_show` у приёмов.",
		);
	});

	test("каждое состояние плана попадает в воронку своим числом и своей подписью", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const funnel = await funnelOf(ORG_HEADERS);
		const byStatus = new Map(
			funnel.map((stage) => [stage.status, stage.value]),
		);

		for (const [status, expected] of Object.entries(EXPECTED_ALL_TIME)) {
			assert.equal(
				byStatus.get(status),
				expected,
				`ветвь ${status}: ожидалось ${expected} планов, в воронке ${byStatus.get(status)} — ` +
					JSON.stringify(funnel),
			);
		}

		// Подписи приёмов в воронке планов означают возврат дефекта целиком.
		const appointmentLabels = funnel
			.map((stage) => stage.name)
			.filter((name) => APPOINTMENT_ONLY_LABELS.includes(name));
		assert.deepEqual(
			appointmentLabels,
			[],
			`Воронка планов лечения подписана состояниями ПРИЁМА: ${appointmentLabels.join(", ")}. ` +
				`Так выглядел дефект: ${JSON.stringify(funnel)}`,
		);
	});

	test("состояния воронки совпадают с pg_enum как множества, в обе стороны", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const labels = await liveEnumLabels();
		assert.ok(
			labels.length > 0,
			"в живой базе нет типа treatment_plan_status — проверка потеряла точку опоры",
		);

		/*
		 * Ветви, КОТОРЫЕ ОБЪЯВЛЯЕТ КОД, берутся у пустого вызова общего строителя,
		 * а не из ответа засеянной клиники. Состояние, которого нет в объявлении,
		 * попадает в воронку под сырым именем из строки данных — свойство полезное
		 * (планы не теряются), но оно же скрывает УТРАТУ ветви, пока в этом
		 * состоянии есть хоть один план. Пустой вызов спрашивает именно объявление.
		 */
		const declared = buildPlanFunnel([]).map((stage) => stage.status);

		const missing = labels.filter((label) => !declared.includes(label));
		assert.deepEqual(
			missing,
			[],
			`Состояния есть в базе, но воронка их не знает: ${missing.join(", ")}. Планы в этих состояниях ` +
				`пропадают из отчёта целиком. В базе: ${labels.join(", ")}; в воронке: ${declared.join(", ")}.`,
		);

		const extra = declared.filter((status) => !labels.includes(status));
		assert.deepEqual(
			extra,
			[],
			`Воронка объявила состояния, которых в базе нет: ${extra.join(", ")}. Под такой ветвью не может ` +
				`оказаться ни одного плана ни при каких данных. В базе: ${labels.join(", ")}.`,
		);

		/*
		 * И то же множество обязано доехать ДО ОТВЕТА МАРШРУТА. У клиники фикстуры
		 * есть план в каждом состоянии перечисления, поэтому отбор ненулевых ветвей
		 * ни одной не убирает: ответ маршрута = объявление = `pg_enum`.
		 */
		const funnel = await funnelOf(ORG_HEADERS);
		const inResponse = funnel.map((stage) => stage.status ?? "");
		assert.deepEqual(
			[...inResponse].sort(),
			[...labels].sort(),
			`Ответ маршрута отдал состояния ${inResponse.join(", ")} вместо ${labels.join(", ")}: ` +
				JSON.stringify(funnel),
		);

		// Подпись обязана быть человеческой: сырое имя состояния в `name` означает,
		// что карта подписей это состояние не знает и оно доехало до экрана как есть.
		for (const stage of funnel) {
			assert.notEqual(
				stage.name,
				stage.status,
				`состояние ${stage.status} доехало до экрана без русской подписи: ${JSON.stringify(stage)}`,
			);
		}
	});

	test("план числится за клиникой из своей колонки, а не за клиникой пациента", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const neighbourFunnel = await funnelOf(OTHER_ORG_HEADERS);
		assert.deepEqual(
			neighbourFunnel,
			[],
			`У соседней клиники нет ни одного своего плана, а воронка не пуста: ${JSON.stringify(neighbourFunnel)}. ` +
				"План с её пациентом принадлежит клинике из `treatment_plans.organization_id` — соединение с " +
				"`patients` отдало бы этот план соседям.",
		);

		const funnel = await funnelOf(ORG_HEADERS);
		const approved = funnel.find(
			(stage) => stage.status === CROSS_TENANT_PLAN_STATUS,
		)?.value;
		assert.equal(
			approved,
			EXPECTED_ALL_TIME[CROSS_TENANT_PLAN_STATUS],
			`ветвь ${CROSS_TENANT_PLAN_STATUS} равна ${approved}: план, чей пациент заведён в соседней клинике, ` +
				`выпал из воронки своей клиники — ${JSON.stringify(funnel)}`,
		);
	});

	test("период экрана сужает воронку по дате создания плана", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const lastMonth = await funnelOf(ORG_HEADERS, "last_month");
		const byStatus = new Map(
			lastMonth.map((stage) => [stage.status, stage.value]),
		);
		for (const [status, expected] of Object.entries(EXPECTED_LAST_MONTH)) {
			assert.equal(
				byStatus.get(status),
				expected,
				`период «последний месяц», ветвь ${status}: ожидалось ${expected}, получено ${byStatus.get(status)} — ` +
					JSON.stringify(lastMonth),
			);
		}
		assert.equal(
			lastMonth.reduce((sum, stage) => sum + stage.value, 0),
			totalOf(EXPECTED_LAST_MONTH),
			`Воронка обязана слушаться переключателя периода: план возрастом ${OLD_PLAN_AGE_DAYS} дней в ` +
				`«последний месяц» не входит — ${JSON.stringify(lastMonth)}`,
		);
	});
});
