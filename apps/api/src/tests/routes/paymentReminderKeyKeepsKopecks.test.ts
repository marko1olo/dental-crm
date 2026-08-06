/**
 * ЗАМОК ШАГА 2 ПЕРЕЕЗДА: НАПОМИНАНИЕ ОБ ОПЛАТЕ ЗНАЕТ КОПЕЙКИ.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ — ДВА ДЕФЕКТА В ОДНОМ МЕСТЕ.
 *
 * 1. Долг для напоминания считался ОТДЕЛЬНОЙ копией формулы
 *    (`sampleData.ts`, `patientPaymentBalanceRub`) — без округления до копейки.
 *    На суммах с копейками она отдавала плавающую грязь: три позиции
 *    1 000,00 + 1 001,82 + 1 489,67 давали `3491.4900000000002` вместо 3 491,49.
 *
 * 2. Долг попадал в КЛЮЧ ИДЕМПОТЕНТНОСТИ округлённым до целого рубля:
 *    `payment-reminder:<пациент>:${Math.round(долг)}`. Следствие для клиники:
 *    пациент доплатил 39 копеек, долг стал другим, а ключ — тем же, значит
 *    напоминание считается уже отправленным и второе не уйдёт НИКОГДА. Обратный
 *    случай так же плох: изменение долга на одну копейку через границу полурубля
 *    рождало новый ключ и повторное напоминание на ту же сумму.
 *
 * ЗАМЕР БОЕВЫМ МАРШРУТОМ `GET /api/telegram/outbox` (2026-07-29, своя клиника):
 *   ДО:    id = `payment-reminder:…:1000` и после доплаты 0,39 ₽ — тот же `…:1000`;
 *          у пациента с грязными копейками id = `payment-reminder:…:3491`.
 *   ПОСЛЕ: `…:1000.49` → `…:1000.10` (ключ изменился), и `…:3491.49`.
 *
 * ПОЧЕМУ ЧЕРЕЗ МАРШРУТ. Долг здесь нигде не показывается пациенту отдельным
 * полем — он виден снаружи ТОЛЬКО в идентификаторе элемента очереди, и именно
 * этот идентификатор решает, уйдёт напоминание или нет. Поэтому проверка читает
 * ответ маршрута, а не вызывает функцию: приватную `patientPaymentBalanceRub`
 * вызвать извне нельзя, и подменять её обёрткой значило бы проверять обёртку.
 *
 * ЖИВАЯ БАЗА, СВОЯ КЛИНИКА, СВОЙ БОТ. Организация выведена из имени файла через
 * `fixtureUuid`; чтобы маршрут согласился считать очередь по ней, конфигурация
 * бота подаётся через `DENTE_TELEGRAM_CLINIC_BOTS_JSON` в окружении ЭТОГО
 * процесса. Секрет администратора тоже свой и живёт только в этом процессе.
 * Уборка идёт и на входе, и на выходе.
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
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "paymentReminderKeyKeepsKopecks";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);

/** Долг 1 000,49 ₽, потом доплата 0,39 ₽ — ключ обязан измениться. */
const PATIENT_KOPECK_DEBT = fixtureUuid(NAMESPACE, 10);
/** Три позиции, чья сумма в плавающей точке даёт 3491.4900000000002. */
const PATIENT_FLOAT_DEBT = fixtureUuid(NAMESPACE, 11);
/** Всё лечение отменено: напоминания быть не должно вовсе. */
const PATIENT_CANCELLED = fixtureUuid(NAMESPACE, 12);
/** Рассчитался ровно: напоминания быть не должно. */
const PATIENT_SETTLED = fixtureUuid(NAMESPACE, 13);

const ADMIN_SECRET = "fixture-paymentReminderKeyKeepsKopecks-admin-secret";

type OutboxItem = {
	readonly id: string;
	readonly subjectId: string;
	readonly templateKind: string;
};

