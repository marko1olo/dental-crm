import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { patientDuplicateDecisions } from "../../db/patientsSchema.js";
import {
	appointments,
	clinics,
	organizations,
	patients,
	payments,
	users,
	visits,
} from "../../db/schema.js";
import { registerPatientDuplicateRoutes } from "../../routes/patientDuplicates.js";
import { registerPatientRoutes } from "../../routes/patients.js";
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
 * PROSECUTOR 2: THE CLONE SABOTEUR — АТАКА НА БАЗУ ДАННЫХ И ДЕДУПЛИКАЦИЮ
 * ============================================================================
 *
 * Цель атаки и верификации:
 * 1. Проверить шлюз регистрации пациентов (POST /api/patients) на устойчивость
 *    к созданию клонов при наличии опечаток в ФИО (например, «Екалерина»
 *    вместо «Екатерина») и перестановке слов ФИО при 100% идентичных
 *    контактах (телефон) и датах рождения.
 * 2. Доказать, что система выбрасывает строгий HTTP 409 Conflict с деталями дубля,
 *    вероятностью совпадения и ссылкой на существующую карту.
 * 3. Проверить работу ретроспективного детектора дублей
 *    (GET /api/patients/duplicates).
 * 4. Проверить операцию слияния карт (POST /api/patients/duplicates/merge):
 *    - Вторичная карта НЕ должна удаляться из PostgreSQL физически;
 *    - Флаг merged_into_patient_id должен указывать на основную карту;
 *    - Статус вторичной карты должен стать 'archived';
 *    - Визиты (visits), приёмы (appointments) и платежи (payments)
 *      должны быть без потерь перенесены на первичную карту;
 *    - У вторичной карты не должно остаться висячих визитов и оплат.
 * 5. Проверить защиту от повторного слияния и самослияния.
 */

const FIXTURE = "prosecutorCloneSaboteur";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);
const VISIT_ID = fixtureUuid(FIXTURE, 4);
const PAYMENT_ID = fixtureUuid(FIXTURE, 5);
const APPOINTMENT_ID = fixtureUuid(FIXTURE, 6);
const SEEDED_DUPLICATE_ID = fixtureUuid(FIXTURE, 7);

