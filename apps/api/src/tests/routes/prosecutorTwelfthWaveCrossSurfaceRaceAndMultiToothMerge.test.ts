import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, desc, eq } from "drizzle-orm";
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
 * PROSECUTOR 2: ДВЕНАДЦАТАЯ ВОЛНА АТАКИ — CROSS-SURFACE CONCURRENCY,
 * APPOINTMENT REASSIGNMENT TAMPERING & MULTI-TOOTH BATCH MERGE
 * ============================================================================
 *
 * 1. Cross-Surface Race: 5 public booking + 5 CRM appointments одновременно
 *    штурмуют один и тот же слот в кресле.
 * 2. Partial Overlap Race: 3 одновременных приёма с перекрывающимися полуинтервалами.
 * 3. Попытка перевесить существующий приём (PATCH) на заблокированного/архивного пациента -> 403.
 * 4. Блокировка создания приёма в CRM для пациента с гомоглифом из черного списка -> 403.
 * 5. Многозубный пакетный конфликт в tooth_states (3+ зуба одновременно) при слиянии карт -> 200 OK, 1 строка на зуб, 100% истории сохранено.
 */

const FIXTURE = "prosecutorWave12";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);

const CHAIR_ID = fixtureUuid(FIXTURE, 10);
const DOCTOR_ID = fixtureUuid(FIXTURE, 20);

const PATIENT_PRIMARY_ID = fixtureUuid(FIXTURE, 30);
const PATIENT_DUPLICATE_ID = fixtureUuid(FIXTURE, 31);
const PATIENT_BLACKLIST_ID = fixtureUuid(FIXTURE, 32);
const PATIENT_ARCHIVED_ID = fixtureUuid(FIXTURE, 33);
const PATIENT_EVASION_ID = fixtureUuid(FIXTURE, 34);

const BLACKLISTED_NAME = "Дебоширов Демьян Данилович";
const ARCHIVED_NAME = "Архивов Артем Артемович";

