/**
 * СТОРОЖ ШВА «ПЛАН ЛЕЧЕНИЯ → ДЕНЬГИ КЛИНИКИ».
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Врач собирал план лечения на 3 491,49 ₽, маршрут
 * отвечал 200, план ложился в `treatment_plans` и `treatment_plan_items_new` —
 * а таблица `treatment_items`, из которой ВСЕ деньги клиники и читаются,
 * оставалась пустой. Следствие на экранах: главный экран «назначено 0 ₽», отчёт
 * дебиторки «долг 0 ₽ у 0 должников», счёт пациенту с пустой суммой. По данным
 * программы пациент лечился бесплатно, и взыскивать было нечего.
 *
 * ЧТО ИМЕННО ЗАПЕРТО ЗДЕСЬ — СВЯЗЬ, А НЕ СУЩЕСТВОВАНИЕ ФУНКЦИИ. Ни одна проверка
 * не спрашивает «есть ли писатель». Каждая сохраняет план ШТАТНЫМ маршрутом
 * через `app.inject` и затем читает деньги НЕЗАВИСИМЫМ SQL, написанным здесь
 * руками по канонической формуле отчёта дебиторки
 * (`services/reports/managerReports.ts`, `receivables()`):
 *
 *     строка позиции = greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)
 *     сальдо пациента = Σ строк(status <> 'cancelled') - Σ оплат(status = 'paid')
 *
 * Ни одного построителя проверяемого маршрута в проверках не участвует: сторож,
 * сверяющий код с самим собой, пройдёт и на сломанной формуле. Разбор, из
 * которого взята каноничность именно этой формулы, — `.agents/lead/
 * recon-debt-formula-sprawl.md`; разбор, почему писать надо в `treatment_items`,
 * а не чинить читателей, — `.agents/lead/recon-treatment-items-vs-plan-items.md`.
 *
 * ПОЧЕМУ `app.inject`, А НЕ СЕРВЕР НА 4100. Сервер разработки отдаёт СТАРУЮ
 * сборку: через него доказать правку невозможно. Маршрут регистрируется в этом
 * же процессе, из этих же исходников.
 *
 * СУММЫ ВЗЯТЫ С КОПЕЙКАМИ НАМЕРЕННО. 1 500,50 + 1 990,99 = 3 491,49 — и в базе
 * обязано лежать ровно `3491.49`, а не `3491.4900000000002`. Отдельная проверка
 * держит умножение: 1 500,10 × 3 = 4 500,30, тогда как в плавающей точке это
 * `4500.299999999999`. Сравнение идёт с ТЕКСТОМ колонки `numeric(12,2)`, потому
 * что сравнение чисел скрыло бы ровно тот дефект, который тут и ловится.
 *
 * ЖИВАЯ БАЗА, СВОЯ КЛИНИКА. Идентификаторы выведены из имени этого файла через
 * `fixtureUuid`, уборка идёт и на входе, и на выходе: прогон, убитый снаружи, до
 * `after` не доходит и оставил бы строки в живой базе. Демонстрационная клиника
 * `d0000000-…` и рабочая `4a3420d1-…` под уборку не подставляются в принципе —
 * `purgeFixtureOrganizations` отвергает всё, что не из тестового пространства.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	serviceCatalogItems,
	users,
} from "../../db/schema.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "treatmentPlanFeedsMoney";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
/** Пациент основного шва: план на 3 491,49 ₽ и его повторные сохранения. */
const PATIENT_MONEY = fixtureUuid(NAMESPACE, 3);
/** Пациент проверки копеек на умножении: 1 500,10 × 3. */
const PATIENT_KOPECKS = fixtureUuid(NAMESPACE, 4);
/** Пациент проверки защиты выполненного лечения от правки сметы. */
const PATIENT_PERFORMED = fixtureUuid(NAMESPACE, 5);
/** Пациент проверки отказа на сумме мельче копейки. */
const PATIENT_SUBKOPECK = fixtureUuid(NAMESPACE, 6);
const SERVICE_ONE_ID = fixtureUuid(NAMESPACE, 10);
const SERVICE_TWO_ID = fixtureUuid(NAMESPACE, 11);