describe("ключ напоминания об оплате хранит копейки долга", () => {
	let app: FastifyInstance;
	let databaseReady = true;

	async function paymentReminderItems(): Promise<OutboxItem[]> {
		const response = await app.inject({
			method: "GET",
			url: `/api/telegram/outbox?organizationId=${ORGANIZATION_ID}&templateKind=payment_reminder_notice&limit=100`,
			headers: { "x-dente-admin-secret": ADMIN_SECRET },
		});
		assert.equal(
			response.statusCode,
			200,
			`очередь отправок ответила HTTP ${response.statusCode}: ${response.body}`,
		);
		const body = JSON.parse(response.body) as { items?: OutboxItem[] };
		return (body.items ?? []).filter(
			(item) => item.templateKind === "payment_reminder_notice",
		);
	}

	function keyFor(items: readonly OutboxItem[], patientId: string): string {
		const item = items.find((row) => row.subjectId === patientId);
		assert.ok(
			item,
			`напоминания об оплате для пациента ${patientId} в очереди нет — долг не увиден вовсе`,
		);
		return item.id;
	}

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		process.env.DENTE_TELEGRAM_ADMIN_SECRET = ADMIN_SECRET;
		/*
		 * Своя клиника со своим ботом: без этой записи маршрут отвечает 404
		 * «Telegram webhook относится к другой организации» — очередь считается
		 * только для клиники, у которой есть конфигурация бота.
		 */
		process.env.DENTE_TELEGRAM_CLINIC_BOTS_JSON = JSON.stringify([
			{
				organizationId: ORGANIZATION_ID,
				clinicId: ORGANIZATION_ID,
				botConfigId: "fixture-payment-reminder-bot",
				botUsername: "dente_fixture_reminder_bot",
				botToken: "000000:fixture-token-not-a-real-secret",
				webhookSecret: "fixture-webhook-secret-not-real",
			},
		]);

		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		/*
		 * Весь сев — под тенант-контекстом клиники. Под FORCE RLS в WITH CHECK
		 * политик тенант-таблиц дизъюнкта обхода нет, поэтому вставка без
		 * `app.current_tenant` отвергается кодом 42501 на каждой строке.
		 */
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db.insert(organizations).values({
				id: ORGANIZATION_ID,
				name: "Клиника замка ключа напоминаний",
			});
			for (const [patientId, fullName] of [
				[PATIENT_KOPECK_DEBT, "Копейкин Долг Копейкович"],
				[PATIENT_FLOAT_DEBT, "Плавающих Точка Хвостовна"],
				[PATIENT_CANCELLED, "Отменин Отмен Отменович"],
				[PATIENT_SETTLED, "Расчётов Расчёт Расчётович"],
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
					patientId: PATIENT_KOPECK_DEBT,
					title: "Лечение с копейками",
					quantity: "1",
					priceRub: 1000.49,
					unitPriceRub: 1000.49,
					discountRub: 0,
					status: "completed",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_FLOAT_DEBT,
					title: "Позиция 1",
					quantity: "1",
					priceRub: 1000,
					unitPriceRub: 1000,
					discountRub: 0,
					status: "completed",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_FLOAT_DEBT,
					title: "Позиция 2",
					quantity: "1",
					priceRub: 1001.82,
					unitPriceRub: 1001.82,
					discountRub: 0,
					status: "completed",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_FLOAT_DEBT,
					title: "Позиция 3",
					quantity: "1",
					priceRub: 1489.67,
					unitPriceRub: 1489.67,
					discountRub: 0,
					status: "proposed",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_CANCELLED,
					title: "Отменённое лечение",
					quantity: "1",
					priceRub: 26500,
					unitPriceRub: 26500,
					discountRub: 0,
					status: "cancelled",
				},
				{
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_SETTLED,
					title: "Оплаченное лечение",
					quantity: "1",
					priceRub: 3491.49,
					unitPriceRub: 3491.49,
					discountRub: 0,
					status: "completed",
				},
			]);
			await db.insert(payments).values({
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_SETTLED,
				amountRub: 3491.49,
				method: "card",
				status: "paid",
			});
		});

		app = Fastify();
		const { registerTelegramRoutes } = await import("../../routes/telegram.js");
		await registerTelegramRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;
		delete process.env.DENTE_TELEGRAM_CLINIC_BOTS_JSON;
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

	test("ключ несёт копейки долга, а не рубли после Math.round", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const items = await paymentReminderItems();
		assert.equal(
			keyFor(items, PATIENT_KOPECK_DEBT),
			`payment-reminder:${PATIENT_KOPECK_DEBT}:1000.49`,
			"долг 1 000,49 ₽ в ключе округлён до рубля: доплата в копейках больше не изменит ключ",
		);
	});

	test("грязь плавающей точки не доезжает до ключа: 3 491,49, а не 3491.4900000000002", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		// Контроль самой ловушки на тех же числах.
		assert.equal(1000 + 1001.82 + 1489.67, 3491.4900000000002);

		const items = await paymentReminderItems();
		assert.equal(
			keyFor(items, PATIENT_FLOAT_DEBT),
			`payment-reminder:${PATIENT_FLOAT_DEBT}:3491.49`,
			"сумма трёх позиций пришла в ключ либо с хвостом float, либо округлённой до рубля",
		);
	});

	test("доплата 39 копеек МЕНЯЕТ ключ — иначе второе напоминание не уйдёт никогда", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const before = keyFor(await paymentReminderItems(), PATIENT_KOPECK_DEBT);

		// Пациент доплатил 39 копеек: долг стал 1 000,10 ₽. Досев внутри теста
		// нуждается в тенант-контексте так же, как сев в before: под FORCE RLS
		// вставка без `app.current_tenant` отвергается кодом 42501.
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db.insert(payments).values({
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_KOPECK_DEBT,
				amountRub: 0.39,
				method: "cash",
				status: "paid",
			});
		});

		const after = keyFor(await paymentReminderItems(), PATIENT_KOPECK_DEBT);
		assert.equal(
			after,
			`payment-reminder:${PATIENT_KOPECK_DEBT}:1000.10`,
			"после доплаты 0,39 ₽ ключ не назвал новый долг",
		);
		assert.notEqual(
			after,
			before,
			"доплата 39 копеек не изменила ключ идемпотентности: напоминание считается отправленным, " +
				"и пациент больше никогда не узнает об остатке 1 000,10 ₽",
		);
		// Прежний ключ на обеих суммах был один и тот же — вот та самая причина.
		assert.equal(Math.round(1000.49), 1000);
		assert.equal(Math.round(1000.1), 1000);
	});

	test("отменённое лечение и полный расчёт напоминаний не рождают", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const items = await paymentReminderItems();
		assert.equal(
			items.find((item) => item.subjectId === PATIENT_CANCELLED),
			undefined,
			"пациенту с отменённым лечением уходит напоминание об оплате 26 500 ₽",
		);
		assert.equal(
			items.find((item) => item.subjectId === PATIENT_SETTLED),
			undefined,
			"пациенту, рассчитавшемуся до копейки, уходит напоминание об оплате",
		);
	});
});
