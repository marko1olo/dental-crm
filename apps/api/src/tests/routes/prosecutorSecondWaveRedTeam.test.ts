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
 * PROSECUTOR 2: THE HAMMER INQUISITION — ВТОРАЯ ВОЛНА БЕСПОЩАДНОЙ АТАКИ
 * ============================================================================
 *
 * Стресс-тестирование базы данных и алгоритмов дедупликации (MPI):
 * 1. Двойные фамилии с дефисом ("Мамин-Сибиряк" vs "Мамин Сибиряк" vs "Сибиряк-Мамин").
 * 2. Регистровые аномалии и визуальные латинские гомоглифы (A/a, C/c, E/e, O/o, P/p, X/x).
 * 3. Атака на состояние гонки (Race Condition): одновременные параллельные POST /api/patients.
 * 4. Слияние с самим собой (Merge with self: primaryId === duplicateId -> 400).
 * 5. Контроль целостности связанных таблиц при слиянии (платежи копейка в копейку, приёмы, визиты).
 */

const FIXTURE = "prosecutorSecondWave";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);

describe("PROSECUTOR 2: ВТОРАЯ ВОЛНА АТАКИ (THE HAMMER INQUISITION)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let databaseAvailable = true;

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
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.update(patients)
					.set({ mergedIntoPatientId: null })
					.where(eq(patients.organizationId, ORG_ID));
			});
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника инквизиции и ред-тиминга (Prosecutor 2 Wave 2)",
				});
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Отделение стресс-аудита",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Инквизитор Г.В.",
					role: "doctor",
				});
			});
		} catch (error) {
			console.error("BEFORE ERROR:", error);
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
				// cleanup error ignore
			}
		}
		await app.close();
	});

	// =========================================================================
	// СЕКТОР 1: СТРЕСС-АТАКА НА MPI (ДВОЙНЫЕ ФАМИЛИИ И ГОМОГЛИФЫ)
	// =========================================================================

	test("ВЕКТОР 1.1: Создание первичного пациента с двойной фамилией ('Мамин-Сибиряк Дмитрий Наркисович')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Мамин-Сибиряк Дмитрий Наркисович",
				birthDate: "1988-11-06",
				phone: "+7 916 222-33-44",
			},
		});

		assert.equal(response.statusCode, 201, response.body);
		const body = JSON.parse(response.body);
		assert.ok(body.id);
	});

	test("ВЕКТОР 1.2 [АТАКА]: Двойная фамилия через пробел вместо дефиса ('Мамин Сибиряк Дмитрий Наркисович')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Мамин Сибиряк Дмитрий Наркисович",
				birthDate: "1988-11-06",
				phone: "+7 916 222-33-44",
			},
		});

		// Должен блокироваться 409 Conflict
		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Двойная фамилия через пробел создала клон (${response.statusCode}) вместо 409: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 1.2 ОТБИТ]: Пробел вместо дефиса заблокирован кодом 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 1.3 [АТАКА]: Перестановка частей двойной фамилии ('Сибиряк-Мамин Дмитрий Наркисович')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Сибиряк-Мамин Дмитрий Наркисович",
				birthDate: "1988-11-06",
				phone: "+7 916 222-33-44",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Перестановка частей двойной фамилии создала клон (${response.statusCode}) вместо 409: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 1.3 ОТБИТ]: Перестановка частей двойной фамилии заблокирована кодом 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 1.4 [АТАКА]: Безумный регистр символов ('мАмИн-сИбИрЯк дМиТрИй нАрКиСоВиЧ')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "мАмИн-сИбИрЯк дМиТрИй нАрКиСоВиЧ",
				birthDate: "1988-11-06",
				phone: "+7 916 222-33-44",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Аномальный регистр создал клон (${response.statusCode}) вместо 409`,
		);
		console.log(`[ВЕКТОР 1.4 ОТБИТ]: Аномальный регистр букв заблокирован кодом 409`);
	});

	test("ВЕКТОР 1.5 [АТАКА]: Визуальные латинские гомоглифы (Cyrillic vs Latin spoofing)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Создаем пациента кириллицей
		const resInit = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Петрова Светлана Игоревна",
				birthDate: "1992-03-20",
				phone: "+7 916 444-55-66",
			},
		});
		assert.equal(resInit.statusCode, 201, resInit.body);

		// АТАКА: Подменяем визуально идентичные буквы кириллицы на латинские символы:
		// 'е' -> Latin 'e' (\u0065)
		// 'о' -> Latin 'o' (\u006f)
		// 'а' -> Latin 'a' (\u0061)
		// 'р' -> Latin 'p' (\u0070)
		// 'с' -> Latin 'c' (\u0063)
		const homoglyphName = "Пeтpoвa Cвeтлaнa Игopeвнa";

		const resAttack = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: homoglyphName,
				birthDate: "1992-03-20",
				phone: "+7 916 444-55-66",
			},
		});

		assert.equal(
			resAttack.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Латинские гомоглифы создали клон (${resAttack.statusCode}) вместо 409: ${resAttack.body}`,
		);
		const body = JSON.parse(resAttack.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 1.5 ОТБИТ]: Атака латинскими гомоглифами заблокирована кодом 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	// =========================================================================
	// СЕКТОР 2: АТАКА НА СОСТОЯНИЕ ГОНКИ (RACE CONDITION CONCURRENCY ATTACK)
	// =========================================================================

	test("ВЕКТОР 2: Параллельная одновременная регистрация (Race Condition Attack: 5 concurrent POST)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const targetName = "Гончаров Илья Павлович";
		const targetPhone = "+7 916 777-88-99";
		const targetDob = "1985-07-12";

		// Запускаем 5 абсолютно одновременных запросов на создание одного и того же человека
		const attackPromises = Array.from({ length: 5 }).map(() =>
			app.inject({
				method: "POST",
				url: "/api/patients",
				headers: clinicHeaders,
				payload: {
					fullName: targetName,
					phone: targetPhone,
					birthDate: targetDob,
				},
			}),
		);

		const responses = await Promise.all(attackPromises);
		const statusCodes = responses.map((r) => r.statusCode);
		const createdCount = statusCodes.filter((c) => c === 201).length;
		const conflictCount = statusCodes.filter((c) => c === 409).length;

		console.log(
			`[RACE CONDITION RESULTS]: 201 Created: ${createdCount}, 409 Conflict: ${conflictCount}`,
		);

		// Проверяем физическое состояние в PostgreSQL
		const rowsInDb = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, ORG_ID),
						eq(patients.fullName, targetName),
					),
				),
		);

		assert.equal(
			rowsInDb.length,
			1,
			`КРИТИЧЕСКИЙ БРАК: В БД физически создано ${rowsInDb.length} карт на одного человека из-за Race Condition! ID: ${rowsInDb.map((r) => r.id).join(", ")}`,
		);
		assert.equal(createdCount, 1, "Ровно 1 запрос должен вернуть 201 Created");
		assert.equal(
			conflictCount,
			4,
			`Остальные 4 параллельных запроса обязаны получить 409 Conflict, получено: 201=${createdCount}, 409=${conflictCount}`,
		);
		console.log(
			`[ВЕКТОР 2 ОТБИТ]: Гонка заблокирована! В БД ровно 1 запись, 4 запроса получили 409 Conflict.`,
		);
	});

	// =========================================================================
	// СЕКТОР 3: СЛИЯНИЕ С САМИМ СОБОЙ (SELF-MERGE ATTACK)
	// =========================================================================

	test("ВЕКТОР 3: Слияние пациента самого с собой (Merge with self: primaryId === duplicateId)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Создаем пациента для проверки
		const resInit = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Одиноков Аркадий Борисович",
				birthDate: "1975-12-12",
				phone: "+7 916 999-00-11",
			},
		});
		assert.equal(resInit.statusCode, 201);
		const selfPatientId = JSON.parse(resInit.body).id;

		const resSelfMerge = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: selfPatientId,
				duplicatePatientId: selfPatientId,
				reason: "Попытка самоуничтожения/самослияния",
			},
		});

		assert.equal(
			resSelfMerge.statusCode,
			400,
			`Самослияние ОБЯЗАНО отвергаться с кодом 400 Bad Request, получен код ${resSelfMerge.statusCode}`,
		);
		const errBody = JSON.parse(resSelfMerge.body);
		assert.equal(errBody.error, "PatientDuplicateValidationError");
		console.log(
			`[ВЕКТОР 3 ОТБИТ]: Слияние с самим собой заблокировано кодом 400 (${errBody.message})`,
		);
	});

	// =========================================================================
	// СЕКТОР 4: ЦЕЛОСТНОСТЬ СВЯЗАННЫХ ТАБЛИЦ ПРИ СЛИЯНИИ (ДЕНЬГИ, ПРИЁМЫ, ВИЗИТЫ)
	// =========================================================================

	test("ВЕКТОР 4: Целостность связанных таблиц при слиянии (нулевая потеря оплат и визитов)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const primaryId = fixtureUuid(FIXTURE, 20);
		const duplicateId = fixtureUuid(FIXTURE, 21);
		const appt1Id = fixtureUuid(FIXTURE, 31);
		const appt2Id = fixtureUuid(FIXTURE, 32);
		const visit1Id = fixtureUuid(FIXTURE, 41);
		const visit2Id = fixtureUuid(FIXTURE, 42);
		const pay1Id = fixtureUuid(FIXTURE, 51);
		const pay2Id = fixtureUuid(FIXTURE, 52);
		const pay3Id = fixtureUuid(FIXTURE, 53);

		await withFixtureTenant(ORG_ID, async () => {
			// Создаем две карточки в БД
			await db.insert(patients).values([
				{
					id: primaryId,
					organizationId: ORG_ID,
					fullName: "Соколов Виктор Андреевич",
					birthDate: "1982-05-20",
					phone: "+7 916 333-44-55",
					notes: "Основная карта пациента",
				},
				{
					id: duplicateId,
					organizationId: ORG_ID,
					fullName: "Соколов Виктор",
					birthDate: "1982-05-20",
					phone: "+7 916 333-44-55",
					notes: "Дубликат с оплатами и визитами",
				},
			]);

			// Засеваем на дубликат: 2 приёма
			await db.insert(appointments).values([
				{
					id: appt1Id,
					organizationId: ORG_ID,
					patientId: duplicateId,
					doctorUserId: DOCTOR_ID,
					status: "completed",
					startsAt: new Date("2026-06-01T10:00:00Z"),
					endsAt: new Date("2026-06-01T11:00:00Z"),
				},
				{
					id: appt2Id,
					organizationId: ORG_ID,
					patientId: duplicateId,
					doctorUserId: DOCTOR_ID,
					status: "completed",
					startsAt: new Date("2026-06-05T14:00:00Z"),
					endsAt: new Date("2026-06-05T15:00:00Z"),
				},
			]);

			// Засеваем на дубликат: 2 визита
			await db.insert(visits).values([
				{
					id: visit1Id,
					organizationId: ORG_ID,
					patientId: duplicateId,
					appointmentId: appt1Id,
					status: "signed",
					diagnosis: "К02.1 Кариес дентина",
				},
				{
					id: visit2Id,
					organizationId: ORG_ID,
					patientId: duplicateId,
					appointmentId: appt2Id,
					status: "signed",
					diagnosis: "К05.0 Гингивит острый",
				},
			]);

			// Засеваем на дубликат: 3 платежа на сумму 5000 + 3200 + 1800 = 10000 руб
			await db.insert(payments).values([
				{
					id: pay1Id,
					organizationId: ORG_ID,
					patientId: duplicateId,
					visitId: visit1Id,
					amountRub: 5000,
					status: "paid",
				},
				{
					id: pay2Id,
					organizationId: ORG_ID,
					patientId: duplicateId,
					visitId: visit2Id,
					amountRub: 3200,
					status: "paid",
				},
				{
					id: pay3Id,
					organizationId: ORG_ID,
					patientId: duplicateId,
					visitId: visit2Id,
					amountRub: 1800,
					status: "paid",
				},
			]);
		});

		// Выполняем слияние через API
		const resMerge = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: primaryId,
				duplicatePatientId: duplicateId,
				reason: "Слияние в рамках Вектора 4: проверка финансовой целостности",
			},
		});

		assert.equal(resMerge.statusCode, 200, resMerge.body);
		const mergeBody = JSON.parse(resMerge.body);
		assert.equal(mergeBody.ok, true);

		// =====================================================================
		// СУДЕБНЫЙ АУДИТ БАЗЫ ДАННЫХ POSTGRESQL НА ПОТЕРЮ ДАННЫХ
		// =====================================================================

		// 1. Проверка финансовой целостности: сумма платежей перенесена до копейки
		const primaryPayments = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(payments).where(eq(payments.patientId, primaryId)),
		);
		assert.equal(
			primaryPayments.length,
			3,
			`Ожидалось ровно 3 платежа у основной карты, обнаружено: ${primaryPayments.length}`,
		);
		const totalRub = primaryPayments.reduce((sum, p) => sum + (p.amountRub ?? 0), 0);
		assert.equal(
			totalRub,
			10000,
			`КРИТИЧЕСКИЙ ФИНАНСОВЫЙ БРАК: Потеря денег при слиянии! Ожидалось 10 000 руб, получено: ${totalRub}`,
		);

		// 2. Проверка визитов
		const primaryVisits = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(visits).where(eq(visits.patientId, primaryId)),
		);
		assert.equal(
			primaryVisits.length,
			2,
			`Ожидалось ровно 2 визита у основной карты, получено: ${primaryVisits.length}`,
		);

		// 3. Проверка приёмов
		const primaryAppts = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(appointments).where(eq(appointments.patientId, primaryId)),
		);
		assert.equal(
			primaryAppts.length,
			2,
			`Ожидалось ровно 2 приёма у основной карты, получено: ${primaryAppts.length}`,
		);

		// 4. Проверка остатка у вторичной карты (должно быть строго 0)
		const dupPayments = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(payments).where(eq(payments.patientId, duplicateId)),
		);
		assert.equal(dupPayments.length, 0, "У вторичной карты остались висеть платежи!");

		const dupVisits = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(visits).where(eq(visits.patientId, duplicateId)),
		);
		assert.equal(dupVisits.length, 0, "У вторичной карты остались висеть визиты!");

		// 5. Вторичная карта НЕ удалена физически, а переведена в архив
		const [dupCard] = await withFixtureTenant(ORG_ID, async () =>
			db.select().from(patients).where(eq(patients.id, duplicateId)),
		);
		assert.ok(dupCard, "Вторичная карта удалена физически! Нарушение целостности!");
		assert.equal(dupCard.status, "archived");
		assert.equal(dupCard.mergedIntoPatientId, primaryId);

		console.log(
			`[ВЕКТОР 4 ОТБИТ]: Финансовая и клиническая целостность подтверждена!\n` +
				`- Перенесено платежей: 3 на сумму ровно 10 000 руб (потерь 0 руб)\n` +
				`- Перенесено визитов: 2\n` +
				`- Перенесено приёмов: 2\n` +
				`- Вторичная карта сохранена в архиве с ссылкой на основную.\n`,
		);
	});
});
