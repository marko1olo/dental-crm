import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { clinics, organizations, patients, payments } from "../db/schema.js";
import { RU_MONTHS, registerAnalyticsRoutes } from "../routes/analytics.js";
import { runBiAnalyticsAggregation } from "../scripts/cronAnalyticsWorker.js";
import { computeBiAnalyticsSnapshots } from "../services/biAnalyticsWorker.js";
import { currentMonthPeriod } from "../services/reports/managerReports.js";

/**
 * МЕСЯЦ КОГОРТЫ — КАЛЕНДАРНОЕ ПОНЯТИЕ ПОЯСА КЛИНИКИ, А НЕ ПОЯСА СЕССИИ БАЗЫ.
 *
 * ЧТО БЫЛО СЛОМАНО В ТРЁХ МЕСТАХ СРАЗУ. `date_trunc('month', …)` и
 * `to_char(…, 'YYYY-MM')` для колонки с часовым поясом режут месяц по поясу
 * СЕССИИ PostgreSQL. У всех российских поясов смещение ПОЛОЖИТЕЛЬНОЕ, поэтому
 * день в поясе сессии отстаёт от местного каждую ночь: в Самаре (пояс клиники по
 * умолчанию в схеме) до 04:00, на Камчатке половину суток. Пациент,
 * зарегистрированный вечером последнего дня месяца, попадал в когорту
 * СЛЕДУЮЩЕГО месяца и оставался там навсегда: когорта присваивается один раз, по
 * дате регистрации. Владелец клиники сравнивает когорты и по этому сравнению
 * решает, какая реклама сработала.
 *
 * ЧЕМ ПРОВЕРЯЕТСЯ. Клинике фикстуры ставится пояс +12 (`Asia/Kamchatka`), а
 * пациент и платёж заводятся через полчаса ПОСЛЕ начала месяца по её часам. В
 * любом поясе сессии западнее (на этом хосте `Europe/Samara`, +4) тот же момент
 * — ещё ПРЕДЫДУЩИЙ месяц. Значит ярлык предыдущего месяца в ответе означает
 * возврат дефекта, и никакая другая причина его не даёт.
 *
 * ЗАМЕР НА ЖИВОЙ БАЗЕ, тот же момент, три места:
 *   маршрут /api/analytics/dashboard  ДО: cohort "Июн"     ПОСЛЕ: "Июл"
 *   scripts/cronAnalyticsWorker.ts    ДО: cohort "2026-06" ПОСЛЕ: "2026-07"
 *   services/biAnalyticsWorker.ts     ДО: cohort "Jun"     ПОСЛЕ: "2026-07"
 *
 * ПОЧЕМУ ФАЙЛ ОКАНЧИВАЕТСЯ НА `.test.ts`, а не на чём-нибудь ещё: `npm test` в
 * apps/api подхватывает ровно `src/**\/*.test.ts`. Прибор с другим именем не
 * запускается никогда — этот класс дефекта уже скрыл в проекте межклиничную
 * утечку.
 */

const ORG_ID = "dce70000-0000-4000-8000-0000000006a1";
const CLINIC_ID = "dce70000-0000-4000-8000-0000000006a2";
const PATIENT_ID = "dce70000-0000-4000-8000-0000000006a3";

/** Пояс +12: западнее его любой пояс сессии на этом хосте. */
const FAR_ZONE = "Asia/Kamchatka";
/** Пояс, которого не существует: `AT TIME ZONE` с ним бросает 22023. */
const UNKNOWN_ZONE = "Europe/Nowhereland";
/** Пояс, к которому фикстура возвращается: тот же, что у фикстур отчётов. */
const RESTORED_ZONE = "Europe/Moscow";

const ORG_HEADERS = { "x-organization-id": ORG_ID };
const REVENUE_RUB = 12_345;

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(
		message,
	);
}

/** Номер месяца (1..12), который показывает календарь пояса. */
function monthNumberIn(zone: string, at: Date): number {
	return Number(
		new Intl.DateTimeFormat("en-CA", { timeZone: zone, month: "2-digit" }).format(at),
	);
}

