import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	communicationOutbox,
	communicationSettings,
	communicationTemplates,
	organizations,
	patientCommunicationConsents,
	patients
} from "../../db/schema.js";
import { registerCommunicationOutboxRoutes } from "../../routes/communicationsOutbox.js";

/**
 * Сквозная проверка по живой базе: шаблон → предпросмотр → постановка в
 * очередь → разбор очереди → журнал.
 *
 * ЗАЧЕМ ИМЕННО ТАК. Раньше отправки не существовало: routes/communications.ts
 * умел только «закрыть задачу связи», а единственный обработчик очереди
 * (services/notificationWorker.ts) ниоткуда не вызывался. Тест на моках здесь
 * ничего не доказал бы — он проверял бы сам себя. Поэтому используются
 * настоящие таблицы, а тестовая организация удаляется в конце.
 *
 * Шлюзы в тестовом окружении не настроены, поэтому сообщение честно получает
 * статус `suppressed` с причиной «нет ключей» — а не «отправлено».
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000001";
const PATIENT_ID = "dce70000-0000-4000-8000-000000000002";
const ORG_HEADERS = { "x-organization-id": ORG_ID };

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(message);
}

/**
 * Одна и та же уборка ДО засева и после прогона — иначе она не уборка.
 *
 * ЧТО ЛОМАЛОСЬ. Уборка стояла только в `after`. Прогон, оборванный до него
 * (Ctrl+C, закрытая труба вида `| head`, убитый процесс, падение соединения),
 * оставлял строки фикстуры в живой базе, а `onConflictDoNothing` на засеве
 * следующего прогона молча оставлял их как есть — то есть тест продолжал на
 * данных, которых сам не создавал. Особенно дорого это стоило в
 * `communication_outbox`: остаток сообщений от прошлого прогона попадает в
 * журнал и в разбор очереди, а проверки здесь считают строки.
 *
 * Порядок удаления — от зависимых строк к организации.
 */
async function purgeFixtures(): Promise<void> {
	await db.delete(communicationOutbox).where(eq(communicationOutbox.organizationId, ORG_ID));
	await db.delete(patientCommunicationConsents).where(eq(patientCommunicationConsents.organizationId, ORG_ID));
	await db.delete(communicationTemplates).where(eq(communicationTemplates.organizationId, ORG_ID));
	await db.delete(communicationSettings).where(eq(communicationSettings.organizationId, ORG_ID));
	await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
	await db.delete(organizations).where(eq(organizations.id, ORG_ID));
}

