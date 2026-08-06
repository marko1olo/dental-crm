import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { type FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { communicationCampaigns } from "../../db/communicationsSchema.js";
import {
	appointments,
	communicationOutbox,
	communicationSettings,
	communicationTemplates,
	organizations,
	patientCommunicationConsents,
	patients
} from "../../db/schema.js";
import { registerCommunicationOutboxRoutes } from "../../routes/communicationsOutbox.js";
import { estimateAudienceCost, resolveAudience } from "../../services/communications/audience.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * Рассылки: отбор получателей, предпросмотр, запуск, отмена.
 *
 * ЗАЧЕМ ПО ЖИВОЙ БАЗЕ. Отбор — это SQL по приёмам, платежам и согласиям; на
 * моках проверялись бы сами моки. Тестовая организация со своими пациентами
 * создаётся здесь же и удаляется в конце.
 *
 * ГЛАВНОЕ, ЧТО ПРОВЕРЯЕТСЯ: рекламная рассылка без согласия пациента не уходит,
 * и это видно в предпросмотре ДО запуска, а не по факту «отправлено 0 из 3».
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000201";
const ORG_HEADERS = { "x-organization-id": ORG_ID };

// Трое пациентов: с согласием, без согласия и без телефона.
const CONSENTED = "dce70000-0000-4000-8000-000000000202";
const NO_CONSENT = "dce70000-0000-4000-8000-000000000203";
const NO_PHONE = "dce70000-0000-4000-8000-000000000204";
const OLD_VISIT_APPOINTMENT = "dce70000-0000-4000-8000-000000000205";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(message);
}

/**
 * Одна и та же уборка ДО засева и после прогона — иначе она не уборка.
 *
 * ЧТО ЛОМАЛОСЬ. Уборка стояла только в `after`. Прогон, оборванный до него
 * (Ctrl+C, закрытая труба вида `| head`, убитый процесс, падение соединения),
 * оставлял строки фикстуры в живой базе, и засев следующего прогона наследовал
 * их: у `patient_communication_consents` есть unique(org, patient, channel,
 * scope), поэтому `onConflictDoNothing` попадал в конфликт и молча оставлял
 * ЧУЖОЕ согласие вместо своего выданного. Отозванное согласие от прошлого
 * прогона переживало засев, и `resolveAudience` честно отвечал
 * `deliverable: 0`, `no_consent: 2`.
 *
 * ЗАМЕРЕНО НА ЭТОМ ФАЙЛЕ: чистый прогон 15/15 зелёных (код выхода 0), после
 * подложенного остатка — 6 упавших из 15 (код выхода 1), причём падали
 * проверки отбора, предпросмотра, запуска, повторного запуска, снимка
 * аудитории и отмены. Ни одна из них не касается кода, который якобы проверяет.
 *
 * Удаление идёт по organization_id тестовой клиники `dce70000-…-02xx`, поэтому
 * чужих данных оно не задевает.
 */
