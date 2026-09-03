import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patientInvoices,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { registerPatientDuplicateRoutes } from "../../routes/patientDuplicates.js";
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
 * PROSECUTOR 2: ДЕВЯТАЯ ВОЛНА АТАКИ — MERGE COLLISION & FINANCIAL INTEGRITY
 * ============================================================================
 *
 * 1. Коллизии в расписании при слиянии карточек (Schedule Collision Attack):
 *    - Пациент А и Пациент Б имеют пересекающиеся активные приемы на одно время
 *      к разным врачам в разных креслах.
 *    - Попытка слияния карточек ОБЯЗАНА блокироваться с кодом 409 Conflict
 *      из-за нарушения 4D GiST exclusion constraint (один человек не может
 *      одновременно быть у двух врачей).
 *    - Транзакция обязана откатиться целиком: ни одна карточка не изменяется.
 *
 * 2. Слияние с отмененным пересекающимся приёмом:
 *    - Если пересекающийся приём отменен (cancelled), слияние разрешено.
 *
 * 3. Финансовая целостность и балансы (Financial Exactness & No Duplicates):
 *    - Суммирование сальдо, долгов и авансов с точностью до копейки.
 *    - Отсутствие дублирования транзакций платежей и строк лечения.
 *    - Проверка сохранения количества исходных проводок.
 *
 * 4. Конкурентная безопасность (Deadlock & Race Condition Prevention):
 *    - Встречные параллельные слияния не вызывают дедлоков PostgreSQL (40P01).
 */

const FIXTURE = "prosecutorWave9";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);

const CHAIR_1_ID = fixtureUuid(FIXTURE, 10);
const CHAIR_2_ID = fixtureUuid(FIXTURE, 11);

const DOCTOR_1_ID = fixtureUuid(FIXTURE, 20);
const DOCTOR_2_ID = fixtureUuid(FIXTURE, 21);

// Пациенты для тестов расписания (Векторы 9.1 и 9.2)
const PATIENT_A_ID = fixtureUuid(FIXTURE, 30);
const PATIENT_B_ID = fixtureUuid(FIXTURE, 31);
const APPT_A_ID = fixtureUuid(FIXTURE, 32);
const APPT_B_ID = fixtureUuid(FIXTURE, 33);

// Пациенты для проверки финансов (Вектор 9.3)
const PATIENT_C_ID = fixtureUuid(FIXTURE, 40);
const PATIENT_D_ID = fixtureUuid(FIXTURE, 41);

// Пациенты для проверки счетов (Вектор 9.4)
const PATIENT_E_ID = fixtureUuid(FIXTURE, 50);
const PATIENT_F_ID = fixtureUuid(FIXTURE, 51);

// Пациенты для конкурентной гонки (Вектор 9.5)
const PATIENT_G_ID = fixtureUuid(FIXTURE, 60);
const PATIENT_H_ID = fixtureUuid(FIXTURE, 61);

