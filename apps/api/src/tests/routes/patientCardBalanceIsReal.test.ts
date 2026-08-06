/**
 * ЗАМОК ШАГА 1 ПЕРЕЕЗДА: САЛЬДО В КАРТОЧКЕ ПАЦИЕНТА — ЧИСЛО, А НЕ КОНСТАНТА.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. `db/patientsQuery.ts` отдавал `balanceRub: 0` —
 * константу, не связанную с данными. Замер боевым маршрутом `GET /api/patients`
 * по клинике `d0000000-…-d001` (2026-07-29): 14 карточек, ноль у ВСЕХ, тогда как
 * прямой SQL даёт четыре ненулевых сальдо — двое должны по 26 500,00 ₽, двое
 * переплатили по 800,00 ₽. Администратор открывал карточку должника на 26 500 ₽ и
 * читал в ней ноль. После правки тот же маршрут отвечает
 * `0103=-26500, 0104=-26500, 0100=800, 0101=800` — 4 ненулевых из 14.
 *
 * ЧТО ИМЕННО ЗАПЕРТО ЗДЕСЬ, И ПОЧЕМУ ПРОВЕРКА НЕ САМОДОСТАТОЧНА НАПОЛОВИНУ.
 * Каждое утверждение сверяет ответ МАРШРУТА с НЕЗАВИСИМЫМ SQL, написанным здесь
 * руками по канонической формуле отчёта дебиторки
 * (`services/reports/managerReports.ts`, `receivables()`):
 *
 *     строка позиции = greatest(unit_price_rub * quantity - discount_rub, 0)
 *     сальдо пациента = Σ строк(status <> 'cancelled') - Σ оплат(status = 'paid')
 *
 * ЗЕРКАЛО ПРИВЕДЕНО К ДЕЙСТВУЮЩЕЙ ФОРМУЛЕ 2026-08-06. Здесь стояло
 * `greatest(quantity, 1)` — копия выражения, которое в тот же день убрали из
 * самого отчёта (`services/reports/managerReports.ts`, `serviceSales` и
 * `receivables`; полный разбор с тремя опровергнутыми оправданиями стоит там).
 * Красным зеркало не было и не стало: на контрактных данных `quantity` целое и
 * не меньше единицы, а с миграции 0162 колонка иного и не примет, поэтому
 * `greatest(quantity, 1) = quantity` побитово и ни одна цифра проверки не
 * изменилась. Но зеркало продолжало ОБЪЯВЛЯТЬ формулу, которой в коде больше
 * нет, то есть работало второй, противоречащей спецификацией. Это приведение
 * устаревшего зеркала к действующей формуле, а не подгонка под зелёный цвет.
 *
 * ЗЕРКАЛО ОСТАЛОСЬ РУЧНЫМ SQL, А НЕ СТАЛО ВЫЗОВОМ `money/patientDebt.ts`
 * (`chargeLineKopecks`), И ЭТО СОЗНАТЕЛЬНО. Причина — абзацем ниже: сторож,
 * сверяющий код с самим собой, прошёл бы и на сломанной формуле. Позвать здесь
 * канон значило бы заменить независимый оракул тавтологией, то есть купить
 * защиту от расхождения ценой самой проверки.
 *
 * Ни одна функция проверяемого пути в проверках не участвует: сторож, сверяющий
 * код с самим собой, прошёл бы и на сломанной формуле. Знак сальдо в карточке
 * ОБРАТНЫЙ канону — так объявлено в контракте (`patientSchema.balanceRub`:
 * «оплачено минус запланировано, отрицательное — долг»), и SQL здесь считает
 * обе стороны, чтобы это было видно, а не подразумевалось.
 *
 * ПОЧЕМУ `app.inject`, А НЕ СЕРВЕР НА 4100. Сервер разработки отдаёт СТАРУЮ
 * сборку; через него правку доказать нельзя. Маршрут регистрируется в этом же
 * процессе из этих же исходников.
 *
 * СУММЫ С КОПЕЙКАМИ ВЗЯТЫ ГРЯЗНЫЕ НАМЕРЕННО. `1000.00 + 1001.82 + 1489.67` в
 * плавающей точке даёт `3491.4900000000002`, а `1500.10 × 3` — `4500.299999999999`.
 * Сальдо обязано остаться ровно `3491.49` и `4500.30`: третий знак после запятой
 * не проходит `moneyRubSchema`, то есть карточка ответила бы ошибкой на верных
 * данных, а колонка `numeric(12,2)` молча обрезала бы сумму.
 *
 * ЖИВАЯ БАЗА, СВОЯ КЛИНИКА. Идентификаторы выведены из имени файла через
 * `fixtureUuid`, уборка идёт и на входе, и на выходе: прогон, убитый снаружи, до
 * `after` не доходит и оставил бы строки в живой базе. Демонстрационные клиники
 * `d0000000-…` и `4a3420d1-…` под уборку не подставляются в принципе.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	payments,
	treatmentItems,
} from "../../db/schema.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "patientCardBalanceIsReal";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);

/** Должник: назначено 10 000,00, оплачено 4 000,00 — карточка обязана показать −6 000,00. */
const PATIENT_DEBTOR = fixtureUuid(NAMESPACE, 10);
/** Переплативший: назначено 1 500,50, оплачено 3 491,49 — карточка +1 990,99. */
const PATIENT_OVERPAID = fixtureUuid(NAMESPACE, 11);
/** Рассчитавшийся до копейки: 3 491,49 и 3 491,49 — ровно 0, без «-0». */
const PATIENT_SETTLED = fixtureUuid(NAMESPACE, 12);
/** Только отменённое лечение: 5 000,00 отменено, оплат нет — ИЗМЕРЕННЫЙ 0. */
const PATIENT_CANCELLED_ONLY = fixtureUuid(NAMESPACE, 13);
/** Ни одной денежной строки: тоже измеренный 0, но по другой причине. */
const PATIENT_NO_MONEY = fixtureUuid(NAMESPACE, 14);
/** Копейки на умножении: 1 500,10 × 3 = 4 500,30, оплат нет. */
const PATIENT_KOPECKS = fixtureUuid(NAMESPACE, 15);

