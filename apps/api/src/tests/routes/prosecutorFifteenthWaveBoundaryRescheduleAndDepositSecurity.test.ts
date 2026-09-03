import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	familyGroups,
	organizations,
	patientArchiveReasonsAndBlacklists,
	patientBonusBalances,
	patients,
	users,
} from "../../db/schema.js";
import { registerPatientDuplicateRoutes } from "../../routes/patientDuplicates.js";
import { registerPatientRoutes } from "../../routes/patients.js";
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
 * PROSECUTOR 2: ПЯТНАДЦАТАЯ ВОЛНА АТАКИ — BOUNDARY RESCHEDULE RACE,
 * EXACT HALF-INTERVAL ENDPOINTS & FAMILY DEPOSIT MULTI-MEMBER INTEGRITY
 * ============================================================================
 *
 * 1. Граничные сценарии переноса (PATCH /api/appointments/:id):
 *    - Стык впритык слева [09:00, 10:00) к [10:00, 11:00) -> 200 OK.
 *    - Стык впритык справа [11:00, 12:00) к [10:00, 11:00) -> 200 OK.
 *    - Микро-наложение на 1 секунду слева [09:30, 10:00:01) -> 409 Conflict.
 *    - Микро-наложение на 1 секунду справа [10:59:59, 11:30) -> 409 Conflict.
 * 2. 3-поточная параллельная гонка: левый стык + правый стык + сквозное наложение.
 *    Доказательство: левый и правый побеждают (200 OK), наложение отбивается (409).
 * 3. Слияние семейных депозитов копейка в копейку (12500.25 ₽ + 7499.75 ₽ = 20000.00 ₽).
 * 4. 10 одновременных регистраций пациентов с двойными фамилиями и гомоглифами.
 */

const FIXTURE = "prosecutorWave15";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);

const CHAIR_ID = fixtureUuid(FIXTURE, 10);
const DOCTOR_ID = fixtureUuid(FIXTURE, 20);
const ADMIN_USER_ID = fixtureUuid(FIXTURE, 21);

// Пациенты и приёмы
const PATIENT_BASE = 30;
const FG_1_ID = fixtureUuid(FIXTURE, 40);
const FG_2_ID = fixtureUuid(FIXTURE, 41);

