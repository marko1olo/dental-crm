import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { organizations, patients, payments, treatmentPlans } from "../db/schema.js";
import { runBiAnalyticsAggregation } from "../scripts/cronAnalyticsWorker.js";
import {
	buildPlanFunnel,
	computeCohortLtvAll,
	computePlanFunnelAll,
} from "../services/biAnalyticsWorker.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
} from "./support/fixtureOrganizations.js";

/**
 * ВОРОНКА ПЛАНОВ ЛЕЧЕНИЯ ОБЯЗАНА СОВПАДАТЬ С ПЕРЕЧИСЛЕНИЕМ БАЗЫ ПО ОБЕ СТОРОНЫ,
 * А ПОКАЗАТЕЛЬ, КОТОРЫЙ НЕ ПОСЧИТАН, ОБЯЗАН ОТСУТСТВОВАТЬ.
 *
 * ЧТО БЫЛО СЛОМАНО. `scripts/cronAnalyticsWorker.ts` строил воронку по СТРОЧНЫМ
 * ключам `{ draft, proposed, approved, active, completed }` и отбирал строки
 * условием `if (p.status in funnelMap)`. Перечисление `treatment_plan_status` в
 * базе — `Draft, Active, Approved, Completed, Rejected` С БОЛЬШОЙ БУКВЫ (снято с
 * живой базы через `pg_enum` 2026-07-29). Ни один статус условие не проходил
 * НИКОГДА, поэтому воронка показывала нули при любом числе планов. ЗАМЕР ДО
 * ПРАВКИ, этим же файлом на живой базе: 15 посеянных планов дали
 * `Draft 0, Proposed 0, Approved 0, Active 0, Completed 0` — сумма 0 из 15.
 * Отказа не было: руководитель видел честно выглядящий ноль и по нему решал,
 * сколько тратить на рекламу.
 *
 * Карта расходилась с базой В ОБЕ СТОРОНЫ, и регистр — только половина беды:
 *   * `proposed` в карте был, а в перечислении базы его НЕТ ВОВСЕ — ветвь
 *     воронки, под которой не может оказаться ни одного плана ни при каких
 *     данных;
 *   * `Rejected` в базе есть, а карта его не знала — планы, от которых пациент
 *     отказался, из воронки исчезали. Это ровно тот показатель, по которому
 *     видно, что смета не продаётся.
 *
 * ПОЧЕМУ ПРОВЕРКА СМОТРИТ В `pg_enum`, А НЕ В `schema.ts`. Второй список
 * разъезжается с первым — этим и был дефект. Объявление в `schema.ts` можно
 * править, база при этом не меняется, и наоборот: тип существует с миграции
 * 0000. Поэтому истина здесь снимается с ЖИВОЙ базы, а код обязан совпасть с
 * ней — МНОЖЕСТВАМИ, а не длинами. Сравнение длин было бы зелено по совпадению:
 * в сломанной карте пять ветвей и в перечислении пять значений, при том что
 * совпадали из них только три. Проверено: на неисправленном коде сравнение длин
 * прошло, сравнение множеств падает.
 *
 * ЧИСЛА ПОСЕЯНЫ РАЗНЫМИ. 1/2/3/4/5 по пяти статусам — если ветви перепутать
 * местами, это видно; при равных числах перестановка прошла бы незамеченной.
 */

const NAMESPACE = "treatmentPlanFunnel";
/** Клиника с планами во всех пяти состояниях. */
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
/** Клиника без единой строки данных: её показатели обязаны отсутствовать, а не выдумываться. */
const EMPTY_ORG_ID = fixtureUuid(NAMESPACE, 3);

/**
 * Сколько планов какого статуса сеется. Ключи — значения перечисления базы,
 * дословно; если здесь появится значение, которого в `pg_enum` нет, вставка
 * упадёт на самой базе, а не разойдётся с ней молча.
 */
const SEEDED: Readonly<Record<string, number>> = {
	Draft: 1,
	Active: 2,
	Approved: 3,
	Completed: 4,
	Rejected: 5,
};