/** 1 500,50 + 1 990,99 = 3 491,49. Копейки обязаны дожить до базы. */
const PRICE_ONE = 1500.5;
const PRICE_TWO = 1990.99;
const PLAN_TOTAL_TEXT = "3491.49";

type LedgerRow = {
	readonly id: string;
	readonly title: string;
	readonly tooth_code: string | null;
	readonly quantity: string;
	readonly unit_price_rub: string;
	readonly price_rub: string;
	readonly discount_rub: string;
	readonly status: string;
	readonly visit_id: string | null;
	readonly service_id: string | null;
};

/**
 * Позиции книги лечения пациента — прямым SQL, все денежные колонки ТЕКСТОМ.
 *
 * `::text` здесь не украшение: драйвер отдал бы `numeric` числом, и `4500.3`
 * визуально не отличалось бы от `4500.299999999999`, округлённого при печати.
 */
async function ledgerRows(patientId: string): Promise<LedgerRow[]> {
	const result = await db.execute<LedgerRow>(sql`
		select id::text as id,
		       title,
		       tooth_code,
		       quantity::text as quantity,
		       unit_price_rub::text as unit_price_rub,
		       price_rub::text as price_rub,
		       discount_rub::text as discount_rub,
		       status::text as status,
		       visit_id::text as visit_id,
		       service_id::text as service_id
		  from treatment_items
		 where organization_id = ${ORGANIZATION_ID}::uuid
		   and patient_id = ${patientId}::uuid
		 order by unit_price_rub, title
	`);
	return result.rows as LedgerRow[];
}

/**
 * Деньги пациента по КАНОНУ отчёта дебиторки, написанному здесь руками.
 *
 * Возвращает текст `numeric(12,2)`: сравнение текстом — единственный способ
 * доказать, что копейка не потерялась ни в маршруте, ни в колонке.
 */
async function moneyForPatient(patientId: string): Promise<{
	planned: string;
	paid: string;
	debt: string;
	items: number;
}> {
	const result = await db.execute<{
		planned: string;
		paid: string;
		debt: string;
		items: number;
	}>(sql`
		with planned as (
		  select coalesce(sum(greatest(unit_price_rub * greatest(quantity, 1) - discount_rub, 0)), 0)::numeric(12,2) as amount,
		         count(*)::int as items
		    from treatment_items
		   where organization_id = ${ORGANIZATION_ID}::uuid
		     and patient_id = ${patientId}::uuid
		     and status <> 'cancelled'
		), paid as (
		  select coalesce(sum(amount_rub), 0)::numeric(12,2) as amount
		    from payments
		   where organization_id = ${ORGANIZATION_ID}::uuid
		     and patient_id = ${patientId}::uuid
		     and status = 'paid'
		)
		select (select amount from planned)::text as planned,
		       (select amount from paid)::text as paid,
		       ((select amount from planned) - (select amount from paid))::text as debt,
		       (select items from planned) as items
	`);
	const row = result.rows[0];
	assert.ok(row, "независимый SQL не вернул строку — сверять нечего");
	return row;
}

/** Позиции сметы-документа: смета обязана продолжать работать. */
async function planItemCount(planId: string): Promise<number> {
	const result = await db.execute<{ n: number }>(
		sql`select count(*)::int as n from treatment_plan_items_new where plan_id = ${planId}::uuid`,
	);
	return result.rows[0]?.n ?? 0;
}

/**
 * Сколько позиций сметы легло БЕЗ принадлежности клинике.
 *
 * ЗАЧЕМ ЭТО ОТДЕЛЬНОЕ ЧИСЛО. Вставка позиций не задавала `organizationId`, хотя он
 * лежал в области видимости строкой выше — строкой плана. Колонка нуллябельна и в
 * базе, и в объявлении, поэтому база молчала, а позиции подписываемой сметы
 * ложились без владельца.
 *
 * Строка без организации не принадлежит никому: запрос с отбором по клинике её не
 * видит, а запрос без отбора видит её у ВСЕХ клиник. Ровно из этого класса выросла
 * межклиничная утечка приёмов (`f18a261bb`), где чужой пациент был виден в
 * расписании. Здесь речь о документе, под которым пациент ставит подпись.
 *
 * Проверяется числом, а не наличием: «ни одной сироты» и «принадлежит нужной
 * клинике» — разные утверждения, и второе без первого проходит на пустой выборке.
 */
