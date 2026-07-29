/**
 * ЗАМОК ШАГА 3 ПЕРЕЕЗДА: ОТМЕНЁННОЕ ЛЕЧЕНИЕ БОЛЬШЕ НЕ ВИСИТ НА ПАЦИЕНТЕ ДОЛГОМ.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Долг в подсказке администратору считался своей
 * копией формулы (`sampleData.ts`, `buildPatientInsights`), и позиции для неё
 * группировались БЕЗ фильтра `status !== "cancelled"`:
 *
 *     const planItemsByPatient = groupByPatientId(treatmentPlanItems);
 *
 * Все остальные расчёты денег отменённое лечение исключают. То есть отменённый
 * план продолжал висеть на пациенте долгом ровно там, где администратор читает
 * сумму перед звонком: чип суммы в строке пациента
 * (`apps/web/src/components/patients/PatientsView.tsx`) и «💰 Долг …» в смене
 * (`apps/web/src/components/.../ShiftView.tsx`). Пациенту звонили и требовали
 * денег за лечение, которое клиника сама отменила.
 *
 * ЗАМЕР БОЕВЫМ МАРШРУТОМ `GET /api/dashboard` (2026-07-29, своя клиника):
 *   ДО:    пациент со смешанным планом — 15 000 ₽ (10 000 активных + 5 000
 *          отменённых), пациент с полностью отменённым планом — 26 500 ₽,
 *          пациент с копейками — 4 991,99 ₽.
 *   ПОСЛЕ: 10 000 ₽, 0 ₽ и 3 491,49 ₽ соответственно.
 * На демонстрационной клинике `d0000000-…-d001` расхождение равно нулю, потому
 * что отменённых позиций там нет ни одной, — именно поэтому дефект и жил.
 *
 * ЧТО ИМЕННО ЗАПЕРТО. Ответ МАРШРУТА сверяется с независимым SQL, написанным
 * здесь руками по канону отчёта дебиторки (`services/reports/managerReports.ts`,
 * `receivables()`), и отдельно — с суммой, посчитанной БЕЗ фильтра статуса, то
 * есть с прежним ответом. Второе обязательно: без него проверка прошла бы и на
 * данных, где отменённых позиций нет, и ничего бы не охраняла.
 *
 * ПРОВЕРЯЕТСЯ И ТЕКСТ, КОТОРЫЙ ЧИТАЕТ ЧЕЛОВЕК. `adminFlags` несёт строку
 * «остаток N ₽» — её и видит администратор. Число в подсказке и число в поле
 * обязаны совпадать, иначе исправленным окажется одно из двух.
 *
 * ПОЧЕМУ `app.inject`, А НЕ СЕРВЕР НА 4100. Сервер разработки отдаёт СТАРУЮ
 * сборку. Маршрут регистрируется в этом же процессе из этих же исходников, и
 * данные клиники он читает из живой базы через `hydrateDomainStateFromDb`.
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
	payments,
	treatmentItems,
} from "../../db/schema.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "patientInsightDropsCancelledTreatment";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);

/** 10 000,00 активного лечения плюс 5 000,00 отменённого. Долг — 10 000,00. */
const PATIENT_MIXED = fixtureUuid(NAMESPACE, 10);
/** Весь план отменён (26 500,00). Долга нет вовсе. */
const PATIENT_ALL_CANCELLED = fixtureUuid(NAMESPACE, 11);
/** Копейки: 1 000,00 + 1 001,82 + 1 489,67 активных, 1 500,50 отменено. */
const PATIENT_KOPECKS = fixtureUuid(NAMESPACE, 12);

type PatientInsightDto = {
	readonly patientId: string;
	readonly balanceDueRub: number;
	readonly adminFlags: readonly string[];
	readonly riskReasons: readonly string[];
};

/**
 * Долг пациента двумя способами: по КАНОНУ (без отменённых) и ПРЕЖНИМ образом
 * (со всеми позициями). Обе суммы — точным `numeric`, текстом колонки.
 */