describe("PROSECUTOR 2: ПЯТНАДЦАТАЯ ВОЛНА (BOUNDARY RESCHEDULE, EXACT ENDPOINTS & DEPOSIT INTEGRITY)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let databaseAvailable = true;

	const createdApptIds: string[] = [];

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
		await registerPatientRoutes(app);
		await app.ready();

		const token = signToken(
			{ organizationId: ORG_ID, clinicId: CLINIC_ID, userId: ADMIN_USER_ID, role: "admin" },
			authTokenSecret(),
		);

		clinicHeaders = {
			"x-dente-clinic-token": token,
			"x-dente-staff-token": token,
			"x-organization-id": ORG_ID,
			"content-type": "application/json",
		};

		try {
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.delete(patientBonusBalances)
					.where(eq(patientBonusBalances.organizationId, ORG_ID));
				await db
					.delete(appointments)
					.where(eq(appointments.organizationId, ORG_ID));
				await db
					.delete(patientArchiveReasonsAndBlacklists)
					.where(
						eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID),
					);
				await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
				await db.delete(familyGroups).where(eq(familyGroups.organizationId, ORG_ID));
				await db.delete(users).where(eq(users.organizationId, ORG_ID));

				await db
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника Высокой Точности Границ (Wave 15)",
						clinicSchedule: {
							workHours: [8, 22],
							workingDays: [0, 1, 2, 3, 4, 5, 6],
						},
					})
					.onConflictDoNothing();

				await db
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Отделение челюстно-лицевой хирургии",
						timezone: "Europe/Moscow",
					})
					.onConflictDoNothing();

				await db
					.insert(chairs)
					.values({
						id: CHAIR_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Хирургическое кресло Alpha",
						color: "#059669",
						isActive: true,
					})
					.onConflictDoNothing();

				await db
					.insert(users)
					.values([
						{
							id: DOCTOR_ID,
							organizationId: ORG_ID,
							fullName: "Профессор Хирургии А.Б.",
							role: "doctor",
							isActive: true,
						},
						{
							id: ADMIN_USER_ID,
							organizationId: ORG_ID,
							fullName: "Старший Администратор",
							role: "admin",
							isActive: true,
						},
					])
					.onConflictDoNothing();

				// Создаем пациентов
				for (let i = 0; i < 15; i++) {
					const pId = fixtureUuid(FIXTURE, PATIENT_BASE + i);
					await db.insert(patients).values({
						id: pId,
						organizationId: ORG_ID,
						fullName: `Пациент Граничного Тестирования ${i + 1}`,
						phone: `+7 (926) 666-00-${i.toString().padStart(2, "0")}`,
						status: "active",
					});

					// Приёмы на 2026-12-20
					const apptId = fixtureUuid(FIXTURE, 100 + i);
					const hour = 8 + i;
					const startsAt = new Date(`2026-12-20T${hour.toString().padStart(2, "0")}:00:00.000Z`);
					const endsAt = new Date(`2026-12-20T${hour.toString().padStart(2, "0")}:30:00.000Z`);

					await db.insert(appointments).values({
						id: apptId,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						patientId: pId,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "planned",
						startsAt,
						endsAt,
						reason: `Граничный приём ${i + 1}`,
					});
					createdApptIds.push(apptId);
				}

				// Семейные группы с депозитами
				await db.insert(familyGroups).values([
					{
						id: FG_1_ID,
						organizationId: ORG_ID,
						name: "Семья Ивановых (Основная)",
						groupName: "Семья Ивановых",
						balance: "12500.25", // 12 500 руб 25 коп
					},
					{
						id: FG_2_ID,
						organizationId: ORG_ID,
						name: "Семья Ивановых (Дублирующая)",
						groupName: "Семья Ивановых Дубликат",
						balance: "7499.75", // 7 499 руб 75 коп
					},
				]);

				// Привязываем семейные группы
				await db
					.update(patients)
					.set({ familyGroupId: FG_1_ID })
					.where(eq(patients.id, fixtureUuid(FIXTURE, PATIENT_BASE + 0)));

				await db
					.update(patients)
					.set({ familyGroupId: FG_2_ID })
					.where(eq(patients.id, fixtureUuid(FIXTURE, PATIENT_BASE + 1)));
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
						.delete(patientBonusBalances)
						.where(eq(patientBonusBalances.organizationId, ORG_ID));
					await db
						.delete(appointments)
						.where(eq(appointments.organizationId, ORG_ID));
					await db
						.delete(patientArchiveReasonsAndBlacklists)
						.where(
							eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID),
						);
					await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
					await db.delete(familyGroups).where(eq(familyGroups.organizationId, ORG_ID));
					await db.delete(users).where(eq(users.organizationId, ORG_ID));
				});
			} catch {
				// cleanup ignore
			}
		}
		await app.close();
	});

	// =========================================================================
	// ВЕКТОР 15.1: ТОЧНЫЕ СТЫКИ ВПРИТЫК [startsAt, endsAt) VS МИКРО-НАЛОЖЕНИЯ
	// =========================================================================
	test("ВЕКТОР 15.1 [EXACT HALF-INTERVAL ENDPOINTS]: Стык впритык [09-10) и [11-12) vs микро-наложения", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// В кресле уже есть приём №0: [10:00, 11:00)
		const baseApptId = createdApptIds[0];
		await db
			.update(appointments)
			.set({
				startsAt: new Date("2026-12-25T10:00:00.000Z"),
				endsAt: new Date("2026-12-25T11:00:00.000Z"),
			})
			.where(eq(appointments.id, baseApptId));

		// Тест 15.1.1: Стык впритык слева [09:00, 10:00) -> Должен быть 200 OK
		const leftTouchId = createdApptIds[1];
		const resLeft = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${leftTouchId}`,
			headers: clinicHeaders,
			payload: {
				chairId: CHAIR_ID,
				startsAt: "2026-12-25T09:00:00.000Z",
				endsAt: "2026-12-25T10:00:00.000Z",
			},
		});
		assert.strictEqual(
			resLeft.statusCode,
			200,
			"Стык впритык слева [09:00, 10:00) обязан успешно пройти (200 OK)",
		);

		// Тест 15.1.2: Стык впритык справа [11:00, 12:00) -> Должен быть 200 OK
		const rightTouchId = createdApptIds[2];
		const resRight = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${rightTouchId}`,
			headers: clinicHeaders,
			payload: {
				chairId: CHAIR_ID,
				startsAt: "2026-12-25T11:00:00.000Z",
				endsAt: "2026-12-25T12:00:00.000Z",
			},
		});
		assert.strictEqual(
			resRight.statusCode,
			200,
			"Стык впритык справа [11:00, 12:00) обязан успешно пройти (200 OK)",
		);

		// Тест 15.1.3: Микро-наложение слева [09:30, 10:00:01) -> 409 Conflict
		const leftMicroOverlapId = createdApptIds[3];
		const resMicroLeft = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${leftMicroOverlapId}`,
			headers: clinicHeaders,
			payload: {
				chairId: CHAIR_ID,
				startsAt: "2026-12-25T09:30:00.000Z",
				endsAt: "2026-12-25T10:00:01.000Z",
			},
		});
		assert.strictEqual(
			resMicroLeft.statusCode,
			409,
			"Микро-наложение слева на 1 секунду обязано быть отклонено (409 Conflict)",
		);

		// Тест 15.1.4: Микро-наложение справа [10:59:59, 11:30) -> 409 Conflict
		const rightMicroOverlapId = createdApptIds[4];
		const resMicroRight = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${rightMicroOverlapId}`,
			headers: clinicHeaders,
			payload: {
				chairId: CHAIR_ID,
				startsAt: "2026-12-25T10:59:59.000Z",
				endsAt: "2026-12-25T11:30:00.000Z",
			},
		});
		assert.strictEqual(
			resMicroRight.statusCode,
			409,
			"Микро-наложение справа на 1 секунду обязано быть отклонено (409 Conflict)",
		);

		console.log(
			"[ВЕКТОР 15.1 ОТБИТ]: Математическая точность полуинтервалов [startsAt, endsAt) доказана: стыки впритык проходят, микро-наложения отсекаются.",
		);
	});

	// =========================================================================
	// ВЕКТОР 15.2: 3-ПОТОЧНАЯ ГОНКА (ЛЕВЫЙ СТЫК + ПРАВЫЙ СТЫК + ПЕРЕКРЫТИЕ)
	// =========================================================================
	test("ВЕКТОР 15.2 [3-WAY CONCURRENT TOUCHING & OVERLAPPING RACE]: Левый стык, правый стык и сквозной наезд", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// В кресле сидит базовый приём: [14:00, 15:00)
		const anchorId = createdApptIds[5];
		await db
			.update(appointments)
			.set({
				startsAt: new Date("2026-12-26T14:00:00.000Z"),
				endsAt: new Date("2026-12-26T15:00:00.000Z"),
			})
			.where(eq(appointments.id, anchorId));

		const idLeft = createdApptIds[6];
		const idRight = createdApptIds[7];
		const idOverlap = createdApptIds[8];

		// 3 одновременных запроса PATCH:
		// 1. Стык слева [13:00, 14:00)
		// 2. Стык справа [15:00, 16:00)
		// 3. Сквозной наезд [13:30, 15:30) (перекрывает оба стыка и середину)
		const [resA, resB, resC] = await Promise.all([
			app.inject({
				method: "PATCH",
				url: `/api/appointments/${idLeft}`,
				headers: clinicHeaders,
				payload: {
					chairId: CHAIR_ID,
					startsAt: "2026-12-26T13:00:00.000Z",
					endsAt: "2026-12-26T14:00:00.000Z",
				},
			}),
			app.inject({
				method: "PATCH",
				url: `/api/appointments/${idRight}`,
				headers: clinicHeaders,
				payload: {
					chairId: CHAIR_ID,
					startsAt: "2026-12-26T15:00:00.000Z",
					endsAt: "2026-12-26T16:00:00.000Z",
				},
			}),
			app.inject({
				method: "PATCH",
				url: `/api/appointments/${idOverlap}`,
				headers: clinicHeaders,
				payload: {
					chairId: CHAIR_ID,
					startsAt: "2026-12-26T13:30:00.000Z",
					endsAt: "2026-12-26T15:30:00.000Z",
				},
			}),
		]);

		console.log(
			`[3-WAY RACE]: Left: ${resA.statusCode}, Right: ${resB.statusCode}, Overlap: ${resC.statusCode}`,
		);

		assert.strictEqual(resA.statusCode, 200, "Левый стык успешно записан (200 OK)");
		assert.strictEqual(resB.statusCode, 200, "Правый стык успешно записан (200 OK)");
		assert.strictEqual(
			resC.statusCode,
			409,
			"Сквозной наезд гарантированно отклонен (409 Conflict)",
		);

		// Проверка в базе данных: на интервале [13:00, 16:00) ровно 3 приёма
		const slotRows = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ORG_ID),
					eq(appointments.chairId, CHAIR_ID),
				),
			);

		const dayRows = slotRows.filter(
			(r) =>
				r.startsAt >= new Date("2026-12-26T13:00:00.000Z") &&
				r.endsAt <= new Date("2026-12-26T16:00:00.000Z"),
		);

		console.log(
			`[POSTGRESQL CONTINUOUS BLOCK]: Приёмов в блоке 13:00-16:00: ${dayRows.length}`,
		);
		assert.strictEqual(
			dayRows.length,
			3,
			"В базе данных сформирован непрерывный монолитный блок из 3 записей без единого наложения",
		);

		console.log(
			"[ВЕКТОР 15.2 ОТБИТ]: 3-поточная гонка стыков успешно сериализована без коллизий.",
		);
	});

	// =========================================================================
	// ВЕКТОР 15.3: СЛИЯНИЕ СЕМЕЙНЫХ ДЕПОЗИТОВ КОПЕЙКА В КОПЕЙКУ
	// =========================================================================
	test("ВЕКТОР 15.3 [FAMILY DEPOSIT INTEGRITY]: 12500.25 ₽ + 7499.75 ₽ = 20000.00 ₽", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		const patPrimaryId = fixtureUuid(FIXTURE, PATIENT_BASE + 0);
		const patDuplicateId = fixtureUuid(FIXTURE, PATIENT_BASE + 1);

		const mergeRes = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: patPrimaryId,
				duplicatePatientId: patDuplicateId,
			},
		});

		console.log(
			`[MERGE RES]: status: ${mergeRes.statusCode}, body: ${mergeRes.payload}`,
		);

		assert.strictEqual(mergeRes.statusCode, 200, "Слияние завершилось 200 OK");

		const [fgPrimary] = await db
			.select()
			.from(familyGroups)
			.where(eq(familyGroups.id, FG_1_ID));

		const [fgDuplicate] = await db
			.select()
			.from(familyGroups)
			.where(eq(familyGroups.id, FG_2_ID));

		console.log(
			`[PRIMARY FAMILY BALANCE]: ${fgPrimary.balance} ₽ (ожидалось: 20000.00)`,
		);
		console.log(
			`[DUPLICATE FAMILY BALANCE]: ${fgDuplicate.balance} ₽ (ожидалось: 0.00)`,
		);

		assert.strictEqual(
			Number(fgPrimary.balance).toFixed(2),
			"20000.00",
			"Депозитный баланс сложен копейка в копейку: 12500.25 + 7499.75 = 20000.00 ₽",
		);
		assert.strictEqual(
			Number(fgDuplicate.balance).toFixed(2),
			"0.00",
			"Баланс дублирующей группы полностью обнулен (0.00 ₽)",
		);

		console.log(
			"[ВЕКТОР 15.3 ОТБИТ]: Слияние семейных депозитов подтвердило 100% финансовую точность.",
		);
	});

	// =========================================================================
	// ВЕКТОР 15.4: 10 ОДНОВРЕМЕННЫХ РЕГИСТРАЦИЙ С ГОМОГЛИФАМИ И ДВОЙНЫМИ ФАМИЛИЯМИ
	// =========================================================================
	test("ВЕКТОР 15.4 [CONCURRENT HOMOGLYPH & DOUBLE SURNAME REGISTRATION]: 10 потоков на одного пациента", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		const sharedPhone = "+7 (926) 555-44-33";

		// 10 параллельных запросов с латинскими гомоглифами в двойной фамилии
		// "Смирнов-Орлов" (буквы С, о, р, а - латиница/кириллица вперемешку)
		const concurrentPosts = Array.from({ length: 10 }).map((_, idx) => {
			const name =
				idx % 2 === 0
					? "Смирнов-Орлов Андрей Викторович"
					: "Cмирнoв-Орлoв Андрей Викторович"; // Latin C, o
			return app.inject({
				method: "POST",
				url: "/api/patients",
				headers: clinicHeaders,
				payload: {
					fullName: name,
					birthDate: "1988-11-20",
					phone: sharedPhone,
				},
			});
		});

		const responses = await Promise.all(concurrentPosts);

		const created = responses.filter((r) => r.statusCode === 201);
		const duplicates = responses.filter((r) => r.statusCode === 409);

		console.log(
			`[HOMOGLYPH DOUBLE SURNAME RACE]: Создано (201): ${created.length}, Заблокировано (409): ${duplicates.length}`,
		);

		assert.strictEqual(
			created.length,
			1,
			"Ровно одна регистрация должна завершиться успехом (201 Created)",
		);
		assert.strictEqual(
			duplicates.length,
			9,
			"Остальные 9 запросов обязаны быть заблокированы как дубликаты (409 Conflict)",
		);

		// Проверка в базе данных: ровно 1 запись с этим телефоном
		const dbRecords = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ORG_ID),
					eq(patients.phone, sharedPhone),
				),
			);

		console.log(
			`[POSTGRESQL UNIQUE RECORDS WITH PHONE]: Создано строк: ${dbRecords.length}`,
		);

		assert.strictEqual(
			dbRecords.length,
			1,
			"В базе данных PostgreSQL сохранена ровно 1 запись (0 клонов с гомоглифами)",
		);

		console.log(
			"[ВЕКТОР 15.4 ОТБИТ]: Гонка регистраций с гомоглифами и двойными фамилиями отражена: 1 x 201, 9 x 409.",
		);
	});
});