async function purgeFixtures(): Promise<void> {
	/*
	 * Уборка идёт под тенант-контекстом клиники: под FORCE RLS DELETE без
	 * `app.current_tenant` не видит своих строк и снимает НОЛЬ, ошибки при этом
	 * нет — отозванное согласие прошлого прогона пережило бы «успешную» уборку.
	 */
	await withFixtureTenant(ORG_ID, async () => {
		await db.delete(communicationOutbox).where(eq(communicationOutbox.organizationId, ORG_ID));
		await db.delete(communicationCampaigns).where(eq(communicationCampaigns.organizationId, ORG_ID));
		await db.delete(patientCommunicationConsents).where(eq(patientCommunicationConsents.organizationId, ORG_ID));
		await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
		await db.delete(communicationTemplates).where(eq(communicationTemplates.organizationId, ORG_ID));
		await db.delete(communicationSettings).where(eq(communicationSettings.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	});
}

describe("рассылки пациентам", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = { ...process.env };
	const now = new Date();

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";
		for (const key of ["DENTE_SMS_PROVIDER", "DENTE_SMS_API_ID", "DENTE_SMS_LOGIN", "DENTE_SMS_PASSWORD"]) {
			delete process.env[key];
		}

		app = createTenantTestApp();
		await registerCommunicationOutboxRoutes(app);

		try {
			// Сначала расчистить место за оборванным прогоном, потом сеять.
			await purgeFixtures();

			/*
			 * Сев под тенант-контекстом: в WITH CHECK тенант-таблиц стоит только
			 * `organization_id = current_tenant`, поэтому INSERT без контекста
			 * отвергается кодом 42501, и обход RLS этого не лечит.
			 */
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({ id: ORG_ID, name: "Клиника рассылок" });
				await db
					.insert(patients)
					.values([
						{ id: CONSENTED, organizationId: ORG_ID, fullName: "Согласный Пётр Иванович", phone: "+7 916 000-01-01" },
						{ id: NO_CONSENT, organizationId: ORG_ID, fullName: "Отказной Иван Петрович", phone: "+7 916 000-01-02" },
						{ id: NO_PHONE, organizationId: ORG_ID, fullName: "Безномера Сергей Сергеевич", phone: null }
					]);

				// Приём годичной давности — для отбора «давно не были».
				const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
				await db
					.insert(appointments)
					.values({
						id: OLD_VISIT_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: CONSENTED,
						status: "completed",
						startsAt: yearAgo,
						endsAt: new Date(yearAgo.getTime() + 3_600_000)
					});

				/*
				 * Согласие на рекламу есть только у одного пациента.
				 *
				 * Без onConflictDoNothing НАМЕРЕННО: место расчищено выше, и конфликт
				 * по unique(org, patient, channel, scope) здесь означал бы, что уборка
				 * не сработала. Прежде он молчал и подменял выданное согласие остатком
				 * прошлого прогона — см. purgeFixtures выше.
				 */
				await db.insert(patientCommunicationConsents).values({
					organizationId: ORG_ID,
					patientId: CONSENTED,
					channel: "sms",
					scope: "marketing",
					state: "granted",
					source: "contract"
				});
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

	test("стоимость SMS считается по сегментам, а не по числу получателей", () => {
		// 400 символов кириллицы — шесть сегментов, и оператор берёт за каждый.
		const long = estimateAudienceCost({ channel: "sms", recipients: 100, body: "я".repeat(400) });
		assert.equal(long.segmentsPerMessage, 6);
		assert.equal(long.billableUnits, 600);

		const short = estimateAudienceCost({ channel: "sms", recipients: 100, body: "Короткий текст." });
		assert.equal(short.segmentsPerMessage, 1);
		assert.equal(short.billableUnits, 100);

		// У мессенджеров сегментов нет — единица тарификации это сообщение.
		const telegram = estimateAudienceCost({ channel: "telegram", recipients: 100, body: "я".repeat(400) });
		assert.equal(telegram.segmentsPerMessage, null);
		assert.equal(telegram.billableUnits, 100);
	});

	test("рекламная рассылка отбирает только тех, кто дал согласие", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// В бою отбор вызывается из previewCampaign/launchCampaign, а те — из
		// маршрута под `withTenantCtx`. Прямой вызов без контекста читал бы ноль
		// пациентов, и «отобран один» краснело бы на пустой выборке.
		const audience = await withFixtureTenant(ORG_ID, async () =>
			resolveAudience({
				organizationId: ORG_ID,
				channel: "sms",
				scope: "marketing",
				criteria: { status: "active" },
				now
			})
		);

		// Пациент без телефона отсеивается запросом, поэтому в matched его нет.
		assert.equal(audience.matched, 2, JSON.stringify(audience));
		assert.equal(audience.deliverable, 1, JSON.stringify(audience));
		assert.equal(audience.excluded.no_consent, 1);
		assert.equal(audience.candidates[0]?.patientId, CONSENTED);
		assert.ok(audience.notes.some((note) => note.includes("согласия")), audience.notes.join(" "));
	});

	test("сервисная рассылка не требует согласия по умолчанию", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Напоминание о приёме — сервисное сообщение в рамках договора.
		const audience = await withFixtureTenant(ORG_ID, async () =>
			resolveAudience({
				organizationId: ORG_ID,
				channel: "sms",
				scope: "service",
				criteria: { status: "active" },
				now
			})
		);
		assert.equal(audience.deliverable, 2, JSON.stringify(audience));
	});

	test("отбор «давно не были» опирается на завершённые приёмы", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const halfYearAgo = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000).toISOString();
		const audience = await withFixtureTenant(ORG_ID, async () =>
			resolveAudience({
				organizationId: ORG_ID,
				channel: "sms",
				scope: "service",
				criteria: { status: "active", lastVisitBefore: halfYearAgo },
				now
			})
		);

		// Только у одного пациента есть приём, и он годичной давности.
		assert.equal(audience.matched, 1, JSON.stringify(audience));
		assert.equal(audience.candidates[0]?.patientId, CONSENTED);
	});

	test("отбор «ни разу не были» исключает того, у кого приём есть", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const audience = await withFixtureTenant(ORG_ID, async () =>
			resolveAudience({
				organizationId: ORG_ID,
				channel: "sms",
				scope: "service",
				criteria: { status: "active", neverVisited: true },
				now
			})
		);
		assert.equal(audience.matched, 1, JSON.stringify(audience));
		assert.equal(audience.candidates[0]?.patientId, NO_CONSENT);
	});

	let templateId = "";
	let campaignId = "";

	test("шаблон рассылки не принимает переменные конкретного приёма", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const template = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: ORG_HEADERS,
			payload: {
				title: "Плохая рассылка",
				channel: "sms",
				intent: "general",
				body: "{patient}, ждём вас {date} в {time}."
			}
		});
		assert.equal(template.statusCode, 201, template.body);

		// Шаблон сохранён, но кампанию на нём построить нельзя: у массовой
		// отправки нет данных приёма, подставить {date} и {time} нечем.
		const campaign = await app.inject({
			method: "POST",
			url: "/api/communications/campaigns",
			headers: ORG_HEADERS,
			payload: { title: "Рассылка", templateId: JSON.parse(template.body).template.id, criteria: {} }
		});
		assert.equal(campaign.statusCode, 400, campaign.body);
		assert.ok(JSON.parse(campaign.body).message.includes("{date}"), campaign.body);
	});

	test("рассылка создаётся на пригодном шаблоне", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const template = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: ORG_HEADERS,
			payload: {
				title: "Приглашение на осмотр",
				channel: "sms",
				intent: "recall",
				body: "{patient}, приглашаем на профилактический осмотр. {clinic}."
			}
		});
		assert.equal(template.statusCode, 201, template.body);
		templateId = JSON.parse(template.body).template.id;

		const campaign = await app.inject({
			method: "POST",
			url: "/api/communications/campaigns",
			headers: ORG_HEADERS,
			payload: {
				title: "Осмотр для давно не приходивших",
				templateId,
				scope: "marketing",
				criteria: { status: "active" }
			}
		});
		assert.equal(campaign.statusCode, 201, campaign.body);
		campaignId = JSON.parse(campaign.body).campaign.id;
		assert.equal(JSON.parse(campaign.body).campaign.status, "draft");
	});

	test("предпросмотр показывает отсев и стоимость до запуска", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/communications/campaigns/${campaignId}/preview`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 200, response.body);
		const preview = JSON.parse(response.body);

		assert.equal(preview.audience.matched, 2);
		assert.equal(preview.audience.deliverable, 1);
		assert.equal(preview.audience.excluded.no_consent, 1);
		assert.equal(preview.cost.recipients, 1);
		// Текст «Марина Петровна, приглашаем на профилактический осмотр. Клиника
		// на Ленина.» — 74 символа кириллицы, то есть УЖЕ два сегмента UCS-2, а
		// не один. Ровно это администратор и должен увидеть до запуска: на вид
		// короткое сообщение стоит вдвое дороже, чем кажется.
		assert.equal(preview.cost.segmentsPerMessage, 2);
		assert.equal(preview.cost.billableUnits, 2);
		assert.ok(typeof preview.sampleText === "string" && preview.sampleText.length > 0);
		assert.ok(preview.criteria.includes("активные пациенты"), JSON.stringify(preview.criteria));
	});

	test("запуск ставит в очередь только получателей с согласием", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: `/api/communications/campaigns/${campaignId}/launch`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 200, response.body);
		assert.equal(JSON.parse(response.body).queued, 1);

		const rows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(communicationOutbox)
				.where(and(eq(communicationOutbox.organizationId, ORG_ID), eq(communicationOutbox.campaignId, campaignId)))
		);
		assert.equal(rows.length, 1);
		assert.equal(rows[0]?.patientId, CONSENTED);
		assert.equal(rows[0]?.scope, "marketing");
		// Имя подставлено каждому своё: «Здравствуйте!» без имени читается как спам.
		assert.ok(rows[0]?.body.startsWith("Пётр Иванович, приглашаем"), rows[0]?.body ?? "");
	});

	/*
	 * Раньше здесь проверялось, что повторный запуск ПРОХОДИТ и не создаёт второго
	 * сообщения: от дублей защищал ключ повтора. Защита работает, но правило было
	 * слишком мягким. Повторный запуск идущей рассылки заново снимает аудиторию и
	 * переписывает счётчики и время старта — журнал перестаёт отвечать на вопрос
	 * «скольким и когда ушло». Найдено просмотром снимка экрана: у рассылки в
	 * состоянии «Выполняется» кнопка «Запустить» была самой заметной в строке, то
	 * есть один лишний щелчок портил журнал рассылки по всей базе.
	 *
	 * Теперь идущая рассылка второй раз не запускается вовсе, и проверяются оба
	 * следствия: понятный отказ и по-прежнему ровно одно сообщение в очереди.
	 */
	test("идущая рассылка второй раз не запускается", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: `/api/communications/campaigns/${campaignId}/launch`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 400, response.body);
		const body = JSON.parse(response.body);
		// Отказ обязан объяснять, что делать дальше, а не просто запрещать.
		assert.ok(body.message.includes("уже выполняется"), body.message);
		assert.ok(body.message.includes("отмените"), body.message);

		const rows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: communicationOutbox.id })
				.from(communicationOutbox)
				.where(and(eq(communicationOutbox.organizationId, ORG_ID), eq(communicationOutbox.campaignId, campaignId)))
		);
		assert.equal(rows.length, 1);
	});

	test("ход рассылки содержит снимок аудитории на момент запуска", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/communications/campaigns/${campaignId}/progress`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 200, response.body);
		const progress = JSON.parse(response.body);

		assert.equal(progress.total, 1);
		assert.equal(progress.campaign.status, "running");
		// Снимок нужен для разбора жалобы: пересчитать выборку позже нельзя,
		// пациенты успеют отозвать согласие и оплатить долг.
		assert.equal(progress.snapshot.matched, 2);
		assert.equal(progress.snapshot.deliverable, 1);
		assert.equal(progress.snapshot.excluded.no_consent, 1);
		assert.ok(typeof progress.snapshot.takenAt === "string");
	});

	test("отмена снимает неотправленное с очереди", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: `/api/communications/campaigns/${campaignId}/cancel`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 200, response.body);
		assert.equal(JSON.parse(response.body).cancelledMessages, 1);

		const [row] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ status: communicationOutbox.status })
				.from(communicationOutbox)
				.where(and(eq(communicationOutbox.organizationId, ORG_ID), eq(communicationOutbox.campaignId, campaignId)))
		);
		assert.equal(row?.status, "cancelled");

		const [campaign] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ status: communicationCampaigns.status })
				.from(communicationCampaigns)
				.where(eq(communicationCampaigns.id, campaignId))
		);
		assert.equal(campaign?.status, "cancelled");
	});

	test("отменённую рассылку запустить нельзя", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: `/api/communications/campaigns/${campaignId}/launch`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 400, response.body);
		assert.ok(JSON.parse(response.body).message.includes("Отменённую"));
	});

	test("неизвестный признак отбора отклоняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Схема строгая: «гибкий конструктор запросов» по медицинской базе рано
		// или поздно выгрузил бы всю картотеку одним условием.
		const response = await app.inject({
			method: "POST",
			url: "/api/communications/campaigns",
			headers: ORG_HEADERS,
			payload: { title: "Хитрая", templateId, criteria: { rawSql: "1=1" } }
		});
		assert.equal(response.statusCode, 400, response.body);
	});

	test("рассылка чужой организации не видна и не запускается", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const otherOrgHeaders = { "x-organization-id": "dce70000-0000-4000-8000-0000000002ff" };
		const preview = await app.inject({
			method: "GET",
			url: `/api/communications/campaigns/${campaignId}/preview`,
			headers: otherOrgHeaders
		});
		assert.equal(preview.statusCode, 404, preview.body);

		const launch = await app.inject({
			method: "POST",
			url: `/api/communications/campaigns/${campaignId}/launch`,
			headers: otherOrgHeaders
		});
		assert.equal(launch.statusCode, 400, launch.body);
		assert.ok(JSON.parse(launch.body).message.includes("не найдена"));
	});
});
