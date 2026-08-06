import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	clinics,
	communicationOutbox,
	communicationSettings,
	communicationTemplates,
	organizations,
	patientCommunicationConsents,
	patients,
	users,
} from "../../db/schema.js";
import { registerCommunicationOutboxRoutes } from "../../routes/communicationsOutbox.js";
import {
	addressableName,
	scheduleAppointmentReminders,
	shortDoctorName,
} from "../../services/communications/appointmentReminders.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * Напоминание за сутки — то, ради чего клиника заводит рассылку. В проекте его
 * не существовало: services/recallScheduler.ts и services/postOpCareTrigger.ts
 * ниоткуда не вызывались, а appointment_reminder_lead_times_hours_json в
 * настройках Telegram-бота не читал никто, кроме сборки списка outbox.
 *
 * Проверяется по живой базе: приём попадает в окно → напоминание встаёт в
 * очередь ровно один раз, с подставленными датой и временем в часовом поясе
 * клиники.
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000101";
const CLINIC_ID = "dce70000-0000-4000-8000-000000000102";
const PATIENT_ID = "dce70000-0000-4000-8000-000000000103";
const DOCTOR_ID = "dce70000-0000-4000-8000-000000000104";
const APPOINTMENT_ID = "dce70000-0000-4000-8000-000000000105";
const ORG_HEADERS = { "x-organization-id": ORG_ID };

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
 * оставлял фикстуру в живой базе, и `onConflictDoNothing` на засеве следующего
 * прогона молча оставлял старые строки вместо своих. Здесь это бьёт по самому
 * смыслу файла: проверка «напоминание встаёт в очередь РОВНО ОДИН РАЗ» считает
 * строки в `communication_outbox`, а `startsAt` приёма отсчитывается от «сейчас»
 * в момент прогона. Остаток от прошлого прогона несёт ЧУЖОЕ время приёма и своё
 * напоминание: приём в окно уже не попадает, зато напоминание в очереди есть —
 * и проверка либо краснеет на верном коде, либо зеленеет на чужом напоминании.
 *
 * Порядок удаления — от зависимых строк к организации.
 */