const CARD_BALANCE_EXPECTED: ReadonlyArray<readonly [string, number, string]> =
	[
		[PATIENT_DEBTOR, -6000, "должник: 4 000,00 − 10 000,00"],
		[PATIENT_OVERPAID, 1990.99, "переплата: 3 491,49 − 1 500,50"],
		[PATIENT_SETTLED, 0, "рассчитался ровно"],
		[PATIENT_CANCELLED_ONLY, 0, "всё лечение отменено, оплат нет"],
		[PATIENT_NO_MONEY, 0, "денежных строк нет вовсе"],
		[PATIENT_KOPECKS, -4500.3, "1 500,10 × 3 без оплат"],
	];

type PatientDto = {
	readonly id: string;
	readonly fullName: string;
	readonly balanceRub: number;
};

/**
 * Сальдо карточки по НЕЗАВИСИМОМУ SQL, точным `numeric`, текстом колонки.
 *
 * Текст, а не число: `4500.3` и `4500.299999999999` при печати числом выглядят
 * одинаково, и сравнение чисел скрыло бы ровно тот дефект, который тут ловится.
 *
 * ЧТЕНИЕ ИДЁТ ПОД ТЕНАНТ-КОНТЕКСТОМ. Под FORCE RLS запрос без
 * `app.current_tenant` не видит ни одной строки клиники и ошибки не даёт: обе
 * суммы пришли бы нулями, а зеркало сверяло бы карточку с пустотой.
 */
async function cardBalanceText(patientId: string): Promise<{
	charged: string;
	paid: string;
	card: string;
	canon: string;
}> {
	return withFixtureTenant(ORGANIZATION_ID, async () => {
		const result = await db.execute<{
			charged: string;
			paid: string;
			card: string;
			canon: string;
		}>(sql`
			with charged as (
			  select coalesce(sum(greatest(unit_price_rub * quantity - discount_rub, 0)), 0)::numeric(12,2) as amount
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
			select (select amount from charged)::text as charged,
			       (select amount from paid)::text as paid,
			       ((select amount from paid) - (select amount from charged))::text as card,
			       ((select amount from charged) - (select amount from paid))::text as canon
		`);
		const row = result.rows[0];
		assert.ok(row, "независимый SQL не вернул строку — сверять нечего");
		return row;
	});
}

