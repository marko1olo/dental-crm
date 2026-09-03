import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
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
 * PROSECUTOR 2: СЕДЬМАЯ ВОЛНА АТАКИ — SCHEDULE CONFLICTS, RESERVES & OVERBOOKING
 * ============================================================================
 *
 * Объект атаки: Ядро расписания (appointmentsQuery.ts, routes/schedule.ts)
 * 1. Конфликты полуинтервалов времени [startsAt, endsAt):
 *    - Полное совпадение времени в одном кресле (14:00 - 15:00) -> 409 Conflict
 *    - Частичный нахлест конца первого приема (14:30 - 15:30) -> 409 Conflict
 *    - Частичный нахлест начала первого приема (13:30 - 14:30) -> 409 Conflict
 *    - Полное поглощение / объемлющий прием (13:00 - 16:00) -> 409 Conflict
 * 2. Разделение виновников коллизии:
 *    - Конфликт кресла: "Кресло уже занято другой записью в это время"
 *    - Конфликт врача: "У врача уже есть запись в это время" (в разных креслах!)
 *    - Конфликт пациента: "У пациента уже есть запись в это время"
 * 3. Математика полуинтервалов:
 *    - Стык в стык (13:00-14:00 и 14:00-15:00 и 15:00-16:00) -> РАЗРЕШЕНО (201 Created)
 * 4. Технические резервы времени:
 *    - Блокировка слота под техобслуживание / кварцевание / обед врача
 *    - Попытка записи пациента на зарезервированный интервал блокируется кодом 409
 * 5. Валидация обращения времени вспять:
 *    - endsAt <= startsAt -> 400 Bad Request
 */

const FIXTURE = "prosecutorWave7";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);

const CHAIR_1_ID = fixtureUuid(FIXTURE, 10);
const CHAIR_2_ID = fixtureUuid(FIXTURE, 11);

const DOCTOR_1_ID = fixtureUuid(FIXTURE, 20);
const DOCTOR_2_ID = fixtureUuid(FIXTURE, 21);

const PATIENT_1_ID = fixtureUuid(FIXTURE, 30);
const PATIENT_2_ID = fixtureUuid(FIXTURE, 31);
const PATIENT_RESERVE_ID = fixtureUuid(FIXTURE, 32);