describe("PROSECUTOR 2: ДЕВЯТАЯ ВОЛНА (MERGE COLLISION & FINANCIAL INTEGRITY)", () => {
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
					.delete(patientInvoices)
					.where(eq(patientInvoices.organizationId, ORG_ID));
				await db
					.delete(payments)
					.where(eq(payments.organizationId, ORG_ID));
				await db
					.delete(treatmentItems)
					.where(eq(treatmentItems.organizationId, ORG_ID));
				await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
				await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
				await db.delete(users).where(eq(users.organizationId, ORG_ID));
			});
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника судебной экспертизы (Wave 9)",
					clinicSchedule: {
						workHours: [8, 21],
						workingDays: [1, 2, 3, 4, 5, 6, 7],
					},
				});
				await db.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главный клинический корпус",
					timezone: "Europe/Moscow",
				});
				await db.insert(chairs).values([
					{
						id: CHAIR_1_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло Хирургии",
						isActive: true,
					},
					{
						id: CHAIR_2_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло Терапии",
						isActive: true,
					},
				]);
				await db.insert(users).values([
					{
						id: DOCTOR_1_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Хирург Х.Х.",
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
					},
					{
						id: DOCTOR_2_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Терапевт Т.Т.",
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
					},
				]);

				// Пациенты А и Б (для теста расписания)
				await db.insert(patients).values([
					{
						id: PATIENT_A_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Альфа А.А.",
						phone: "+7 (926) 111-00-01",
						status: "active",
					},
					{
						id: PATIENT_B_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Бета Б.Б.",
						phone: "+7 (926) 111-00-02",
						status: "active",
					},
				]);

				// Пациенты C и D (для теста финансовых балансов)
				await db.insert(patients).values([
					{
						id: PATIENT_C_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Смирнов С.С. (Должник)",
						phone: "+7 (926) 222-00-01",
						status: "active",
					},
					{
						id: PATIENT_D_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Дмитриев Д.Д. (Аванс)",
						phone: "+7 (926) 222-00-02",
						status: "active",
					},
				]);

				// Пациенты E и F (для теста счетов)
				await db.insert(patients).values([
					{
						id: PATIENT_E_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Егоров Е.Е.",
						phone: "+7 (926) 333-00-01",
						status: "active",
					},
					{
						id: PATIENT_F_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Федоров Ф.Ф.",
						phone: "+7 (926) 333-00-02",
						status: "active",
					},
				]);

				// Пациенты G и H (для теста конкурентной гонки)
				await db.insert(patients).values([
					{
						id: PATIENT_G_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Григорьев Г.Г.",
						phone: "+7 (926) 444-00-01",
						status: "active",
					},
					{
						id: PATIENT_H_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Харитонов Х.Х.",
						phone: "+7 (926) 444-00-02",
						status: "active",
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
						.delete(patientInvoices)
						.where(eq(patientInvoices.organizationId, ORG_ID));
					await db
						.delete(payments)
						.where(eq(payments.organizationId, ORG_ID));
					await db
						.delete(treatmentItems)
						.where(eq(treatmentItems.organizationId, ORG_ID));
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
	// СЕКТОР 1: КОЛЛИЗИИ В РАСПИСАНИИ ПРИ СЛИЯНИИ
	// =========================================================================

	test("ВЕКТОР 9.1 [SCHEDULE COLLISION]: Слияние карточек с активными пересекающимися приёмами блокируется 409", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Создаем два активных пересекающихся приёма:
		// Пациент А: 10:00 - 11:00 (Доктор 1, Кресло 1)
		// Пациент Б: 10:30 - 11:30 (Доктор 2, Кресло 2) - нахлест 30 минут!
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(appointments).values([
				{
					id: APPT_A_ID,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					patientId: PATIENT_A_ID,
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_1_ID,
					startsAt: new Date("2026-12-01T10:00:00.000Z"),
					endsAt: new Date("2026-12-01T11:00:00.000Z"),
					status: "planned",
					reason: "Приём Пациента А",
				},
				{
					id: APPT_B_ID,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					patientId: PATIENT_B_ID,
					doctorUserId: DOCTOR_2_ID,
					chairId: CHAIR_2_ID,
					startsAt: new Date("2026-12-01T10:30:00.000Z"),
					endsAt: new Date("2026-12-01T11:30:00.000Z"),
					status: "planned",
					reason: "Приём Пациента Б",
				},
			]);
		});

		// Попытка слияния Пациента А в Пациента Б
		const mergeResponse = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: PATIENT_B_ID,
				duplicatePatientId: PATIENT_A_ID,
				reason: "Попытка объединить карточки с пересекающимся расписанием",
			},
		});

		assert.equal(
			mergeResponse.statusCode,
			409,
			`Ожидался код 409 Conflict из-за конфликта расписания, получено ${mergeResponse.statusCode}: ${mergeResponse.body}`,
		);
		const body = JSON.parse(mergeResponse.body);
		assert.equal(body.error, "PatientMergeRejected");
		assert.match(body.message, /exclusion constraint|appointments|отменено/i);

		// ПРОВЕРКА ЦЕЛОСТНОСТИ И АТОМАРНОГО ОТКАТА (ROLLBACK VERIFICATION):
		const [patientA, patientB] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: patients.id,
					status: patients.status,
					mergedInto: patients.mergedIntoPatientId,
				})
				.from(patients)
				.where(or(eq(patients.id, PATIENT_A_ID), eq(patients.id, PATIENT_B_ID))),
		);

		const rowA = patientA?.id === PATIENT_A_ID ? patientA : patientB;
		const rowB = patientB?.id === PATIENT_B_ID ? patientB : patientA;

		assert.equal(rowA?.status, "active", "Пациент А обязан остаться active");
		assert.equal(rowA?.mergedInto, null, "Пациент А не должен иметь mergedInto");
		assert.equal(rowB?.status, "active", "Пациент Б обязан остаться active");
		assert.equal(rowB?.mergedInto, null, "Пациент Б не должен иметь mergedInto");

		// Приёмы не должны быть перенесены
		const [apptA, apptB] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: appointments.id, patientId: appointments.patientId })
				.from(appointments)
				.where(or(eq(appointments.id, APPT_A_ID), eq(appointments.id, APPT_B_ID))),
		);
		const recA = apptA?.id === APPT_A_ID ? apptA : apptB;
		const recB = apptB?.id === APPT_B_ID ? apptB : apptA;

		assert.equal(
			recA?.patientId,
			PATIENT_A_ID,
			"Приём А обязан остаться у Пациента А",
		);
		assert.equal(
			recB?.patientId,
			PATIENT_B_ID,
			"Приём Б обязан остаться у Пациента Б",
		);

		console.log(
			`[ВЕКТОР 9.1 ОТБИТ]: Попытка слияния при пересечении приёмов успешно отклонена кодом 409, транзакция полностью откатана без повреждения данных.`,
		);
	});

	test("ВЕКТОР 9.2 [CANCELLED OVERLAP]: Пересечение с отмененным приёмом НЕ блокирует слияние", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Отменяем приём Пациента А
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(appointments)
				.set({ status: "cancelled" })
				.where(eq(appointments.id, APPT_A_ID));
		});

		// Повторная попытка слияния Пациента А в Пациента Б
		const mergeResponse = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: PATIENT_B_ID,
				duplicatePatientId: PATIENT_A_ID,
				reason: "Слияние после отмены конфликтного приёма",
			},
		});

		assert.equal(
			mergeResponse.statusCode,
			200,
			`Ожидался код 200 OK после отмены конфликта, получено ${mergeResponse.statusCode}: ${mergeResponse.body}`,
		);

		// Проверка: Пациент А архивирован, оба приёма теперь принадлежат Пациенту Б
		const [patientA] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					status: patients.status,
					mergedInto: patients.mergedIntoPatientId,
				})
				.from(patients)
				.where(eq(patients.id, PATIENT_A_ID)),
		);

		assert.equal(patientA?.status, "archived");
		assert.equal(patientA?.mergedInto, PATIENT_B_ID);

		const bAppointments = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: appointments.id, status: appointments.status })
				.from(appointments)
				.where(eq(appointments.patientId, PATIENT_B_ID)),
		);

		assert.equal(
			bAppointments.length,
			2,
			"У Пациента Б теперь должно быть оба приёма (1 активный, 1 отмененный)",
		);

		console.log(
			`[ВЕКТОР 9.2]: Слияние с отмененным приёмом успешно выполнено (200 OK), оба приёма аккуратно перенесены.`,
		);
	});

	// =========================================================================
	// СЕКТОР 2: ФИНАНСОВАЯ ЦЕЛОСТНОСТЬ (САЛЬДО, ДОЛГИ И АВАНСЫ)
	// =========================================================================

	test("ВЕКТОР 9.3 [ФИНАНСОВАЯ ТОЧНОСТЬ]: Сальдо, долг и аванс суммируются до копейки без дублирования транзакций", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Пациент C (Должник):
		// - Лечение 1: 1500.50 ₽
		// - Лечение 2: 2250.25 ₽ (Итого лечение: 3750.75 ₽)
		// - Оплата 1: 2000.00 ₽ (Долг: 1750.75 ₽)
		//
		// Пациент D (Аванс):
		// - Лечение 1: 4500.00 ₽
		// - Оплата 1: 3000.00 ₽
		// - Оплата 2: 2500.00 ₽ (Итого оплаты: 5500.00 ₽, Аванс: 1000.00 ₽)

		const itemC1Id = fixtureUuid(FIXTURE, 42);
		const itemC2Id = fixtureUuid(FIXTURE, 43);
		const payC1Id = fixtureUuid(FIXTURE, 44);

		const itemD1Id = fixtureUuid(FIXTURE, 45);
		const payD1Id = fixtureUuid(FIXTURE, 46);
		const payD2Id = fixtureUuid(FIXTURE, 47);

		await withFixtureTenant(ORG_ID, async () => {
			// Лечение C
			await db.insert(treatmentItems).values([
				{
					id: itemC1Id,
					organizationId: ORG_ID,
					patientId: PATIENT_C_ID,
					title: "Удаление зуба сложное",
					priceRub: 1500.5,
					unitPriceRub: 1500.5,
					quantity: "1",
					discountRub: 0,
					status: "completed",
				},
				{
					id: itemC2Id,
					organizationId: ORG_ID,
					patientId: PATIENT_C_ID,
					title: "Анестезия инфильтрационная",
					priceRub: 2250.25,
					unitPriceRub: 2250.25,
					quantity: "1",
					discountRub: 0,
					status: "completed",
				},
			]);
			// Оплата C
			await db.insert(payments).values({
				id: payC1Id,
				organizationId: ORG_ID,
				patientId: PATIENT_C_ID,
				amountRub: 2000.0,
				method: "card",
				status: "paid",
			});

			// Лечение D
			await db.insert(treatmentItems).values({
				id: itemD1Id,
				organizationId: ORG_ID,
				patientId: PATIENT_D_ID,
				title: "Керамическая коронка E-max",
				priceRub: 4500.0,
				unitPriceRub: 4500.0,
				quantity: "1",
				discountRub: 0,
				status: "completed",
			});
			// Оплаты D
			await db.insert(payments).values([
				{
					id: payD1Id,
					organizationId: ORG_ID,
					patientId: PATIENT_D_ID,
					amountRub: 3000.0,
					method: "cash",
					status: "paid",
				},
				{
					id: payD2Id,
					organizationId: ORG_ID,
					patientId: PATIENT_D_ID,
					amountRub: 2500.0,
					method: "card",
					status: "paid",
				},
			]);
		});

		// Слияние Пациента C (Должника) в Пациента D (с авансом)
		const mergeRes = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: PATIENT_D_ID,
				duplicatePatientId: PATIENT_C_ID,
				reason: "Слияние с объединением финансовых балансов",
			},
		});

		assert.equal(
			mergeRes.statusCode,
			200,
			`Слияние карточек C и D завершилось с ошибкой: ${mergeRes.body}`,
		);

		// ПРОВЕРКА ФИНАНСОВОЙ ЦЕЛОСТНОСТИ В БАЗЕ ДАННЫХ:
		const dItems = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: treatmentItems.id,
					priceRub: treatmentItems.priceRub,
					discountRub: treatmentItems.discountRub,
				})
				.from(treatmentItems)
				.where(eq(treatmentItems.patientId, PATIENT_D_ID)),
		);

		const dPayments = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: payments.id,
					amountRub: payments.amountRub,
				})
				.from(payments)
				.where(eq(payments.patientId, PATIENT_D_ID)),
		);

		// 1. Проверка отсутствия дублирования проводок:
		assert.equal(
			dItems.length,
			3,
			`Ожидалось ровно 3 позиции лечения у Пациента D (2 от C + 1 от D), получено: ${dItems.length}`,
		);
		assert.equal(
			dPayments.length,
			3,
			`Ожидалось ровно 3 платежа у Пациента D (1 от C + 2 от D), получено: ${dPayments.length}`,
		);

		// 2. Точный подсчёт сумм в копейках:
		const totalBilledRub = dItems.reduce(
			(sum, item) => sum + Number(item.priceRub) - Number(item.discountRub),
			0,
		);
		const totalPaidRub = dPayments.reduce(
			(sum, pay) => sum + Number(pay.amountRub),
			0,
		);

		// Ожидаемое лечение: 1500.50 + 2250.25 + 4500.00 = 8250.75 ₽
		assert.equal(
			Math.round(totalBilledRub * 100),
			825075,
			`Сумма лечения расходится: ожидалось 8250.75 ₽, получено ${totalBilledRub} ₽`,
		);

		// Ожидаемые оплаты: 2000.00 + 3000.00 + 2500.00 = 7500.00 ₽
		assert.equal(
			Math.round(totalPaidRub * 100),
			750000,
			`Сумма оплат расходится: ожидалось 7500.00 ₽, получено ${totalPaidRub} ₽`,
		);

		// Сальдо (Назначено - Оплачено) = 8250.75 - 7500.00 = 750.75 ₽ долга
		const netBalanceKopecks =
			Math.round(totalBilledRub * 100) - Math.round(totalPaidRub * 100);
		assert.equal(
			netBalanceKopecks,
			75075,
			`Итоговое сальдо пациента D расходится: ожидался долг 750.75 ₽, получено ${netBalanceKopecks / 100} ₽`,
		);

		// У Пациента C не осталось записей
		const cItems = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: treatmentItems.id })
				.from(treatmentItems)
				.where(eq(treatmentItems.patientId, PATIENT_C_ID)),
		);
		const cPayments = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: payments.id })
				.from(payments)
				.where(eq(payments.patientId, PATIENT_C_ID)),
		);

		assert.equal(cItems.length, 0, "У Пациента C не должно остаться позиций лечения");
		assert.equal(cPayments.length, 0, "У Пациента C не должно остаться платежей");

		console.log(
			`[ВЕКТОР 9.3 ОТБИТ]: Финансовая целостность подтверждена: 3 платежа, 3 услуги лечения, итоговое сальдо 750.75 ₽ (точность до копейки, ноль дубликатов).`,
		);
	});

	// =========================================================================
	// СЕКТОР 3: ЦЕЛОСТНОСТЬ СЧЕТОВ (PATIENT INVOICES)
	// =========================================================================

	test("ВЕКТОР 9.4 [СЧЕТА И ЛИЦЕВЫЕ СЧЕТА]: Счета переносятся без потерь и дублей", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const invEId = fixtureUuid(FIXTURE, 52);
		const invFId = fixtureUuid(FIXTURE, 53);

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(patientInvoices).values([
				{
					id: invEId,
					organizationId: ORG_ID,
					patientId: PATIENT_E_ID,
					totalRub: "1111.11",
					totalAmountRub: 1111.11,
					status: "issued",
				},
				{
					id: invFId,
					organizationId: ORG_ID,
					patientId: PATIENT_F_ID,
					totalRub: "2222.22",
					totalAmountRub: 2222.22,
					status: "issued",
				},
			]);
		});

		// Слияние Пациента E в Пациента F
		const res = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: PATIENT_F_ID,
				duplicatePatientId: PATIENT_E_ID,
				reason: "Слияние счетов",
			},
		});

		assert.equal(res.statusCode, 200, `Слияние E и F отклонено: ${res.body}`);

		// Проверка счетов в БД
		const fInvoices = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: patientInvoices.id,
					totalAmountRub: patientInvoices.totalAmountRub,
				})
				.from(patientInvoices)
				.where(eq(patientInvoices.patientId, PATIENT_F_ID)),
		);

		assert.equal(
			fInvoices.length,
			2,
			`Ожидалось ровно 2 счета у Пациента F, получено ${fInvoices.length}`,
		);

		const sumInvoices = fInvoices.reduce(
			(sum, inv) => sum + Number(inv.totalAmountRub),
			0,
		);
		assert.equal(
			Math.round(sumInvoices * 100),
			333333,
			`Сумма счетов расходится: ожидалось 3333.33 ₽, получено ${sumInvoices} ₽`,
		);

		console.log(
			`[ВЕКТОР 9.4 ОТБИТ]: Счета перенесены на единый лицевой счет: ровно 2 счета, сумма 3333.33 ₽.`,
		);
	});

	// =========================================================================
	// СЕКТОР 4: ПАРАЛЛЕЛЬНЫЕ ВСТРЕЧНЫЕ СЛИЯНИЯ (DEADLOCK & RACE SAFETY)
	// =========================================================================

	test("ВЕКТОР 9.5 [CONCURRENT RACE]: Встречные слияния G->H и H->G не вызывают взаимных блокировок (40P01)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Два одновременных запроса слияния в противоположных направлениях
		const [res1, res2] = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/patients/duplicates/merge",
				headers: clinicHeaders,
				payload: {
					primaryPatientId: PATIENT_G_ID,
					duplicatePatientId: PATIENT_H_ID,
					reason: "Гонка 1: слияние H в G",
				},
			}),
			app.inject({
				method: "POST",
				url: "/api/patients/duplicates/merge",
				headers: clinicHeaders,
				payload: {
					primaryPatientId: PATIENT_H_ID,
					duplicatePatientId: PATIENT_G_ID,
					reason: "Гонка 2: слияние G в H",
				},
			}),
		]);

		const statusCodes = [res1.statusCode, res2.statusCode].sort();
		console.log(`[CONCURRENT MERGE RESPONSES]: [${statusCodes.join(", ")}]`);

		// Должно быть ровно 1 x 200 OK и 1 x 409 Conflict
		assert.deepEqual(
			statusCodes,
			[200, 409],
			`Ожидалось ровно 1 успешное слияние (200) и 1 отказ (409), получено: ${JSON.stringify(statusCodes)}`,
		);

		// Проверка на дедлок: в ответах не должно быть ошибки PostgreSQL 40P01 (deadlock detected)
		assert.doesNotMatch(res1.body, /40P01|deadlock/i);
		assert.doesNotMatch(res2.body, /40P01|deadlock/i);

		// Проверка базы данных: одна карточка активна, вторая архивна со ссылкой на первую
		const [patientG, patientH] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: patients.id,
					status: patients.status,
					mergedInto: patients.mergedIntoPatientId,
				})
				.from(patients)
				.where(or(eq(patients.id, PATIENT_G_ID), eq(patients.id, PATIENT_H_ID))),
		);

		const g = patientG?.id === PATIENT_G_ID ? patientG : patientH;
		const h = patientH?.id === PATIENT_H_ID ? patientH : patientG;

		if (res1.statusCode === 200) {
			// Победил G
			assert.equal(g?.status, "active");
			assert.equal(g?.mergedInto, null);
			assert.equal(h?.status, "archived");
			assert.equal(h?.mergedInto, PATIENT_G_ID);
		} else {
			// Победил H
			assert.equal(h?.status, "active");
			assert.equal(h?.mergedInto, null);
			assert.equal(g?.status, "archived");
			assert.equal(g?.mergedInto, PATIENT_H_ID);
		}

		console.log(
			`[ВЕКТОР 9.5 ОТБИТ]: Конкурентные слияния обработаны без дедлока PostgreSQL: детерминированная сортировка UUID гарантирует строгий ACID.`,
		);
	});
});
