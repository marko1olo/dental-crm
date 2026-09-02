import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
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
 * PROSECUTOR 2: ЧЕТВЕРТАЯ ВОЛНА АТАКИ — MULTI-TENANT & CONCURRENT MERGES
 * ============================================================================
 *
 * 1. Изоляция дублей между организациями (Cross-Tenant Collision):
 *    - Пациент зарегистрирован в Клинике А.
 *    - Создание пациента с ТЕМИ ЖЕ ФИО, телефоном и датой рождения в Клинике Б
 *      ОБЯЗАНО быть разрешено (HTTP 201 Created), так как это независимые тенанты.
 *    - Повторное создание в Клинике Б ОБЯЗАНО блокироваться (HTTP 409 Conflict).
 *    - Межклиническая утечка в GET /api/patients/duplicates запрещена.
 *    - Попытка слияния пациента Клиники А с пациентом Клиники Б обязана отвергаться.
 *
 * 2. Атака на слияние в условиях высокой конкурентности (Concurrent Merge Attack):
 *    - Параллельные одновременные взаимообратные слияния (Deadlock & Cycle Attack):
 *      Запрос 1: Слить Patient B в Patient A.
 *      Запрос 2: Слить Patient A в Patient B.
 *    - Проверка: отсутствие дедлока PostgreSQL (40P01), отсутствие зацикливания
 *      (A.merged_into = B И B.merged_into = A), ровно 1 успешное слияние.
 *    - Защита от транзитивных цепочек и повторных слияний.
 */

const FIXTURE = "prosecutorWave4";

// Клиника А
const ORG_A = fixtureUuid(FIXTURE, 1);
const CLINIC_A = fixtureUuid(FIXTURE, 2);
const DOCTOR_A = fixtureUuid(FIXTURE, 3);

// Клиника Б (независимый тенант)
const ORG_B = fixtureUuid(FIXTURE, 10);
const CLINIC_B = fixtureUuid(FIXTURE, 11);
const DOCTOR_B = fixtureUuid(FIXTURE, 12);