describe("PROSECUTOR 2: СЕДЬМАЯ ВОЛНА (SCHEDULE CONFLICTS, RESERVES & OVERBOOKING)", () => {
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
				await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
				await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
				await db.delete(users).where(eq(users.organizationId, ORG_ID));
			});
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника точного расписания (Wave 7 Conflicts)",
				});
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главный корпус",
					timezone: "Europe/Moscow",
				});
				// 2 кресла
				await db.insert(chairs).values([
					{
						id: CHAIR_1_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 1 (Ортопедия)",
					},
					{
						id: CHAIR_2_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 2 (Терапия)",
					},
				]);
				// 2 врача
				await db.insert(users).values([
					{
						id: DOCTOR_1_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Ортопедов О.О.",
						role: "doctor",
					},
					{
						id: DOCTOR_2_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Терапевтов Т.Т.",
						role: "doctor",
					},
				]);
				// 3 пациента
				await db.insert(patients).values([
					{
						id: PATIENT_1_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Первов П.П.",
						phone: "+7 (926) 111-22-33",
					},
					{
						id: PATIENT_2_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Второв В.В.",
						phone: "+7 (926) 444-55-66",
					},
					{
						id: PATIENT_RESERVE_ID,
						organizationId: ORG_ID,
						fullName: "[Служебный] Технический Блок / Резерв",
						phone: "+7 (926) 000-00-00",
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
	// СЕКТОР 1: БАЗОВОЕ СОЗДАНИЕ И КОНФЛИКТЫ КРЕСЛА (CHAIR CONFLICTS)
	// =========================================================================

	test("ВЕКТОР 7.1: Легитимное создание базового приёма в Кресле 1 (14:00 - 15:00)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_1_ID,
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-10-15T14:00:00.000Z",
				endsAt: "2026-10-15T15:00:00.000Z",
				reason: "Первичная консультация ортопеда",
			},
		});

		assert.equal(
			response.statusCode,
			201,
			`Ожидалось 201 Created, получено ${response.statusCode}: ${response.body}`,
		);
		console.log(`[ВЕКТОР 7.1]: Базовый приём успешно создан в Кресле 1 (14:00-15:00)`);
	});

	test("ВЕКТОР 7.2 [КОНФЛИКТ КРЕСЛА]: Точное совпадение времени (14:00 - 15:00) в Кресле 1 блокируется", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Другой пациент и другой врач пытаются занять то же Кресло 1 на то же время
		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_2_ID,
				chairId: CHAIR_1_ID, // То же кресло!
				startsAt: "2026-10-15T14:00:00.000Z",
				endsAt: "2026-10-15T15:00:00.000Z",
				reason: "Попытка наложения приёма на то же кресло",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Сервер позволил занять занятое кресло (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.code, "AppointmentCreateRejected");
		assert.equal(body.reason, "resource_overlap");
		assert.match(
			body.message,
			/Кресло уже занято/i,
			"Сообщение об ошибке обязано прямо указывать на занятость кресла",
		);
		console.log(
			`[ВЕКТОР 7.2 ОТБИТ]: Точный конфликт кресла заблокирован кодом 409 (${body.message})`,
		);
	});

	test("ВЕКТОР 7.3 [НАХЛЕСТ СПРАВА]: Частичный нахлест на вторую половину приёма (14:30 - 15:30)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_2_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-10-15T14:30:00.000Z", // Нахлест на 14:00-15:00
				endsAt: "2026-10-15T15:30:00.000Z",
			},
		});

		assert.equal(response.statusCode, 409);
		const body = JSON.parse(response.body);
		assert.equal(body.reason, "resource_overlap");
		assert.match(body.message, /Кресло уже занято/i);
		console.log(
			`[ВЕКТОР 7.3 ОТБИТ]: Частичный нахлест справа (14:30-15:30) заблокирован кодом 409`,
		);
	});

	test("ВЕКТОР 7.4 [НАХЛЕСТ СЛЕВА И ПОГЛОЩЕНИЕ]: Нахлест 13:30-14:30 и 13:00-16:00 блокируются", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Нахлест слева (13:30 - 14:30)
		const resLeft = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_2_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-10-15T13:30:00.000Z",
				endsAt: "2026-10-15T14:30:00.000Z",
			},
		});
		assert.equal(resLeft.statusCode, 409);

		// Объемлющий интервал (13:00 - 16:00)
		const resEngulf = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_2_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-10-15T13:00:00.000Z",
				endsAt: "2026-10-15T16:00:00.000Z",
			},
		});
		assert.equal(resEngulf.statusCode, 409);
		console.log(
			`[ВЕКТОР 7.4 ОТБИТ]: Нахлест слева и объемлющее поглощение слота строго блокируются 409`,
		);
	});

	// =========================================================================
	// СЕКТОР 2: КОНФЛИКТЫ ВРАЧА И ПАЦИЕНТА (РАЗДЕЛЕНИЕ ВИНОВНИКОВ)
	// =========================================================================

	test("ВЕКТОР 7.5 [КОНФЛИКТ ВРАЧА]: Один врач в двух разных креслах одновременно (14:00 - 15:00)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Доктор 1 уже занят в Кресле 1 с 14:00 до 15:00.
		// Пытаемся назначить его во второе СВОБОДНОЕ Кресло 2 в то же самое время!
		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_1_ID, // Тот же доктор!
				chairId: CHAIR_2_ID, // Другое кресло (свободное)!
				startsAt: "2026-10-15T14:00:00.000Z",
				endsAt: "2026-10-15T15:00:00.000Z",
				reason: "Попытка раздвоения врача по разным кабинетам",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Сервер позволил одному врачу принимать пациентов в двух креслах одновременно!`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.code, "AppointmentCreateRejected");
		assert.equal(body.reason, "resource_overlap");
		assert.match(
			body.message,
			/У врача уже есть запись/i,
			`ОШИБКА ДИАГНОСТИКИ: Сервер должен сообщить о занятости ВРАЧА, а не кресла! Сообщение: ${body.message}`,
		);
		console.log(
			`[ВЕКТОР 7.5 ОТБИТ]: Коллизия врача в разных креслах заблокирована кодом 409 (${body.message})`,
		);
	});

	test("ВЕКТОР 7.6 [КОНФЛИКТ ПАЦИЕНТА]: Один пациент на двух приёмах одновременно", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Пациент 1 уже записан к Доктору 1 в Кресло 1 с 14:00 до 15:00.
		// Пытаемся записать его же к Доктору 2 в Кресло 2 с 14:00 до 15:00.
		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_1_ID, // Тот же пациент!
				doctorUserId: DOCTOR_2_ID, // Другой врач!
				chairId: CHAIR_2_ID, // Другое кресло!
				startsAt: "2026-10-15T14:00:00.000Z",
				endsAt: "2026-10-15T15:00:00.000Z",
				reason: "Попытка записать пациента на два приема в одно время",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Сервер позволил пациенту быть в двух кабинетах одновременно!`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.reason, "resource_overlap");
		assert.match(
			body.message,
			/У пациента уже есть запись/i,
			`ОШИБКА ДИАГНОСТИКИ: Сервер должен сообщить о занятости ПАЦИЕНТА! Сообщение: ${body.message}`,
		);
		console.log(
			`[ВЕКТОР 7.6 ОТБИТ]: Коллизия пациента заблокирована кодом 409 (${body.message})`,
		);
	});

	// =========================================================================
	// СЕКТОР 3: МАТЕМАТИКА ПОЛУИНТЕРВАЛОВ (СТЫК В СТЫК [startsAt, endsAt))
	// =========================================================================

	test("ВЕКТОР 7.7 [СТЫК В СТЫК]: Приемы встык (13:00-14:00 и 15:00-16:00) разрешены", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// 1. Предшествующий приём встык (13:00 - 14:00) в Кресле 1 с Доктором 1
		const resBefore = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-10-15T13:00:00.000Z",
				endsAt: "2026-10-15T14:00:00.000Z", // Ровно в 14:00 начинается следующий!
				reason: "Приём встык до базового",
			},
		});
		assert.equal(
			resBefore.statusCode,
			201,
			`Стык встык ДО должен быть разрешен (201): ${resBefore.body}`,
		);

		// 2. Последующий приём встык (15:00 - 16:00) в Кресле 1 с Доктором 1
		const resAfter = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-10-15T15:00:00.000Z", // Ровно в 15:00 окончился базовый!
				endsAt: "2026-10-15T16:00:00.000Z",
				reason: "Приём встык после базового",
			},
		});
		assert.equal(
			resAfter.statusCode,
			201,
			`Стык встык ПОСЛЕ должен быть разрешен (201): ${resAfter.body}`,
		);

		console.log(
			`[ВЕКТОР 7.7 ОТБИТ]: Полуинтервальная математика [13:00, 14:00) и [15:00, 16:00) соблюдена на 100% (201 Created)`,
		);
	});

	// =========================================================================
	// СЕКТОР 4: ТЕХНИЧЕСКИЕ РЕЗЕРВЫ ВРЕМЕНИ (КВАРЦЕВАНИЕ / ОБЕД / ТЕХОБСЛУЖИВАНИЕ)
	// =========================================================================

	test("ВЕКТОР 7.8 [ТЕХНИЧЕСКИЙ РЕЗЕРВ]: Бронирование кресла под кварцевание/санобработку блокирует запись", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Администратор создает технический блок (кварцевание/техобслуживание) в Кресле 2 на 16:00 - 17:00
		const reserveRes = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_RESERVE_ID, // Служебный тех-пациент
				doctorUserId: DOCTOR_2_ID,
				chairId: CHAIR_2_ID,
				startsAt: "2026-10-15T16:00:00.000Z",
				endsAt: "2026-10-15T17:00:00.000Z",
				reason: "КВАРЦЕВАНИЕ И САНИТАРНАЯ ОБРАБОТКА ПО СанПиН",
				comment: "Кресло закрыто для записи пациентов",
			},
		});
		assert.equal(reserveRes.statusCode, 201);
		console.log(`[РЕЗЕРВ]: Технический блок в Кресле 2 установлен (16:00-17:00)`);

		// АТАКА: Администратор или пациент пытается записаться к ДРУГОМУ свободному врачу (Доктор 1) в зарезервированное кресло 2 (16:15 - 16:45)
		const attackRes = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_1_ID,
				doctorUserId: DOCTOR_1_ID, // Доктор 1 свободен, но КРЕСЛО 2 занято кварцеванием!
				chairId: CHAIR_2_ID,
				startsAt: "2026-10-15T16:15:00.000Z",
				endsAt: "2026-10-15T16:45:00.000Z",
				reason: "Попытка вклиниться в кварцевание",
			},
		});

		assert.equal(
			attackRes.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Система разрешила запись пациента на время кварцевания/санобработки! (${attackRes.statusCode})`,
		);
		const attackBody = JSON.parse(attackRes.body);
		assert.equal(attackBody.reason, "resource_overlap");
		assert.match(
			attackBody.message,
			/Кресло уже занято/i,
			"Должен быть зафиксирован именно конфликт кресла (технический блок кресла)",
		);
		console.log(
			`[ВЕКТОР 7.8 ОТБИТ]: Запись на зарезервированное кресло заблокирована кодом 409 (${attackBody.message})`,
		);
	});

	// =========================================================================
	// СЕКТОР 5: ВАЛИДАЦИЯ ВРЕМЕНИ ВСПЯТЬ
	// =========================================================================

	test("ВЕКТОР 7.9 [ВРЕМЯ ВСПЯТЬ]: endsAt <= startsAt отклоняется кодом 400 Bad Request", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_1_ID,
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-10-15T18:00:00.000Z",
				endsAt: "2026-10-15T17:00:00.000Z", // Время вспять!
			},
		});

		assert.equal(
			response.statusCode,
			400,
			`Ожидалось 400 Bad Request для времени вспять, получено: ${response.statusCode}`,
		);
		console.log(
			`[ВЕКТОР 7.9 ОТБИТ]: Некорректный интервал (время вспять) отклонен кодом 400.`,
		);
	});
});
