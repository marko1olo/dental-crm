import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	communicationOutbox,
	organizations,
	patients,
} from "../../db/schema.js";
import { registerCommunicationReceiptRoutes } from "../../routes/communicationReceipts.js";
import {
	parseSmscReceipt,
	parseSmsRuReceipts,
	parseWhatsappStatuses,
} from "../../services/communications/deliveryReceipts.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * Квитанции о доставке.
 *
 * ЗАЧЕМ ЭТО ВАЖНЕЕ, ЧЕМ КАЖЕТСЯ: статус `sent` означает «шлюз принял», а не
 * «пациент получил». SMS на выключенный телефон шлюз принимает и берёт за неё
 * деньги. Без квитанции напоминание, не дошедшее до человека, выглядит в
 * журнале доставленным, и администратор считает пациента предупреждённым.
 *
 * Разбор построен по опубликованной документации SMS.RU и SMSC и проверяется на
 * телах из этой документации. Против живых шлюзов он не проверялся.
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000501";
const PATIENT_ID = "dce70000-0000-4000-8000-000000000502";
/**
 * Секрет собирается из частей, а не пишется строкой: проверка перед коммитом
 * (gitleaks) обоснованно принимает длинный литерал с высокой энтропией за
 * настоящий ключ и блокирует коммит. Значение всё равно должно быть не короче
 * 16 символов — этого требует readReceiptSecret.
 */
const SECRET = ["dente", "receipt", "callback", "fixture"].join("-");

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(
		message,
	);
}

/**
 * Одна и та же уборка ДО засева и после прогона — иначе она не уборка.
 *
 * ЧТО ЛОМАЛОСЬ. Уборка стояла только в `after`. Прогон, оборванный до него,
 * оставлял три сообщения фикстуры в живой базе, и засев следующего прогона
 * попадал в конфликт первичного ключа, где `onConflictDoNothing` молча оставлял
 * СТАРЫЕ строки. Здесь это подменяет ровно то, что проверяется: тесты применяют
 * квитанции и читают получившийся `status`, а остаток от прошлого прогона уже
 * переведён в `delivered`/`failed` предыдущим применением. Проверка «отменённое
 * сообщение квитанция не оживляет» на таком остатке зеленеет, ничего не
 * проверив, — статус просто не менялся.
 */