async function purgeFixtures(): Promise<void> {
	/*
	 * Уборка идёт под тенант-контекстом клиники: под FORCE RLS DELETE без
	 * `app.current_tenant` не видит ни одной строки и снимает НОЛЬ, ошибкой это
	 * не считается — приём прошлого прогона со своим временем пережил бы уборку.
	 */
	await withFixtureTenant(ORG_ID, async () => {
		await db
			.delete(communicationOutbox)
			.where(eq(communicationOutbox.organizationId, ORG_ID));
		await db
			.delete(patientCommunicationConsents)
			.where(eq(patientCommunicationConsents.organizationId, ORG_ID));
		await db
			.delete(appointments)
			.where(eq(appointments.organizationId, ORG_ID));
		await db
			.delete(communicationTemplates)
			.where(eq(communicationTemplates.organizationId, ORG_ID));
		await db
			.delete(communicationSettings)
			.where(eq(communicationSettings.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(users).where(eq(users.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	});
}

describe("автоматические напоминания о приёме", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = { ...process.env };
	// Приём ровно через 24 часа от «сейчас» в тесте.
	const now = new Date();
	const appointmentStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await registerCommunicationOutboxRoutes(app);

		try {
			// Сначала расчистить место за оборванным прогоном, потом сеять.
			await purgeFixtures();

			/*
			 * Сев под тенант-контекстом. В WITH CHECK тенант-таблиц стоит только
			 * `organization_id = current_tenant`, поэтому INSERT без контекста
			 * отвергается кодом 42501 — и обход RLS здесь не помогает вовсе.
			 */
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID, name: "Клиника напоминаний" });
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Клиника на Ленина",
					phone: "+7 495 000-00-00",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Иванович",
					role: "doctor",
				});
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Орлова Марина Петровна",
					phone: "+7 916 000-00-02",
				});
				// Время приёма отсчитывается от «сейчас», поэтому строка обязана быть
				// СВОЕЙ: onConflictDoNothing здесь оставил бы приём прошлого прогона с
				// его временем, и окно напоминания считалось бы по чужой дате.
				await db.insert(appointments).values({
					id: APPOINTMENT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					doctorUserId: DOCTOR_ID,
					status: "planned",
					startsAt: appointmentStart,
					endsAt: new Date(appointmentStart.getTime() + 60 * 60 * 1000),
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

	test("обращение к пациенту по имени и отчеству", () => {
		assert.equal(addressableName("Орлова Марина Петровна"), "Марина Петровна");
		assert.equal(addressableName("Орлова Марина"), "Марина");
		assert.equal(addressableName("Орлова"), "Орлова");
	});

	test("врач называется фамилией с инициалами", () => {
		assert.equal(shortDoctorName("Иванов Иван Иванович"), "Иванов И. И.");
		assert.equal(shortDoctorName("Иванов Иван"), "Иванов И.");
		assert.equal(shortDoctorName("Иванов"), "Иванов");
	});

	test("напоминания нельзя включить без шаблона", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Иначе получилась бы автоматика, которая ничего не отправляет и молчит.
		const response = await app.inject({
			method: "PUT",
			url: "/api/communications/settings",
			headers: ORG_HEADERS,
			payload: { appointmentReminderEnabled: true },
		});

		assert.equal(response.statusCode, 400, response.body);
		assert.ok(
			JSON.parse(response.body).message.includes("Подтверждение приёма"),
		);
	});

	test("после создания шаблона напоминания включаются", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const template = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: ORG_HEADERS,
			payload: {
				title: "Напоминание о приёме",
				channel: "sms",
				intent: "appointment_confirmation",
				body: "{patient}, напоминаем: приём {date} в {time}, {clinic}. Тел. {clinicPhone}.",
			},
		});
		assert.equal(template.statusCode, 201, template.body);

		const settings = await app.inject({
			method: "PUT",
			url: "/api/communications/settings",
			headers: ORG_HEADERS,
			payload: {
				appointmentReminderEnabled: true,
				appointmentReminderLeadHours: [24],
				channelFallback: ["sms"],
				timezone: "Europe/Moscow",
			},
		});
		assert.equal(settings.statusCode, 200, settings.body);
		assert.equal(
			JSON.parse(settings.body).settings.appointmentReminderEnabled,
			true,
		);
	});

	test("приём в окне порождает ровно одно напоминание", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const first = await scheduleAppointmentReminders({
			organizationId: ORG_ID,
			now,
		});
		assert.equal(first.queued, 1, JSON.stringify(first));

		// Чтение тоже под контекстом: без него выборка пуста молча, и «ровно одно
		// напоминание» краснело бы на нуле строк, а не на дефекте планировщика.
		const rows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(communicationOutbox)
				.where(
					and(
						eq(communicationOutbox.organizationId, ORG_ID),
						eq(communicationOutbox.dedupeKey, `reminder:${APPOINTMENT_ID}:24`),
					),
				),
		);
		assert.equal(rows.length, 1);

		const reminder = rows[0];
		assert.equal(reminder?.channel, "sms");
		assert.equal(reminder?.intent, "appointment_confirmation");
		assert.equal(reminder?.recipientAddress, "79160000002");
		assert.ok(
			reminder?.body.startsWith("Марина Петровна, напоминаем: приём "),
			reminder?.body ?? "",
		);
		assert.ok(
			reminder?.body.includes("Клиника на Ленина"),
			reminder?.body ?? "",
		);
		assert.ok(
			reminder?.body.includes("+7 495 000-00-00"),
			reminder?.body ?? "",
		);
	});

	test("повторный запуск планировщика не создаёт второе напоминание", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// За повторное сообщение клиника платит дважды, а доверие теряет один раз.
		const second = await scheduleAppointmentReminders({
			organizationId: ORG_ID,
			now,
		});
		assert.equal(second.queued, 0, JSON.stringify(second));
		assert.equal(second.alreadyQueued, 1, JSON.stringify(second));

		const rows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: communicationOutbox.id })
				.from(communicationOutbox)
				.where(
					and(
						eq(communicationOutbox.organizationId, ORG_ID),
						eq(communicationOutbox.dedupeKey, `reminder:${APPOINTMENT_ID}:24`),
					),
				),
		);
		assert.equal(rows.length, 1);
	});

	test("отменённый приём напоминания не получает", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// DELETE и UPDATE без контекста трогают НОЛЬ строк и молчат об этом:
		// очередь осталась бы непустой, а приём — запланированным.
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.delete(communicationOutbox)
				.where(eq(communicationOutbox.organizationId, ORG_ID));
			await db
				.update(appointments)
				.set({ status: "cancelled" })
				.where(eq(appointments.id, APPOINTMENT_ID));
		});

		const report = await scheduleAppointmentReminders({
			organizationId: ORG_ID,
			now,
		});
		assert.equal(report.queued, 0, JSON.stringify(report));
		assert.equal(report.examined, 0, JSON.stringify(report));

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(appointments)
				.set({ status: "planned" })
				.where(eq(appointments.id, APPOINTMENT_ID));
		});
	});

	test("отказ пациента отменяет напоминание по этому каналу", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.delete(communicationOutbox)
				.where(eq(communicationOutbox.organizationId, ORG_ID));
			await db.insert(patientCommunicationConsents).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				channel: "sms",
				scope: "service",
				state: "revoked",
				source: "staff",
			});
		});

		const report = await scheduleAppointmentReminders({
			organizationId: ORG_ID,
			now,
		});
		// Других каналов с шаблоном и контактом нет, поэтому напоминание не уходит.
		assert.equal(report.queued, 0, JSON.stringify(report));
		assert.equal(report.skippedNoChannel, 1, JSON.stringify(report));

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.delete(patientCommunicationConsents)
				.where(eq(patientCommunicationConsents.organizationId, ORG_ID));
		});
	});

	test("приём вне окна не трогается", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.delete(communicationOutbox)
				.where(eq(communicationOutbox.organizationId, ORG_ID));
		});
		// «Сейчас» на трое суток раньше: до приёма ещё далеко, напоминать рано.
		const tooEarly = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

		const report = await scheduleAppointmentReminders({
			organizationId: ORG_ID,
			now: tooEarly,
		});
		assert.equal(report.examined, 0, JSON.stringify(report));
		assert.equal(report.queued, 0, JSON.stringify(report));
	});

	test("ручной запуск доступен через маршрут", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.delete(communicationOutbox)
				.where(eq(communicationOutbox.organizationId, ORG_ID));
		});
		const response = await app.inject({
			method: "POST",
			url: "/api/communications/reminders/run",
			headers: ORG_HEADERS,
		});

		assert.equal(response.statusCode, 200, response.body);
		const report = JSON.parse(response.body).report;
		assert.equal(report.organizations, 1, JSON.stringify(report));
	});
});