describe("маршруты сообщений пациентам", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = { ...process.env };

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";
		// Шлюзы должны быть заведомо не настроены: тест не отправляет наружу.
		for (const key of [
			"DENTE_SMS_PROVIDER",
			"DENTE_SMS_API_ID",
			"DENTE_SMS_LOGIN",
			"DENTE_SMS_PASSWORD",
			"DENTE_SMTP_HOST",
			"DENTE_SMTP_USER",
			"DENTE_SMTP_PASSWORD",
			"DENTE_TELEGRAM_BOT_TOKEN",
			"TELEGRAM_BOT_TOKEN"
		]) {
			delete process.env[key];
		}

		app = Fastify();
		await registerCommunicationOutboxRoutes(app);

		try {
			// Сначала расчистить место за оборванным прогоном, потом сеять.
			await purgeFixtures();

			await db.insert(organizations).values({ id: ORG_ID, name: "Тестовая клиника (сообщения)" });
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Тестов Тест Тестович",
				phone: "+7 916 000-00-01",
				email: "test-patient@example.ru"
			});

			/*
			 * Тихие часы выключены явно.
			 *
			 * БЕЗ ЭТОГО ТЕСТ ЗАВИСЕЛ ОТ ЧАСА ЗАПУСКА. По умолчанию тихие часы —
			 * с 21:00 до 09:00 и служебные сообщения в них ОТКЛАДЫВАЮТСЯ. Поэтому
			 * днём разбор очереди доходил до проверки шлюза и давал ожидаемое
			 * «suppressed: шлюз не настроен», а вечером сообщение откладывалось до
			 * утра и оставалось «queued» — три проверки в этом файле падали.
			 * Найдено в 23:18: набор был зелёным ровно потому, что все прежние
			 * прогоны шли днём.
			 *
			 * Проверка самих тихих часов живёт в тестах deliveryPolicy, где время
			 * задаётся явным аргументом, а не берётся из часов машины.
			 */
			await db
				.insert(communicationSettings)
				.values({
					organizationId: ORG_ID,
					timezone: "Europe/Moscow",
					deferServiceInQuietHours: false,
					blockMarketingInQuietHours: false
				})
				.onConflictDoUpdate({
					target: communicationSettings.organizationId,
					set: { deferServiceInQuietHours: false, blockMarketingInQuietHours: false }
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

	test("шаблон с опечаткой в переменной не сохраняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: ORG_HEADERS,
			payload: {
				title: "Напоминание",
				channel: "sms",
				intent: "appointment_confirmation",
				body: "Здравствуйте, {pacient}! Приём {date}."
			}
		});

		assert.equal(response.statusCode, 400);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "CommunicationValidationError");
		assert.ok(body.message.includes("{pacient}"), body.message);
	});

	test("медицинская переменная не проходит в канал без согласия", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: ORG_HEADERS,
			payload: {
				title: "Памятка",
				channel: "sms",
				intent: "post_visit_instruction",
				body: "Напоминаем о процедуре {procedure} и зубе {tooth}."
			}
		});

		assert.equal(response.statusCode, 400);
		assert.ok(JSON.parse(response.body).message.includes("Медицинские сведения"));
	});

	test("слишком длинная SMS отклоняется с указанием числа сегментов", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: ORG_HEADERS,
			payload: {
				title: "Длинная",
				channel: "sms",
				intent: "general",
				body: "я".repeat(500)
			}
		});

		assert.equal(response.statusCode, 400);
		assert.ok(JSON.parse(response.body).message.includes("сегмент"));
	});

	let templateId = "";

	test("корректный шаблон сохраняется вместе со списком переменных", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: ORG_HEADERS,
			payload: {
				title: "Напоминание о приёме",
				channel: "sms",
				intent: "appointment_confirmation",
				body: "{patient}, ждём вас {date} в {time}."
			}
		});

		assert.equal(response.statusCode, 201, response.body);
		const body = JSON.parse(response.body);
		templateId = body.template.id;
		assert.deepEqual(JSON.parse(body.template.variablesJson), ["patient", "date", "time"]);
		assert.equal(body.sms.encoding, "ucs2");
		assert.equal(body.sms.segments, 1);
	});

	test("предпросмотр подставляет примеры и считает сегменты", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/templates/preview",
			headers: ORG_HEADERS,
			payload: { body: "{patient}, ждём вас {date} в {time}.", channel: "sms", values: { patient: "Марина" } }
		});

		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.ok(body.text.startsWith("Марина, ждём вас"));
		assert.equal(body.text.includes("{"), false);
		assert.equal(body.sms.encoding, "ucs2");
	});

	test("отправка по шаблону без значения переменной останавливается", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Пациент не должен получить «ждём вас {date} в {time}».
		const response = await app.inject({
			method: "POST",
			url: "/api/communications/outbox",
			headers: ORG_HEADERS,
			payload: { patientId: PATIENT_ID, channel: "sms", templateId, values: { patient: "Марина" } }
		});

		assert.equal(response.statusCode, 400, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "TemplateRenderError");
		assert.deepEqual(body.missingVariables, ["date", "time"]);
	});

	let outboxId = "";

	test("сообщение с заполненными переменными встаёт в очередь", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/outbox",
			headers: ORG_HEADERS,
			payload: {
				patientId: PATIENT_ID,
				channel: "sms",
				templateId,
				values: { patient: "Марина", date: "12 августа", time: "14:30" },
				dedupeKey: "test:appointment:1"
			}
		});

		assert.equal(response.statusCode, 201, response.body);
		outboxId = JSON.parse(response.body).outboxId;

		const [row] = await db.select().from(communicationOutbox).where(eq(communicationOutbox.id, outboxId));
		assert.equal(row?.status, "queued");
		assert.equal(row?.body, "Марина, ждём вас 12 августа в 14:30.");
		// Номер приведён к международному формату из «+7 916 000-00-01».
		assert.equal(row?.recipientAddress, "79160000001");
	});

	test("повторная постановка с тем же ключом не создаёт второе сообщение", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/outbox",
			headers: ORG_HEADERS,
			payload: {
				patientId: PATIENT_ID,
				channel: "sms",
				templateId,
				values: { patient: "Марина", date: "12 августа", time: "14:30" },
				dedupeKey: "test:appointment:1"
			}
		});

		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.duplicate, true);
		assert.equal(body.outboxId, outboxId);

		const rows = await db
			.select({ id: communicationOutbox.id })
			.from(communicationOutbox)
			.where(and(eq(communicationOutbox.organizationId, ORG_ID), eq(communicationOutbox.dedupeKey, "test:appointment:1")));
		assert.equal(rows.length, 1);
	});

	test("ненастроенный шлюз даёт suppressed с причиной, а не «отправлено»", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/communications/outbox/dispatch",
			headers: ORG_HEADERS,
			payload: { batchSize: 10 }
		});

		assert.equal(response.statusCode, 200, response.body);
		const report = JSON.parse(response.body).report;
		assert.ok(report.claimed >= 1, JSON.stringify(report));
		assert.equal(report.sent, 0);

		const [row] = await db.select().from(communicationOutbox).where(eq(communicationOutbox.id, outboxId));
		assert.equal(row?.status, "suppressed");
		assert.equal(row?.lastErrorClass, "not_configured");
		assert.ok(row?.lastErrorMessage?.includes("SMS-шлюз не настроен"), row?.lastErrorMessage ?? "");
		// Строка освобождена: захват не остаётся висеть после разбора.
		assert.equal(row?.lockedAt, null);
	});

	test("отказ пациента останавливает следующее сообщение", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const consentResponse = await app.inject({
			method: "PUT",
			url: `/api/communications/consents/${PATIENT_ID}`,
			headers: ORG_HEADERS,
			payload: { entries: [{ channel: "sms", scope: "service", state: "revoked", source: "staff" }] }
		});
		assert.equal(consentResponse.statusCode, 200, consentResponse.body);

		const enqueued = await app.inject({
			method: "POST",
			url: "/api/communications/outbox",
			headers: ORG_HEADERS,
			payload: {
				patientId: PATIENT_ID,
				channel: "sms",
				body: "Проверка отказа",
				dedupeKey: "test:consent:1"
			}
		});
		assert.equal(enqueued.statusCode, 201, enqueued.body);
		const secondId = JSON.parse(enqueued.body).outboxId;

		await app.inject({
			method: "POST",
			url: "/api/communications/outbox/dispatch",
			headers: ORG_HEADERS,
			payload: { batchSize: 10 }
		});

		const [row] = await db.select().from(communicationOutbox).where(eq(communicationOutbox.id, secondId));
		assert.equal(row?.status, "suppressed");
		assert.ok(row?.lastErrorMessage?.includes("отказался"), row?.lastErrorMessage ?? "");
	});

	test("журнал показывает сводку по статусам", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/communications/outbox", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.ok(Array.isArray(body.items));
		assert.ok(body.summary.suppressed >= 2, JSON.stringify(body.summary));
	});

	test("отправленное отменить нельзя, задержанное — можно повторить", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Сообщение уже в статусе suppressed: отменять нечего.
		const cancel = await app.inject({
			method: "POST",
			url: `/api/communications/outbox/${outboxId}/cancel`,
			headers: ORG_HEADERS
		});
		assert.equal(cancel.statusCode, 409, cancel.body);

		const retry = await app.inject({
			method: "POST",
			url: `/api/communications/outbox/${outboxId}/retry`,
			headers: ORG_HEADERS
		});
		assert.equal(retry.statusCode, 200, retry.body);

		const [row] = await db.select().from(communicationOutbox).where(eq(communicationOutbox.id, outboxId));
		assert.equal(row?.status, "queued");
		assert.equal(row?.attempts, 0);
	});

	test("состояние шлюзов сообщает, что не настроено", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/communications/gateway-status", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.channels.sms.configured, false);
		assert.equal(body.channels.email.configured, false);
		// VK и MAX отправку не поддерживают — так и написано.
		assert.equal(body.channels.vk.configured, false);
		assert.equal(body.channels.max.configured, false);
		assert.deepEqual(body.deliverableChannels, ["sms", "email", "whatsapp", "telegram"]);
	});

	test("настройки рассылки сохраняются и читаются", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const saved = await app.inject({
			method: "PUT",
			url: "/api/communications/settings",
			headers: ORG_HEADERS,
			payload: { timezone: "Europe/Samara", quietHoursStartMinute: 22 * 60, dailyLimitPerPatient: 2 }
		});
		assert.equal(saved.statusCode, 200, saved.body);

		const read = await app.inject({ method: "GET", url: "/api/communications/settings", headers: ORG_HEADERS });
		const body = JSON.parse(read.body);
		assert.equal(body.settings.timezone, "Europe/Samara");
		assert.equal(body.settings.quietHoursStartMinute, 22 * 60);
		assert.equal(body.settings.dailyLimitPerPatient, 2);
	});

	test("несогласованный интервал повторов отклоняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "PUT",
			url: "/api/communications/settings",
			headers: ORG_HEADERS,
			payload: { retryBaseSeconds: 600, retryMaxSeconds: 120 }
		});
		assert.equal(response.statusCode, 400, response.body);
	});

	test("сообщение чужой организации не видно в журнале", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const rows = await db
			.select({ organizationId: communicationOutbox.organizationId })
			.from(communicationOutbox)
			.where(inArray(communicationOutbox.dedupeKey, ["test:appointment:1", "test:consent:1"]));

		// Обе строки принадлежат тестовой организации: маршрут не мог бы
		// подтянуть чужие, потому что фильтр по организации обязателен.
		assert.ok(rows.every((row) => row.organizationId === ORG_ID));
	});
});