const SEEDED_TOTAL = Object.values(SEEDED).reduce((sum, count) => sum + count, 0);

/** Оплаченная выручка клиники. Ровно эта сумма обязана вернуться без множителей. */
const REVENUE_RUB = 7_431;

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

/** Последний снимок клиники: воронка планов лечения так, как её записал воркер. */
async function readSnapshot(organizationId: string): Promise<{
	planFunnel: { status?: string; name: string; value: number }[];
	cohortLtv: Record<string, unknown>[];
}> {
	const snapshot = await db.execute<{
		plan_funnel_json: { status?: string; name: string; value: number }[];
		cohort_ltv_json: Record<string, unknown>[];
	}>(sql`
		SELECT plan_funnel_json, cohort_ltv_json
		FROM bi_analytics_snapshots
		WHERE organization_id = ${organizationId}
		ORDER BY snapshot_date DESC
		LIMIT 1
	`);
	assert.equal(
		snapshot.rows.length,
		1,
		"снимок не записан: агрегация упала внутрь своего catch, смотри лог [BI Analytics]",
	);
	return {
		planFunnel: snapshot.rows[0]?.plan_funnel_json ?? [],
		cohortLtv: snapshot.rows[0]?.cohort_ltv_json ?? [],
	};
}

describe("воронка планов лечения совпадает с перечислением базы", () => {
	let databaseAvailable = true;

	before(async () => {
		try {
			// Уборка НА ВХОДЕ: прогон, убитый снаружи, до `after` не доходит и
			// оставляет свои планы в живой базе — иначе к посеянным пяти статусам
			// добавятся вчерашние и числа перестанут сходиться.
			await purgeFixtureOrganizations([ORG_ID, EMPTY_ORG_ID]);
			await db.insert(organizations).values([
				{ id: ORG_ID, name: "Клиника воронки планов" },
				{ id: EMPTY_ORG_ID, name: "Клиника без данных" },
			]);
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Сметин Планович Отказов",
			});
			await db.insert(treatmentPlans).values(
				Object.entries(SEEDED).flatMap(([status, count]) =>
					Array.from({ length: count }, (_unused, index) => ({
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						name: `План ${status} №${index + 1}`,
						status: status as (typeof treatmentPlans.status)["_"]["data"],
					})),
				),
			);
			await db.insert(payments).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				amountRub: REVENUE_RUB,
				status: "paid",
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (!databaseAvailable) return;
		await purgeFixtureOrganizations([ORG_ID, EMPTY_ORG_ID]);
	});

	test("каждое состояние из базы попадает в воронку своим числом планов", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await runBiAnalyticsAggregation(ORG_ID);
		const { planFunnel } = await readSnapshot(ORG_ID);

		const total = planFunnel.reduce((sum, stage) => sum + stage.value, 0);
		assert.equal(
			total,
			SEEDED_TOTAL,
			`В базе ${SEEDED_TOTAL} планов, а воронка насчитала ${total}: ${JSON.stringify(planFunnel)}. ` +
				"Ноль здесь означает, что ни один статус не совпал с картой состояний — именно так дефект и " +
				"выглядел: строчные ключи против `Draft` из базы, отказа нет, есть тихий ноль, которому " +
				"руководитель верит и по которому решает, сколько тратить на рекламу.",
		);

		// Поимённо, а не только суммой: сумма сошлась бы и при перепутанных ветвях.
		const byStatus = new Map(planFunnel.map((stage) => [stage.status, stage.value]));
		for (const [status, expected] of Object.entries(SEEDED)) {
			assert.equal(
				byStatus.get(status),
				expected,
				`ветвь ${status}: ожидалось ${expected} планов, в воронке ${byStatus.get(status)} — ` +
					`${JSON.stringify(planFunnel)}`,
			);
		}
	});

	test("состояния воронки совпадают с pg_enum как множества, в обе стороны", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const labels = await liveEnumLabels();
		assert.ok(
			labels.length > 0,
			"в живой базе нет типа treatment_plan_status — проверка потеряла свою точку опоры",
		);

		/*
		 * Ветви берутся у ПУСТОГО вызова, а не из снимка засеянной клиники, и это
		 * решает, работает ли проверка вообще. `buildPlanFunnel` не выбрасывает
		 * состояние, которого не знает: план в нём попадает в воронку под сырым
		 * именем из базы, чтобы не пропасть из отчёта. Полезное свойство — и оно же
		 * скрывает утрату ветви, пока в этом состоянии есть хоть один план: имя
		 * вернётся из строки данных, а не из объявления. ПРОВЕРЕНО прогоном: при
		 * `Rejected`, убранном из объявления, снимок засеянной клиники всё равно
		 * содержал `Rejected` — сверка по снимку осталась зелёной и дефект пропустила.
		 *
		 * Пустой вызов спрашивает ровно то, что нужно: какие ветви ОБЪЯВЛЯЕТ код,
		 * независимо от того, какие данные сегодня в базе. Именно ветвь без планов и
		 * опасна — она молча исчезает из отчёта, и владелец не узнаёт, что она
		 * существует.
		 */
		const inFunnel = buildPlanFunnel([]).map((stage) => stage.status);

		const missing = labels.filter((label) => !inFunnel.includes(label));
		assert.deepEqual(
			missing,
			[],
			`Состояния есть в базе, но воронка их не знает: ${missing.join(", ")}. Планы в этих состояниях ` +
				"из отчёта пропадают целиком — так пропадал `Rejected`, то есть отказы пациентов от смет. " +
				`В перечислении базы: ${labels.join(", ")}; в воронке: ${inFunnel.join(", ")}.`,
		);

		const extra = inFunnel.filter((status) => !labels.includes(status));
		assert.deepEqual(
			extra,
			[],
			`Воронка объявила состояния, которых в базе нет: ${extra.join(", ")}. Под такой ветвью не может ` +
				"оказаться ни одного плана ни при каких данных — так в воронке жил `proposed`. " +
				`В перечислении базы: ${labels.join(", ")}.`,
		);
	});

	test("ноль планов остаётся нулём и не подменяется единицей", (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// `services/biAnalyticsWorker.ts` подставлял `os.draft || 1` у трёх ветвей из
		// четырёх: клиника без единого плана лечения видела по одному плану в
		// «Draft», «Proposed» и «Active». Выдуманная единица от настоящей не
		// отличается ничем.
		const funnel = buildPlanFunnel([]);
		const inflated = funnel.filter((stage) => stage.value !== 0);
		assert.deepEqual(
			inflated,
			[],
			`При полном отсутствии планов воронка показала ненулевые ветви: ${JSON.stringify(inflated)}. ` +
				"Ноль — это утверждение «планов нет», и оно верное; единица на его месте — выдумка.",
		);
	});

	test("состояние, которого нет в объявлении, не выбрасывается из воронки", (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Прежний отбор `if (p.status in funnelMap)` терял такие планы молча, и сумма
		// воронки не сходилась с числом планов в базе — заметить это было нечем.
		const funnel = buildPlanFunnel([
			{ status: "Draft", count: 2 },
			{ status: "СостояниеИзБудущейМиграции", count: 7 },
		]);
		const total = funnel.reduce((sum, stage) => sum + stage.value, 0);
		assert.equal(
			total,
			9,
			`Сумма воронки ${total} вместо 9: план в незнакомом состоянии потерян. Показать ветвь без ` +
				`русской подписи допустимо, потерять планы — нет. Воронка: ${JSON.stringify(funnel)}`,
		);
	});

	test("выручка когорты возвращается измеренной, без множителей 1.5 / 2 / 3", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const cohorts = await computeCohortLtvAll([ORG_ID]);
		const rows = cohorts.get(ORG_ID) ?? [];
		assert.equal(
			rows.length,
			1,
			`ожидалась одна корзина месяца с посеянным платежом, получено ${JSON.stringify(rows)}`,
		);

		const row = rows[0];
		assert.ok(row);
		assert.equal(
			row["Month 1"],
			REVENUE_RUB,
			`выручка корзины ${row["Month 1"]} вместо посеянных ${REVENUE_RUB} ₽`,
		);

		/*
		 * Горизонты 3 / 6 / 12 месяцев по этой выборке не восстанавливаются: её
		 * корзина — месяц, В КОТОРОМ ПРИШЛИ ДЕНЬГИ, а не месяц регистрации
		 * пациента, и даты регистрации плательщика в ней нет. Здесь стояли
		 * `* 1.5`, `* 2`, `* 3`. Особенно дорого стоил `Month 12`: экран читает
		 * ровно это поле и подписывает его «За год»
		 * (`AnalyticsDashboardView.tsx:388`), то есть месячная выручка,
		 * умноженная на три, предъявлялась владельцу как измеренная годовая.
		 */
		const horizons = Object.keys(row).filter((key) => /^Month (3|6|12)$/.test(key));
		assert.deepEqual(
			horizons,
			[],
			`Вернулись горизонты, которые здесь не считаются: ${horizons.join(", ")} — ` +
				`${JSON.stringify(row)}. Если величину посчитать нельзя, она обязана отсутствовать: ` +
				"отсутствующее видно, а выдуманное владелец клиники примет за правду.",
		);
	});

	test("воронка второго писателя колонки считает планы, а не стратегии сценариев", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		/*
		 * `services/biAnalyticsWorker.ts` считал воронку по `treatment_scenarios`
		 * с группировкой по `strategy` и раскладкой `urgent → Active`,
		 * `standard → Proposed`, `optimal → Draft`, всё остальное → `Completed`.
		 * Стратегия — подход к лечению, а не стадия: сценарий `phased` или
		 * `maintenance` попадал в `else` и объявлялся ЗАВЕРШЁННЫМ планом лечения.
		 * Оба писателя колонки `plan_funnel_json` обязаны считать одно и то же.
		 */
		const funnels = await computePlanFunnelAll();
		const funnel = funnels.get(ORG_ID) ?? [];
		const byStatus = new Map(funnel.map((stage) => [stage.status, stage.value]));

		for (const [status, expected] of Object.entries(SEEDED)) {
			assert.equal(
				byStatus.get(status),
				expected,
				`ветвь ${status}: ожидалось ${expected} планов, получено ${byStatus.get(status)} — ` +
					`${JSON.stringify(funnel)}`,
			);
		}
	});

	test("у клиники без данных показатели отсутствуют, а не выдумываются", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		/*
		 * Здесь стояли три подставных набора на случай пустой карты:
		 * `[{ cohort: "Jan", "Month 1": 0 }]`, воронка с единицами и
		 * «Chair 1 — 10 приёмов», «Chair 2 — 5». Худший из возможных случаев для
		 * подмены: ровно НОВАЯ клиника получала чужие показатели как свои.
		 */
		const cohorts = await computeCohortLtvAll([EMPTY_ORG_ID]);
		assert.equal(
			cohorts.get(EMPTY_ORG_ID),
			undefined,
			`клиника без платежей получила корзины выручки: ${JSON.stringify(cohorts.get(EMPTY_ORG_ID))}`,
		);

		const funnels = await computePlanFunnelAll();
		assert.equal(
			funnels.get(EMPTY_ORG_ID),
			undefined,
			`клиника без планов получила воронку: ${JSON.stringify(funnels.get(EMPTY_ORG_ID))}`,
		);

		// Сквозь запись в снимок: массивы обязаны быть пустыми, а не подставными.
		await runBiAnalyticsAggregation(EMPTY_ORG_ID);
		const { cohortLtv, planFunnel } = await readSnapshot(EMPTY_ORG_ID);
		assert.deepEqual(
			cohortLtv,
			[],
			`снимок клиники без данных содержит когорты: ${JSON.stringify(cohortLtv)}. Ярлык «Jan» здесь и ` +
				"был подменой: января в данных не было вовсе.",
		);
		assert.deepEqual(
			planFunnel.filter((stage) => stage.value !== 0),
			[],
			`снимок клиники без планов содержит ненулевые ветви: ${JSON.stringify(planFunnel)}`,
		);
	});
});
