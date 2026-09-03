import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patientArchiveReasonsAndBlacklists,
	patients,
	users,
} from "../../db/schema.js";
import { registerPublicBookingRoutes } from "../../routes/publicBooking.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * ============================================================================
 * PROSECUTOR 2: ВОСЬМАЯ ВОЛНА АТАКИ — ARCHIVE PATIENTS & BLACKLIST ENFORCEMENT
 * ============================================================================
 *
 * Объект атаки: Защита клиники от записи нежелательных и архивных лиц
 * Канал 1: Административное расписание CRM (POST /api/appointments, PATCH /api/appointments/:id)
 * Канал 2: Публичный онлайн-виджет записи (POST /api/public/booking/:organizationId/book)
 *
 * Цель атаки:
 * 1. Попытка записать пациента с blacklisted: true через админку -> 403 Forbidden
 * 2. Попытка записать архивного пациента (status: "archived") через админку -> 403 Forbidden
 * 3. Попытка записать черносписочника через публичный онлайн-виджет по номеру телефона -> 403 Forbidden
 * 4. Попытка записать архивного пациента через публичный онлайн-виджет по номеру телефона -> 403 Forbidden
 * 5. Попытка обхода через новый телефон с ФИО из чёрного списка клиники -> 403 Forbidden
 * 6. Попытка перевесить существующий приём на архивного/заблокированного пациента -> 403 Forbidden
 * 7. Проверка целостности БД: 0 записей создано для заблокированных/архивных пациентов
 */

const FIXTURE = "prosecutorWave8";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);

const CHAIR_ID = fixtureUuid(FIXTURE, 10);
const DOCTOR_ID = fixtureUuid(FIXTURE, 20);

const PATIENT_ACTIVE_ID = fixtureUuid(FIXTURE, 30);
const PATIENT_BLACKLIST_ID = fixtureUuid(FIXTURE, 31);
const PATIENT_ARCHIVED_ID = fixtureUuid(FIXTURE, 32);

const BLACKLISTED_NAME = "Хулиганов Хам Хамович";