async function planItemOwnership(planId: string): Promise<{ total: number; orphans: number; mine: number }> {
	const result = await db.execute<{ total: number; orphans: number; mine: number }>(
		sql`select count(*)::int as total,
		           count(*) filter (where organization_id is null)::int as orphans,
		           count(*) filter (where organization_id = ${ORGANIZATION_ID}::uuid)::int as mine
		      from treatment_plan_items_new where plan_id = ${planId}::uuid`,
	);
	return result.rows[0] ?? { total: 0, orphans: 0, mine: 0 };
}

function planItem(overrides: Record<string, unknown> = {}) {
	return {
		toothNumber: 36,
		priceId: SERVICE_ONE_ID,
		name: "Лечение кариеса 36",
		quantity: 1,
		price: PRICE_ONE,
		discount: 0,
		phase: 1,
		...overrides,
	};
}

describe("сохранённый план лечения виден деньгам клиники", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	async function savePlan(
		patientId: string,
		body: Record<string, unknown>,
	): Promise<{
		statusCode: number;
		json: Record<string, unknown>;
		body: string;
	}> {
		const response = await app.inject({
			method: "POST",
			url: `/api/patients/${patientId}/treatment-plans`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: body,
		});
		let json: Record<string, unknown> = {};
		try {
			json = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			json = {};
		}
		return { statusCode: response.statusCode, json, body: response.body };
	}

	before(async () => {
		process.env.NODE_ENV = "test";
		try {
			// Уборка следов прерванного прогона ДО посева: см. докстринг фикстуры.
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await db.insert(organizations).values({
			id: ORGANIZATION_ID,
			name: "Клиника сторожа шва план→деньги",
		});
		await db.insert(users).values({
			id: DOCTOR_ID,
			organizationId: ORGANIZATION_ID,
			fullName: "Врач сторожа шва план→деньги",
			role: "doctor",
		});
		for (const [patientId, fullName] of [
			[PATIENT_MONEY, "Пациент основного шва"],
			[PATIENT_KOPECKS, "Пациент проверки копеек"],
			[PATIENT_PERFORMED, "Пациент выполненного лечения"],
			[PATIENT_SUBKOPECK, "Пациент подкопеечной суммы"],
		] as const) {
			await db.insert(patients).values({
				id: patientId,
				organizationId: ORGANIZATION_ID,
				fullName,
				status: "active",
			});
		}
		/*
		 * Прайс с копейками: позиция плана обязана уметь ссылаться на услугу
		 * (`treatment_items.service_id` — внешний ключ на этот справочник), иначе
		 * назначенное лечение «висит в воздухе» и правила материалов его не найдут.
		 */
		await db.insert(serviceCatalogItems).values([
			{
				id: SERVICE_ONE_ID,
				organizationId: ORGANIZATION_ID,
				code: "TPM-1",
				title: "Лечение кариеса (сторож шва)",
				basePriceRub: PRICE_ONE,
				priceRub: PRICE_ONE,
			},
			{
				id: SERVICE_TWO_ID,
				organizationId: ORGANIZATION_ID,
				code: "TPM-2",
				title: "Пломба светового отверждения (сторож шва)",
				basePriceRub: PRICE_TWO,
				priceRub: PRICE_TWO,
			},
		]);

		staffToken = signToken(
			{ organizationId: ORGANIZATION_ID, userId: DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);

		app = Fastify();
		// Тот же хук, что в apps/api/src/server.ts: он наполняет request.user.
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});
		await registerOdontogramRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
		const leftovers = await db.execute<{ n: number }>(sql`
			select count(*)::int as n
			  from treatment_items
			 where organization_id = ${ORGANIZATION_ID}::uuid
		`);
		assert.equal(
			leftovers.rows[0]?.n ?? 0,
			0,
			"уборка не сняла позиции лечения фикстуры — следующий прогон прочтёт их как данные клиники",
		);
	});

	test("план на 3 491,49 ₽ становится долгом пациента, а не нулём", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const before = await moneyForPatient(PATIENT_MONEY);
		assert.equal(
			before.items,
			0,
			"перед сохранением плана позиций быть не должно",
		);
		assert.equal(before.planned, "0.00");

		const saved = await savePlan(PATIENT_MONEY, {
			name: "План лечения сторожа шва",
			items: [
				planItem(),
				planItem({
					toothNumber: 46,
					priceId: SERVICE_TWO_ID,
					name: "Пломба 46",
					price: PRICE_TWO,
				}),
			],
		});
		assert.equal(
			saved.statusCode,
			200,
			`маршрут не сохранил план: ${saved.body}`,
		);
		const planId = saved.json.planId as string;
		assert.ok(planId, "маршрут не вернул идентификатор плана");

		// Смета-документ обязана продолжать работать: у неё свои читатели (recall
		// хирургии по `phase`, история зуба), и они берут именно её.
		assert.equal(
			await planItemCount(planId),
			2,
			"позиции сметы-документа исчезли",
		);

		// И обязаны принадлежать КЛИНИКЕ, а не никому: строка без организации не
		// видна запросу с отбором по клинике и видна запросу без отбора у всех.
		const ownership = await planItemOwnership(planId);
		assert.deepEqual(
			ownership,
			{ total: 2, orphans: 0, mine: 2 },
			`позиции сметы легли без принадлежности клинике: ${JSON.stringify(ownership)} — ` +
				"строка без организации не принадлежит никому, и документ, под которым пациент ставит подпись, " +
				"становится виден чужой клинике при запросе без отбора",
		);

		const money = await moneyForPatient(PATIENT_MONEY);
		assert.equal(
			money.items,
			2,
			`деньги не видят плана: в treatment_items ${money.items} строк вместо 2 — ` +
				"главный экран покажет «назначено 0 ₽», дебиторка «долг 0 ₽ у 0 должников», счёт уйдёт с пустой суммой",
		);
		assert.equal(
			money.planned,
			PLAN_TOTAL_TEXT,
			`назначено по независимому SQL ${money.planned} ₽ вместо ${PLAN_TOTAL_TEXT} ₽`,
		);
		assert.equal(money.paid, "0.00");
		assert.equal(
			money.debt,
			PLAN_TOTAL_TEXT,
			"долг пациента не равен сумме плана",
		);

		// Итог в ответе маршрута и итог плана в базе — те же копейки.
		assert.equal(String(saved.json.totalPrice), "3491.49");
		const planRow = await db.execute<{ total_price: string }>(
			sql`select total_price::text as total_price from treatment_plans where id = ${planId}::uuid`,
		);
		assert.equal(planRow.rows[0]?.total_price, PLAN_TOTAL_TEXT);

		/*
		 * Долг считается по канону, а не «сумма позиций»: оплата вычитается. Без
		 * этой части проверка прошла бы и на писателе, который пишет позиции в
		 * таблицу, из которой дебиторка их не берёт.
		 */
		await db.execute(sql`
			insert into payments (organization_id, patient_id, amount_rub, method, status)
			values (${ORGANIZATION_ID}::uuid, ${PATIENT_MONEY}::uuid, 1500.50, 'card', 'paid')
		`);
		const afterPayment = await moneyForPatient(PATIENT_MONEY);
		assert.equal(afterPayment.paid, "1500.50");
		assert.equal(
			afterPayment.debt,
			"1990.99",
			"долг после оплаты 1 500,50 ₽ обязан быть 1 990,99 ₽ — ровно остаток плана",
		);

		const rows = await ledgerRows(PATIENT_MONEY);
		assert.deepEqual(
			rows.map((row) => [row.unit_price_rub, row.price_rub, row.discount_rub]),
			[
				["1500.50", "1500.50", "0.00"],
				["1990.99", "1990.99", "0.00"],
			],
			"цены позиций лечения не совпали с ценами плана до копейки",
		);
		assert.deepEqual(
			rows.map((row) => row.tooth_code),
			["36", "46"],
			"номер зуба из плана не доехал до позиции лечения",
		);
		assert.deepEqual(
			rows.map((row) => row.service_id),
			[SERVICE_ONE_ID, SERVICE_TWO_ID],
			"позиция лечения не сослалась на услугу прайса — правила материалов её не найдут",
		);
		assert.deepEqual(
			rows.map((row) => row.status),
			["proposed", "proposed"],
			"неподписанный план обязан давать позиции в статусе proposed",
		);
		assert.deepEqual(
			rows.map((row) => row.visit_id),
			[null, null],
			"позиция назначенного лечения не привязана к приёму, которого ещё не было",
		);
	});

	test("повторное сохранение плана не удваивает долг и снятая услуга уходит из денег", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const plans = await db.execute<{ id: string }>(
			sql`select id::text as id from treatment_plans where patient_id = ${PATIENT_MONEY}::uuid`,
		);
		const planId = plans.rows[0]?.id;
		assert.ok(planId, "план предыдущей проверки не найден");

		// Тот же план, те же две услуги: денег обязано остаться столько же.
		const resaved = await savePlan(PATIENT_MONEY, {
			id: planId,
			name: "План лечения сторожа шва",
			items: [
				planItem(),
				planItem({
					toothNumber: 46,
					priceId: SERVICE_TWO_ID,
					name: "Пломба 46",
					price: PRICE_TWO,
				}),
			],
		});
		assert.equal(
			resaved.statusCode,
			200,
			`повторное сохранение отказало: ${resaved.body}`,
		);

		const same = await moneyForPatient(PATIENT_MONEY);
		assert.equal(
			same.items,
			2,
			`после повторного сохранения ${same.items} позиций вместо 2`,
		);
		assert.equal(
			same.planned,
			PLAN_TOTAL_TEXT,
			`повторное сохранение изменило назначенное: ${same.planned} ₽ вместо ${PLAN_TOTAL_TEXT} ₽`,
		);

		// Врач убрал вторую услугу из сметы — деньги обязаны последовать за сметой.
		const shrunk = await savePlan(PATIENT_MONEY, {
			id: planId,
			name: "План лечения сторожа шва",
			items: [planItem()],
		});
		assert.equal(
			shrunk.statusCode,
			200,
			`сокращение плана отказало: ${shrunk.body}`,
		);
		const afterShrink = await moneyForPatient(PATIENT_MONEY);
		assert.equal(
			afterShrink.items,
			1,
			"снятая из сметы услуга осталась в деньгах",
		);
		assert.equal(
			afterShrink.planned,
			"1500.50",
			`после снятия услуги назначено ${afterShrink.planned} ₽ вместо 1500.50 ₽`,
		);
	});

	test("копейки не теряются на умножении: 1 500,10 × 3 = 4 500,30", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		/*
		 * В плавающей точке это выражение даёт 4500.299999999999. Такая сумма не
		 * проходит moneyRubSchema (третий знак после запятой), а колонка
		 * numeric(12,2) молча обрезала бы её — и в базе с планом на руках у
		 * пациента оказались бы разные суммы.
		 */
		const saved = await savePlan(PATIENT_KOPECKS, {
			name: "План проверки копеек",
			items: [
				planItem({
					priceId: SERVICE_ONE_ID,
					name: "Лечение кариеса, три единицы",
					quantity: 3,
					price: 1500.1,
				}),
			],
		});
		assert.equal(
			saved.statusCode,
			200,
			`маршрут не сохранил план: ${saved.body}`,
		);
		assert.equal(
			String(saved.json.totalPrice),
			"4500.3",
			`итог в ответе маршрута ${saved.json.totalPrice} — это след счёта денег в плавающей точке`,
		);

		const money = await moneyForPatient(PATIENT_KOPECKS);
		assert.equal(money.items, 1);
		assert.equal(
			money.planned,
			"4500.30",
			`назначено ${money.planned} ₽ вместо 4500.30 ₽`,
		);

		const planRow = await db.execute<{ total_price: string }>(sql`
			select total_price::text as total_price from treatment_plans
			 where patient_id = ${PATIENT_KOPECKS}::uuid
		`);
		assert.equal(planRow.rows[0]?.total_price, "4500.30");

		const rows = await ledgerRows(PATIENT_KOPECKS);
		assert.equal(
			rows[0]?.quantity,
			"3.00",
			"количество из плана не доехало до позиции лечения",
		);
		assert.equal(rows[0]?.unit_price_rub, "1500.10");
	});

	test("правка сметы не переписывает уже выполненное лечение", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const saved = await savePlan(PATIENT_PERFORMED, {
			name: "План выполненного лечения",
			items: [
				planItem({
					priceId: SERVICE_TWO_ID,
					name: "Пломба 46",
					price: PRICE_TWO,
				}),
			],
		});
		assert.equal(
			saved.statusCode,
			200,
			`маршрут не сохранил план: ${saved.body}`,
		);
		const planId = saved.json.planId as string;

		/*
		 * Клиника выполнила услугу: статус позиции ушёл из-под власти сметы. В
		 * боевом дереве это делает routes/diary.ts при закрытии дневника приёма;
		 * здесь состояние ставится прямым SQL, потому что проверяется НЕ переход
		 * статуса, а то, что правка сметы его не отменяет.
		 */
		await db.execute(sql`
			update treatment_items set status = 'completed'
			 where organization_id = ${ORGANIZATION_ID}::uuid
			   and patient_id = ${PATIENT_PERFORMED}::uuid
		`);

		// Врач переписал смету дешевле. Выполненное подорожать или подешеветь от
		// этого не может: оно уже оказано и подлежит оплате как оказано.
		const rewritten = await savePlan(PATIENT_PERFORMED, {
			id: planId,
			name: "План выполненного лечения",
			items: [
				planItem({ priceId: SERVICE_ONE_ID, name: "Дешёвая замена", price: 1 }),
			],
		});
		assert.equal(
			rewritten.statusCode,
			200,
			`правка сметы отказала: ${rewritten.body}`,
		);

		const rows = await ledgerRows(PATIENT_PERFORMED);
		const completed = rows.filter((row) => row.status === "completed");
		assert.equal(
			completed.length,
			1,
			"выполненная позиция лечения исчезла при правке сметы — клиника потеряла оказанную услугу",
		);
		assert.equal(
			completed[0]?.unit_price_rub,
			"1990.99",
			"правка сметы переписала цену уже выполненной услуги",
		);
		const money = await moneyForPatient(PATIENT_PERFORMED);
		assert.equal(
			money.planned,
			"1991.99",
			`назначено ${money.planned} ₽: обязано быть 1990.99 выполненного плюс 1.00 новой позиции`,
		);
	});

	test("сумма мельче копейки отклоняется, а не округляется молча", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		/*
		 * 1500.505 раньше проходила `z.number().finite().min(0)` и отсекалась
		 * только в `chargeLineKopecks` (422). Теперь `nonNegativeMoneyRubSchema`
		 * на позиции сметы режет её на входе — 400 TreatmentPlanValidationError.
		 * Тихое округление до 1500.51 подтвердило бы чужую потерю точности
		 * подписью клиники; правильный ответ — отказ 4xx, а не 500.
		 */
		const refused = await savePlan(PATIENT_SUBKOPECK, {
			name: "План с подкопеечной ценой",
			items: [planItem({ price: 1500.505 })],
		});
		assert.equal(
			refused.statusCode,
			400,
			`подкопеечная цена дала HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.equal(
			refused.json.error,
			"TreatmentPlanValidationError",
			`ожидали TreatmentPlanValidationError, получили ${String(refused.json.error)}`,
		);
		const money = await moneyForPatient(PATIENT_SUBKOPECK);
		assert.equal(
			money.items,
			0,
			"отклонённый план всё равно оставил позиции в деньгах",
		);
		const plans = await db.execute<{ n: number }>(
			sql`select count(*)::int as n from treatment_plans where patient_id = ${PATIENT_SUBKOPECK}::uuid`,
		);
		assert.equal(
			plans.rows[0]?.n,
			0,
			"отклонённый план всё равно записался — транзакция не откатилась",
		);
	});
});
