import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, desc, eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patientArchiveReasonsAndBlacklists,
	patients,
	toothStateHistory,
	toothStates,
	users,
} from "../../db/schema.js";
import { registerPatientDuplicateRoutes } from "../../routes/patientDuplicates.js";
import { registerPublicBookingRoutes } from "../../routes/publicBooking.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * ============================================================================
 * PROSECUTOR 2: ОДИННАДЦАТАЯ ВОЛНА АТАКИ — CHAIR RACE CONDITIONS, BLACKLIST
 * EVASION & DENTAL HISTORY INTEGRITY
 * ============================================================================
 *
 * Объект атаки:
 * 1. Расписание appointments и онлайн-запись publicBooking при одновременных
 *    попытках занять один слот (Race Condition в Кресле).
 * 2. Блокировка онлайн-записи для пациентов из черного списка и архива
 *    при попытках обхода через смену номера телефона, опечатки, гомоглифы, смену регистра.
 * 3. Целостность слияния карт при наличии конфликтующих состояний tooth_states
 *    и параллельных записей tooth_state_history.
 */

const FIXTURE = "prosecutorWave11";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);

const CHAIR_ID = fixtureUuid(FIXTURE, 10);
const DOCTOR_ID = fixtureUuid(FIXTURE, 20);

const PATIENT_PRIMARY_ID = fixtureUuid(FIXTURE, 30);
const PATIENT_DUPLICATE_ID = fixtureUuid(FIXTURE, 31);
const PATIENT_BLACKLIST_ID = fixtureUuid(FIXTURE, 32);
const PATIENT_ARCHIVED_ID = fixtureUuid(FIXTURE, 33);

const BLACKLISTED_NAME = "Хулиганов Хам Хамович";
const ARCHIVED_NAME = "Архивов Петр Петрович";