describe("PROSECUTOR 2: ДВЕНАДЦАТАЯ ВОЛНА (CROSS-SURFACE RACE & MULTI-TOOTH MERGE)", () => {
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
						name: "Клиника Одонтологии и Высшей Безопасности (Wave 12)",
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
						name: "Отделение хирургии и ортопедии",
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
						color: "#3b82f6",
						isActive: true,
					})
					.onConflictDoNothing();

				await db
					.insert(users)
					.values({
						id: DOCTOR_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Главный Г.Г.",
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
						phone: "+7 (926) 222-00-01",
						birthDate: "1988-03-10",
						status: "active",
					},
					{
						id: PATIENT_DUPLICATE_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Дублирующий Д.Д.",
						phone: "+7 (926) 222-00-02",
						birthDate: "1988-03-10",
						status: "active",
					},
					{
						id: PATIENT_BLACKLIST_ID,
						organizationId: ORG_ID,
						fullName: BLACKLISTED_NAME,
						phone: "+7 (926) 333-00-01",
						status: "active",
					},
					{
						id: PATIENT_ARCHIVED_ID,
						organizationId: ORG_ID,
						fullName: ARCHIVED_NAME,
						phone: "+7 (926) 444-00-02",
						status: "archived",
					},
					{
						id: PATIENT_EVASION_ID,
						organizationId: ORG_ID,
						fullName: "Дeбоширов Демьян Данилович", // Латинская 'e'
						phone: "+7 (926) 555-00-03",
						status: "active",
					},
				]);

				// Внесение в черный список
				await db.insert(patientArchiveReasonsAndBlacklists).values({
					organizationId: ORG_ID,
					patientId: PATIENT_BLACKLIST_ID,
					patientName: BLACKLISTED_NAME,
					recordType: "blacklist",
					primaryReasonCategory: "conflict_behavior",
					reasonTitle: "Угрозы персоналу и оскорбления",
					isBookingBlocked: true,
					status: "active",
				});

				// Начальное состояние зубов для многозубного слияния (Вектор 12.5):
				// Primary: 18 (Healthy), 38 (Crown), 48 (Impacted), 16 (Implant)
				await db.insert(toothStates).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 18,
						state: "Healthy",
						notes: "18 здоров",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 38,
						state: "Crown",
						notes: "38 коронка",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 48,
						state: "Impacted",
						notes: "48 ретинирован",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 16,
						state: "Implant",
						notes: "16 имплантат",
					},
				]);

				// Duplicate: 18 (Caries), 38 (Extracted), 48 (Healthy), 26 (Filled)
				await db.insert(toothStates).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 18,
						state: "Caries",
						notes: "18 кариес",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 38,
						state: "Extracted",
						notes: "38 удален",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 48,
						state: "Healthy",
						notes: "48 здоров",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 26,
						state: "Filled",
						notes: "26 пломба",
					},
				]);

				// История зубов:
				await db.insert(toothStateHistory).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 38,
						previousState: "Caries",
						newState: "Crown",
						reason: "Ортопедия Primary",
						changedAt: new Date("2025-01-10T10:00:00.000Z"),
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 38,
						previousState: "Healthy",
						newState: "Extracted",
						reason: "Хирургия Duplicate",
						changedAt: new Date("2024-03-12T11:00:00.000Z"),
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 48,
						previousState: "Healthy",
						newState: "Impacted",
						reason: "КТ ретенция Primary",
						changedAt: new Date("2025-05-01T12:00:00.000Z"),
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
	// ВЕКТОР 12.1: CROSS-SURFACE RACE (PUBLIC BOOKING VS CRM ADMIN — 10 ЗАПРОСОВ)
	// =========================================================================
	test("ВЕКТОР 12.1 [CROSS-SURFACE RACE]: 5 публичных пациентов + 5 CRM администраторов штурмуют один слот", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		const startsAt = "2026-11-10T10:00:00.000Z";
		const endsAt = "2026-11-10T10:30:00.000Z";

		// 5 публичных запросов
		const publicRequests = Array.from({ length: 5 }, (_, i) =>
			app.inject({
				method: "POST",
				url: `/api/public/booking/${ORG_ID}/book`,
				payload: {
					doctorId: DOCTOR_ID,
					startsAt,
					endsAt,
					patientName: `Публичный Заявитель ${i + 1}`,
					patientPhone: `+7 (926) 800-01-0${i + 1}`,
				},
			}),
		);

		// 5 запросов от CRM администраторов
		const crmRequests = Array.from({ length: 5 }, (_, i) =>
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
					reason: `CRM Администратор ${i + 1}`,
				},
			}),
		);

		// Запускаем все 10 запросов одновременно
		const allResponses = await Promise.all([
			...publicRequests,
			...crmRequests,
		]);

		const winners = allResponses.filter(
			(r) => r.statusCode === 200 || r.statusCode === 201,
		);
		const conflicts = allResponses.filter((r) => r.statusCode === 409);

		console.log(
			`[CROSS-SURFACE RACE]: Победителей: ${winners.length}, Отклонено (409 Conflict): ${conflicts.length}`,
		);

		assert.strictEqual(
			winners.length,
			1,
			"Ровно один запрос во всей системе должен занять слот (HTTP 200 или 201)",
		);
		assert.strictEqual(
			conflicts.length,
			9,
			"Остальные 9 запросов обязаны быть отклонены кодом 409 Conflict",
		);

		// Проверяем PostgreSQL:
		const slotRows = await db
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
			slotRows.length,
			1,
			"В базе данных PostgreSQL создана ровно 1 запись (0 овербукинга между вебом и CRM)",
		);

		console.log(
			"[ВЕКТОР 12.1 ОТБИТ]: Кросс-поверхностная гонка отражена: 1 победитель, 9 конфликтов, ровно 1 строка в PostgreSQL.",
		);
	});

	// =========================================================================
	// ВЕКТОР 12.2: PARTIAL OVERLAP RACE (3 ВЛОЖЕННЫХ / ПЕРЕСЕКАЮЩИХСЯ ИНТЕРВАЛА)
	// =========================================================================
	test("ВЕКТОР 12.2 [PARTIAL OVERLAP RACE]: 3 запроса с пересекающимися полуинтервалами [startsAt, endsAt)", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Запрос 1: 11:00 - 12:00 (60 мин)
		// Запрос 2: 11:15 - 11:45 (30 мин, внутри)
		// Запрос 3: 11:30 - 12:30 (60 мин, пересекает границу)
		const req1 = app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_PRIMARY_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				status: "planned",
				startsAt: "2026-11-10T11:00:00.000Z",
				endsAt: "2026-11-10T12:00:00.000Z",
				reason: "Интервал 11:00 - 12:00",
			},
		});

		const req2 = app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_PRIMARY_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				status: "planned",
				startsAt: "2026-11-10T11:15:00.000Z",
				endsAt: "2026-11-10T11:45:00.000Z",
				reason: "Вложенный 11:15 - 11:45",
			},
		});

		const req3 = app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_PRIMARY_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				status: "planned",
				startsAt: "2026-11-10T11:30:00.000Z",
				endsAt: "2026-11-10T12:30:00.000Z",
				reason: "Пересекающий 11:30 - 12:30",
			},
		});

		const [res1, res2, res3] = await Promise.all([req1, req2, req3]);
		const all = [res1, res2, res3];

		const winners = all.filter((r) => r.statusCode === 201);
		const conflicts = all.filter((r) => r.statusCode === 409);

		console.log(
			`[PARTIAL OVERLAP RACE]: Победителей: ${winners.length}, Конфликтов: ${conflicts.length}`,
		);

		assert.strictEqual(
			winners.length,
			1,
			"Ровно один из трех пересекающихся приемов должен быть записан",
		);
		assert.strictEqual(
			conflicts.length,
			2,
			"Остальные 2 приема отклоняются блокировкой GiST (HTTP 409 Conflict)",
		);

		console.log(
			"[ВЕКТОР 12.2 ОТБИТ]: Защита частичных пересечений [startsAt, endsAt) в кресле доказана.",
		);
	});

	// =========================================================================
	// ВЕКТОР 12.3: APPOINTMENT REASSIGNMENT TAMPERING (PATCH НА ЧЕРНЫЙ СПИСОК / АРХИВ)
	// =========================================================================
	test("ВЕКТОР 12.3 [APPOINTMENT REASSIGN TAMPERING]: Перевод существующего приёма на заблокированного/архивного пациента", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Шаг 1: Создаем легитимный приём для активного пациента
		const createRes = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_PRIMARY_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				status: "planned",
				startsAt: "2026-11-10T15:00:00.000Z",
				endsAt: "2026-11-10T16:00:00.000Z",
				reason: "Легитимный приём",
			},
		});

		assert.strictEqual(
			createRes.statusCode,
			201,
			"Легитимный приём создан",
		);
		const [createdAppt] = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ORG_ID),
					eq(appointments.patientId, PATIENT_PRIMARY_ID),
				),
			)
			.orderBy(desc(appointments.startsAt))
			.limit(1);
		assert.ok(createdAppt, "Приём найден в базе данных");
		const appointmentId = createdAppt.id;

		// Шаг 2: Попытка PATCH изменить patientId на черносписочника
		const patchBlacklistRes = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${appointmentId}`,
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_BLACKLIST_ID,
			},
		});

		console.log(
			`[PATCH BLACKLIST REASSIGN]: Статус: ${patchBlacklistRes.statusCode}, Тело: ${patchBlacklistRes.payload}`,
		);

		assert.strictEqual(
			patchBlacklistRes.statusCode,
			403,
			"Попытка перевесить приём на пациента из черного списка должна быть отклонена кодом 403",
		);

		// Шаг 3: Попытка PATCH изменить patientId на архивного пациента
		const patchArchivedRes = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${appointmentId}`,
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_ARCHIVED_ID,
			},
		});

		console.log(
			`[PATCH ARCHIVED REASSIGN]: Статус: ${patchArchivedRes.statusCode}, Тело: ${patchArchivedRes.payload}`,
		);

		assert.strictEqual(
			patchArchivedRes.statusCode,
			403,
			"Попытка перевесить приём на архивного пациента должна быть отклонена кодом 403",
		);

		// Проверка в БД: приём по-прежнему привязан к легитимному пациенту
		const [inDb] = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.id, appointmentId),
					eq(appointments.organizationId, ORG_ID),
				),
			);

		assert.strictEqual(
			inDb.patientId,
			PATIENT_PRIMARY_ID,
			"Приём в БД сохранил исходного легитимного пациента, подмена отвергнута",
		);

		console.log(
			"[ВЕКТОР 12.3 ОТБИТ]: Попытки внедрения черносписочника/архивника через PATCH приёма отбиты на 100% (403 Forbidden).",
		);
	});

	// =========================================================================
	// ВЕКТОР 12.4: CRM BLACKLIST EVASION: ГОМОГЛИФЫ ПРИ СОЗДАНИИ В CRM
	// =========================================================================
	test("ВЕКТОР 12.4 [CRM BLACKLIST HOMOGLYPH]: Создание приёма в CRM на пациента с латинским гомоглифом из черного списка", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// В черном списке: "Дебоширов Демьян Данилович"
		// В базе пациент PATIENT_EVASION_ID с именем: "Дeбоширов Демьян Данилович" (латинская 'e')
		const response = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: clinicHeaders,
			payload: {
				patientId: PATIENT_EVASION_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				status: "planned",
				startsAt: "2026-11-10T17:00:00.000Z",
				endsAt: "2026-11-10T18:00:00.000Z",
				reason: "Попытка записи гомоглифа в CRM",
			},
		});

		console.log(
			`[CRM BLACKLIST HOMOGLYPH]: Статус: ${response.statusCode}, Тело: ${response.payload}`,
		);

		assert.strictEqual(
			response.statusCode,
			403,
			"Попытка записи в CRM пациента с гомоглифом из черного списка должна быть отклонена кодом 403",
		);

		console.log(
			"[ВЕКТОР 12.4 ОТБИТ]: Функция checkPatientBookingBlockDetails перехватила гомоглиф в CRM расписании (403).",
		);
	});

	// =========================================================================
	// ВЕКТОР 12.5: MULTI-TOOTH CONFLICT MERGE (3+ ЗУБА ОДНОВРЕМЕННО)
	// =========================================================================
	test("ВЕКТОР 12.5 [MULTI-TOOTH CONFLICT MERGE]: Пакетное разрешение конфликтов по 3 зубам одновременно", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Primary: 18 (Healthy), 38 (Crown), 48 (Impacted), 16 (Implant)
		// Duplicate: 18 (Caries), 38 (Extracted), 48 (Healthy), 26 (Filled)
		// Конфликты по зубам: 18, 38, 48 (3 зуба конфликтуют!). Уникальные: 16 (Primary), 26 (Duplicate).

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
			`[MULTI-TOOTH MERGE RESPONSE]: Статус: ${mergeResponse.statusCode}, Тело: ${mergeResponse.payload}`,
		);

		assert.strictEqual(
			mergeResponse.statusCode,
			200,
			"Пакетное слияние с 3 конфликтами зубов должно пройти успешно (200 OK)",
		);

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
			`[PRIMARY MULTI-TOOTH STATES]: ${JSON.stringify(
				primaryStates.map((s) => ({
					tooth: s.toothNumber,
					state: s.state,
				})),
			)}`,
		);

		// Всего зубов должно быть ровно 5: 16, 18, 26, 38, 48
		assert.strictEqual(
			primaryStates.length,
			5,
			"В объединенной карте ровно 5 зубов",
		);

		const t18 = primaryStates.find((s) => s.toothNumber === 18);
		const t38 = primaryStates.find((s) => s.toothNumber === 38);
		const t48 = primaryStates.find((s) => s.toothNumber === 48);
		const t16 = primaryStates.find((s) => s.toothNumber === 16);
		const t26 = primaryStates.find((s) => s.toothNumber === 26);

		assert.strictEqual(
			t18?.state,
			"Healthy",
			"Зуб 18: статус Primary (Healthy) победил Caries",
		);
		assert.strictEqual(
			t38?.state,
			"Crown",
			"Зуб 38: статус Primary (Crown) победил Extracted",
		);
		assert.strictEqual(
			t48?.state,
			"Impacted",
			"Зуб 48: статус Primary (Impacted) победил Healthy",
		);
		assert.strictEqual(
			t16?.state,
			"Implant",
			"Зуб 16: исходный Primary сохранен",
		);
		assert.strictEqual(
			t26?.state,
			"Filled",
			"Зуб 26: уникальный перенесен из Duplicate",
		);

		// У Duplicate в tooth_states должно остаться ровно 0 строк
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

		// История в tooth_state_history: все 3 записи должны быть у Primary
		const history = await db
			.select()
			.from(toothStateHistory)
			.where(
				and(
					eq(toothStateHistory.organizationId, ORG_ID),
					eq(toothStateHistory.patientId, PATIENT_PRIMARY_ID),
				),
			);

		assert.strictEqual(
			history.length,
			3,
			"Все исторические записи перенесены в анамнез Primary",
		);

		console.log(
			"[ВЕКТОР 12.5 ОТБИТ]: Пакетное слияние 3+ зубов выполнено без единой ошибки и без задвоения записей.",
		);
	});
});