/** Ярлык `YYYY-MM`, который показывает календарь пояса. */
function monthKeyIn(zone: string, at: Date): string {
	const parts = new Map(
		new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit" })
			.formatToParts(at)
			.map((part) => [part.type, part.value]),
	);
	return `${parts.get("year")}-${parts.get("month")}`;
}

async function removeFixtureRows(): Promise<void> {
	await db.execute(sql`delete from bi_analytics_snapshots where organization_id = ${ORG_ID}`);
	await db.delete(payments).where(eq(payments.organizationId, ORG_ID));
	await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
	await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
	await db.delete(organizations).where(eq(organizations.id, ORG_ID));
}

describe("месяц когорты берётся в поясе клиники", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	/*
	 * Начало текущего месяца по часам клиники +12, плюс полчаса. В поясе сессии
	 * это ещё предыдущий месяц — именно на этом разрыве и проверяется дефект.
	 */
	const clinicMonthStart = currentMonthPeriod(new Date(), FAR_ZONE).from;
	const boundary = new Date(clinicMonthStart.getTime() + 30 * 60_000);
	/** Момент на час РАНЬШЕ границы: он принадлежит предыдущему месяцу в обоих поясах. */
	const beforeBoundary = new Date(clinicMonthStart.getTime() - 60 * 60_000);

	const clinicMonthLabel = RU_MONTHS[monthNumberIn(FAR_ZONE, boundary) - 1];
	const previousMonthLabel = RU_MONTHS[monthNumberIn(FAR_ZONE, beforeBoundary) - 1];
	const clinicMonthKey = monthKeyIn(FAR_ZONE, boundary);
	const previousMonthKey = monthKeyIn(FAR_ZONE, beforeBoundary);

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = Fastify();
		await registerAnalyticsRoutes(app);

		try {
			// Подчистить за упавшим прогоном ДО засева: иначе к своему платежу
			// добавится вчерашний и сумма когорты перестанет сходиться.
			await removeFixtureRows();
			await db.insert(organizations).values({ id: ORG_ID, name: "Клиника когорт" });
			await db
				.insert(clinics)
				.values({ id: CLINIC_ID, organizationId: ORG_ID, name: "Главная", timezone: FAR_ZONE });
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Границевич Ночной Пациентович",
				createdAt: boundary,
			});
			await db.insert(payments).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				amountRub: REVENUE_RUB,
				status: "paid",
				paidAt: boundary,
				createdAt: boundary,
			});
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (app) await app.close();
		if (!databaseAvailable) return;
		// Пояс фикстуры возвращается обязательно: он ставится в +12, а остальные
		// тесты считают период по умолчанию в поясе клиники.
		await db.update(clinics).set({ timezone: RESTORED_ZONE }).where(eq(clinics.id, CLINIC_ID));
		await removeFixtureRows();
	});

	/** МЕСТО 1: routes/analytics.ts, выражение месяца стояло ТРИЖДЫ. */
	test("маршрут /api/analytics/dashboard относит пациента к месяцу клиники", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/analytics/dashboard",
			headers: ORG_HEADERS,
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		const cohorts: { cohort: string; "Month 12": number }[] = body?.data?.cohortLtvJson ?? [];

		assert.ok(
			cohorts.some((row) => row.cohort === clinicMonthLabel),
			`ярлыка ${clinicMonthLabel} нет в ${JSON.stringify(cohorts)}`,
		);
		assert.ok(
			!cohorts.some((row) => row.cohort === previousMonthLabel),
			`пациент попал в предыдущий месяц ${previousMonthLabel}: месяц снова считается в поясе сессии — ${JSON.stringify(cohorts)}`,
		);
		// Сумма когорты — та же, что заведена: сдвиг пояса не должен ни терять
		// деньги, ни удваивать их.
		assert.equal(
			cohorts.find((row) => row.cohort === clinicMonthLabel)?.["Month 12"],
			REVENUE_RUB,
			JSON.stringify(cohorts),
		);
	});

	/**
	 * ВЫРАЖЕНИЕ МЕСЯЦА ОДНО НА ТРИ МЕСТА. Через три отдельных фрагмента имя пояса
	 * ушло бы параметром трижды и получило РАЗНЫЕ номера ($1, $6, $7) —
	 * PostgreSQL считает такие выражения разными и отвергает запрос целиком.
	 * Приведение `::text` не спасает: дело не в типе, а в номере. Тепловая карта
	 * смен падала на этом дважды, поэтому здесь проверяется НАСТОЯЩИЙ текст SQL,
	 * ушедший в базу, а не рассуждение о нём.
	 */
	test("в SQL когорты имя пояса стоит литералом и выражение во всех трёх местах одно", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const client = db.$client as unknown as { query: (...args: unknown[]) => unknown };
		const originalQuery = client.query.bind(client);
		const seen: string[] = [];
		client.query = (...args: unknown[]) => {
			const first = args[0] as { text?: string } | string;
			const text = typeof first === "string" ? first : first?.text;
			if (typeof text === "string") seen.push(text);
			return originalQuery(...args);
		};
		try {
			const response = await app.inject({
				method: "GET",
				url: "/api/analytics/dashboard",
				headers: ORG_HEADERS,
			});
			assert.equal(response.statusCode, 200, response.body);
		} finally {
			client.query = originalQuery;
		}

		const cohortSql = seen.find((text) => text.includes("date_trunc('month'"));
		assert.ok(cohortSql, `запроса когорты нет среди ${seen.length} перехваченных`);

		const zoneArguments = [...cohortSql.matchAll(/AT TIME ZONE (\$\d+|'[^']+')/g)].map((m) => m[1]);
		assert.deepEqual(
			zoneArguments,
			[`'${FAR_ZONE}'`, `'${FAR_ZONE}'`, `'${FAR_ZONE}'`],
			`имя пояса должно стоять литералом ТРИЖДЫ (SELECT, GROUP BY, ORDER BY); получено ${JSON.stringify(zoneArguments)} в ${cohortSql}`,
		);
		assert.ok(
			!/AT TIME ZONE \$\d+/.test(cohortSql),
			`имя пояса ушло параметром — в SELECT и GROUP BY номера разойдутся и запрос будет отвергнут целиком: ${cohortSql}`,
		);
	});

	/** МЕСТО 2: scripts/cronAnalyticsWorker.ts, сырой SQL фоновой задачи. */
	test("фоновая задача runBiAnalyticsAggregation режет когорту в поясе клиники", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await db.execute(sql`delete from bi_analytics_snapshots where organization_id = ${ORG_ID}`);
		await runBiAnalyticsAggregation(ORG_ID);

		const snapshot = await db.execute(
			sql`select cohort_ltv_json from bi_analytics_snapshots where organization_id = ${ORG_ID} order by snapshot_date desc limit 1`,
		);
		assert.equal(
			snapshot.rows.length,
			1,
			"снимок не записан: агрегация упала внутрь своего catch, смотри лог [BI Analytics]",
		);
		const cohorts = (snapshot.rows[0] as { cohort_ltv_json: { cohort: string }[] }).cohort_ltv_json;
		const keys = cohorts.map((row) => row.cohort);

		assert.ok(keys.includes(clinicMonthKey), `${clinicMonthKey} нет в ${JSON.stringify(keys)}`);
		assert.ok(
			!keys.includes(previousMonthKey),
			`пациент попал в предыдущий месяц ${previousMonthKey}: месяц снова считается в поясе сессии — ${JSON.stringify(keys)}`,
		);
	});

	/**
	 * МЕСТО 3: services/biAnalyticsWorker.ts. Там же проверяется, что ярлык
	 * перестал быть `Mon`: `to_char(…, 'Mon')` даёт английский `Jul` независимо
	 * от `lc_time`, и в нём НЕТ ГОДА — июль 2025 и июль 2026 складывались в одну
	 * корзину «Jul», то есть выручка двух разных когорт суммировалась.
	 */
	test("computeBiAnalyticsSnapshots режет когорту в поясе клиники и печатает YYYY-MM", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const existing = await db.execute(sql`select id from bi_analytics_snapshots`);
		const existingIds = new Set(existing.rows.map((row) => (row as { id: string }).id));

		try {
			await computeBiAnalyticsSnapshots();

			const snapshot = await db.execute(
				sql`select cohort_ltv_json from bi_analytics_snapshots where organization_id = ${ORG_ID} order by snapshot_date desc limit 1`,
			);
			assert.equal(
				snapshot.rows.length,
				1,
				"снимок не записан: сборка упала внутрь своего catch, смотри лог [BI Worker]",
			);
			const cohorts = (snapshot.rows[0] as { cohort_ltv_json: { cohort: string }[] })
				.cohort_ltv_json;
			const keys = cohorts.map((row) => row.cohort);

			assert.ok(keys.includes(clinicMonthKey), `${clinicMonthKey} нет в ${JSON.stringify(keys)}`);
			assert.ok(
				!keys.includes(previousMonthKey),
				`платёж попал в предыдущий месяц ${previousMonthKey}: месяц снова считается в поясе сессии — ${JSON.stringify(keys)}`,
			);
			for (const key of keys) {
				assert.match(
					key,
					/^\d{4}-\d{2}$/,
					`ярлык когорты «${key}» не в формате YYYY-MM: вернулся 'Mon' — английское название без года, склеивающее июль разных лет`,
				);
			}
		} finally {
			// Сборка пишет снимок КАЖДОЙ организации базы, включая чужие. Свои
			// строки убираем поимённо по id, чужие исторические не трогаем.
			const after = await db.execute(sql`select id from bi_analytics_snapshots`);
			const created = after.rows
				.map((row) => (row as { id: string }).id)
				.filter((id) => !existingIds.has(id));
			for (const id of created) {
				await db.execute(sql`delete from bi_analytics_snapshots where id = ${id}`);
			}
		}
	});

	/**
	 * НЕИЗВЕСТНЫЙ ПОЯС НЕ РОНЯЕТ ОТЧЁТ. `clinics.timezone` — свободный текст со
	 * значением по умолчанию `Europe/Samara` и без ограничения на список, а
	 * единственная проверка при записи спрашивает ICU, не PostgreSQL. Значит
	 * имя, принятое при записи, здесь может оказаться неизвестным, и тогда
	 * `AT TIME ZONE` бросает 22023. Поведение обязано остаться прежним: месяц
	 * режется в поясе сессии, ответ 200, `AT TIME ZONE` в SQL не появляется
	 * вовсе.
	 */
	test("неизвестный пояс клиники не превращает дашборд в 500", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const client = db.$client as unknown as { query: (...args: unknown[]) => unknown };
		const originalQuery = client.query.bind(client);
		const seen: string[] = [];

		await db.update(clinics).set({ timezone: UNKNOWN_ZONE }).where(eq(clinics.id, CLINIC_ID));
		client.query = (...args: unknown[]) => {
			const first = args[0] as { text?: string } | string;
			const text = typeof first === "string" ? first : first?.text;
			if (typeof text === "string") seen.push(text);
			return originalQuery(...args);
		};
		try {
			const response = await app.inject({
				method: "GET",
				url: "/api/analytics/dashboard",
				headers: ORG_HEADERS,
			});
			assert.equal(response.statusCode, 200, `неизвестный пояс уронил дашборд: ${response.body}`);

			const cohortSql = seen.find((text) => text.includes("date_trunc('month'"));
			assert.ok(cohortSql, `запроса когорты нет среди ${seen.length} перехваченных`);
			assert.ok(
				!cohortSql.includes("AT TIME ZONE"),
				`неизвестный пояс всё же попал в SQL и бросит 22023: ${cohortSql}`,
			);
		} finally {
			client.query = originalQuery;
			await db.update(clinics).set({ timezone: FAR_ZONE }).where(eq(clinics.id, CLINIC_ID));
		}
	});
});