async function debtBothWays(patientId: string): Promise<{
	canon: string;
	with_cancelled: string;
	paid: string;
}> {
	const result = await db.execute<{
		canon: string;
		with_cancelled: string;
		paid: string;
	}>(sql`
		with active as (
		  select coalesce(sum(greatest(unit_price_rub * greatest(quantity, 1) - discount_rub, 0)), 0)::numeric(12,2) as amount
		    from treatment_items
		   where organization_id = ${ORGANIZATION_ID}::uuid
		     and patient_id = ${patientId}::uuid
		     and status <> 'cancelled'
		), everything as (
		  select coalesce(sum(greatest(unit_price_rub * greatest(quantity, 1) - discount_rub, 0)), 0)::numeric(12,2) as amount
		    from treatment_items
		   where organization_id = ${ORGANIZATION_ID}::uuid
		     and patient_id = ${patientId}::uuid
		), paid as (
		  select coalesce(sum(amount_rub), 0)::numeric(12,2) as amount
		    from payments
		   where organization_id = ${ORGANIZATION_ID}::uuid
		     and patient_id = ${patientId}::uuid
		     and status = 'paid'
		)
		select greatest((select amount from active) - (select amount from paid), 0)::text as canon,
		       greatest((select amount from everything) - (select amount from paid), 0)::text as with_cancelled,
		       (select amount from paid)::text as paid
	`);
	const row = result.rows[0];
	assert.ok(row, "независимый SQL не вернул строку — сверять нечего");
	return row;
}