describe("PROSECUTOR 2: ВОСЬМАЯ ВОЛНА (ARCHIVE PATIENTS & BLACKLIST ENFORCEMENT)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let databaseAvailable = true;

	before(async () => {
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await registerScheduleRoutes(app);
		await app.register(registerPublicBookingRoutes, {
			prefix: "/api/public/booking",
		});

		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_ID, clinicId: CLINIC_ID },
				authTokenSecret(),
			),
			"x-organization-id": ORG_ID,
			"content-type": "application/json",
		};

		try {
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.delete(appointments)
					.where(eq(appointments.organizationId, ORG_ID));
				await db
					.delete(patientArchiveReasonsAndBlacklists)
					.where(
						eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID),
					);
				await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
				await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
				await db.delete(users).where(eq(users.organizationId, ORG_ID));
			});
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника строгой безопасности (Wave 8)",
					clinicSchedule: {
						workHours: [8, 21],
						workingDays: [1, 2, 3, 4, 5, 6, 7],
					},
				});
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Центральное отделение",
					timezone: "Europe/Moscow",
				});
				// 1 активное кресло
				await db.insert(chairs).values({
					id: CHAIR_ID,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					name: "Кресло 1",
					isActive: true,
				});
				// 1 активный врач
				await db.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Айболит А.А.",
					role: "doctor",
					isActive: true,
					workingHours: {
						monday: { start: "08:00", end: "20:00" },
						tuesday: { start: "08:00", end: "20:00" },
						wednesday: { start: "08:00", end: "20:00" },
						thursday: { start: "08:00", end: "20:00" },
						friday: { start: "08:00", end: "20:00" },
						saturday: { start: "08:00", end: "20:00" },
						sunday: { start: "08:00", end: "20:00" },
					},
				});
				// Пациенты: 1 активный, 1 черный список, 1 архивный
				await db.insert(patients).values([
					{
						id: PATIENT_ACTIVE_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Добросовестный Д.Д.",
						phone: "+7 (926) 111-11-11",
						status: "active",
					},
					{
						id: PATIENT_BLACKLIST_ID,
						organizationId: ORG_ID,
						fullName: "Заблокированный Токсик Т.Т.",
						phone: "+7 (926) 222-22-22",
						status: "active",
					},
					{
						id: PATIENT_ARCHIVED_ID,
						organizationId: ORG_ID,
						fullName: "Архивный Переехавший П.П.",
						phone: "+7 (926) 333-33-33",
						status: "archived",
					},
				]);

				// Строки чёрного списка в patientArchiveReasonsAndBlacklists
				await db.insert(patientArchiveReasonsAndBlacklists).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_BLACKLIST_ID,
						patientName: "Заблокированный Токсик Т.Т.",
						archiveReason: "Дебош в приемной и отказ от оплаты",
						isBookingBlocked: true,
						warningBadge: "⛔ ЧЕРНЫЙ СПИСОК (Запрет записи)",
					},
					{
						organizationId: ORG_ID,
						patientId: null,
						patientName: BLACKLISTED_NAME,
						archiveReason: "Судебный запрет на посещение клиники",
						isBookingBlocked: true,
						warningBadge: "⛔ ЧЕРНЫЙ СПИСОК (Запрет по ФИО)",
					},
				]);
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			try {
				await withFixtureTenant(ORG_ID, async () => {
					await db
						.delete(appointments)
						.where(eq(appointments.organizationId, ORG_ID));
					await db
						.delete(patientArchiveReasonsAndBlacklists)
						.where(
							eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID),
						);
					await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
					await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
					await db.delete(users).where(eq(users.organizationId, ORG_ID));
				});
				await purgeFixtureOrganizations([ORG_ID]);
			} catch {
				// cleanup ignore
			}
		}
		await app.close();
	});

	// =========================================================================
	// СЕКТОР 1: АДМИНИСТРАТИВНОЕ РАСПИСАНИЕ CRM (POST /api/appointments)
	// =========================================================================

	test("ВЕКТОР 8.1 [АДМИН РАСПИСАНИЕ]: Попытка записи черносписочника блокируется кодом 403 Forbidden", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_BLACKLIST_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				startsAt: "2026-11-20T10:00:00.000Z",
				endsAt: "2026-11-20T11:00:00.000Z",
				reason: "Попытка записать черносписочника через админа",
			},
		});

		assert.equal(
			response.statusCode,
			403,
			`КРИТИЧЕСКИЙ БРАК: Ожидался код 403 Forbidden, получено ${response.statusCode}: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.code, "AppointmentCreateRejected");
		assert.equal(body.reason, "patient_blacklisted");
		assert.match(body.message, /черный список|заблокирована/i);
		console.log(
			`[ВЕКТОР 8.1 ОТБИТ]: Административная запись заблокированного пациента отклонена кодом 403 (${body.message})`,
		);
	});

	test("ВЕКТОР 8.2 [АДМИН РАСПИСАНИЕ]: Попытка записи архивного пациента блокируется кодом 403 Forbidden", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_ARCHIVED_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				startsAt: "2026-11-20T11:00:00.000Z",
				endsAt: "2026-11-20T12:00:00.000Z",
				reason: "Попытка записать архивного пациента",
			},
		});

		assert.equal(
			response.statusCode,
			403,
			`КРИТИЧЕСКИЙ БРАК: Ожидался код 403 Forbidden для архивного пациента, получено ${response.statusCode}: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.code, "AppointmentCreateRejected");
		assert.match(body.message, /архиве|заблокирована/i);
		console.log(
			`[ВЕКТОР 8.2 ОТБИТ]: Административная запись архивного пациента отклонена кодом 403 (${body.message})`,
		);
	});

	test("ВЕКТОР 8.3 [АДМИН РАСПИСАНИЕ]: Легитимная запись активного пациента разрешена (201 Created)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_ACTIVE_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				startsAt: "2026-11-20T12:00:00.000Z",
				endsAt: "2026-11-20T13:00:00.000Z",
				reason: "Плановый приём активного пациента",
			},
		});

		assert.equal(
			response.statusCode,
			201,
			`Ожидалось 201 Created для активного пациента, получено: ${response.statusCode}`,
		);
		console.log(
			`[ВЕКТОР 8.3]: Легитимный активный пациент успешно записан кодом 201 Created`,
		);
	});

	// =========================================================================
	// СЕКТОР 2: ПУБЛИЧНЫЙ ОНЛАЙН-ВИДЖЕТ ЗАПИСИ (POST /api/public/booking/:org/book)
	// =========================================================================

	test("ВЕКТОР 8.4 [ОНЛАЙН-ВИДЖЕТ]: Черносписочник по номеру телефона блокируется кодом 403 Forbidden", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_ID}/book`,
			headers: { "content-type": "application/json" },
			payload: {
				doctorId: DOCTOR_ID,
				startsAt: "2026-11-20T14:00:00.000Z",
				endsAt: "2026-11-20T14:30:00.000Z",
				patientName: "Токсик Т.Т.",
				patientPhone: "+7 (926) 222-22-22", // Телефон из чёрного списка!
				comment: "Попытка онлайн-прорыва через виджет",
			},
		});

		assert.equal(
			response.statusCode,
			403,
			`КРИТИЧЕСКИЙ ПРОБОЙ БЕЗОПАСНОСТИ: Виджет позволил записаться черносписочнику! (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "BookingBlocked");
		console.log(
			`[ВЕКТОР 8.4 ОТБИТ]: Онлайн-попытка черносписочника заблокирована кодом 403 (${body.message})`,
		);
	});

	test("ВЕКТОР 8.5 [ОНЛАЙН-ВИДЖЕТ]: Архивный пациент по номеру телефона блокируется кодом 403 Forbidden", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_ID}/book`,
			headers: { "content-type": "application/json" },
			payload: {
				doctorId: DOCTOR_ID,
				startsAt: "2026-11-20T15:00:00.000Z",
				endsAt: "2026-11-20T15:30:00.000Z",
				patientName: "Архивный Переехавший П.П.",
				patientPhone: "+7 (926) 333-33-33", // Телефон архивного пациента!
			},
		});

		assert.equal(
			response.statusCode,
			403,
			`КРИТИЧЕСКИЙ ПРОБОЙ БЕЗОПАСНОСТИ: Виджет позволил записаться архивному пациенту! (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientArchived");
		console.log(
			`[ВЕКТОР 8.5 ОТБИТ]: Онлайн-попытка архивного пациента заблокирована кодом 403 (${body.message})`,
		);
	});

	test("ВЕКТОР 8.6 [ОНЛАЙН-ВИДЖЕТ]: Попытка обхода под новым номером с ФИО из чёрного списка блокируется кодом 403", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Пациент использует совершенно новый «левый» номер телефона, но указывает ФИО из чёрного списка
		const response = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_ID}/book`,
			headers: { "content-type": "application/json" },
			payload: {
				doctorId: DOCTOR_ID,
				startsAt: "2026-11-20T16:00:00.000Z",
				endsAt: "2026-11-20T16:30:00.000Z",
				patientName: BLACKLISTED_NAME, // "Хулиганов Хам Хамович"
				patientPhone: "+7 (999) 777-88-99", // Новый телефон!
			},
		});

		assert.equal(
			response.statusCode,
			403,
			`КРИТИЧЕСКИЙ ПРОБОЙ: Виджет пропустил лицо из чёрного списка с новым телефоном! (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "BookingBlocked");
		console.log(
			`[ВЕКТОР 8.6 ОТБИТ]: Обход через новый номер по ФИО из чёрного списка заблокирован кодом 403 (${body.message})`,
		);
	});

	test("ВЕКТОР 8.7 [ОНЛАЙН-ВИДЖЕТ]: Легитимная запись нового добросовестного пациента проходит успешно", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_ID}/book`,
			headers: { "content-type": "application/json" },
			payload: {
				doctorId: DOCTOR_ID,
				startsAt: "2026-11-20T17:00:00.000Z",
				endsAt: "2026-11-20T17:30:00.000Z",
				patientName: "Новый Доброжелательный Н.Н.",
				patientPhone: "+7 (903) 555-44-33",
			},
		});

		assert.equal(
			response.statusCode,
			200,
			`Ожидалось 200 OK для нового добросовестного пациента: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.success, true);
		console.log(
			`[ВЕКТОР 8.7]: Легитимный пациент успешно записан через онлайн-виджет (200 OK)`,
		);
	});

	// =========================================================================
	// СЕКТОР 3: ПЕРЕНОС / ОБНОВЛЕНИЕ ПРИЁМА НА АРХИВНОГО / ЧЕРНОСПИСОЧНИКА
	// =========================================================================

	test("ВЕКТОР 8.8 [ПЕРЕНОС И СМЕНА ПАЦИЕНТА]: Попытка подмены пациента на архивного/черносписочника блокируется 403", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Сначала находим легитимный приём, созданный в Векторе 8.3
		const [activeAppt] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: appointments.id })
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, ORG_ID),
						eq(appointments.patientId, PATIENT_ACTIVE_ID),
					),
				)
				.limit(1),
		);

		assert.ok(activeAppt, "Легитимный приём должен существовать в базе");

		// Попытка 1: Подменить пациента в приёме на черносписочника
		const resBlacklist = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${activeAppt.id}`,
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_BLACKLIST_ID,
			},
		});
		assert.equal(
			resBlacklist.statusCode,
			403,
			`Ожидался отказ 403 при подмене пациента на черносписочника: ${resBlacklist.body}`,
		);

		// Попытка 2: Подменить пациента в приёме на архивного
		const resArchived = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${activeAppt.id}`,
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_ARCHIVED_ID,
			},
		});
		assert.equal(
			resArchived.statusCode,
			403,
			`Ожидался отказ 403 при подмене пациента на архивного: ${resArchived.body}`,
		);

		console.log(
			`[ВЕКТОР 8.8 ОТБИТ]: Подмена пациента на заблокированного/архивного при обновлении записи строго блокируется кодом 403`,
		);
	});

	// =========================================================================
	// СЕКТОР 4: ПРОВЕРКА ЦЕЛОСТНОСТИ БАЗЫ ДАННЫХ (ZERO LEAKAGE)
	// =========================================================================

	test("ВЕКТОР 8.9 [ЦЕЛОСТНОСТЬ БД]: В таблице appointments строго 0 записей для черносписочников и архивных", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const blockedAppointments = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: appointments.id, patientId: appointments.patientId })
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, ORG_ID),
						or(
							eq(appointments.patientId, PATIENT_BLACKLIST_ID),
							eq(appointments.patientId, PATIENT_ARCHIVED_ID),
						),
					),
				),
		);

		assert.equal(
			blockedAppointments.length,
			0,
			`КРИТИЧЕСКИЙ БРАК: В базе найдены записи для заблокированных пациентов: ${JSON.stringify(blockedAppointments)}`,
		);

		console.log(
			`[ВЕКТОР 8.9 ОТБИТ]: Проверка базы подтвердила: 0 записей для архивных и черносписочников. Целостность 100%!`,
		);
	});
});
