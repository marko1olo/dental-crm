import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	clinics,
	communicationOutbox,
	communicationTasks,
	organizations,
	patientRecalls,
	patients,
	uisSmsChatQuotas,
	users,
} from "../../db/schema.js";
import { dispatchDueCareTasks } from "../../services/communications/dispatchWorker.js";
import { MessageTemplateEngine } from "../../services/communications/MessageTemplateEngine.js";
import { getDailySmsQuota, incrementDailySmsQuota } from "../../db/uisSmsChatQuotasQuery.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import { registerPatientRecallRoutes } from "../../routes/patientRecall.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";

const FIXTURE = "domain56Fixer";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const DOCTOR_ID = fixtureUuid(FIXTURE, 2);
const CLINIC_ID = fixtureUuid(FIXTURE, 3);
const PATIENT_ID = fixtureUuid(FIXTURE, 0x11);

const STAFF_TOKEN = signToken(
	{ role: "admin", organizationId: ORG_ID, userId: DOCTOR_ID, clinicalRole: "admin" },
	authTokenSecret(),
);
const ORG_HEADERS = { "x-organization-id": ORG_ID, "x-dente-staff-token": STAFF_TOKEN };

describe("Домен 56: Хирургическая верификация исправлений коммуникаций и Recall", () => {
	let app: FastifyInstance;
	const originalEnv = process.env;

	before(async () => {
		process.env = {
			...originalEnv,
			NODE_ENV: "test",
			DENTE_DEV_ALLOW_HEADER_ORG: "1",
			DENTE_CLINICAL_ALLOW_UNGUARDED_READS: "1",
		};
		app = createTenantTestApp();
		await registerPatientRecallRoutes(app);

		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.insert(organizations)
				.values({ id: ORG_ID, name: "Клиника Домена 56" })
				.onConflictDoNothing();
			await db
				.insert(clinics)
				.values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главная",
					timezone: "Europe/Moscow",
				})
				.onConflictDoNothing();
			await db
				.insert(users)
				.values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Врач Домена 56",
					role: "doctor",
				})
				.onConflictDoNothing();
			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Пациент Для Задач Ухода",
					phone: "+7 916 000-09-01",
				})
				.onConflictDoNothing();
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		process.env = originalEnv;
	});

	test("SEV-2.5: Номера зубов разрешены в сервисных сообщениях, но блокируются соматические диагнозы", () => {
		const serviceResult = MessageTemplateEngine.detectMedicalSecrecyLeaks(
			"После удаления зуба 38 соблюдайте покой и приложите холод.",
			{ scope: "service", allowToothNumbers: true },
		);
		assert.equal(serviceResult.hasLeak, false, "Номер зуба в сервисном уходе не должен считаться утечкой");

		const somaticResult = MessageTemplateEngine.detectMedicalSecrecyLeaks(
			"У вас ВИЧ и гепатит C, требуется явка к врачу.",
			{ scope: "service", allowToothNumbers: true },
		);
		assert.equal(somaticResult.hasCriticalLeak, true, "Соматический диагноз обязан блокироваться даже в service");
		assert.ok(somaticResult.criticalTerms.length > 0);
	});

	test("SEV-3.7 & SEV-3.8: Атомарный SQL-upsert для счетчика квот SMS в uisSmsChatQuotas", async () => {
		const today = new Date().toISOString().slice(0, 10);
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.delete(uisSmsChatQuotas)
				.where(
					and(
						eq(uisSmsChatQuotas.organizationId, ORG_ID),
						eq(uisSmsChatQuotas.monthYear, today),
					),
				);

			await incrementDailySmsQuota(ORG_ID);
			let quota = await getDailySmsQuota(ORG_ID);
			assert.equal(quota.smsSentCount, 1);

			await incrementDailySmsQuota(ORG_ID);
			quota = await getDailySmsQuota(ORG_ID);
			assert.equal(quota.smsSentCount, 2);
		});
	});

	test("SEV-1.1: Ошибочная задача ухода переводится в статус 'failed' с lastErrorMessage (нет вечного DoS цикла)", async () => {
		const invalidTaskId = fixtureUuid(FIXTURE, 0x51);
		const past = new Date(Date.now() - 60_000);

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.insert(communicationTasks)
				.values({
					id: invalidTaskId,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					patientId: PATIENT_ID,
					assignedRole: "reception",
					channel: "in_person", // Не является машино-отправляемым каналом -> enqueueMessage вернет !ok
					intent: "post_visit_instruction",
					status: "scheduled",
					priority: "normal",
					dueAt: past,
					title: "Личный инструктаж",
					body: "Подойти лично в клинику",
				})
				.onConflictDoUpdate({
					target: [communicationTasks.id],
					set: { status: "scheduled", dueAt: past },
				});

			const result = await dispatchDueCareTasks(new Date());
			assert.ok(result.problems.length > 0, "Должна быть зафиксирована ошибка канала");

			const [updated] = await db
				.select({
					status: communicationTasks.status,
					lastErrorMessage: communicationTasks.lastErrorMessage,
				})
				.from(communicationTasks)
				.where(eq(communicationTasks.id, invalidTaskId));

			assert.ok(updated, "Задача должна существовать");
			assert.equal(updated.status, "failed", "Статус должен стать failed, ликвидируя бесконечный цикл выборки");
			assert.ok(updated.lastErrorMessage?.includes("не отправляется автоматически"));
		});
	});

	test("SEV-1.2: Приглашение Recall атомарно сохраняет статус 'invited' в patientRecalls", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/recalls/invite",
			headers: ORG_HEADERS,
			payload: {
				patientId: PATIENT_ID,
				channel: "sms",
				body: "Время планового осмотра подошло.",
			},
		});

		assert.equal(response.statusCode, 200, response.body);

		await withFixtureTenant(ORG_ID, async () => {
			const [recall] = await db
				.select({
					status: patientRecalls.status,
					channel: patientRecalls.channel,
				})
				.from(patientRecalls)
				.where(
					and(
						eq(patientRecalls.organizationId, ORG_ID),
						eq(patientRecalls.patientId, PATIENT_ID),
					),
				);

			assert.ok(recall, "Запись в patientRecalls должна быть создана в транзакции");
			assert.equal(recall.status, "invited", "Статус должен быть 'invited', устраняя фантомный 'due_now'");
			assert.equal(recall.channel, "sms");
		});
	});
});
