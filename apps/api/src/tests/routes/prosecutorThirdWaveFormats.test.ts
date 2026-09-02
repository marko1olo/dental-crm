import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
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
 * PROSECUTOR 2: ТРЕТЬЯ ВОЛНА АТАКИ — ВАРИАЦИИ ФОРМАТОВ СНИЛС И ТЕЛЕФОНОВ
 * ============================================================================
 *
 * Цель атаки:
 * 1. Проверить инвариантность СНИЛС:
 *    - Стандартный масочный формат: "123-456-789 01"
 *    - Слитный формат из 11 цифр: "12345678901"
 *    - Дефисный формат: "123-456-789-01"
 *    - Размещение СНИЛС в корне запроса против administrativeProfile.snils
 *    - Опечатка в 1 цифру контрольного числа при том же ФИО и дате рождения.
 *
 * 2. Проверить инвариантность форматов телефонных номеров:
 *    - Канонический международный: "+7 (999) 111-22-33"
 *    - Национальный через 8: "89991112233"
 *    - Префикс 7 без плюса: "79991112233"
 *    - Слитный международный: "+79991112233"
 *    - Разделители точками/пробелами: "+7.999.111.22.33"
 *    - Опечатка в 1 цифре телефона при совпадающем ФИО и дате рождения.
 */

const FIXTURE = "prosecutorThirdWave";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);

describe("PROSECUTOR 2: ТРЕТЬЯ ВОЛНА АТАКИ (ФОРМАТЫ СНИЛС И ТЕЛЕФОНОВ)", () => {
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
					name: "Клиника аудита форматов СНИЛС и телефонов (Prosecutor 2 Wave 3)",
				});
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Отделение нормализации",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Стандартов С.А.",
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
	// СЕКТОР 1: СТРЕСС-АТАКА НА ФОРМАТЫ СНИЛС
	// =========================================================================

	test("ВЕКТОР 3.1: Создание первичного пациента со стандартным СНИЛС ('123-456-789 01')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Кузнецов Артем Валерьевич",
				birthDate: "1983-04-10",
				phone: "+7 916 555-01-01",
				snils: "123-456-789 01",
				administrativeProfile: {
					snils: "123-456-789 01",
				},
			},
		});

		assert.equal(response.statusCode, 201, response.body);
		const body = JSON.parse(response.body);
		assert.ok(body.id);
	});

	test("ВЕКТОР 3.2 [АТАКА]: Слитный СНИЛС ('12345678901') при совпадающем ФИО", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Кузнецов Артем Валерьевич",
				snils: "12345678901",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Слитный СНИЛС обошел дедупликацию (${response.statusCode}) вместо 409: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 3.2 ОТБИТ]: Слитный СНИЛС заблокирован кодом 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 3.3 [АТАКА]: Дефисный СНИЛС ('123-456-789-01') в administrativeProfile.snils", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Кузнецов Артем Валерьевич",
				administrativeProfile: {
					snils: "123-456-789-01",
				},
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Дефисный СНИЛС обошел дедупликацию (${response.statusCode}) вместо 409: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 3.3 ОТБИТ]: Дефисный СНИЛС заблокирован кодом 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 3.4 [АТАКА]: СНИЛС с опечаткой в 1 цифру при совпадающем ФИО и ДР", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Кузнецов Артем Валерьевич",
				birthDate: "1983-04-10",
				snils: "123-456-789 02", // опечатка в последней цифре
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Совпадение ФИО и ДР при опечатке в СНИЛС не заблокировано (${response.statusCode})`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 3.4 ОТБИТ]: Опечатка в СНИЛС при совпадении ФИО и ДР заблокирована кодом 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	// =========================================================================
	// СЕКТОР 2: СТРЕСС-АТАКА НА ФОРМАТЫ ТЕЛЕФОНОВ
	// =========================================================================

	test("ВЕКТОР 3.5: Создание первичного пациента с телефоном '+7 (999) 111-22-33'", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Морозов Денис Олегович",
				birthDate: "1994-08-25",
				phone: "+7 (999) 111-22-33",
			},
		});

		assert.equal(response.statusCode, 201, response.body);
		const body = JSON.parse(response.body);
		assert.ok(body.id);
	});

	test("ВЕКТОР 3.6 [АТАКА]: Телефон через национальную восьмёрку ('89991112233')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Морозов Денис Олегович",
				phone: "89991112233",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Формат 8999... создал клон (${response.statusCode}) вместо 409: ${response.body}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 3.6 ОТБИТ]: Телефон 89991112233 заблокирован кодом 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});

	test("ВЕКТОР 3.7 [АТАКА]: Международный номер без плюса ('79991112233')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Морозов Денис Олегович",
				phone: "79991112233",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Формат 7999... создал клон (${response.statusCode}) вместо 409`,
		);
		console.log(`[ВЕКТОР 3.7 ОТБИТ]: Телефон 79991112233 заблокирован кодом 409`);
	});

	test("ВЕКТОР 3.8 [АТАКА]: Слитный международный '+79991112233'", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Морозов Денис Олегович",
				phone: "+79991112233",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Слитный +7999... создал клон (${response.statusCode}) вместо 409`,
		);
		console.log(`[ВЕКТОР 3.8 ОТБИТ]: Телефон +79991112233 заблокирован кодом 409`);
	});

	test("ВЕКТОР 3.9 [АТАКА]: Разделители точками ('+7.999.111.22.33')", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Морозов Денис Олегович",
				phone: "+7.999.111.22.33",
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Телефон с точками создал клон (${response.statusCode}) вместо 409`,
		);
		console.log(`[ВЕКТОР 3.9 ОТБИТ]: Телефон с точками заблокирован кодом 409`);
	});

	test("ВЕКТОР 3.10 [АТАКА]: Опечатка в 1 цифру телефона при совпадающем ФИО и дате рождения", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients",
			headers: clinicHeaders,
			payload: {
				fullName: "Морозов Денис Олегович",
				birthDate: "1994-08-25",
				phone: "+7 999 111-22-34", // опечатка в последней цифре: 4 вместо 3
			},
		});

		assert.equal(
			response.statusCode,
			409,
			`КРИТИЧЕСКИЙ БРАК: Опечатка в 1 цифру телефона при совпадающем ФИО и ДР создала клон (${response.statusCode}) вместо 409`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "PatientDuplicateError");
		console.log(
			`[ВЕКТОР 3.10 ОТБИТ]: Опечатка в 1 цифру номера при совпадении ФИО и ДР заблокирована кодом 409 (уверенность ${body.matchConfidencePercent}%)`,
		);
	});
});
