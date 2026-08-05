import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	communicationEvents,
	communicationOutbox,
	crmLeads,
	messengerInboundEvents,
	organizations,
	patientCommunicationConsents,
	patients
} from "../db/schema.js";
import { processInboundEvents } from "../services/messengerIngestion.js";
import { detectOptOutIntent, optOutAcknowledgement } from "../services/communications/optOut.js";
import { withFixtureTenant } from "./support/fixtureOrganizations.js";

/**
 * Ответ «СТОП» ничего не менял: таблица согласий заполнялась только руками
 * администратора, и отписаться от рассылки пациент не мог никак, кроме звонка в
 * клинику. Разбор входящих при этом запускался только из вебхуков WhatsApp и
 * MAX, без ожидания и без повтора, — упавшее событие не разбиралось больше
 * никогда.
 *
 * Отдельно проверяется то, что раньше засоряло картотеку: сообщение с
 * незнакомого номера создавало КАРТОЧКУ ПАЦИЕНТА «WhatsApp User 79161234567».
 * Теперь такое становится лидом.
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000301";
const PATIENT_ID = "dce70000-0000-4000-8000-000000000302";
const TWIN_A = "dce70000-0000-4000-8000-000000000303";
const TWIN_B = "dce70000-0000-4000-8000-000000000304";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(message);
}

describe("распознавание отказа от сообщений", () => {
	test("однословный «стоп» в любом регистре и с точкой", () => {
		assert.equal(detectOptOutIntent("СТОП"), "opt_out");
		assert.equal(detectOptOutIntent("стоп"), "opt_out");
		assert.equal(detectOptOutIntent("Стоп."), "opt_out");
		assert.equal(detectOptOutIntent(" stop "), "opt_out");
		assert.equal(detectOptOutIntent("отписаться"), "opt_out");
		assert.equal(detectOptOutIntent("ОТКАЗ!"), "opt_out");
	});

	test("короткая команда со стоп-словом впереди", () => {
		assert.equal(detectOptOutIntent("стоп рассылка"), "opt_out");
		assert.equal(detectOptOutIntent("стоп смс"), "opt_out");
	});

	test("многословные выражения отказа", () => {
		assert.equal(detectOptOutIntent("не пишите мне больше"), "opt_out");
		assert.equal(detectOptOutIntent("уберите меня из рассылки"), "opt_out");
		assert.equal(detectOptOutIntent("больше не присылайте"), "opt_out");
	});

	test("вопрос со словом «стоп» отказом не считается", () => {
		// Отписать лишнего — значит, что человек не получит напоминание и не
		// придёт на приём. Такое сообщение должно дойти до администратора.
		assert.equal(detectOptOutIntent("Стоп, а во сколько приём завтра?"), null);
		assert.equal(detectOptOutIntent("подскажите, где остановка"), null);
		assert.equal(detectOptOutIntent("Здравствуйте! Хочу записаться на осмотр"), null);
	});

	test("«старт» возвращает к рассылке", () => {
		assert.equal(detectOptOutIntent("СТАРТ"), "opt_in");
		assert.equal(detectOptOutIntent("подписаться"), "opt_in");
		assert.equal(detectOptOutIntent("возобновить"), "opt_in");
	});

	test("«ё» и «е» распознаются одинаково", () => {
		assert.equal(detectOptOutIntent("Не пишите"), "opt_out");
		assert.equal(detectOptOutIntent("не пишите"), "opt_out");
	});

	test("пустое сообщение ничего не значит", () => {
		assert.equal(detectOptOutIntent(""), null);
		assert.equal(detectOptOutIntent("   "), null);
		assert.equal(detectOptOutIntent(null), null);
	});

	test("подтверждение отписки называет способ вернуться", () => {
		// Молчаливая отписка выглядит как игнорирование сообщения.
		const text = optOutAcknowledgement("opt_out", "Клиника на Ленина");
		assert.ok(text.includes("Клиника на Ленина"));
		assert.ok(text.includes("СТАРТ"));
	});
});

describe("разбор входящих сообщений", () => {
	let databaseAvailable = true;

	before(async () => {
		try {
			// Под принудительным RLS `WITH CHECK` тенант-таблиц сверяет
			// `organization_id` с `app.current_tenant` и обхода не допускает: сев без
			// тенант-контекста отвергается кодом 42501, а не создаёт клинику.
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({ id: ORG_ID, name: "Клиника входящих" }).onConflictDoNothing();
				await db
					.insert(patients)
					.values([
						{ id: PATIENT_ID, organizationId: ORG_ID, fullName: "Входящий Иван Иванович", phone: "+7 916 000-02-01" },
						// Два пациента с одним номером — семья, общий телефон. Такое
						// совпадение нельзя разрешать в пользу первой строки.
						{ id: TWIN_A, organizationId: ORG_ID, fullName: "Двойников Пётр Петрович", phone: "+7 916 000-02-99" },
						{ id: TWIN_B, organizationId: ORG_ID, fullName: "Двойникова Анна Петровна", phone: "89160000299" }
					])
					.onConflictDoNothing();
			});
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			// Уборка тоже под контекстом: `DELETE` без него не видит своих строк и
			// снимает НОЛЬ молча — фикстура осталась бы в живой базе, а отчёт
			// выглядел бы успешным.
			await withFixtureTenant(ORG_ID, async () => {
				await db.delete(communicationOutbox).where(eq(communicationOutbox.organizationId, ORG_ID));
				await db.delete(communicationEvents).where(eq(communicationEvents.organizationId, ORG_ID));
				await db.delete(patientCommunicationConsents).where(eq(patientCommunicationConsents.organizationId, ORG_ID));
				await db.delete(messengerInboundEvents).where(eq(messengerInboundEvents.organizationId, ORG_ID));
				await db.delete(crmLeads).where(eq(crmLeads.organizationId, ORG_ID));
				await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
				await db.delete(organizations).where(eq(organizations.id, ORG_ID));
			});
		}
	});

	test("«СТОП» от известного пациента отзывает согласие по каналу", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Входящее событие — такая же тенант-строка, как и всё остальное: без
		// контекста её вставка отвергается кодом 42501, а чтение согласий ниже
		// вернуло бы ноль строк и ошибки не дало бы.
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(messengerInboundEvents).values({
				organizationId: ORG_ID,
				channel: "whatsapp",
				externalChatId: "79160000201",
				messageText: "СТОП",
				eventKind: "message"
			});
		});

		const report = await processInboundEvents({ limit: 50 });
		assert.ok(report.matchedToPatient >= 1, JSON.stringify(report));
		assert.ok(report.optOuts >= 1, JSON.stringify(report));

		const consents = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ scope: patientCommunicationConsents.scope, state: patientCommunicationConsents.state, source: patientCommunicationConsents.source })
				.from(patientCommunicationConsents)
				.where(
					and(
						eq(patientCommunicationConsents.organizationId, ORG_ID),
						eq(patientCommunicationConsents.patientId, PATIENT_ID),
						eq(patientCommunicationConsents.channel, "whatsapp")
					)
				)
		);

		// Пациент, написавший «СТОП», не делает разницы между сервисным и
		// рекламным — отзываются обе области.
		assert.equal(consents.length, 2, JSON.stringify(consents));
		assert.ok(consents.every((row) => row.state === "revoked"), JSON.stringify(consents));
		assert.ok(consents.every((row) => row.source === "inbound_stop"), JSON.stringify(consents));
	});

	test("после «СТОП» пациенту уходит подтверждение, а не тишина", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(messengerInboundEvents).values({
				organizationId: ORG_ID,
				channel: "whatsapp",
				externalChatId: "79160000201",
				messageText: "стоп",
				eventKind: "message"
			});
		});

		await processInboundEvents({ limit: 50 });

		const queued = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					intent: communicationOutbox.intent,
					scope: communicationOutbox.scope,
					body: communicationOutbox.body,
					channel: communicationOutbox.channel,
					status: communicationOutbox.status
				})
				.from(communicationOutbox)
				.where(and(eq(communicationOutbox.organizationId, ORG_ID), eq(communicationOutbox.patientId, PATIENT_ID)))
		);

		const acknowledgement = queued.find((row) => row.intent === "transactional_reply");
		assert.ok(acknowledgement, `подтверждение не поставлено в очередь: ${JSON.stringify(queued)}`);
		// Ответ идёт по тому каналу, откуда пришёл «СТОП».
		assert.equal(acknowledgement.channel, "whatsapp");
		// Это не реклама: область остаётся служебной.
		assert.equal(acknowledgement.scope, "service");
		// В тексте обязателен способ вернуться — иначе отписка необратима для
		// пациента, который передумал.
		assert.ok(acknowledgement.body.includes("СТАРТ"), acknowledgement.body);
	});

	test("повторный разбор того же события не удваивает подтверждение", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const [event] = await withFixtureTenant(ORG_ID, async () =>
			db
				.insert(messengerInboundEvents)
				.values({
					organizationId: ORG_ID,
					channel: "sms",
					externalChatId: "79160000201",
					messageText: "отпишите меня",
					eventKind: "message"
				})
				.returning({ id: messengerInboundEvents.id })
		);
		assert.ok(event);

		await processInboundEvents({ limit: 50 });
		// Разбор повторяется целиком: так бывает при перезапуске обработчика.
		// `UPDATE` без тенант-контекста тронул бы ноль строк и не сообщил об этом —
		// повтор разбора просто не состоялся бы, а тест остался бы зелёным.
		await withFixtureTenant(ORG_ID, async () => {
			await db.update(messengerInboundEvents).set({ processedAt: null }).where(eq(messengerInboundEvents.id, event.id));
		});
		await processInboundEvents({ limit: 50 });

		const acknowledgements = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: communicationOutbox.id })
				.from(communicationOutbox)
				.where(
					and(
						eq(communicationOutbox.organizationId, ORG_ID),
						eq(communicationOutbox.dedupeKey, `optout-ack:${event.id}`)
					)
				)
		);

		assert.equal(acknowledgements.length, 1, "подтверждение поставлено дважды");
	});

	test("«СТАРТ» возвращает только сервисные сообщения, но не рекламу", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(messengerInboundEvents).values({
				organizationId: ORG_ID,
				channel: "whatsapp",
				externalChatId: "79160000201",
				messageText: "СТАРТ",
				eventKind: "message"
			});
		});

		const report = await processInboundEvents({ limit: 50 });
		assert.ok(report.optIns >= 1, JSON.stringify(report));

		const rows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ scope: patientCommunicationConsents.scope, state: patientCommunicationConsents.state })
				.from(patientCommunicationConsents)
				.where(
					and(
						eq(patientCommunicationConsents.organizationId, ORG_ID),
						eq(patientCommunicationConsents.patientId, PATIENT_ID),
						eq(patientCommunicationConsents.channel, "whatsapp")
					)
				)
		);
		const byScope = new Map(rows.map((row) => [row.scope, row.state]));
		assert.equal(byScope.get("service"), "granted");
		// Согласие на рекламу словом «СТАРТ» не выдаётся: для рекламы нужно
		// отдельное явное согласие.
		assert.equal(byScope.get("marketing"), "revoked");
	});

	test("обычное сообщение попадает в переписку без изменения согласий", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(messengerInboundEvents).values({
				organizationId: ORG_ID,
				channel: "whatsapp",
				externalChatId: "79160000201",
				messageText: "Здравствуйте, можно перенести приём на четверг?",
				eventKind: "message"
			});
		});

		const report = await processInboundEvents({ limit: 50 });
		assert.equal(report.optOuts, 0, JSON.stringify(report));

		const events = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ message: communicationEvents.message, direction: communicationEvents.direction })
				.from(communicationEvents)
				.where(and(eq(communicationEvents.organizationId, ORG_ID), eq(communicationEvents.patientId, PATIENT_ID)))
		);
		assert.ok(events.some((row) => row.message.includes("перенести приём")), JSON.stringify(events));
		assert.ok(events.every((row) => row.direction === "inbound"));
	});

	test("незнакомый номер становится лидом, а не карточкой пациента", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const patientsBefore = await withFixtureTenant(ORG_ID, async () =>
			db.select({ id: patients.id }).from(patients).where(eq(patients.organizationId, ORG_ID))
		);

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(messengerInboundEvents).values({
				organizationId: ORG_ID,
				channel: "whatsapp",
				externalChatId: "79995550000",
				messageText: "Здравствуйте, сколько стоит имплантация?",
				eventKind: "message"
			});
		});

		const report = await processInboundEvents({ limit: 50 });
		assert.ok(report.leadsCreated >= 1, JSON.stringify(report));

		// Картотека не пополнилась: раньше здесь появлялся пациент с именем
		// «WhatsApp User 79995550000». Оба счёта берутся под тенант-контекстом —
		// без него они оба дали бы ноль и сравнение стало бы бессодержательным.
		const patientsAfter = await withFixtureTenant(ORG_ID, async () =>
			db.select({ id: patients.id }).from(patients).where(eq(patients.organizationId, ORG_ID))
		);
		assert.equal(patientsAfter.length, patientsBefore.length);

		const leads = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ source: crmLeads.source, phone: crmLeads.phone, notes: crmLeads.notes })
				.from(crmLeads)
				.where(eq(crmLeads.organizationId, ORG_ID))
		);
		assert.equal(leads.length, 1, JSON.stringify(leads));
		assert.equal(leads[0]?.source, "inbound_whatsapp");
		assert.equal(leads[0]?.phone, "79995550000");
		assert.ok(leads[0]?.notes?.includes("имплантация"));
	});

	test("номер, подходящий двум карточкам, не сопоставляется наугад", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(messengerInboundEvents).values({
				organizationId: ORG_ID,
				channel: "whatsapp",
				externalChatId: "+7 916 000-02-99",
				messageText: "Добрый день",
				eventKind: "message"
			});
		});

		const report = await processInboundEvents({ limit: 50 });
		assert.ok(report.ambiguous >= 1, JSON.stringify(report));

		// Переписка не ушла ни в одну из двух карточек: раньше брали первую.
		const events = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ patientId: communicationEvents.patientId })
				.from(communicationEvents)
				.where(eq(communicationEvents.organizationId, ORG_ID))
		);
		assert.equal(events.some((row) => row.patientId === TWIN_A || row.patientId === TWIN_B), false);

		const leads = await withFixtureTenant(ORG_ID, async () =>
			db.select({ notes: crmLeads.notes }).from(crmLeads).where(eq(crmLeads.organizationId, ORG_ID))
		);
		assert.ok(
			leads.some((row) => row.notes?.includes("несколько карточек")),
			JSON.stringify(leads)
		);
	});

	test("событие без текста закрывается без записи в переписку", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const [inserted] = await withFixtureTenant(ORG_ID, async () =>
			db
				.insert(messengerInboundEvents)
				.values({ organizationId: ORG_ID, channel: "whatsapp", externalChatId: "79160000201", eventKind: "status" })
				.returning({ id: messengerInboundEvents.id })
		);

		await processInboundEvents({ limit: 50 });

		const [row] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ processedAt: messengerInboundEvents.processedAt })
				.from(messengerInboundEvents)
				.where(eq(messengerInboundEvents.id, inserted?.id ?? ""))
		);
		assert.notEqual(row?.processedAt, null);
	});

	test("повторный прогон не разбирает уже обработанное", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const second = await processInboundEvents({ limit: 50 });
		assert.equal(second.processed, 0, JSON.stringify(second));
	});
});