describe("PROSECUTOR 2: АТАКА НА РЕГИСТРАЦИЮ И ДЕДУПЛИКАЦИЮ ПАЦИЕНТОВ", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let databaseAvailable = true;

	let originalPatientId: string;

	const ORIGINAL_NAME = "Иванова Екатерина Сергеевна";
	const TYPO_NAME = "Иванова Екалерина Сергеевна"; // Опечатка: 'л' вместо 'т'
	const TRANSPOSED_NAME = "Екатерина Сергеевна Иванова"; // Перестановка слов
	const COMMON_PHONE = "+7 916 123-45-67";
	const COMMON_BIRTH_DATE = "1990-05-15";

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await registerPatientRoutes(app);
		await registerPatientDuplicateRoutes(app);

		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_ID, clinicId: CLINIC_ID },
				authTokenSecret(),
			),
			"x-organization-id": ORG_ID,
			"content-type": "application/json",
		};

		try {
			// Предварительная зачистка
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.update(patients)
					.set({ mergedIntoPatientId: null })
					.where(eq(patients.organizationId, ORG_ID));
			});
			await purgeFixtureOrganizations([ORG_ID]);

			// Базовый посев организации, клиники и доктора
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника судебной экспертизы и дедупликации (Prosecutor 2)",
				});
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главный клинический филиал",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Преображенский Ф.Ф.",
					role: "doctor",
				});
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
						.update(patients)
						.set({ mergedIntoPatientId: null })
						.where(eq(patients.organizationId, ORG_ID));
				});
				await purgeFixtureOrganizations([ORG_ID]);
			} catch {
				// игнорируем ошибку при финальной зачистке
			}
		}
		await app.close();
	});

	test("ШАГ 1: Легитимное создание первичного пациента (Иванова Екатерина Сергеевна)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: ORIGINAL_NAME,
				birthDate: COMMON_BIRTH_DATE,
				phone: COMMON_PHONE,
				notes: "Первичный пациент: аллергия на пенициллин",
			},
		});

		assert.equal(
			response.statusCode,
			201,
			`Ожидался статус 201 Created, получен ${response.statusCode}: ${response.body}`,
		);
		const body = JSON.parse(response.body) as { id: string; fullName: string };
		assert.ok(body.id, "Сервер должен вернуть присвоенный UUID пациента");
		assert.equal(body.fullName, ORIGINAL_NAME);
		originalPatientId = body.id;

		// Проверка физической записи в PostgreSQL
		const [patientInDb] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(patients).where(eq(patients.id, originalPatientId)),
		);
		assert.ok(patientInDb, "Пациент обязан существовать в базе данных");
		assert.equal(patientInDb.fullName, ORIGINAL_NAME);
	});

	test("ШАГ 2 [АТАКА]: Регистрация дубля с опечаткой в имени ('Екалерина' вместо 'Екатерина') при том же телефоне и дате рождения", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: TYPO_NAME,
				birthDate: COMMON_BIRTH_DATE,
				phone: COMMON_PHONE,
				notes: "Пациент зарегистрирован администратором с опечаткой",
			},
		});

		// СУДЕБНАЯ ПРОВЕРКА ЗАЩИТЫ:
		// Сервер ОБЯЗАН выбросить HTTP 409 Conflict, так как телефон и дата рождения совпадают,
		// а опечатка 'Екалерина' имеет сходство >95% по Левенштейну/Дамерау.
		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Сервер создал дубль с опечаткой (${response.statusCode}) вместо блокировки 409 Conflict: ${response.body}`,
		);

		const body = JSON.parse(response.body) as {
			error?: string;
			message?: string;
			existingPatientId?: string;
			matchConfidencePercent?: number;
			reasons?: string[];
		};

		assert.equal(body.error, "PatientDuplicateError");
		assert.equal(body.existingPatientId, originalPatientId);
		assert.ok(
			(body.matchConfidencePercent ?? 0) >= 90,
			`Ожидалась уверенность совпадения >= 90%, получено: ${body.matchConfidencePercent}`,
		);
		assert.ok(
			body.reasons && body.reasons.length > 0,
			"Ответ обязан перечислять клинические причины совпадения",
		);

		console.log(
			`[АТАКА 1 ОТБИТА]: Сервер заблокировал опечатку '${TYPO_NAME}' кодом 409.\n` +
				`Уверенность: ${body.matchConfidencePercent}%. Причины: ${body.reasons?.join("; ")}`,
		);
	});

	test("ШАГ 3 [АТАКА]: Регистрация дубля с переставленными словами ФИО ('Екатерина Сергеевна Иванова')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: TRANSPOSED_NAME,
				birthDate: COMMON_BIRTH_DATE,
				phone: COMMON_PHONE,
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Сервер создал дубль с перестановкой слов ФИО (${response.statusCode}) вместо 409: ${response.body}`,
		);

		const body = JSON.parse(response.body) as {
			error?: string;
			existingPatientId?: string;
			matchConfidencePercent?: number;
		};
		assert.equal(body.error, "PatientDuplicateError");
		assert.equal(body.existingPatientId, originalPatientId);

		console.log(
			`[АТАКА 2 ОТБИТА]: Сервер заблокировал перестановку слов ФИО кодом 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ШАГ 4 [КОНТРОЛЬ]: Полное совпадение имени и телефона блокируется сервером (HTTP 409)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: ORIGINAL_NAME,
				phone: COMMON_PHONE,
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`Точный дубль обязан возвращать HTTP 409, получен ${response.statusCode}`,
		);
		const body = JSON.parse(response.body) as { error?: string };
		assert.equal(body.error, "PatientDuplicateError");
	});

	test("ШАГ 5: Засев исторического дубля в БД и ретроспективный поиск (GET /api/patients/duplicates)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Засеваем в БД дубль напрямую (имитация унаследованных данных до внедрения шлюза)
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(patients).values({
				id: SEEDED_DUPLICATE_ID,
				organizationId: ORG_ID,
				fullName: TYPO_NAME,
				birthDate: COMMON_BIRTH_DATE,
				phone: COMMON_PHONE,
				notes: "Исторический дубль, созданный до исправления шлюза",
			});
		});

		const response = await app.inject({
			method: "GET",
			url: "/api/patients/duplicates",
			headers: clinicHeaders,
		});

		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as {
			candidates: Array<{
				leftPatientId: string;
				rightPatientId: string;
				reason: string;
				confidence: number;
			}>;
			examinedPatients: number;
		};

		assert.ok(
			body.candidates.length >= 1,
			"Ретроспективный детектор обязан обнаружить дубликатную пару",
		);
		const foundPair = body.candidates.find(
			(c) =>
				(c.leftPatientId === originalPatientId &&
					c.rightPatientId === SEEDED_DUPLICATE_ID) ||
				(c.leftPatientId === SEEDED_DUPLICATE_ID &&
					c.rightPatientId === originalPatientId),
		);

		assert.ok(
			foundPair,
			`Пара (${originalPatientId}, ${SEEDED_DUPLICATE_ID}) не найдена в списке кандидатов: ${JSON.stringify(body.candidates)}`,
		);
		console.log(
			`[ДЕТЕКТОР ДУБЛЕЙ]: Найдена пара кандидатов с причиной "${foundPair.reason}" и уверенностью ${foundPair.confidence}`,
		);
	});

	test("ШАГ 6 [СЛИЯНИЕ]: Засев клинических данных вторичной карты (визиты, приёмы, оплаты)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Засеваем на вторичную карту (клон):
		// 1 приём, 1 визит, 1 платёж
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(appointments).values({
				id: APPOINTMENT_ID,
				organizationId: ORG_ID,
				patientId: SEEDED_DUPLICATE_ID,
				doctorUserId: DOCTOR_ID,
				status: "completed",
				startsAt: new Date("2026-08-10T10:00:00Z"),
				endsAt: new Date("2026-08-10T11:00:00Z"),
			});

			await db.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: SEEDED_DUPLICATE_ID,
				appointmentId: APPOINTMENT_ID,
				status: "signed",
				complaint: "Острая боль в зубе 46",
				diagnosis: "К04.0 Пульпит начальный",
			});

			await db.insert(payments).values({
				id: PAYMENT_ID,
				organizationId: ORG_ID,
				patientId: SEEDED_DUPLICATE_ID,
				visitId: VISIT_ID,
				amountRub: 8500,
				status: "paid",
			});
		});

		// Проверяем, что данные привязаны к клону
		const [visitBefore] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(visits).where(eq(visits.id, VISIT_ID)),
		);
		assert.equal(visitBefore?.patientId, SEEDED_DUPLICATE_ID);

		const [paymentBefore] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(payments).where(eq(payments.id, PAYMENT_ID)),
		);
		assert.equal(paymentBefore?.patientId, SEEDED_DUPLICATE_ID);
		assert.equal(paymentBefore?.amountRub, 8500);
	});

	test("ШАГ 7 [СЛИЯНИЕ]: Выполнение POST /api/patients/duplicates/merge и инспекция БД", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: originalPatientId,
				duplicatePatientId: SEEDED_DUPLICATE_ID,
				reason: "Слияние дубля Prosecutor 2: опечатка 'Екалерина' -> 'Екатерина'",
			},
		});

		assert.equal(
			response.statusCode,
			200,
			`Слияние должно завершиться кодом 200 OK: ${response.body}`,
		);
		const mergeResult = JSON.parse(response.body);
		assert.equal(mergeResult.ok, true);

		// =========================================================================
		// КРИТИЧЕСКАЯ ИНСПЕКЦИЯ БАЗЫ ДАННЫХ POSTGRESQL ПОСЛЕ СЛИЯНИЯ
		// =========================================================================

		// 1. Вторичная карта НЕ ДОЛЖНА удаляться из БД физически!
		const [secondaryCardInDb] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(patients).where(eq(patients.id, SEEDED_DUPLICATE_ID)),
		);
		assert.ok(
			secondaryCardInDb,
			"КРИТИЧЕСКИЙ БРАК: Вторичная карта была физически удалена из БД! Это уничтожение медицинских данных!",
		);
		assert.equal(
			secondaryCardInDb.status,
			"archived",
			`Статус вторичной карты должен быть 'archived', получено: ${secondaryCardInDb.status}`,
		);
		assert.equal(
			secondaryCardInDb.mergedIntoPatientId,
			originalPatientId,
			`merged_into_patient_id обязан указывать на основную карту (${originalPatientId}), получено: ${secondaryCardInDb.mergedIntoPatientId}`,
		);
		assert.ok(
			secondaryCardInDb.notes?.includes("объединена"),
			`Заметки вторичной карты должны фиксировать факт слияния: ${secondaryCardInDb.notes}`,
		);

		// 2. Визиты должны быть перенесены на первичную карту
		const [transferredVisit] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(visits).where(eq(visits.id, VISIT_ID)),
		);
		assert.equal(
			transferredVisit?.patientId,
			originalPatientId,
			"Визит не был перенесен на первичную карту!",
		);

		// 3. Платежи должны быть перенесены на первичную карту
		const [transferredPayment] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(payments).where(eq(payments.id, PAYMENT_ID)),
		);
		assert.equal(
			transferredPayment?.patientId,
			originalPatientId,
			"Платёж не был перенесен на первичную карту!",
		);

		// 4. Приёмы должны быть перенесены на первичную карту
		const [transferredAppointment] = await withFixtureTenant(
			ORG_ID,
			async () =>
				db
					.select()
					.from(appointments)
					.where(eq(appointments.id, APPOINTMENT_ID)),
		);
		assert.equal(
			transferredAppointment?.patientId,
			originalPatientId,
			"Приём не был перенесен на первичную карту!",
		);

		// 5. У вторичной карты не должно остаться никаких привязанных сущностей
		const leftoverVisits = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(visits).where(eq(visits.patientId, SEEDED_DUPLICATE_ID)),
		);
		assert.equal(
			leftoverVisits.length,
			0,
			`У дубля остались привязаны ${leftoverVisits.length} визитов!`,
		);

		const leftoverPayments = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(eq(payments.patientId, SEEDED_DUPLICATE_ID)),
		);
		assert.equal(
			leftoverPayments.length,
			0,
			`У дубля остались привязаны ${leftoverPayments.length} платежей!`,
		);

		// 6. Проверка записи в журнале решений дедупликации (patient_duplicate_decisions)
		const [decisionRecord] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(patientDuplicateDecisions)
				.where(
					and(
						eq(patientDuplicateDecisions.organizationId, ORG_ID),
						eq(patientDuplicateDecisions.decision, "merged"),
					),
				),
		);
		assert.ok(
			decisionRecord,
			"В таблице patient_duplicate_decisions должна появиться запись о слиянии",
		);

		console.log(
			`[СЛИЯНИЕ ВЕРИФИЦИРОВАНО]:\n` +
				`- Вторичная карта ${SEEDED_DUPLICATE_ID} СОХРАНЕНА в БД (status='archived', merged_into_patient_id='${originalPatientId}')\n` +
				`- Визит ${VISIT_ID} успешно перенесен на карту ${originalPatientId}\n` +
				`- Платёж ${PAYMENT_ID} (8500 руб) перенесен на карту ${originalPatientId}\n` +
				`- У дубля осталось 0 висячих записей в базе.\n`,
		);
	});

	test("ШАГ 8 [ЗАЩИТА]: Повторное слияние уже объединенной карты отклоняется (HTTP 409)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: originalPatientId,
				duplicatePatientId: SEEDED_DUPLICATE_ID,
				reason: "Попытка повторного слияния",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`Повторное слияние обязано отвергаться с 409, получено ${response.statusCode}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientMergeRejected");
		assert.match(String(body.message), /уже объединена/);
	});

	test("ШАГ 9 [ЗАЩИТА]: Самослияние (primaryId === duplicateId) отклоняется (HTTP 400)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: originalPatientId,
				duplicatePatientId: originalPatientId,
				reason: "Попытка слияния с самой собой",
			},
		});

		assert.equal(
			response.statusCode,
			400,
			`Самослияние должно отвергаться кодом 400 Bad Request, получено ${response.statusCode}`,
		);
	});
});