describe("подсказка администратору не считает отменённое лечение долгом", () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let databaseReady = true;

	async function insights(): Promise<PatientInsightDto[]> {
		const response = await app.inject({
			method: "GET",
			url: "/api/dashboard",
			headers: {
				"x-dente-clinic-token": clinicToken,
				authorization: `Bearer ${clinicToken}`,
			},
		});
		assert.equal(
			response.statusCode,
			200,
			`сводка ответила HTTP ${response.statusCode}: ${response.body.slice(0, 300)}`,
		);
		const body = JSON.parse(response.body) as {
			patientInsights?: PatientInsightDto[];
		};
		return body.patientInsights ?? [];
	}

	function insightFor(
		rows: readonly PatientInsightDto[],
		patientId: string,
	): PatientInsightDto {
		const row = rows.find((item) => item.patientId === patientId);
		assert.ok(row, `подсказки по пациенту ${patientId} в сводке нет`);
		return row;
	}

	before(async () => {
		process.env.NODE_ENV = "test";
		// В памяти сводка собралась бы из демонстрационных массивов, а не из базы.
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await db.insert(organizations).values({
			id: ORGANIZATION_ID,
			name: "Клиника замка отменённого лечения",
		});
		for (const [patientId, fullName] of [
			[PATIENT_MIXED, "Смешанин Смешан Смешанович"],
			[PATIENT_ALL_CANCELLED, "Отменин Отмен Отменович"],
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
			{
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_MIXED,
				title: "Активное лечение 1",
				quantity: "1",
				priceRub: 5000,
				unitPriceRub: 5000,
				discountRub: 0,
				status: "completed",
			},
			{
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_MIXED,
				title: "Активное лечение 2",
				quantity: "1",
				priceRub: 5000,
				unitPriceRub: 5000,
				discountRub: 0,
				status: "proposed",
			},
			{
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_MIXED,
				title: "Отменённое лечение",
				quantity: "1",
				priceRub: 5000,
				unitPriceRub: 5000,
				discountRub: 0,
				status: "cancelled",
			},
			{
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_ALL_CANCELLED,
				title: "Отменённый план целиком",
				quantity: "1",
				priceRub: 26500,
				unitPriceRub: 26500,
				discountRub: 0,
				status: "cancelled",
			},
			{
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_KOPECKS,
				title: "Позиция 1",
				quantity: "1",
				priceRub: 1000,
				unitPriceRub: 1000,
				discountRub: 0,
				status: "completed",
			},
			{
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_KOPECKS,
				title: "Позиция 2",
				quantity: "1",
				priceRub: 1001.82,
				unitPriceRub: 1001.82,
				discountRub: 0,
				status: "completed",
			},
			{
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_KOPECKS,
				title: "Позиция 3",
				quantity: "1",
				priceRub: 1489.67,
				unitPriceRub: 1489.67,
				discountRub: 0,
				status: "proposed",
			},
			{
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_KOPECKS,
				title: "Отменённая позиция с копейками",
				quantity: "1",
				priceRub: 1500.5,
				unitPriceRub: 1500.5,
				discountRub: 0,
				status: "cancelled",
			},
		]);
		/*
		 * Оплата у пациента с копейками есть намеренно: долг обязан считаться
		 * вычитанием, а не «суммой активных позиций». Без оплаты проверка прошла
		 * бы и на расчёте, который оплаты не видит вовсе.
		 */
		await db.insert(payments).values({
			organizationId: ORGANIZATION_ID,
			patientId: PATIENT_KOPECKS,
			amountRub: 1000,
			method: "card",
			status: "paid",
		});

		clinicToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: ORGANIZATION_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		app = Fastify();
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});
		await registerDashboardRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
		const leftovers = await db.execute<{ n: number }>(sql`
			select (select count(*) from treatment_items where organization_id = ${ORGANIZATION_ID}::uuid)
			     + (select count(*) from payments where organization_id = ${ORGANIZATION_ID}::uuid)
			     + (select count(*) from patients where organization_id = ${ORGANIZATION_ID}::uuid) as n
		`);
		assert.equal(
			Number(leftovers.rows[0]?.n ?? 0),
			0,
			"уборка не сняла строки фикстуры — следующий прогон прочтёт их как данные клиники",
		);
	});

	test("отменённые 5 000 ₽ ушли из долга: 10 000 ₽ вместо 15 000 ₽", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const money = await debtBothWays(PATIENT_MIXED);
		// Сначала — что расхождение вообще есть в данных, иначе проверка пустая.
		assert.equal(money.canon, "10000.00");
		assert.equal(money.with_cancelled, "15000.00");

		const insight = insightFor(await insights(), PATIENT_MIXED);
		assert.equal(
			insight.balanceDueRub,
			10_000,
			`подсказка администратору называет долг ${insight.balanceDueRub} ₽ вместо 10 000 ₽: ` +
				"отменённое лечение снова висит на пациенте, и по этой сумме ему позвонят",
		);
		assert.notEqual(
			insight.balanceDueRub,
			15_000,
			"долг равен сумме ВСЕХ позиций, включая отменённую — прежний дефект вернулся",
		);
	});

	test("полностью отменённый план даёт 0 и не оставляет подсказки о долге", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const money = await debtBothWays(PATIENT_ALL_CANCELLED);
		assert.equal(money.canon, "0.00");
		assert.equal(money.with_cancelled, "26500.00");

		const insight = insightFor(await insights(), PATIENT_ALL_CANCELLED);
		assert.equal(
			insight.balanceDueRub,
			0,
			`пациент с полностью отменённым планом должен ${insight.balanceDueRub} ₽`,
		);
		assert.equal(
			insight.adminFlags.find((flag) => flag.startsWith("остаток")),
			undefined,
			`в подсказке администратору осталась строка об остатке: ${insight.adminFlags.join(" | ")}`,
		);
	});

	test("текст подсказки называет то же число, что и поле долга", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const insight = insightFor(await insights(), PATIENT_MIXED);
		// Ровно так строку собирает сервер: toLocaleString("ru-RU") ставит
		// НЕРАЗРЫВНЫЙ пробел, поэтому ожидание строится тем же вызовом, а не
		// литералом с обычным пробелом — иначе падение выглядело бы как
		// «10 000 ₽ !== 10 000 ₽».
		const expectedFlag = `остаток ${(10_000).toLocaleString("ru-RU")} ₽`;
		assert.ok(
			insight.adminFlags.includes(expectedFlag),
			`администратор читает ${insight.adminFlags.join(" | ")}, а не «${expectedFlag}»`,
		);
		assert.ok(
			insight.riskReasons.some((reason) => reason === expectedFlag),
			"причина риска называет другую сумму, чем поле долга",
		);
	});

	test("копейки: 3 491,49 после отмены позиции на 1 500,50 и оплаты 1 000,00", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		// Контроль ловушки: в плавающей точке сумма позиций даёт хвост.
		assert.equal(1000 + 1001.82 + 1489.67, 3491.4900000000002);

		const money = await debtBothWays(PATIENT_KOPECKS);
		assert.equal(money.paid, "1000.00");
		assert.equal(money.canon, "2491.49");
		assert.equal(money.with_cancelled, "3991.99");

		const insight = insightFor(await insights(), PATIENT_KOPECKS);
		assert.equal(
			insight.balanceDueRub,
			2491.49,
			`долг ${insight.balanceDueRub} — либо посчитана отменённая позиция, либо потерялись копейки`,
		);
		// Третий знак после запятой не прошёл бы nonNegativeMoneyRubSchema, то
		// есть сводка ответила бы ошибкой на верных данных.
		assert.equal(String(insight.balanceDueRub), "2491.49");
	});
});