describe("картотека отдаёт настоящее сальдо пациента, а не ноль", () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let databaseReady = true;

	async function fetchPatients(): Promise<PatientDto[]> {
		const response = await app.inject({
			method: "GET",
			url: "/api/patients",
			headers: { "x-dente-clinic-token": clinicToken },
		});
		assert.equal(
			response.statusCode,
			200,
			`картотека ответила HTTP ${response.statusCode}: ${response.body}`,
		);
		return JSON.parse(response.body) as PatientDto[];
	}

	before(async () => {
		process.env.NODE_ENV = "test";
		// В памяти маршрут отдал бы демонстрационный массив, а не строки базы.
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		try {
			// Уборка следов прерванного прогона ДО посева: см. докстринг фикстуры.
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		/*
		 * Весь сев идёт под тенант-контекстом клиники. Под FORCE RLS в WITH CHECK
		 * политик тенант-таблиц дизъюнкта обхода нет, поэтому вставка без
		 * `app.current_tenant` отвергается кодом 42501 на КАЖДОЙ строке —
		 * и на организации, и на пациентах, и на деньгах.
		 */
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db.insert(organizations).values({
				id: ORGANIZATION_ID,
				name: "Клиника замка сальдо карточки",
			});
			for (const [patientId, fullName] of [
				[PATIENT_DEBTOR, "Должников Должник Должникович"],
				[PATIENT_OVERPAID, "Переплатова Переплата Переплатовна"],
				[PATIENT_SETTLED, "Расчётов Расчёт Расчётович"],
				[PATIENT_CANCELLED_ONLY, "Отменин Отмен Отменович"],
				[PATIENT_NO_MONEY, "Безденежных Без Денегович"],
				[PATIENT_KOPECKS, "Копейкин Копей Копейкович"],
			] as const) {
				await db.insert(patients).values({
					id: patientId,
					organizationId: ORGANIZATION_ID,
					fullName,
					status: "active",
				});
			}

			await db.insert(treatmentItems).values([
				// Должник: 10 000,00 назначено двумя строками.
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_DEBTOR,
					title: "Лечение кариеса",
					quantity: "1",
					priceRub: 6000,
					unitPriceRub: 6000,
					discountRub: 0,
					status: "completed",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_DEBTOR,
					title: "Пломба",
					quantity: "1",
					priceRub: 4000,
					unitPriceRub: 4000,
					discountRub: 0,
					status: "proposed",
				},
				// Переплативший: назначено 1 500,50.
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_OVERPAID,
					title: "Осмотр",
					quantity: "1",
					priceRub: 1500.5,
					unitPriceRub: 1500.5,
					discountRub: 0,
					status: "completed",
				},
				/*
				 * Рассчитавшийся: три позиции, чья сумма в плавающей точке даёт
				 * 3491.4900000000002. В карточке обязано выйти ровно 0.
				 */
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_SETTLED,
					title: "Позиция 1",
					quantity: "1",
					priceRub: 1000,
					unitPriceRub: 1000,
					discountRub: 0,
					status: "completed",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_SETTLED,
					title: "Позиция 2",
					quantity: "1",
					priceRub: 1001.82,
					unitPriceRub: 1001.82,
					discountRub: 0,
					status: "completed",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_SETTLED,
					title: "Позиция 3",
					quantity: "1",
					priceRub: 1489.67,
					unitPriceRub: 1489.67,
					discountRub: 0,
					status: "completed",
				},
				// Только отменённое лечение: в сальдо не идёт ни копейки.
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_CANCELLED_ONLY,
					title: "Отменённый план",
					quantity: "1",
					priceRub: 5000,
					unitPriceRub: 5000,
					discountRub: 0,
					status: "cancelled",
				},
				// Копейки на умножении: 1 500,10 × 3 = 4 500,30, а не 4500.299999999999.
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_KOPECKS,
					title: "Три единицы по 1 500,10",
					quantity: "3",
					priceRub: 4500.3,
					unitPriceRub: 1500.1,
					discountRub: 0,
					status: "proposed",
				},
			]);

			await db.insert(payments).values([
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_DEBTOR,
					amountRub: 4000,
					method: "card",
					status: "paid",
				},
				// 1 500,50 + 1 990,99 = 3 491,49 — переплата 1 990,99 сверх назначенного.
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_OVERPAID,
					amountRub: 1500.5,
					method: "card",
					status: "paid",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_OVERPAID,
					amountRub: 1990.99,
					method: "cash",
					status: "paid",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_SETTLED,
					amountRub: 3491.49,
					method: "card",
					status: "paid",
				},
				/*
				 * Запланированный платёж должника (`planned` — статус из enum
				 * `payment_status`): в сальдо он не идёт, иначе долг «погасился» бы
				 * обещанием заплатить.
				 */
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_DEBTOR,
					amountRub: 6000,
					method: "card",
					status: "planned",
				},
			]);
		});

		clinicToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: ORGANIZATION_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		// Оба хука боевого server.ts: onRequest кладёт организацию из подписанного
		// токена в request.tenantId, onRoute оборачивает обработчик в withTenantCtx.
		// Без второго маршрут под FORCE RLS читает ноль строк, и картотека приходит
		// пустой на только что засеянной клинике.
		app = createTenantTestApp();
		await registerPatientRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
		// Счёт остатков — тоже под тенант-контекстом. Без него SELECT не видит ни
		// одной строки клиники и вернул бы 0 при любом содержимом базы, то есть
		// проверка уборки стала бы её имитацией.
		const leftovers = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{ n: number }>(sql`
				select (select count(*) from treatment_items where organization_id = ${ORGANIZATION_ID}::uuid)
				     + (select count(*) from payments where organization_id = ${ORGANIZATION_ID}::uuid)
				     + (select count(*) from patients where organization_id = ${ORGANIZATION_ID}::uuid) as n
			`),
		);
		assert.equal(
			Number(leftovers.rows[0]?.n ?? 0),
			0,
			"уборка не сняла строки фикстуры — следующий прогон прочтёт их как данные клиники",
		);
	});

	test("сальдо каждой карточки совпадает с независимым SQL по канону", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const rows = await fetchPatients();
		assert.equal(
			rows.length,
			6,
			"картотека вернула не шесть карточек фикстуры",
		);

		for (const [patientId, expected, why] of CARD_BALANCE_EXPECTED) {
			const card = rows.find((row) => row.id === patientId);
			assert.ok(card, `пациент ${patientId} исчез из картотеки`);
			assert.equal(
				card.balanceRub,
				expected,
				`карточка ${why}: маршрут отдал ${card.balanceRub} вместо ${expected}`,
			);

			const money = await cardBalanceText(patientId);
			assert.equal(
				String(card.balanceRub),
				String(Number(money.card)),
				`карточка ${why}: маршрут и независимый SQL разошлись — ${card.balanceRub} против ${money.card}`,
			);
			/*
			 * И знак: канон и карточка обязаны быть зеркальны, а не равны.
			 * Зеркальность проверяется СУММОЙ, а не отрицанием: `-Number("0.00")`
			 * даёт отрицательный ноль, и `assert.equal(0, -0)` падает на верных
			 * данных — на этом я и споткнулся при первом прогоне.
			 */
			assert.equal(
				Number(money.canon) + Number(money.card),
				0,
				`у ${why} канон и карточка не зеркальны — конвенция знака нарушена`,
			);
		}
	});

	test("ноль в карточке бывает только ИЗМЕРЕННЫМ, и это не одна причина", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const rows = await fetchPatients();
		const nonZero = rows.filter((row) => row.balanceRub !== 0);
		assert.equal(
			nonZero.length,
			3,
			`ненулевых сальдо ${nonZero.length} вместо трёх: константа вернулась либо расчёт отвалился`,
		);

		// Отменённое лечение: 5 000,00 в базе есть, в сальдо его нет.
		const cancelledMoney = await cardBalanceText(PATIENT_CANCELLED_ONLY);
		assert.equal(cancelledMoney.charged, "0.00");
		// Тенант-контекст обязателен и для этого счёта: без него SELECT вернул бы 0
		// на живой строке, и «позиция исчезла из базы» прозвучало бы о политике, а
		// не о данных.
		const cancelledRows = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{ n: number }>(sql`
				select count(*)::int as n from treatment_items
				 where organization_id = ${ORGANIZATION_ID}::uuid
				   and patient_id = ${PATIENT_CANCELLED_ONLY}::uuid
			`),
		);
		assert.equal(
			Number(cancelledRows.rows[0]?.n),
			1,
			"позиция отменённого лечения исчезла из базы — проверка стала пустой",
		);

		// Пациент без денежных строк: ноль по другой причине, но тоже измеренный.
		const emptyMoney = await cardBalanceText(PATIENT_NO_MONEY);
		assert.equal(emptyMoney.charged, "0.00");
		assert.equal(emptyMoney.paid, "0.00");

		// Рассчитавшийся до копейки: именно 0, а не «-0» (его печать даёт «-0 ₽»).
		const settled = rows.find((row) => row.id === PATIENT_SETTLED);
		assert.ok(settled);
		assert.ok(
			Object.is(settled.balanceRub, 0),
			"сальдо рассчитавшегося пациента — отрицательный ноль: карточка напечатает «-0 ₽»",
		);
	});

	test("копейки доживают до карточки: 3 491,49 и 4 500,30 без хвоста float", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		// Контроль самой ловушки: в плавающей точке эти суммы дают хвост.
		assert.equal(1000 + 1001.82 + 1489.67, 3491.4900000000002);
		assert.equal(1500.1 * 3, 4500.299999999999);

		const settledMoney = await cardBalanceText(PATIENT_SETTLED);
		assert.equal(
			settledMoney.charged,
			"3491.49",
			"назначенное рассчитавшегося пациента не равно 3 491,49 в самой базе",
		);
		const kopecksMoney = await cardBalanceText(PATIENT_KOPECKS);
		assert.equal(
			kopecksMoney.charged,
			"4500.30",
			"1 500,10 × 3 в базе не равно 4 500,30",
		);

		const rows = await fetchPatients();
		const settled = rows.find((row) => row.id === PATIENT_SETTLED);
		const kopecks = rows.find((row) => row.id === PATIENT_KOPECKS);
		assert.ok(settled && kopecks);
		assert.equal(settled.balanceRub, 0);
		assert.equal(
			kopecks.balanceRub,
			-4500.3,
			`сальдо ${kopecks.balanceRub} — след счёта денег в плавающей точке`,
		);
		// Третий знак после запятой не прошёл бы moneyRubSchema, то есть карточка
		// ответила бы ошибкой на верных данных. Проверяем сам ответ маршрута.
		assert.equal(String(kopecks.balanceRub), "-4500.3");
	});

	test("правка анкеты не гасит долг: PUT карточки возвращает то же сальдо", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const response = await app.inject({
			method: "PUT",
			url: `/api/patients/${PATIENT_DEBTOR}`,
			headers: { "x-dente-clinic-token": clinicToken },
			payload: {
				fullName: "Должников Должник Должникович",
				phone: "+7 900 000-00-11",
			},
		});
		assert.equal(
			response.statusCode,
			200,
			`правка карточки ответила HTTP ${response.statusCode}: ${response.body}`,
		);
		const updated = JSON.parse(response.body) as PatientDto;
		assert.equal(
			updated.balanceRub,
			-6000,
			`после сохранения анкеты карточка отдала сальдо ${updated.balanceRub}: ` +
				"нажатие «Сохранить» в анкете не имеет права гасить долг 6 000,00 ₽",
		);

		// В базе деньги при этом не тронуты — правка касалась только анкеты.
		const money = await cardBalanceText(PATIENT_DEBTOR);
		assert.equal(money.charged, "10000.00");
		assert.equal(money.paid, "4000.00");
	});
});