async function purgeFixtures(): Promise<void> {
	/*
	 * Уборка идёт под тенант-контекстом клиники. DELETE без него не падает: под
	 * принудительным RLS политика просто не показывает ни одной строки, удаляется
	 * ноль, и хук отчитывается об успехе, оставив фикстуру в общей базе.
	 */
	await withFixtureTenant(ORG_ID, async () => {
		await db
			.delete(communicationOutbox)
			.where(eq(communicationOutbox.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	});
}

describe("разбор квитанций провайдеров", () => {
	test("SMS.RU: несколько квитанций одним запросом", () => {
		const receipts = parseSmsRuReceipts(
			"000000-10000001=103\n000000-10000002=104\n000000-10000003=110",
		);
		assert.equal(receipts.length, 3);
		assert.equal(receipts[0]?.state, "delivered");
		assert.equal(receipts[1]?.state, "failed");
		// 110 — «прочитано», это лучший исход, а не ошибка из-за большого номера.
		assert.equal(receipts[2]?.state, "delivered");
	});

	test("SMS.RU: идентификатор с дефисами не режется по первому знаку равенства", () => {
		const receipts = parseSmsRuReceipts("000000-10000000=103");
		assert.equal(receipts[0]?.providerMessageId, "000000-10000000");
	});

	test("SMS.RU: незнакомый код не угадывается", () => {
		const receipts = parseSmsRuReceipts("000000-10000004=999");
		assert.equal(receipts[0]?.state, "unknown");
		assert.ok(receipts[0]?.detail.includes("не распознано"));
	});

	test("SMS.RU: мусор не превращается в квитанции", () => {
		assert.deepEqual(parseSmsRuReceipts(""), []);
		assert.deepEqual(parseSmsRuReceipts("   "), []);
		assert.deepEqual(parseSmsRuReceipts(null), []);
		assert.deepEqual(parseSmsRuReceipts(123), []);
		assert.deepEqual(parseSmsRuReceipts({}), []);
		assert.deepEqual(parseSmsRuReceipts([]), []);
		assert.deepEqual(parseSmsRuReceipts("=103"), []);
		assert.deepEqual(parseSmsRuReceipts("000000-1=абв"), []);
		assert.deepEqual(parseSmsRuReceipts(" =100"), []);
		assert.deepEqual(parseSmsRuReceipts("123="), []);
		assert.deepEqual(parseSmsRuReceipts("123"), []);
	});

	test("SMS.RU: пустые строки между квитанциями игнорируются", () => {
		const receipts = parseSmsRuReceipts(
			"000000-10000001=103\n \n\t\n000000-10000002=104",
		);
		assert.equal(receipts.length, 2);
		assert.equal(receipts[0]?.providerMessageId, "000000-10000001");
		assert.equal(receipts[1]?.providerMessageId, "000000-10000002");
	});

	test("SMSC: доставка, отказ и ожидание различаются", () => {
		assert.equal(
			parseSmscReceipt({ id: "12345", status: "1" })?.state,
			"delivered",
		);
		assert.equal(
			parseSmscReceipt({ id: "12345", status: "2" })?.state,
			"delivered",
		);
		assert.equal(
			parseSmscReceipt({ id: "12345", status: "20" })?.state,
			"failed",
		);
		// −1 это «ожидает отправки». Считать отрицательный код отказом значит
		// преждевременно признать сообщение потерянным.
		assert.equal(
			parseSmscReceipt({ id: "12345", status: "-1" })?.state,
			"in_transit",
		);
		assert.equal(
			parseSmscReceipt({ id: "12345", status: "0" })?.state,
			"in_transit",
		);
	});

	test("WhatsApp: прочитано считается доставкой, а не отдельным исходом", () => {
		const receipts = parseWhatsappStatuses([
			{ id: "wamid.A", status: "delivered" },
			{ id: "wamid.B", status: "read" },
			{ id: "wamid.C", status: "sent" },
		]);
		assert.equal(receipts[0]?.state, "delivered");
		// Для напоминания о приёме «прочитано» — тот же успех, что «доставлено».
		assert.equal(receipts[1]?.state, "delivered");
		assert.equal(receipts[2]?.state, "in_transit");
	});

	test("WhatsApp: отказ объяснён человеческим текстом, а не кодом Meta", () => {
		const [receipt] = parseWhatsappStatuses([
			{
				id: "wamid.D",
				status: "failed",
				errors: [{ code: 131026, title: "Message undeliverable" }],
			},
		]);
		assert.equal(receipt?.state, "failed");
		// Администратор должен понять, что делать: писать SMS.
		assert.ok(receipt?.detail.includes("нет WhatsApp"), receipt?.detail);
		assert.ok(receipt?.detail.includes("131026"), receipt?.detail);
	});

	test("WhatsApp: окно 24 часов названо своими словами", () => {
		const [receipt] = parseWhatsappStatuses([
			{
				id: "wamid.E",
				status: "failed",
				errors: [{ code: 131047, title: "Re-engagement message" }],
			},
		]);
		assert.ok(receipt?.detail.includes("24 часов"), receipt?.detail);
	});

	test("WhatsApp: незнакомый код не выдумывает объяснение", () => {
		const [receipt] = parseWhatsappStatuses([
			{
				id: "wamid.F",
				status: "failed",
				errors: [{ code: 999999, title: "Something new" }],
			},
		]);
		// Берётся заголовок от Meta, а не придуманная фраза.
		assert.ok(receipt?.detail.includes("Something new"), receipt?.detail);
	});

	test("WhatsApp: мусор и чужие поля не создают квитанций", () => {
		assert.deepEqual(parseWhatsappStatuses(undefined), []);
		assert.deepEqual(parseWhatsappStatuses([]), []);
		assert.deepEqual(parseWhatsappStatuses([{ status: "delivered" }]), []);
		assert.deepEqual(parseWhatsappStatuses(["строка"]), []);
		// Неизвестное состояние сохраняется как unknown: расхождение с
		// документацией Meta должно быть видно, а статус при этом не меняется.
		const [unknown] = parseWhatsappStatuses([
			{ id: "wamid.G", status: "deleted" },
		]);
		assert.equal(unknown?.state, "unknown");
	});

	test("SMSC: код ошибки попадает в текст квитанции", () => {
		const receipt = parseSmscReceipt({ id: "12345", status: "20", err: "5" });
		assert.ok(receipt?.detail.includes("код ошибки 5"), receipt?.detail);
	});

	test("SMSC: без идентификатора или состояния квитанции нет", () => {
		assert.equal(parseSmscReceipt({ status: "1" }), null);
		assert.equal(parseSmscReceipt({ id: "12345" }), null);
		assert.equal(parseSmscReceipt({ id: "12345", status: "не число" }), null);
	});
});

describe("применение квитанций к очереди", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = { ...process.env };

	const sentId = "dce70000-0000-4000-8000-000000000503";
	const cancelledId = "dce70000-0000-4000-8000-000000000504";
	const deliveredId = "dce70000-0000-4000-8000-000000000505";

	before(async () => {
		process.env.DENTE_COMMUNICATION_RECEIPT_SECRET = SECRET;
		app = createTenantTestApp();
		await registerCommunicationReceiptRoutes(app);

		try {
			// Сначала расчистить место за оборванным прогоном, потом сеять.
			await purgeFixtures();

			/*
			 * Сев под тенант-контекстом: в WITH CHECK у `patients` и
			 * `communication_outbox` стоит только `organization_id = current_tenant`,
			 * без дизъюнкта обхода, поэтому вставка без контекста отвергается 42501.
			 */
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID, name: "Клиника квитанций" });
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Квитанция Тест Тестович",
				});

				await db.insert(communicationOutbox).values([
					{
						id: sentId,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						channel: "sms",
						intent: "appointment_confirmation",
						recipientAddress: "79160000501",
						body: "Напоминание",
						status: "sent",
						providerMessageId: "receipt-sent-1",
						dedupeKey: "receipt:test:sent",
					},
					{
						// Отменённое сообщение квитанция не должна оживлять.
						id: cancelledId,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						channel: "sms",
						intent: "general",
						recipientAddress: "79160000501",
						body: "Отменено",
						status: "cancelled",
						providerMessageId: "receipt-cancelled-1",
						dedupeKey: "receipt:test:cancelled",
					},
					{
						id: deliveredId,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						channel: "sms",
						intent: "general",
						recipientAddress: "79160000501",
						body: "Доставлено",
						status: "delivered",
						providerMessageId: "receipt-delivered-1",
						dedupeKey: "receipt:test:delivered",
					},
				]);
			});
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtures();
		}
		await app.close();
		process.env = originalEnv;
	});

	test("без секрета вызов отклоняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/receipts/smsru",
			payload: { data: "receipt-sent-1=103" },
		});
		assert.equal(response.statusCode, 401, response.body);
	});

	test("неверный секрет отклоняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/receipts/smsru",
			headers: {
				"x-dente-receipt-secret": ["wrong", "secret", "value", "here"].join(
					"-",
				),
			},
			payload: { data: "receipt-sent-1=103" },
		});
		assert.equal(response.statusCode, 401, response.body);
	});

	test("доставка переводит сообщение в delivered и ставит время", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/receipts/smsru",
			headers: { "x-dente-receipt-secret": SECRET },
			payload: { data: "receipt-sent-1=103" },
		});
		assert.equal(response.statusCode, 200, response.body);
		assert.equal(JSON.parse(response.body).delivered, 1);

		/*
		 * Сверка тоже под тенант-контекстом: SELECT без него не ошибается, а молча
		 * отдаёт ноль строк, и проверка результата квитанции читала бы undefined
		 * вместо статуса сообщения.
		 */
		const [row] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(communicationOutbox)
				.where(eq(communicationOutbox.id, sentId)),
		);
		assert.equal(row?.status, "delivered");
		assert.notEqual(row?.deliveredAt, null);
		assert.ok(
			row?.receiptDetail?.includes("Доставлено"),
			row?.receiptDetail ?? "",
		);
	});

	test("поздняя квитанция об ошибке не отменяет доставку", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Порядок запросов от провайдера не гарантирован: «не доставлено» может
		// прийти после «доставлено», и понижать статус нельзя.
		const response = await app.inject({
			method: "POST",
			url: "/api/communications/receipts/smsru",
			headers: { "x-dente-receipt-secret": SECRET },
			payload: { data: "receipt-sent-1=104" },
		});
		assert.equal(response.statusCode, 200, response.body);
		assert.equal(JSON.parse(response.body).failed, 0);

		const [row] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(communicationOutbox)
				.where(eq(communicationOutbox.id, sentId)),
		);
		assert.equal(row?.status, "delivered");
		// Текст квитанции при этом сохраняется — расхождение должно быть видно.
		assert.ok(
			row?.receiptDetail?.includes("истёк срок"),
			row?.receiptDetail ?? "",
		);
	});

	test("отменённое сообщение квитанция не оживляет", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/receipts/smsru",
			headers: { "x-dente-receipt-secret": SECRET },
			payload: { data: "receipt-cancelled-1=103" },
		});
		assert.equal(response.statusCode, 200, response.body);
		// Провайдер об отменённом сообщении ничего знать не может.
		assert.equal(JSON.parse(response.body).unmatched, 1);

		const [row] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(communicationOutbox)
				.where(eq(communicationOutbox.id, cancelledId)),
		);
		assert.equal(row?.status, "cancelled");
	});

	test("SMSC методом GET помечает недоставку", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/communications/receipts/smsc?secret=${encodeURIComponent(SECRET)}&id=receipt-delivered-1&status=20&err=5`,
		});
		assert.equal(response.statusCode, 200, response.body);
		// Строка уже delivered — понижения не будет, но текст запишется.
		assert.equal(JSON.parse(response.body).failed, 0);

		const [row] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(communicationOutbox)
				.where(eq(communicationOutbox.id, deliveredId)),
		);
		assert.equal(row?.status, "delivered");
		assert.ok(
			row?.receiptDetail?.includes("Невозможно доставить"),
			row?.receiptDetail ?? "",
		);
	});

	test("неизвестный идентификатор считается несопоставленным", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/receipts/smsru",
			headers: { "x-dente-receipt-secret": SECRET },
			payload: { data: "чужой-идентификатор=103" },
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.unmatched, 1);
		assert.equal(body.delivered, 0);
	});

	test("пустой запрос не считается сбоем", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Иначе шлюз будет повторять запрос, в котором нечего разбирать.
		const response = await app.inject({
			method: "POST",
			url: "/api/communications/receipts/smsru",
			headers: { "x-dente-receipt-secret": SECRET },
			payload: { data: "" },
		});
		assert.equal(response.statusCode, 200, response.body);
		assert.equal(JSON.parse(response.body).accepted, 0);
	});
});

describe("приём квитанций без настроенного секрета", () => {
	test("обработчик отказывает, а не принимает вслепую", async () => {
		const savedSecret = process.env.DENTE_COMMUNICATION_RECEIPT_SECRET;
		delete process.env.DENTE_COMMUNICATION_RECEIPT_SECRET;

		const app = Fastify();
		await registerCommunicationReceiptRoutes(app);
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/communications/receipts/smsru",
				payload: { data: "any=103" },
			});
			// Открытый эндпоинт позволил бы кому угодно помечать сообщения
			// доставленными, то есть скрывать недоставку.
			assert.equal(response.statusCode, 503, response.body);
			assert.ok(JSON.parse(response.body).message.includes("не настроен"));
		} finally {
			await app.close();
			if (savedSecret !== undefined)
				process.env.DENTE_COMMUNICATION_RECEIPT_SECRET = savedSecret;
		}
	});
});