describe("PROSECUTOR 2: ОДИННАДЦАТАЯ ВОЛНА (SCHEDULE RACE, EVASION & DENTAL HISTORY)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let doctorHeaders: Record<string, string>;
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
		await registerPatientDuplicateRoutes(app);
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

		doctorHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_ID, clinicId: CLINIC_ID },
				authTokenSecret(),
			),
			"x-dente-staff-token": signToken(
				{
					organizationId: ORG_ID,
					userId: DOCTOR_ID,
					role: "doctor",
					clinicalRole: "dentist_general",
					canSignMedicalRecords: true,
				},
				authTokenSecret(),
			),
			"x-organization-id": ORG_ID,
			"content-type": "application/json",
		};

		try {
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.delete(toothStateHistory)
					.where(eq(toothStateHistory.organizationId, ORG_ID));
				await db
					.delete(toothStates)
					.where(eq(toothStates.organizationId, ORG_ID));
				await db
					.delete(appointments)
					.where(eq(appointments.organizationId, ORG_ID));
				await db
					.delete(patientArchiveReasonsAndBlacklists)
					.where(
						eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID),
					);
				await db.delete(patients).where(eq(patients.organizationId, ORG_ID));

				await db
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника Одонтологии и Безопасности (Wave 11)",
						clinicSchedule: {
							workHours: [8, 21],
							workingDays: [0, 1, 2, 3, 4, 5, 6],
						},
					})
					.onConflictDoNothing();

				await db
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Отделение хирургии и терапии",
						timezone: "Europe/Moscow",
					})
					.onConflictDoNothing();

				await db
					.insert(chairs)
					.values({
						id: CHAIR_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Операционное кресло №1",
						color: "#2563eb",
						isActive: true,
					})
					.onConflictDoNothing();

				await db
					.insert(users)
					.values({
						id: DOCTOR_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Хирург-Ортопед Х.Х.",
						role: "doctor",
						isActive: true,
					})
					.onConflictDoNothing();

				// Пациенты
				await db.insert(patients).values([
					{
						id: PATIENT_PRIMARY_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Главный Г.Г.",
						phone: "+7 (926) 111-00-01",
						birthDate: "1990-01-01",
						status: "active",
					},
					{
						id: PATIENT_DUPLICATE_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Дублирующий Д.Д.",
						phone: "+7 (926) 111-00-02",
						birthDate: "1990-01-01",
						status: "active",
					},
					{
						id: PATIENT_BLACKLIST_ID,
						organizationId: ORG_ID,
						fullName: BLACKLISTED_NAME,
						phone: "+7 (926) 666-00-01",
						status: "active",
					},
					{
						id: PATIENT_ARCHIVED_ID,
						organizationId: ORG_ID,
						fullName: ARCHIVED_NAME,
						phone: "+7 (926) 777-00-02",
						status: "archived",
					},
				]);

				// Внесение в черный список
				await db.insert(patientArchiveReasonsAndBlacklists).values({
					organizationId: ORG_ID,
					patientId: PATIENT_BLACKLIST_ID,
					patientName: BLACKLISTED_NAME,
					recordType: "blacklist",
					primaryReasonCategory: "non_payment",
					reasonTitle: "Систематический дебош и неоплата",
					isBookingBlocked: true,
					status: "active",
				});

				// Начальное состояние зубов для слияния (Вектор 11.6):
				// У Primary: зуб 46 = Implant, зуб 11 = Healthy
				await db.insert(toothStates).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 46,
						state: "Implant",
						notes: "Имплантат Straumann 2025",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 11,
						state: "Healthy",
						notes: "Здоров",
					},
				]);

				// У Duplicate: зуб 46 = Extracted (конфликт!), зуб 11 = Caries (конфликт!), зуб 24 = Filled (уникальный)
				await db.insert(toothStates).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 46,
						state: "Extracted",
						notes: "Удален в 2024",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 11,
						state: "Caries",
						notes: "Кариес эмали",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 24,
						state: "Filled",
						notes: "Пломба на 24",
					},
				]);

				// История зубов:
				await db.insert(toothStateHistory).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 46,
						previousState: "Extracted",
						newState: "Implant",
						reason: "Установка имплантата",
						changedAt: new Date("2025-02-01T10:00:00.000Z"),
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 46,
						previousState: "Healthy",
						newState: "Extracted",
						reason: "Удаление корня",
						changedAt: new Date("2024-05-15T12:00:00.000Z"),
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
						.delete(toothStateHistory)
						.where(eq(toothStateHistory.organizationId, ORG_ID));
					await db
						.delete(toothStates)
						.where(eq(toothStates.organizationId, ORG_ID));
					await db
						.delete(appointments)
						.where(eq(appointments.organizationId, ORG_ID));
					await db
						.delete(patientArchiveReasonsAndBlacklists)
						.where(
							eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID),
						);
					await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
				});
			} catch {
				// cleanup ignore
			}
		}
		await app.close();
	});

	// =========================================================================
	// ВЕКТОР 11.1: RACE CONDITION В КРЕСЛЕ ЧЕРЕЗ PUBLIC BOOKING (5 ЗАПРОСОВ)
	// =========================================================================
	test("ВЕКТОР 11.1 [PUBLIC BOOKING RACE]: 5 одновременных запросов на один слот в кресле", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		const startsAt = "2026-10-15T10:00:00.000Z";
		const endsAt = "2026-10-15T10:30:00.000Z";

		// 5 параллельных пациентов штурмуют один слот (10:00 - 10:30) в Операционном кресле №1
		const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
			app.inject({
				method: "POST",
				url: `/api/public/booking/${ORG_ID}/book`,
				payload: {
					doctorId: DOCTOR_ID,
					startsAt,
					endsAt,
					patientName: `Штурмовик Номер ${i + 1}`,
					patientPhone: `+7 (926) 900-00-0${i + 1}`,
				},
			}),
		);

		const responses = await Promise.all(concurrentRequests);

		const successResponses = responses.filter((r) => r.statusCode === 200);
		const conflictResponses = responses.filter((r) => r.statusCode === 409);

		console.log(
			`[PUBLIC BOOKING RACE]: Успехов: ${successResponses.length}, Конфликтов: ${conflictResponses.length}`,
		);

		assert.strictEqual(
			successResponses.length,
			1,
			"Ровно один запрос должен захватить кресло (HTTP 200 OK)",
		);
		assert.strictEqual(
			conflictResponses.length,
			4,
			"Остальные 4 запроса обязаны быть отвергнуты с кодом 409 Conflict",
		);

		// Проверка в PostgreSQL:
		const slotAppointments = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ORG_ID),
					eq(appointments.chairId, CHAIR_ID),
					eq(appointments.startsAt, new Date(startsAt)),
				),
			);

		assert.strictEqual(
			slotAppointments.length,
			1,
			"В базе данных PostgreSQL создана ровно 1 запись на этот слот кресла (0 овербукинга)",
		);
		console.log(
			"[ВЕКТОР 11.1 ОТБИТ]: Защита слота кресла в publicBooking доказана: 1 x 200 OK, 4 x 409 Conflict, 1 строка в БД.",
		);
	});

	// =========================================================================
	// ВЕКТОР 11.2: RACE CONDITION В КРЕСЛЕ ЧЕРЕЗ CRM SCHEDULE (5 ЗАПРОСОВ)
	// =========================================================================
	test("ВЕКТОР 11.2 [CRM SCHEDULE RACE]: 5 одновременных приёмов на один интервал кресла", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		const startsAt = "2026-10-15T11:00:00.000Z";
		const endsAt = "2026-10-15T12:00:00.000Z";

		// 5 одновременных запросов от разных администраторов
		const concurrentCrm = Array.from({ length: 5 }, (_, i) =>
			app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: clinicHeaders,
				payload: {
					patientId: PATIENT_PRIMARY_ID,
					doctorUserId: DOCTOR_ID,
					chairId: CHAIR_ID,
					status: "planned",
					startsAt,
					endsAt,
					reason: `Приём админа ${i + 1}`,
				},
			}),
		);

		const responses = await Promise.all(concurrentCrm);

		const success = responses.filter((r) => r.statusCode === 201);
		const conflicts = responses.filter((r) => r.statusCode === 409);

		console.log(
			`[CRM SCHEDULE RACE]: Успехов: ${success.length}, Конфликтов: ${conflicts.length}`,
		);

		assert.strictEqual(
			success.length,
			1,
			"Ровно один администратор успел занять кресло (HTTP 201 Created)",
		);
		assert.strictEqual(
			conflicts.length,
			4,
			"Остальные 4 запроса отклонены блокировкой кресла GiST / FOR UPDATE (HTTP 409 Conflict)",
		);

		const inDb = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ORG_ID),
					eq(appointments.chairId, CHAIR_ID),
					eq(appointments.startsAt, new Date(startsAt)),
				),
			);

		assert.strictEqual(
			inDb.length,
			1,
			"В PostgreSQL ровно 1 запись на этот интервал кресла",
		);
		console.log(
			"[ВЕКТОР 11.2 ОТБИТ]: Встречная гонка администраторов в CRM отбита: 1 x 201, 4 x 409, 0 задвоений.",
		);
	});

	// =========================================================================
	// ВЕКТОР 11.3: ОБХОД ЧЕРНОГО СПИСКА: НОВЫЙ ТЕЛЕФОН + ОПЕЧАТКА В ФИО
	// =========================================================================
	test("ВЕКТОР 11.3 [BLACKLIST EVASION]: Новый номер телефона + опечатка в ФИО блокируется кодом 403", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// В черном списке: "Хулиганов Хам Хамович"
		// Атакующий покупает новую SIM: "+7 (999) 777-11-22" и пишет имя с опечаткой: "Хулиганов Хам Хамовичь" (лишний 'ь')
		const response = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_ID}/book`,
			payload: {
				doctorId: DOCTOR_ID,
				startsAt: "2026-10-15T14:00:00.000Z",
				endsAt: "2026-10-15T14:30:00.000Z",
				patientName: "Хулиганов Хам Хамовичь",
				patientPhone: "+7 (999) 777-11-22",
			},
		});

		console.log(
			`[BLACKLIST EVASION TYPO]: Статус: ${response.statusCode}, Тело: ${response.payload}`,
		);

		assert.strictEqual(
			response.statusCode,
			403,
			"Попытка обхода черного списка через опечатку и новый телефон должна быть отбита с кодом 403",
		);

		const parsed = JSON.parse(response.payload);
		assert.strictEqual(parsed.error, "BookingBlocked");

		// Проверка БД: карточка для атакующего не должна быть создана
		const checkPatient = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ORG_ID),
					eq(patients.phone, "+7 (999) 777-11-22"),
				),
			);
		assert.strictEqual(
			checkPatient.length,
			0,
			"В базе данных не создана карточка для заблокированного лица",
		);

		console.log(
			"[ВЕКТОР 11.3 ОТБИТ]: Обход черного списка через опечатку отбит (403 BookingBlocked, 0 строк в patients).",
		);
	});

	// =========================================================================
	// ВЕКТОР 11.4: ОБХОД ЧЕРНОГО СПИСКА: СМЕНА РЕГИСТРА И ЛАТИНСКИЕ ГОМОГЛИФЫ
	// =========================================================================
	test("ВЕКТОР 11.4 [HOMOGLYPH EVASION]: Латинские гомоглифы ('X' вместо 'Х') блокируются кодом 403", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Атакующий шлет латинские 'X': "Xулиганов Xам Хамович" и новый телефон
		const response = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_ID}/book`,
			payload: {
				doctorId: DOCTOR_ID,
				startsAt: "2026-10-15T15:00:00.000Z",
				endsAt: "2026-10-15T15:30:00.000Z",
				patientName: "Xулиганов Xам Хамович",
				patientPhone: "+7 (999) 888-22-33",
			},
		});

		console.log(
			`[BLACKLIST HOMOGLYPH]: Статус: ${response.statusCode}, Тело: ${response.payload}`,
		);

		assert.strictEqual(
			response.statusCode,
			403,
			"Латинские гомоглифы в имени черносписочника должны блокироваться кодом 403",
		);

		const parsed = JSON.parse(response.payload);
		assert.strictEqual(parsed.error, "BookingBlocked");
		console.log(
			"[ВЕКТОР 11.4 ОТБИТ]: Атака латинскими гомоглифами нейтрализована на 100% (403 BookingBlocked).",
		);
	});

	// =========================================================================
	// ВЕКТОР 11.5: ОБХОД АРХИВА: НОВЫЙ ТЕЛЕФОН И ПЕРЕСТАНОВКА СЛОВ В ИМЕНИ
	// =========================================================================
	test("ВЕКТОР 11.5 [ARCHIVED EVASION]: Архивный пациент с новым номером телефона и перестановкой слов", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// В архиве: "Архивов Петр Петрович"
		// Атакующий отправляет: "Петр Петрович Архивов" с новым номером "+7 (999) 555-44-33"
		const response = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_ID}/book`,
			payload: {
				doctorId: DOCTOR_ID,
				startsAt: "2026-10-15T16:00:00.000Z",
				endsAt: "2026-10-15T16:30:00.000Z",
				patientName: "Петр Петрович Архивов",
				patientPhone: "+7 (999) 555-44-33",
			},
		});

		console.log(
			`[ARCHIVE EVASION]: Статус: ${response.statusCode}, Тело: ${response.payload}`,
		);

		assert.strictEqual(
			response.statusCode,
			403,
			"Запись архивного лица под новым телефоном должна быть отклонена с кодом 403",
		);

		const parsed = JSON.parse(response.payload);
		assert.strictEqual(parsed.error, "PatientArchived");

		const checkPatient = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ORG_ID),
					eq(patients.phone, "+7 (999) 555-44-33"),
				),
			);
		assert.strictEqual(
			checkPatient.length,
			0,
			"В базе данных не создана карточка-клон для архивного лица",
		);

		console.log(
			"[ВЕКТОР 11.5 ОТБИТ]: Попытка воскрешения архивной карты через новый телефон отбита (403 PatientArchived).",
		);
	});

	// =========================================================================
	// ВЕКТОР 11.6: СЛИЯНИЕ КАРТ С КОНФЛИКТАМИ ЗУБОВ И СОХРАНЕНИЕМ ИСТОРИИ
	// =========================================================================
	test("ВЕКТОР 11.6 [DENTAL HISTORY & STATE MERGE]: Слияние карт сохраняет канонический статус и всю историю", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Primary: зуб 46 (Implant), зуб 11 (Healthy)
		// Duplicate: зуб 46 (Extracted), зуб 11 (Caries), зуб 24 (Filled)
		// История: 1 запись Primary + 1 запись Duplicate по зубу 46

		const mergeResponse = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: PATIENT_PRIMARY_ID,
				duplicatePatientId: PATIENT_DUPLICATE_ID,
			},
		});

		console.log(
			`[DENTAL MERGE RESPONSE]: Статус: ${mergeResponse.statusCode}, Тело: ${mergeResponse.payload}`,
		);

		assert.strictEqual(
			mergeResponse.statusCode,
			200,
			"Слияние карт должно пройти успешно (200 OK)",
		);

		// Проверяем tooth_states для Primary:
		const primaryStates = await db
			.select()
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, ORG_ID),
					eq(toothStates.patientId, PATIENT_PRIMARY_ID),
				),
			);

		console.log(
			`[PRIMARY TOOTH STATES AFTER MERGE]: ${JSON.stringify(
				primaryStates.map((s) => ({
					tooth: s.toothNumber,
					state: s.state,
					notes: s.notes,
				})),
			)}`,
		);

		// Должно быть ровно 3 зуба: 11, 24, 46
		assert.strictEqual(
			primaryStates.length,
			3,
			"В объединенной карте должно быть ровно 3 зуба",
		);

		const tooth46 = primaryStates.find((s) => s.toothNumber === 46);
		const tooth11 = primaryStates.find((s) => s.toothNumber === 11);
		const tooth24 = primaryStates.find((s) => s.toothNumber === 24);

		assert.ok(tooth46, "Зуб 46 присутствует");
		assert.strictEqual(
			tooth46.state,
			"Implant",
			"Канонический статус Primary (Implant) победил устаревший статус Duplicate (Extracted)",
		);

		assert.ok(tooth11, "Зуб 11 присутствует");
		assert.strictEqual(
			tooth11.state,
			"Healthy",
			"Канонический статус Primary (Healthy) сохранен",
		);

		assert.ok(tooth24, "Уникальный зуб Duplicate (24) перенесен");
		assert.strictEqual(tooth24.state, "Filled");

		// Проверяем, что в tooth_states для Duplicate осталось 0 строк
		const dupStates = await db
			.select()
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, ORG_ID),
					eq(toothStates.patientId, PATIENT_DUPLICATE_ID),
				),
			);
		assert.strictEqual(
			dupStates.length,
			0,
			"У дубликата не осталось записей в tooth_states",
		);

		// Проверяем tooth_state_history:
		const historyRows = await db
			.select()
			.from(toothStateHistory)
			.where(
				and(
					eq(toothStateHistory.organizationId, ORG_ID),
					eq(toothStateHistory.patientId, PATIENT_PRIMARY_ID),
				),
			)
			.orderBy(desc(toothStateHistory.changedAt));

		console.log(
			`[PRIMARY TOOTH HISTORY AFTER MERGE]: ${JSON.stringify(
				historyRows.map((h) => ({
					tooth: h.toothNumber,
					prev: h.previousState,
					new: h.newState,
					reason: h.reason,
					changedAt: h.changedAt,
				})),
			)}`,
		);

		assert.strictEqual(
			historyRows.length,
			2,
			"Обе исторические записи по зубу 46 сохранены в анамнезе Primary",
		);

		console.log(
			"[ВЕКТОР 11.6 ОТБИТ]: Целостность одонтограммы доказана: 1 строка на зуб, канонический статус сохранен, история 100% сохранена.",
		);
	});
});
