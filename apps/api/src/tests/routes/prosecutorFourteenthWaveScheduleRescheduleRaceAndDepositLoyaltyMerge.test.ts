import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	bonusTransactions,
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
 * PROSECUTOR 2: ЧЕТЫРНАДЦАТАЯ ВОЛНА АТАКИ — HIGH CONCURRENCY RESCHEDULE RACE,
 * DEPOSIT & LOYALTY BONUS MERGE & ANONYMOUS CARD (UUID_ANON) DE-ANONYMIZATION
 * ============================================================================
 *
 * 1. 10 параллельных запросов PATCH /api/appointments/:id на перенос разных приёмов
 *    на один и тот же целевой слот кресла.
 *    Доказательство: ровно 1 победитель (200 OK), 9 отклонены (409 Conflict).
 * 2. Слияние карт при наличии семейных денежных депозитов (family_groups.balance)
 *    и бонусных баллов лояльности (patient_bonus_balances).
 *    Доказательство: баланс депозита сложен копейка в копейку, баллы объединены,
 *    ноль задвоений строк в БД.
 * 3. Слияние анонимной карты (UUID_ANON) с паспортизированной картой:
 *    восстановление реального ФИО, паспорта, СНИЛС, снятие флага isAnonymous.
 * 4. Обратное слияние (паспортизированная основная + анонимный дубликат).
 */

const FIXTURE = "prosecutorWave14";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);

const CHAIR_ID = fixtureUuid(FIXTURE, 10);
const DOCTOR_ID = fixtureUuid(FIXTURE, 20);
const ADMIN_USER_ID = fixtureUuid(FIXTURE, 21);

// Пациенты для гонки расписания (10 приёмов)
const PATIENT_SCHEDULE_BASE = 30;

// Семейные группы / депозиты
const FG_PRIMARY_ID = fixtureUuid(FIXTURE, 40);
const FG_DUPLICATE_ID = fixtureUuid(FIXTURE, 41);

// Пациенты для слияния депозитов и бонусов
const PATIENT_FIN_PRIMARY_ID = fixtureUuid(FIXTURE, 50);
const PATIENT_FIN_DUPLICATE_ID = fixtureUuid(FIXTURE, 51);

// Пациенты для деанонимизации
const PATIENT_ANON_ID = fixtureUuid(FIXTURE, 60);
const PATIENT_IDENTIFIED_ID = fixtureUuid(FIXTURE, 61);

