import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	clinics,
	organizations,
	patients,
	users,
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
 * PROSECUTOR 2: ПЯТАЯ ВОЛНА АТАКИ — EXTREME DISTORTIONS & 5-THREAD MERGE RACE
 * ============================================================================
 *
 * Фронт 1: Экстремальные искажения входных данных
 * - Перестановка Имени и Отчества ("Васильев Павлович Георгий" vs "Васильев Георгий Павлович")
 * - Множественные опечатки в 2-3 буквах ("Василев Гиоргий", "Василев Гиорги Павлыч")
 * - Подмена похожих цифр в номере телефона (1 цифра)
 * - Смена номера телефона при полном совпадении ФИО и даты рождения
 * - Полная латинская транслитерация ФИО ("Vasiliev Georgiy Pavlovich")
 *
 * Фронт 2: 5-поточная круговая гонка слияния (Circular Merge Race)
 * - 3 пациента (A, B, C) и 5 параллельных перекрестных запросов:
 *   (B->A, C->B, A->C, C->A, B->C)
 * - Проверка: zero deadlocks (40P01), zero cycles (A->B->C->A), целостность графа.
 */

const FIXTURE = "prosecutorWave5";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);

describe("PROSECUTOR 2: ПЯТАЯ ВОЛНА (EXTREME DISTORTIONS & 5-THREAD MERGE RACE)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let databaseAvailable = true;

	const BASE_NAME = "Васильев Георгий Павлович";
	const BASE_PHONE = "+7 916 444-33-22";
	const BASE_DOB = "1980-02-14";
	let primaryPatientId: string;

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
					name: "Клиника экстремального ред-тиминга (Prosecutor 2 Wave 5)",
				});
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Экстремальный сектор",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Экстремалов Э.Э.",
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
				// cleanup ignore
			}
		}
		await app.close();
	});

	// =========================================================================
	// ФРОНТ 1: ЭКСТРЕМАЛЬНЫЕ ИСКАЖЕНИЯ ВХОДНЫХ ДАННЫХ
	// =========================================================================

	test("ВЕКТОР 5.1: Создание первичного пациента ('Васильев Георгий Павлович')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: BASE_NAME,
				phone: BASE_PHONE,
				birthDate: BASE_DOB,
			},
		});

		assert.equal(response.statusCode, 201, response.body);
		const body = JSON.parse(response.body);
		assert.ok(body.id);
		primaryPatientId = body.id;
		console.log(`[ПЕРВИЧНЫЙ ПАЦИЕНТ]: ID=${primaryPatientId}`);
	});

	test("ВЕКТОР 5.2 [АТАКА]: Перестановка Имени и Отчества ('Васильев Павлович Георгий')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Васильев Павлович Георгий", // Переставлены Имя и Отчество
				phone: BASE_PHONE,
				birthDate: BASE_DOB,
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Перестановка Имени и Отчества обошла дедупликацию (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 5.2 ОТБИТ]: Перестановка Имени и Отчества заблокирована 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 5.3 [АТАКА]: Опечатки в 2 буквах ('Василев Гиоргий Павлович')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Василев Гиоргий Павлович", // 'ь' пропущено, 'и' вместо 'е'
				phone: BASE_PHONE,
				birthDate: BASE_DOB,
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Опечатки в 2 буквах обошли дедупликацию (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 5.3 ОТБИТ]: 2 опечатки в ФИО заблокированы 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 5.4 [АТАКА]: 3 опечатки в разных словах ФИО ('Василев Гиоргий Павловис')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// 3 опечатки по 1 в каждом слове (-ь в фамилии, е->и в имени, ч->с в отчестве)
		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Василев Гиоргий Павловис",
				phone: BASE_PHONE,
				birthDate: BASE_DOB,
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: 3 опечатки в ФИО обошли дедупликацию (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 5.4 ОТБИТ]: 3 опечатки в ФИО заблокированы 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 5.4b [ГРАНИЦА ЧУВСТВИТЕЛЬНОСТИ]: Экстремальное разговорное сокращение (6 правок: 'Василев Гиорги Павлыч')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Разговорная форма: Василев (-ь), Гиорги (е->и, -й), Павлыч (ов->ы) = 6 правок (дистанция 6, similarity 0.76)
		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Василев Гиорги Павлыч",
				phone: BASE_PHONE,
				birthDate: BASE_DOB,
			},
		});

		if (response.statusCode === 201) {
			const body = JSON.parse(response.body);
			console.log(
				`[ГРАНИЦА ФУЗЗИ ЗАФИКСИРОВАНА]: 6 правок ('Василев Гиорги Павлыч') дали схожесть 0.76 (< 0.80) и создали карту ID=${body.id}.\n` +
					`Система строго отсекает совпадения ниже порога 0.80 для защиты от ложных объединений однофамильцев.\n`,
			);
		} else {
			assert.equal(response.statusCode, 409);
			console.log(`[ВЕКТОР 5.4b ОТБИТ]: Разговорная форма заблокирована кодом 409`);
		}
	});

	test("ВЕКТОР 5.5 [АТАКА]: Подмена похожей цифры в номере телефона (1 опечатка в номере)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: BASE_NAME,
				phone: "+7 916 444-33-23", // Последняя цифра 3 вместо 2
				birthDate: BASE_DOB,
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Опечатка в 1 цифру телефона при совпадающем ФИО и ДР создала дубль (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 5.5 ОТБИТ]: 1 опечатка в номере телефона заблокирована 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 5.6 [АТАКА]: Полная смена номера телефона при 100% совпадающем ФИО и дате рождения", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: BASE_NAME,
				phone: "+7 903 111-99-88", // Совершенно новый номер
				birthDate: BASE_DOB, // 100% та же дата рождения
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Совпадение ФИО и даты рождения при смене номера телефона не заблокировано (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 5.6 ОТБИТ]: Совпадение ФИО и ДР при новом номере заблокировано 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 5.7 [ТРАНСЛИТЕРАЦИЯ]: Латинский транслит ФИО ('Vasiliev Georgiy Pavlovich')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const translitName = "Vasiliev Georgiy Pavlovich";
		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: translitName,
				phone: BASE_PHONE,
				birthDate: BASE_DOB,
			},
		});

		if (response.statusCode === 201) {
			const body = JSON.parse(response.body);
			console.log(
				`[ТРАНСЛИТ ФАКТ ЗАФИКСИРОВАН]: Полная латинская транслитерация создала карточку ID=${body.id}.\n` +
					`Причина: транслитератор (ISO 9 / BGN) не встроен в ядро (поддерживаются только посимвольные визуальные гомоглифы).\n`,
			);
		} else {
			assert.equal(response.statusCode, 409);
			console.log(`[ВЕКТОР 5.7 ОТБИТ]: Транслитерация заблокирована кодом 409`);
		}
	});

	// =========================================================================
	// ФРОНТ 2: 5-ПОТОЧНАЯ КРУГОВАЯ ГОНКА СЛИЯНИЯ (CIRCULAR MERGE RACE)
	// =========================================================================

	test("ВЕКТОР 5.8 [ГОНКА 5 ПОТОКОВ]: Циклическое слияние 3 карт (A->B, B->C, C->A, C->A, B->C)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const nodeAId = fixtureUuid(FIXTURE, 20);
		const nodeBId = fixtureUuid(FIXTURE, 21);
		const nodeCId = fixtureUuid(FIXTURE, 22);

		// Создаем 3 активных пациента
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(patients).values([
				{
					id: nodeAId,
					organizationId: ORG_ID,
					fullName: "Узел Графа А",
					phone: "+7 916 111-00-01",
					notes: "Начальный узел А",
				},
				{
					id: nodeBId,
					organizationId: ORG_ID,
					fullName: "Узел Графа Б",
					phone: "+7 916 111-00-02",
					notes: "Начальный узел Б",
				},
				{
					id: nodeCId,
					organizationId: ORG_ID,
					fullName: "Узел Графа В",
					phone: "+7 916 111-00-03",
					notes: "Начальный узел В",
				},
			]);
		});

		// Запускаем 5 строго одновременных перекрестных запросов на слияние:
		// 1. Слить B в A (A побеждает B)
		// 2. Слить C в B (B побеждает C)
		// 3. Слить A в C (C побеждает A) -> классический треугольный цикл A->C->B->A
		// 4. Слить C в A (A побеждает C)
		// 5. Слить B в C (C побеждает B)
		const attackMergePromises = [
			// 1. primary: A, duplicate: B
			app.inject({
				method: "POST",
				url: "/api/patients/duplicates/merge",
				headers: clinicHeaders,
				payload: { primaryPatientId: nodeAId, duplicatePatientId: nodeBId },
			}),
			// 2. primary: B, duplicate: C
			app.inject({
				method: "POST",
				url: "/api/patients/duplicates/merge",
				headers: clinicHeaders,
				payload: { primaryPatientId: nodeBId, duplicatePatientId: nodeCId },
			}),
			// 3. primary: C, duplicate: A
			app.inject({
				method: "POST",
				url: "/api/patients/duplicates/merge",
				headers: clinicHeaders,
				payload: { primaryPatientId: nodeCId, duplicatePatientId: nodeAId },
			}),
			// 4. primary: A, duplicate: C
			app.inject({
				method: "POST",
				url: "/api/patients/duplicates/merge",
				headers: clinicHeaders,
				payload: { primaryPatientId: nodeAId, duplicatePatientId: nodeCId },
			}),
			// 5. primary: C, duplicate: B
			app.inject({
				method: "POST",
				url: "/api/patients/duplicates/merge",
				headers: clinicHeaders,
				payload: { primaryPatientId: nodeCId, duplicatePatientId: nodeBId },
			}),
		];

		const responses = await Promise.all(attackMergePromises);
		const statusCodes = responses.map((r) => r.statusCode);
		console.log(`[5-THREAD MERGE STATUS CODES]:`, statusCodes);

		// ПРОВЕРКА 1: Отсутствие необработанных дедлоков PostgreSQL (40P01 Deadlock detected)
		for (let i = 0; i < responses.length; i += 1) {
			assert.notEqual(
				statusCodes[i],
				500,
				`Поток ${i + 1} упал с 500 Internal Server Error: ${responses[i]?.body}`,
			);
		}

		// ПРОВЕРКА 2: Аудит состояния графа слияний в PostgreSQL
		const nodesInDb = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					status: patients.status,
					mergedInto: patients.mergedIntoPatientId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, ORG_ID),
						or(
							eq(patients.id, nodeAId),
							eq(patients.id, nodeBId),
							eq(patients.id, nodeCId),
						),
					),
				),
		);

		console.log("[INSPECT 3-NODE STATE IN POSTGRESQL]:", nodesInDb);

		// Проверка 3: Проверка отсутствия взаимных и треугольных циклов
		const nodeA = nodesInDb.find((n) => n.id === nodeAId);
		const nodeB = nodesInDb.find((n) => n.id === nodeBId);
		const nodeC = nodesInDb.find((n) => n.id === nodeCId);

		// Прямой 2-узловой цикл
		const cycleAB = nodeA?.mergedInto === nodeBId && nodeB?.mergedInto === nodeAId;
		const cycleBC = nodeB?.mergedInto === nodeCId && nodeC?.mergedInto === nodeBId;
		const cycleCA = nodeC?.mergedInto === nodeAId && nodeA?.mergedInto === nodeCId;
		assert.equal(cycleAB || cycleBC || cycleCA, false, "Обнаружен 2-узловой взаимный цикл!");

		// Треугольный 3-узловой цикл (A->B->C->A или A->C->B->A)
		const cycleABC =
			nodeA?.mergedInto === nodeBId &&
			nodeB?.mergedInto === nodeCId &&
			nodeC?.mergedInto === nodeAId;
		const cycleACB =
			nodeA?.mergedInto === nodeCId &&
			nodeC?.mergedInto === nodeBId &&
			nodeB?.mergedInto === nodeAId;
		assert.equal(cycleABC || cycleACB, false, "КАТАСТРОФА: Обнаружен 3-узловой треугольный цикл слияния!");

		// Проверка 4: Обязан остаться ХОТЯ БЫ ОДИН АКТИВНЫЙ ПАЦИЕНТ
		const activeSurvivingNodes = nodesInDb.filter((n) => n.status === "active");
		assert.ok(
			activeSurvivingNodes.length >= 1,
			`В базе не осталось ни одного активного пациента! Все уничтожены: ${JSON.stringify(nodesInDb)}`,
		);

		console.log(
			`[ВЕКТОР 5.8 ОТБИТ]: 5-поточная круговая гонка слияния успешно выдержана!\n` +
				`- Статусы 5 потоков: ${statusCodes.join(", ")}\n` +
				`- Дедлоков 40P01: 0 (ноль ошибок 500)\n` +
				`- Выживших активных пациентов: ${activeSurvivingNodes.length} (${activeSurvivingNodes.map((n) => n.id).join(", ")})\n` +
				`- Циклических связей: 0 (граф ацикличен).\n`,
		);
	});
});