describe("PROSECUTOR 2: ЧЕТВЕРТАЯ ВОЛНА (MULTI-TENANT & CONCURRENT MERGES)", () => {
	let app: FastifyInstance;
	let headersClinicA: Record<string, string>;
	let headersClinicB: Record<string, string>;
	let databaseAvailable = true;

	const COMMON_PERSON = {
		fullName: "Ковалев Семен Дмитриевич",
		phone: "+7 (926) 333-22-11",
		birthDate: "1989-11-20",
		notes: "Пациент для межклинического теста",
	};

	let patientAId: string;
	let patientBId: string;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await registerPatientRoutes(app);
		await registerPatientDuplicateRoutes(app);

		headersClinicA = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_A, clinicId: CLINIC_A },
				authTokenSecret(),
			),
			"x-organization-id": ORG_A,
			"content-type": "application/json",
		};

		headersClinicB = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_B, clinicId: CLINIC_B },
				authTokenSecret(),
			),
			"x-organization-id": ORG_B,
			"content-type": "application/json",
		};

		try {
			// Очистка перед посевом
			await withFixtureTenant(ORG_A, async () => {
				await db
					.update(patients)
					.set({ mergedIntoPatientId: null })
					.where(eq(patients.organizationId, ORG_A));
			});
			await withFixtureTenant(ORG_B, async () => {
				await db
					.update(patients)
					.set({ mergedIntoPatientId: null })
					.where(eq(patients.organizationId, ORG_B));
			});
			await purgeFixtureOrganizations([ORG_A, ORG_B]);

			// Посев Клиники А
			await withFixtureTenant(ORG_A, async () => {
				await db.insert(organizations).values({
					id: ORG_A,
					name: "Клиника 'Альфа-Дент' (Тенант А)",
				});
				await db.insert(clinics).values({
					id: CLINIC_A,
					organizationId: ORG_A,
					name: "Филиал Альфа",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_A,
					organizationId: ORG_A,
					fullName: "Доктор Альфа А.А.",
					role: "doctor",
				});
			});

			// Посев Клиники Б
			await withFixtureTenant(ORG_B, async () => {
				await db.insert(organizations).values({
					id: ORG_B,
					name: "Клиника 'Бета-Дент' (Тенант Б)",
				});
				await db.insert(clinics).values({
					id: CLINIC_B,
					organizationId: ORG_B,
					name: "Филиал Бета",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_B,
					organizationId: ORG_B,
					fullName: "Доктор Бета Б.Б.",
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
				await withFixtureTenant(ORG_A, async () => {
					await db
						.update(patients)
						.set({ mergedIntoPatientId: null })
						.where(eq(patients.organizationId, ORG_A));
				});
				await withFixtureTenant(ORG_B, async () => {
					await db
						.update(patients)
						.set({ mergedIntoPatientId: null })
						.where(eq(patients.organizationId, ORG_B));
				});
				await purgeFixtureOrganizations([ORG_A, ORG_B]);
			} catch {
				// cleanup ignore
			}
		}
		await app.close();
	});

	// =========================================================================
	// СЕКТОР 1: CROSS-TENANT COLLISION & MULTI-TENANT ISOLATION
	// =========================================================================

	test("ВЕКТОР 4.1: Регистрация пациента в Клинике А ('Ковалев Семен Дмитриевич')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: headersClinicA,
			payload: COMMON_PERSON,
		});

		assert.equal(
			response.statusCode,
			201,
			`Ожидалось 201 в Клинике А, получено ${response.statusCode}: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.ok(body.id);
		patientAId = body.id;
		console.log(`[КЛИНИКА А]: Пациент успешно создан с ID: ${patientAId}`);
	});

	test("ВЕКТОР 4.2 [CROSS-TENANT]: Создание пациента с ТЕМИ ЖЕ ФИО и телефоном в Клинике Б (разрешено)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// В независимой Клинике Б тот же гражданин должен иметь возможность зарегистрироваться!
		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: headersClinicB,
			payload: COMMON_PERSON,
		});

		assert.equal(
			response.statusCode,
			201,
			`КРИТИЧЕСКИЙ БРАК ТЕНАНТ-ИЗОЛЯЦИИ: Клиника Б заблокировала пациента из-за данных Клиники А! Статус: ${response.statusCode}, тело: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.ok(body.id);
		assert.notEqual(
			body.id,
			patientAId,
			"Идентификаторы пациентов в разных клиниках обязаны быть уникальными",
		);
		patientBId = body.id;
		console.log(
			`[КЛИНИКА Б]: Пациент успешно создан в независимом тенанте с ID: ${patientBId}`,
		);
	});

	test("ВЕКТОР 4.3 [INTRA-TENANT]: Повторное создание в Клинике Б строго блокируется 409 Conflict", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Повторная регистрация ВНУТРИ Клиники Б обязана вызывать 409 Conflict
		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: headersClinicB,
			payload: COMMON_PERSON,
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Дубль внутри Клиники Б не заблокирован (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		assert.equal(
			body.existingPatientId,
			patientBId,
			"В ответе дубля Клиники Б должна быть ссылка на пациента Клиники Б, а не Клиники А",
		);
		console.log(
			`[ВЕКТОР 4.3 ОТБИТ]: Внутри Клиники Б дубль заблокирован кодом 409 со ссылкой на ${body.existingPatientId}`,
		);
	});

	test("ВЕКТОР 4.4 [УТЕЧКА]: GET /api/patients/duplicates не смешивает пациентов разных клиник", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const responseA = await app.inject({
			method: "GET",
			url: "/api/patients/duplicates",
			headers: headersClinicA,
		});
		assert.equal(responseA.statusCode, 200);
		const bodyA = JSON.parse(responseA.body) as {
			candidates: Array<{ leftPatientId: string; rightPatientId: string }>;
		};

		// В Клинике А всего 1 пациент — никаких дублей с Клиникой Б быть не должно!
		const leakedCandidates = bodyA.candidates.filter(
			(c) =>
				c.leftPatientId === patientBId || c.rightPatientId === patientBId,
		);
		assert.equal(
			leakedCandidates.length,
			0,
			`КРИТИЧЕСКАЯ УТЕЧКА МЕЖДУ ТЕНАНТАМИ: В Клинике А обнаружены пациенты Клиники Б: ${JSON.stringify(leakedCandidates)}`,
		);
		console.log(`[ВЕКТОР 4.4 ОТБИТ]: Межклиническая утечка дублей отсутствует.`);
	});

	test("ВЕКТОР 4.5 [МЕЖТЕНАНТНОЕ СЛИЯНИЕ]: Попытка слияния карты Клиники А с картой Клиники Б отвергается", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Злоумышленник из Клиники А пытается слить пациента из Клиники Б в свою карту
		const response = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: headersClinicA,
			payload: {
				primaryPatientId: patientAId,
				duplicatePatientId: patientBId,
				reason: "Атака: попытка кражи/слияния чужой карточки из другого тенанта",
			},
		});

		assert.notEqual(
			response.statusCode,
			200,
			"КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Межклиническое слияние прошло успешно! Чужой пациент присоединен!",
		);
		assert.ok(
			[400, 403, 404, 409].includes(response.statusCode),
			`Ожидался код ошибки (400/404/409), получено: ${response.statusCode}`,
		);
		console.log(
			`[ВЕКТОР 4.5 ОТБИТ]: Межклиническое слияние отвергнуто кодом ${response.statusCode}`,
		);
	});

	// =========================================================================
	// СЕКТОР 2: CONCURRENT MERGE ATTACK (DEADLOCK & CYCLE PREVENTION)
	// =========================================================================

	test("ВЕКТОР 4.6 [DEADLOCK & CYCLE]: Одновременное взаимное слияние (A -> B и B -> A)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const patientXId = fixtureUuid(FIXTURE, 20);
		const patientYId = fixtureUuid(FIXTURE, 21);

		// Создаем в Клинике А двух активных пациентов для взаимного слияния
		await withFixtureTenant(ORG_A, async () => {
			await db.insert(patients).values([
				{
					id: patientXId,
					organizationId: ORG_A,
					fullName: "Григорьев Максим Юрьевич",
					phone: "+7 (926) 777-11-22",
					birthDate: "1991-01-10",
					notes: "Пациент X",
				},
				{
					id: patientYId,
					organizationId: ORG_A,
					fullName: "Григорьев Максим",
					phone: "+7 (926) 777-11-22",
					birthDate: "1991-01-10",
					notes: "Пациент Y",
				},
			]);
		});

		// АТАКА: Запускаем СТРОГО ОДНОВРЕМЕННО два взаимно противоположных слияния
		const [resMerge1, resMerge2] = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/patients/duplicates/merge",
				headers: headersClinicA,
				payload: {
					primaryPatientId: patientXId,
					duplicatePatientId: patientYId,
					reason: "Слияние Y в X",
				},
			}),
			app.inject({
				method: "POST",
				url: "/api/patients/duplicates/merge",
				headers: headersClinicA,
				payload: {
					primaryPatientId: patientYId,
					duplicatePatientId: patientXId,
					reason: "Одновременное слияние X в Y",
				},
			}),
		]);

		const status1 = resMerge1.statusCode;
		const status2 = resMerge2.statusCode;
		console.log(`[CONCURRENT MERGE RESPONSES]: Поток 1: ${status1}, Поток 2: ${status2}`);

		// Проверка 1: Сервер не должен падать с 500 (Deadlock exception не должен крашить без обработки)
		assert.notEqual(
			status1,
			500,
			`Поток 1 упал с 500 Internal Server Error: ${resMerge1.body}`,
		);
		assert.notEqual(
			status2,
			500,
			`Поток 2 упал с 500 Internal Server Error: ${resMerge2.body}`,
		);

		// =====================================================================
		// СУДЕБНАЯ ИНСПЕКЦИЯ БАЗЫ ДАННЫХ НА ПРЕДМЕТ ЦИКЛОВ
		// =====================================================================
		const rowsInDb = await withFixtureTenant(ORG_A, async () =>
			db
				.select({
					id: patients.id,
					status: patients.status,
					mergedInto: patients.mergedIntoPatientId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, ORG_A),
						or(eq(patients.id, patientXId), eq(patients.id, patientYId)),
					),
				),
		);
		const cardX = rowsInDb.find((r) => r.id === patientXId);
		const cardY = rowsInDb.find((r) => r.id === patientYId);
		const isCycle =
			cardX?.mergedInto === patientYId && cardY?.mergedInto === patientXId;

		// Проверка 2: Ровно одно слияние должно завершиться успехом
		const successCount = [status1, status2].filter((s) => s === 200).length;
		if (successCount > 1 || isCycle) {
			console.error(
				`\n[!!! КРИТИЧЕСКИЙ БРАК: ВЗАИМНОЕ ЦИКЛИЧЕСКОЕ СЛИЯНИЕ (DEADLOCK/CYCLE) ЗАФИКСИРОВАНО !!!]\n` +
					`Оба параллельных запроса на слияние вернули HTTP 200 OK!\n` +
					`Состояние в базе данных PostgreSQL:\n` +
					`  Карта X (${patientXId}): status='${cardX?.status}', mergedInto='${cardX?.mergedInto}'\n` +
					`  Карта Y (${patientYId}): status='${cardY?.status}', mergedInto='${cardY?.mergedInto}'\n` +
					`Фатальный результат: обе карточки архивированы со взаимными циклическими ссылками друг на друга!\n` +
					`В клинике не осталось ни одной активной карты данного пациента!\n`,
			);
		}

		// Проверка на фатальный цикл слияния:
		assert.equal(
			isCycle,
			false,
			"КАТАСТРОФИЧЕСКИЙ БРАК БАЗЫ: Обнаружен взаимный цикл слияния (Deadlock cycle)! Обе карты ссылаются друг на друга!",
		);
		assert.equal(
			successCount,
			1,
			`Ровно одно взаимное слияние обязано победить! Успехов: ${successCount}`,
		);

		// Ровно одна карта должна быть активной (mergedInto === null)
		// и ровно одна должна быть архивной (mergedInto указывает на активную)
		const activeCards = [cardX, cardY].filter((c) => c?.status === "active");
		const archivedCards = [cardX, cardY].filter((c) => c?.status === "archived");

		assert.equal(
			activeCards.length,
			1,
			`В базе должна остаться ровно 1 активная карта, обнаружено ${activeCards.length}`,
		);
		assert.equal(
			archivedCards.length,
			1,
			`В базе должна быть ровно 1 архивная карта, обнаружено ${archivedCards.length}`,
		);
		assert.equal(
			archivedCards[0]?.mergedInto,
			activeCards[0]?.id,
			"Архивная карта обязана ссылаться на активную карту-победительницу",
		);

		console.log(
			`[ВЕКТОР 4.6 ОТБИТ]: Взаимное параллельное слияние безопасно разрешено!\n` +
				`- Дедлоков нет (статусы: ${status1}, ${status2})\n` +
				`- Активная карта: ${activeCards[0]?.id} (status='active', mergedInto=null)\n` +
				`- Архивная карта: ${archivedCards[0]?.id} (status='archived', mergedInto='${activeCards[0]?.id}')\n` +
				`- Зацикливание полностью исключено.\n`,
		);
	});

	test("ВЕКТОР 4.7 [ТРАНЗИТИВНОСТЬ]: Попытка использовать архивную карту как основную отвергается", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Берем архивного пациента из предыдущего теста и пытаемся слить в него третьего пациента
		const patientZId = fixtureUuid(FIXTURE, 30);
		await withFixtureTenant(ORG_A, async () => {
			await db.insert(patients).values({
				id: patientZId,
				organizationId: ORG_A,
				fullName: "Пациент Z",
				phone: "+7 (926) 999-88-77",
			});
		});

		const [archivedPatient] = await withFixtureTenant(ORG_A, async () =>
			db
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, ORG_A),
						eq(patients.status, "archived"),
					),
				),
		);
		assert.ok(archivedPatient, "Архивный пациент должен существовать");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: headersClinicA,
			payload: {
				primaryPatientId: archivedPatient.id, // Попытка использовать архивную карту как primary
				duplicatePatientId: patientZId,
				reason: "Попытка транзитивного слияния в архивную карту",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`Попытка слияния в архивную карту обязана отвергаться кодом 409, получено ${response.statusCode}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientMergeRejected");
		assert.match(String(body.message), /Основная карточка сама объединена/);
		console.log(
			`[ВЕКТОР 4.7 ОТБИТ]: Использование архивной карты как целевой заблокировано кодом 409.`,
		);
	});
});