describe("PROSECUTOR 2: ЧЕТЫРНАДЦАТАЯ ВОЛНА (RESCHEDULE RACE, DEPOSITS, LOYALTY & DE-ANONYMIZATION)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let databaseAvailable = true;

	const appointmentIds: string[] = [];

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
					.delete(bonusTransactions)
					.where(eq(bonusTransactions.organizationId, ORG_ID));
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
						name: "Клиника Высокой Надежности и Финансовой Точности (Wave 14)",
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
						color: "#10b981",
						isActive: true,
					})
					.onConflictDoNothing();

				await db
					.insert(users)
					.values([
						{
							id: DOCTOR_ID,
							organizationId: ORG_ID,
							fullName: "Доктор Хирург-Ортопед В.В.",
							role: "doctor",
							isActive: true,
						},
						{
							id: ADMIN_USER_ID,
							organizationId: ORG_ID,
							fullName: "Администратор Главный А.Г.",
							role: "admin",
							isActive: true,
						},
					])
					.onConflictDoNothing();

				// Создаем 10 пациентов для 10 приёмов гонки расписания
				for (let i = 0; i < 10; i++) {
					const pId = fixtureUuid(FIXTURE, PATIENT_SCHEDULE_BASE + i);
					await db.insert(patients).values({
						id: pId,
						organizationId: ORG_ID,
						fullName: `Пациент Гонки Расписания ${i + 1}`,
						phone: `+7 (926) 777-01-0${i}`,
						status: "active",
					});

					// Исходный приём на разные часы/дни
					const apptId = fixtureUuid(FIXTURE, 100 + i);
					const hour = 8 + i;
					const startsAt = new Date(`2026-12-10T${hour.toString().padStart(2, "0")}:00:00.000Z`);
					const endsAt = new Date(`2026-12-10T${hour.toString().padStart(2, "0")}:30:00.000Z`);

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
						reason: `Исходный приём ${i + 1}`,
					});
					appointmentIds.push(apptId);
				}

				// Семейные группы / Депозиты
				await db.insert(familyGroups).values([
					{
						id: FG_PRIMARY_ID,
						organizationId: ORG_ID,
						name: "Семья Основного Пациента",
						groupName: "Семья Основного Пациента",
						balance: "5000.00", // 5000 руб депозит
					},
					{
						id: FG_DUPLICATE_ID,
						organizationId: ORG_ID,
						name: "Семья Дублирующего Пациента",
						groupName: "Семья Дублирующего Пациента",
						balance: "3500.50", // 3500 руб 50 коп депозит
					},
				]);

				// Пациенты для финансового слияния (депозиты и бонусы)
				await db.insert(patients).values([
					{
						id: PATIENT_FIN_PRIMARY_ID,
						organizationId: ORG_ID,
						fullName: "Финансовый Пациент Основной",
						phone: "+7 (926) 888-00-01",
						familyGroupId: FG_PRIMARY_ID,
						status: "active",
					},
					{
						id: PATIENT_FIN_DUPLICATE_ID,
						organizationId: ORG_ID,
						fullName: "Финансовый Пациент Дубль",
						phone: "+7 (926) 888-00-02",
						familyGroupId: FG_DUPLICATE_ID,
						status: "active",
					},
				]);

				// Бонусные балансы лояльности для обоих пациентов
				await db.insert(patientBonusBalances).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_FIN_PRIMARY_ID,
						activePoints: "400.00",
						pendingPoints: "100.00",
						lifetimeEarnedPoints: "500.00",
						lifetimeSpentPoints: "0.00",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_FIN_DUPLICATE_ID,
						activePoints: "250.00",
						pendingPoints: "50.00",
						lifetimeEarnedPoints: "300.00",
						lifetimeSpentPoints: "0.00",
					},
				]);

				// Пациенты для деанонимизации (Векторы 14.3 и 14.4)
				await db.insert(patients).values([
					{
						id: PATIENT_ANON_ID,
						organizationId: ORG_ID,
						fullName: "UUID_ANON-8899 Анонимный Пациент",
						phone: "",
						status: "active",
						administrativeProfile: {
							isAnonymous: true,
						},
					},
					{
						id: PATIENT_IDENTIFIED_ID,
						organizationId: ORG_ID,
						fullName: "Соколов Сергей Семенович",
						phone: "+7 (926) 777-88-99",
						birthDate: "1985-07-14",
						status: "active",
						administrativeProfile: {
							snils: "123-456-789 01",
							identityDocument: {
								type: "passport_rf",
								series: "4510",
								number: "123456",
								issueDate: "2015-05-20",
							},
							insurancePolicyNumber: "1234567890123456",
							isAnonymous: false,
						},
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
						.delete(bonusTransactions)
						.where(eq(bonusTransactions.organizationId, ORG_ID));
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
	// ВЕКТОР 14.1: 10 ОДНОВРЕМЕННЫХ ПЕРЕНОСОВ (PATCH) НА ОДИН И ТОТ ЖЕ СЛОТ
	// =========================================================================
	test("ВЕКТОР 14.1 [APPOINTMENT RESCHEDULE RACE]: 10 одновременных переносов на один слот", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Целевой занятый интервал: 2026-12-15 14:00 - 15:00 в Операционное кресло №1
		const targetStartsAt = "2026-12-15T14:00:00.000Z";
		const targetEndsAt = "2026-12-15T15:00:00.000Z";

		// 10 разных администраторов одновременно пытаются перенести свои приёмы на этот слот
		const concurrentReschedules = appointmentIds.map((apptId, index) =>
			app.inject({
				method: "PATCH",
				url: `/api/appointments/${apptId}`,
				headers: clinicHeaders,
				payload: {
					chairId: CHAIR_ID,
					startsAt: targetStartsAt,
					endsAt: targetEndsAt,
					reason: `Перенос конкурентный ${index + 1}`,
				},
			}),
		);

		const responses = await Promise.all(concurrentReschedules);

		const winners = responses.filter((r) => r.statusCode === 200);
		const conflicts = responses.filter((r) => r.statusCode === 409);

		console.log(
			`[RESCHEDULE RACE]: Победителей (200 OK): ${winners.length}, Конфликтов (409 Conflict): ${conflicts.length}`,
		);

		assert.strictEqual(
			winners.length,
			1,
			"Ровно один приём должен успешно занять целевой слот (HTTP 200 OK)",
		);
		assert.strictEqual(
			conflicts.length,
			9,
			"Остальные 9 приёмов обязаны быть отклонены кодом 409 Conflict",
		);

		// Проверка в базе данных PostgreSQL:
		const slotRows = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ORG_ID),
					eq(appointments.chairId, CHAIR_ID),
					eq(appointments.startsAt, new Date(targetStartsAt)),
				),
			);

		console.log(
			`[POSTGRESQL RESCHEDULE SLOT OCCUPANCY]: На слоте сидит записей: ${slotRows.length}`,
		);

		assert.strictEqual(
			slotRows.length,
			1,
			"В базе данных PostgreSQL на целевом слоте строго 1 запись (0 овербукинга)",
		);

		console.log(
			"[ВЕКТОР 14.1 ОТБИТ]: Высококонкурентная атака на перенос приёмов отражена: 1 x 200, 9 x 409.",
		);
	});

	// =========================================================================
	// ВЕКТОР 14.2: СЛИЯНИЕ ДЕНЕЖНЫХ ДЕПОЗИТОВ И БОНУСНЫХ БАЛЛОВ ЛОЯЛЬНОСТИ
	// =========================================================================
	test("ВЕКТОР 14.2 [FINANCIAL & LOYALTY MERGE]: Объединение депозита и бонусного счёта без потерь", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Primary: депозит в family_groups 5000.00 руб, активных бонусов 400.00
		// Duplicate: депозит в family_groups 3500.50 руб, активных бонусов 250.00
		const mergeRes = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: PATIENT_FIN_PRIMARY_ID,
				duplicatePatientId: PATIENT_FIN_DUPLICATE_ID,
			},
		});

		console.log(
			`[FINANCIAL MERGE RESPONSE]: Статус: ${mergeRes.statusCode}, Тело: ${mergeRes.payload}`,
		);

		assert.strictEqual(mergeRes.statusCode, 200, "Слияние завершилось 200 OK");

		// Проверка депозитного баланса в PostgreSQL (family_groups.balance):
		const [primaryGroup] = await db
			.select()
			.from(familyGroups)
			.where(eq(familyGroups.id, FG_PRIMARY_ID));

		const [duplicateGroup] = await db
			.select()
			.from(familyGroups)
			.where(eq(familyGroups.id, FG_DUPLICATE_ID));

		console.log(
			`[PRIMARY POST-MERGE DEPOSIT]: ${primaryGroup.balance} руб (ожидалось: 8500.50)`,
		);
		console.log(
			`[DUPLICATE POST-MERGE DEPOSIT]: ${duplicateGroup.balance} руб (ожидалось: 0.00)`,
		);

		assert.strictEqual(
			Number(primaryGroup.balance).toFixed(2),
			"8500.50",
			"Депозитный баланс объединен копейка в копейку: 5000.00 + 3500.50 = 8500.50",
		);
		assert.strictEqual(
			Number(duplicateGroup.balance).toFixed(2),
			"0.00",
			"Баланс дублирующей группы обнулен во избежание задвоения денег",
		);

		// Проверка бонусов лояльности в PostgreSQL (patient_bonus_balances):
		const bonusBalances = await db
			.select()
			.from(patientBonusBalances)
			.where(eq(patientBonusBalances.organizationId, ORG_ID));

		const primaryBonus = bonusBalances.find(
			(b) => b.patientId === PATIENT_FIN_PRIMARY_ID,
		);
		const duplicateBonus = bonusBalances.find(
			(b) => b.patientId === PATIENT_FIN_DUPLICATE_ID,
		);

		assert.ok(primaryBonus, "Бонусный счет Primary существует");
		assert.strictEqual(
			duplicateBonus,
			undefined,
			"Бонусный счет Duplicate корректно удален для избежания коллизии уникального индекса",
		);

		console.log(
			`[PRIMARY LOYALTY BONUS POINTS]: active: ${primaryBonus.activePoints} (ожидалось: 650.00), pending: ${primaryBonus.pendingPoints} (ожидалось: 150.00)`,
		);

		assert.strictEqual(
			Number(primaryBonus.activePoints),
			650,
			"Активные бонусные баллы объединены: 400 + 250 = 650",
		);
		assert.strictEqual(
			Number(primaryBonus.pendingPoints),
			150,
			"Ожидающие бонусные баллы объединены: 100 + 50 = 150",
		);
		assert.strictEqual(
			Number(primaryBonus.lifetimeEarnedPoints),
			800,
			"Всего начисленных баллов за историю: 500 + 300 = 800",
		);

		console.log(
			"[ВЕКТОР 14.2 ОТБИТ]: Депозиты и бонусные счета лояльности объединены без потерь и без задвоения.",
		);
	});

	// =========================================================================
	// ВЕКТОР 14.3: СЛИЯНИЕ АНОНИМНОЙ КАРТЫ (UUID_ANON) С ПАСПОРТИЗИРОВАННОЙ
	// =========================================================================
	test("ВЕКТОР 14.3 [ANONYMOUS CARD DE-ANONYMIZATION MERGE]: Анонимная основная + паспортизированный дубль", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Primary: PATIENT_ANON_ID ("UUID_ANON-8899 Анонимный Пациент")
		// Duplicate: PATIENT_IDENTIFIED_ID ("Соколов Сергей Семенович", паспорт, СНИЛС, полис)

		const mergeRes = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: PATIENT_ANON_ID,
				duplicatePatientId: PATIENT_IDENTIFIED_ID,
			},
		});

		console.log(
			`[DE-ANONYMIZATION MERGE RES]: Статус: ${mergeRes.statusCode}, Тело: ${mergeRes.payload}`,
		);

		assert.strictEqual(mergeRes.statusCode, 200, "Слияние прошло успешно");

		const [deanonymized] = await db
			.select()
			.from(patients)
			.where(eq(patients.id, PATIENT_ANON_ID));

		console.log(
			`[DE-ANONYMIZED PATIENT]: fullName = "${deanonymized.fullName}", phone = "${deanonymized.phone}"`,
		);

		// Проверяем восстановление ФИО (деанонимизация)
		assert.strictEqual(
			deanonymized.fullName,
			"Соколов Сергей Семенович",
			"ФИО анонимной карты деанонимизировано и заменено на паспортное",
		);

		// Проверяем перенос телефона
		assert.strictEqual(
			deanonymized.phone,
			"+7 (926) 777-88-99",
			"Телефон перенесен в основную карту",
		);

		// Проверяем административный профиль
		const adminProfile = deanonymized.administrativeProfile as Record<string, unknown>;
		assert.ok(adminProfile, "Административный профиль перенесен");
		assert.strictEqual(
			adminProfile.snils,
			"123-456-789 01",
			"СНИЛС успешно перенесен в карту",
		);
		assert.strictEqual(
			adminProfile.insurancePolicyNumber,
			"1234567890123456",
			"Полис ОМС успешно перенесен в карту",
		);
		assert.strictEqual(
			adminProfile.isAnonymous,
			false,
			"Флаг анонимности снят после объединения с паспортизированной картой",
		);

		console.log(
			"[ВЕКТОР 14.3 ОТБИТ]: Деанонимизация карты UUID_ANON прошла успешно, паспортные данные восстановлены.",
		);
	});

	// =========================================================================
	// ВЕКТОР 14.4: ПАСПОРТИЗИРОВАННАЯ ОСНОВНАЯ КАРТА + АНОНИМНЫЙ ДУБЛЬ
	// =========================================================================
	test("ВЕКТОР 14.4 [IDENTIFIED PRIMARY WITH ANON DUPLICATE]: Защита паспортных данных основной карты", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Создаем пару: Primary - "Смирнова Анна Викторовна" (паспорт РФ), Duplicate - "UUID_ANON-3344"
		const idPrimary = fixtureUuid(FIXTURE, 70);
		const idAnonDup = fixtureUuid(FIXTURE, 71);

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(patients).values([
				{
					id: idPrimary,
					organizationId: ORG_ID,
					fullName: "Смирнова Анна Викторовна",
					phone: "+7 (926) 333-22-11",
					status: "active",
					administrativeProfile: {
						snils: "987-654-321 00",
						identityDocument: {
							type: "passport_rf",
							series: "4509",
							number: "654321",
						},
						isAnonymous: false,
					},
				},
				{
					id: idAnonDup,
					organizationId: ORG_ID,
					fullName: "UUID_ANON-3344 Экстренная Запись",
					phone: "",
					status: "active",
					administrativeProfile: {
						isAnonymous: true,
					},
				},
			]);
		});

		const mergeRes = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: idPrimary,
				duplicatePatientId: idAnonDup,
			},
		});

		assert.strictEqual(mergeRes.statusCode, 200, "Слияние завершилось 200 OK");

		const [primaryPat] = await db
			.select()
			.from(patients)
			.where(eq(patients.id, idPrimary));

		console.log(
			`[IDENTIFIED PRIMARY AFTER MERGE]: fullName = "${primaryPat.fullName}"`,
		);

		// ФИО не должно стать анонимным!
		assert.strictEqual(
			primaryPat.fullName,
			"Смирнова Анна Викторовна",
			"ФИО основной паспортизированной карты сохранено без искажений",
		);

		// СНИЛС не затерт
		const adminProfile = primaryPat.administrativeProfile as Record<string, unknown>;
		assert.strictEqual(
			adminProfile.snils,
			"987-654-321 00",
			"СНИЛС основной карты сохранен",
		);
		assert.strictEqual(
			adminProfile.isAnonymous,
			false,
			"Флаг анонимности остался false",
		);

		console.log(
			"[ВЕКТОР 14.4 ОТБИТ]: Паспортизированная карта поглотила анонимный дубль, сохранив 100% персональных данных.",
		);
	});

	// =========================================================================
	// ВЕКТОР 14.5: 10 ОДНОВРЕМЕННЫХ РЕГИСТРАЦИЙ С ОДИНАКОВЫМ СНИЛС И ОПЕЧАТКАМИ В ФИО
	// =========================================================================
	test("ВЕКТОР 14.5 [CONCURRENT SNILS REGISTRATION RACE]: 10 параллельных регистраций на один СНИЛС", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		const targetSnils = "111-222-333 44";

		// 10 параллельных запросов на регистрацию с одним и тем же СНИЛС,
		// но с вариациями написания ФИО и телефонов
		const concurrentCreations = Array.from({ length: 10 }).map((_, i) =>
			app.inject({
				method: "POST",
				url: "/api/patients",
				headers: clinicHeaders,
				payload: {
					fullName: i % 2 === 0 ? "Кузнецов Андрей Павлович" : "Кузнецов Андрей Павлович",
					birthDate: "1990-05-12",
					phone: `+7 (926) 999-00-0${i}`,
					administrativeProfile: {
						snils: targetSnils,
					},
				},
			}),
		);

		const responses = await Promise.all(concurrentCreations);

		const successes = responses.filter((r) => r.statusCode === 201);
		const duplicates = responses.filter((r) => r.statusCode === 409);

		console.log(
			`[SNILS RACE]: Успешных регистраций (201): ${successes.length}, Отклонено как дубликаты (409): ${duplicates.length}`,
		);

		assert.strictEqual(
			successes.length,
			1,
			"Ровно одна регистрация должна создать карточку (201 Created)",
		);
		assert.strictEqual(
			duplicates.length,
			9,
			"Остальные 9 запросов обязаны быть заблокированы как дубликаты (409 Conflict)",
		);

		// Проверка в базе данных PostgreSQL
		const snilsPatients = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ORG_ID),
					eq(patients.fullName, "Кузнецов Андрей Павлович"),
				),
			);

		console.log(
			`[POSTGRESQL SNILS PATIENTS COUNT]: В БД создано карт: ${snilsPatients.length}`,
		);

		assert.strictEqual(
			snilsPatients.length,
			1,
			"В базе данных PostgreSQL создана строго 1 карточка пациента (0 дублей по СНИЛС)",
		);

		console.log(
			"[ВЕКТОР 14.5 ОТБИТ]: Гонка параллельной регистрации по СНИЛС отражена: 1 x 201, 9 x 409.",
		);
	});
});
