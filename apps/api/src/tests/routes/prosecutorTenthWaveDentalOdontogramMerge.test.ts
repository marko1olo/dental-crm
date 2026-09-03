import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, desc, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	attachments,
	clinics,
	imagingStudies,
	organizations,
	patients,
	perioCharts,
	toothStateHistory,
	toothStates,
	users,
} from "../../db/schema.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerPatientDuplicateRoutes } from "../../routes/patientDuplicates.js";
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
 * PROSECUTOR 2: ДЕСЯТАЯ ВОЛНА АТАКИ — DENTAL ODONTOGRAM & CLINICAL HISTORY MERGE
 * ============================================================================
 *
 * 1. Целостность зубной формулы (Odontogram Tooth States Collision):
 *    - Пациент Primary и Пациент Duplicate имеют записи по одному и тому же зубу (зуб 36).
 *    - Primary имеет зуб 36 в статусе "Crown" (коронка).
 *    - Duplicate имеет зуб 36 в статусе "Caries" (кариес).
 *    - Duplicate также имеет зуб 14 в статусе "Filled" (у Primary его нет).
 *    - Primary также имеет зуб 21 в статусе "Healthy" (у Duplicate его нет).
 *    - При слиянии:
 *      * Конфликт по зубу 36 разрешается в пользу ОСНОВНОЙ карточки ("Crown").
 *      * Запись дубликата по зубу 36 отбрасывается во избежание дублирования зуба.
 *      * Зуб 14 успешно переносится в Primary.
 *      * В таблице tooth_states у пациента Primary СТРОГО 1 строка на каждый зуб!
 *        Никаких задвоений зуба 36!
 *
 * 2. Непрерывность и неизменность истории зубов (Tooth State History):
 *    - Все исторические события из tooth_state_history (и Primary, и Duplicate)
 *      сохраняются и переносятся на Primary.
 *    - Ноль потерянных записей анамнеза зуба!
 *
 * 3. Перенос пародонтологических карт (Perio Charts):
 *    - Все пародонтологические обследования за разные даты переносятся на Primary.
 *
 * 4. Перенос снимков и файлов (Imaging Studies & Attachments):
 *    - Все рентген-снимки, прицельные снимки (RVG), ОПТГ и файлы переносятся.
 *
 * 5. Верификация через Odontogram API:
 *    - GET /api/patients/:primaryId/tooth-states возвращает актуальную формулу.
 *    - У архивного дубликата зубная формула пуста.
 */

const FIXTURE = "prosecutorWave10";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const CLINIC_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);

const PATIENT_PRIMARY_ID = fixtureUuid(FIXTURE, 10);
const PATIENT_DUPLICATE_ID = fixtureUuid(FIXTURE, 11);

const ATTACHMENT_ID = fixtureUuid(FIXTURE, 20);
const IMAGING_PRIMARY_ID = fixtureUuid(FIXTURE, 21);
const IMAGING_DUPLICATE_ID = fixtureUuid(FIXTURE, 22);

const PERIO_PRIMARY_ID = fixtureUuid(FIXTURE, 30);
const PERIO_DUPLICATE_ID = fixtureUuid(FIXTURE, 31);

describe("PROSECUTOR 2: ДЕСЯТАЯ ВОЛНА (DENTAL ODONTOGRAM & CLINICAL MERGE)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let doctorHeaders: Record<string, string>;
	let databaseAvailable = true;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await registerOdontogramRoutes(app);
		await registerPatientDuplicateRoutes(app);

		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_ID, clinicId: CLINIC_ID },
				authTokenSecret(),
			),
			"x-organization-id": ORG_ID,
			"content-type": "application/json",
		};

		// Токен авторизованного врача для чтения клинических данных (152-ФЗ)
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
					.delete(attachments)
					.where(eq(attachments.organizationId, ORG_ID));
				await db
					.delete(imagingStudies)
					.where(eq(imagingStudies.organizationId, ORG_ID));
				await db
					.delete(perioCharts)
					.where(eq(perioCharts.organizationId, ORG_ID));
				await db
					.delete(toothStateHistory)
					.where(eq(toothStateHistory.organizationId, ORG_ID));
				await db
					.delete(toothStates)
					.where(eq(toothStates.organizationId, ORG_ID));
				await db.delete(patients).where(eq(patients.organizationId, ORG_ID));

				await db
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника стоматологии и одонтологии (Wave 10)",
						clinicSchedule: {
							workHours: [8, 21],
							workingDays: [1, 2, 3, 4, 5, 6, 7],
						},
					})
					.onConflictDoNothing();
				await db
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Стоматологическое отделение",
						timezone: "Europe/Moscow",
					})
					.onConflictDoNothing();
				await db
					.insert(users)
					.values({
						id: DOCTOR_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Стоматолог С.С.",
						role: "doctor",
						isActive: true,
					})
					.onConflictDoNothing();

				// 1. Создаем пациентов: Primary и Duplicate
				await db.insert(patients).values([
					{
						id: PATIENT_PRIMARY_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Основной О.О.",
						phone: "+7 (926) 888-00-01",
						status: "active",
					},
					{
						id: PATIENT_DUPLICATE_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Дубль Д.Д.",
						phone: "+7 (926) 888-00-02",
						status: "active",
					},
				]);

				// 2. Заполняем tooth_states:
				// Primary: зуб 36 ("Crown"), зуб 21 ("Healthy")
				await db.insert(toothStates).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 36,
						state: "Crown",
						surfaces: ["O", "M"],
						notes: "Коронка цирконий 2025",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 21,
						state: "Healthy",
						notes: "Здоров",
					},
				]);

				// Duplicate: зуб 36 ("Caries" - КОНФЛИКТ!), зуб 14 ("Filled" - уникальный)
				await db.insert(toothStates).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 36,
						state: "Caries",
						surfaces: ["O"],
						notes: "Старый кариес из дубликата",
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 14,
						state: "Filled",
						surfaces: ["MOD"],
						notes: "Пломба светоотверждаемая",
					},
				]);

				// 3. Заполняем tooth_state_history:
				// Primary: 2 записи по зубу 36
				await db.insert(toothStateHistory).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 36,
						previousState: "Healthy",
						newState: "Caries",
						changedByUserId: DOCTOR_ID,
						reason: "Первичное обнаружение кариеса",
						changedAt: new Date("2025-01-10T10:00:00.000Z"),
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						toothNumber: 36,
						previousState: "Caries",
						newState: "Crown",
						changedByUserId: DOCTOR_ID,
						reason: "Установка коронки",
						changedAt: new Date("2025-06-15T12:00:00.000Z"),
					},
				]);

				// Duplicate: 1 запись по зубу 36 и 1 запись по зубу 14
				await db.insert(toothStateHistory).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 36,
						previousState: "Healthy",
						newState: "Caries",
						changedByUserId: DOCTOR_ID,
						reason: "Зафиксирован кариес в дублирующей карте",
						changedAt: new Date("2024-11-20T09:00:00.000Z"),
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						toothNumber: 14,
						previousState: "Caries",
						newState: "Filled",
						changedByUserId: DOCTOR_ID,
						reason: "Постановка пломбы",
						changedAt: new Date("2025-03-01T14:00:00.000Z"),
					},
				]);

				// 4. Пародонтологические карты (Perio Charts):
				await db.insert(perioCharts).values([
					{
						id: PERIO_PRIMARY_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						doctorId: DOCTOR_ID,
						chartDate: new Date("2026-01-15T10:00:00.000Z"),
						teethData: { "36": { probingDepthMm: [3, 4, 3] } },
						summaryData: { activePocketsCount: 1 },
						notes: "Пародонтальная карта Primary",
					},
					{
						id: PERIO_DUPLICATE_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						doctorId: DOCTOR_ID,
						chartDate: new Date("2025-08-10T11:00:00.000Z"),
						teethData: { "14": { probingDepthMm: [2, 2, 2] } },
						summaryData: { activePocketsCount: 0 },
						notes: "Пародонтальная карта Duplicate",
					},
				]);

				// 5. Рентген-снимки (Imaging Studies):
				await db.insert(imagingStudies).values([
					{
						id: IMAGING_PRIMARY_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_PRIMARY_ID,
						kind: "opg",
						title: "ОПТГ панорамный снимок",
						capturedAt: new Date("2026-01-10T10:00:00.000Z"),
						sourceKind: "manual_upload",
						sourceName: "Vatech PaX-i",
						status: "available",
					},
					{
						id: IMAGING_DUPLICATE_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_DUPLICATE_ID,
						kind: "periapical",
						title: "Прицельный снимок зуба 36",
						toothCode: "36",
						capturedAt: new Date("2025-05-12T15:30:00.000Z"),
						sourceKind: "sensor_bridge",
						sourceName: "EzSensor",
						status: "available",
					},
				]);

				// 6. Файловое вложение (Attachments):
				await db.insert(attachments).values({
					id: ATTACHMENT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_DUPLICATE_ID,
					fileName: "ct_scan_report.pdf",
					mimeType: "application/pdf",
					storagePath: "/storage/patients/ct_scan_report.pdf",
					sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
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
						.delete(attachments)
						.where(eq(attachments.organizationId, ORG_ID));
					await db
						.delete(imagingStudies)
						.where(eq(imagingStudies.organizationId, ORG_ID));
					await db
						.delete(perioCharts)
						.where(eq(perioCharts.organizationId, ORG_ID));
					await db
						.delete(toothStateHistory)
						.where(eq(toothStateHistory.organizationId, ORG_ID));
					await db
						.delete(toothStates)
						.where(eq(toothStates.organizationId, ORG_ID));
					await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
				});
			} catch {
				// cleanup ignore
			}
		}
		await app.close();
	});

	// =========================================================================
	// ТЕСТ 10.1: ВЫПОЛНЕНИЕ СЛИЯНИЯ И РАЗРЕШЕНИЕ КОНФЛИКТА В TOOTH_STATES
	// =========================================================================

	test("ВЕКТОР 10.1 [ТООTH STATES]: Разрешение конфликта зуба 36: отсутствие дублей зуба в tooth_states", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Запуск слияния Duplicate в Primary
		const mergeRes = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: clinicHeaders,
			payload: {
				primaryPatientId: PATIENT_PRIMARY_ID,
				duplicatePatientId: PATIENT_DUPLICATE_ID,
				reason: "Слияние карточек с ревизией одонтограммы",
			},
		});

		assert.equal(
			mergeRes.statusCode,
			200,
			`Слияние карточек завершилось отказом: ${mergeRes.body}`,
		);
		const mergeBody = JSON.parse(mergeRes.body);
		assert.equal(mergeBody.ok, true);

		// ПРОВЕРКА TOOTH_STATES В POSTGRESQL:
		const primaryToothStates = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					toothNumber: toothStates.toothNumber,
					state: toothStates.state,
					notes: toothStates.notes,
				})
				.from(toothStates)
				.where(eq(toothStates.patientId, PATIENT_PRIMARY_ID))
				.orderBy(toothStates.toothNumber),
		);

		console.log(
			"[POSTGRESQL TOOTH_STATES PRIMARY]:",
			JSON.stringify(primaryToothStates),
		);

		// 1. Должно быть ровно 3 зуба: 14, 21, 36
		assert.equal(
			primaryToothStates.length,
			3,
			`Ожидалось ровно 3 зуба в формуле Primary, получено: ${primaryToothStates.length}`,
		);

		// 2. По зубу 36: обязан сохраниться статус ОСНОВНОЙ карточки ("Crown"), а не устаревший "Caries" из дубля
		const tooth36 = primaryToothStates.find((t) => t.toothNumber === 36);
		assert.ok(tooth36, "Зуб 36 обязан присутствовать");
		assert.equal(
			tooth36.state,
			"Crown",
			`КРИТИЧЕСКИЙ БРАК: Статус зуба 36 перезаписан! Ожидался "Crown", получено: ${tooth36.state}`,
		);

		// 3. Зуб 14 перенесен из дубля
		const tooth14 = primaryToothStates.find((t) => t.toothNumber === 14);
		assert.ok(tooth14, "Зуб 14 обязан быть перенесен из дубля");
		assert.equal(tooth14.state, "Filled");

		// 4. Зуб 21 сохранен от primary
		const tooth21 = primaryToothStates.find((t) => t.toothNumber === 21);
		assert.ok(tooth21, "Зуб 21 обязан присутствовать");
		assert.equal(tooth21.state, "Healthy");

		// 5. ЖЕСТКИЙ ИНВАРИАНТ: В tooth_states ДЛЯ ЗУБА 36 СТРОГО 1 СТРОКА НА ВСЮ БАЗУ
		const allTooth36Rows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: toothStates.id, patientId: toothStates.patientId })
				.from(toothStates)
				.where(
					and(
						eq(toothStates.organizationId, ORG_ID),
						eq(toothStates.toothNumber, 36),
					),
				),
		);
		assert.equal(
			allTooth36Rows.length,
			1,
			`КАТАСТРОФА ДУБЛИРОВАНИЯ: На зуб 36 найдено ${allTooth36Rows.length} строк в tooth_states! Должна быть ровно 1.`,
		);

		// 6. У архивного дубликата осталось ровно 0 строк в tooth_states
		const duplicateToothStates = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: toothStates.id })
				.from(toothStates)
				.where(eq(toothStates.patientId, PATIENT_DUPLICATE_ID)),
		);
		assert.equal(
			duplicateToothStates.length,
			0,
			"У дубликата не должно остаться строк в tooth_states",
		);

		console.log(
			`[ВЕКТОР 10.1 ОТБИТ]: Конфликт по зубу 36 разрешен в пользу основной карточки (Crown). В tooth_states ровно 1 строка на зуб, дублирование исключено на 100%.`,
		);
	});

	// =========================================================================
	// ТЕСТ 10.2: ЦЕЛОСТНОСТЬ ИСТОРИИ ЗУБОВ (TOOTH_STATE_HISTORY)
	// =========================================================================

	test("ВЕКТОР 10.2 [TOOTH HISTORY]: Все 4 исторические записи сохранены без потерь", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const historyRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: toothStateHistory.id,
					toothNumber: toothStateHistory.toothNumber,
					previousState: toothStateHistory.previousState,
					newState: toothStateHistory.newState,
					reason: toothStateHistory.reason,
					changedAt: toothStateHistory.changedAt,
				})
				.from(toothStateHistory)
				.where(eq(toothStateHistory.patientId, PATIENT_PRIMARY_ID))
				.orderBy(desc(toothStateHistory.changedAt)),
		);

		console.log(
			"[POSTGRESQL TOOTH_STATE_HISTORY PRIMARY]:",
			JSON.stringify(historyRows),
		);

		// Ожидаем ровно 4 записи: 2 от Primary + 2 от Duplicate
		assert.equal(
			historyRows.length,
			4,
			`КРИТИЧЕСКАЯ ПОТЕРЯ МЕДИЦИНСКОГО АНАМНЕЗА: Ожидалось 4 записи в истории зубов, получено: ${historyRows.length}`,
		);

		// Проверяем наличие всех ключевых событий анамнеза
		const tooth36History = historyRows.filter((h) => h.toothNumber === 36);
		assert.equal(
			tooth36History.length,
			3,
			"У зуба 36 должно быть ровно 3 исторических этапа (2 от Primary, 1 от Duplicate)",
		);

		const tooth14History = historyRows.filter((h) => h.toothNumber === 14);
		assert.equal(
			tooth14History.length,
			1,
			"У зуба 14 должна быть 1 историческая запись из дубликата",
		);

		// У дубликата должно остаться ровно 0 записей в истории
		const dupHistory = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: toothStateHistory.id })
				.from(toothStateHistory)
				.where(eq(toothStateHistory.patientId, PATIENT_DUPLICATE_ID)),
		);
		assert.equal(dupHistory.length, 0);

		console.log(
			`[ВЕКТОР 10.2 ОТБИТ]: Непрерывность анамнеза подтверждена: 4 из 4 исторических записей сохранены и привязаны к основной карте.`,
		);
	});

	// =========================================================================
	// ТЕСТ 10.3: ПЕРЕНОС ПАРОДОНТОЛОГИЧЕСКИХ КАРТ (PERIO_CHARTS)
	// =========================================================================

	test("ВЕКТОР 10.3 [PERIO CHARTS]: Пародонтологические карты перенесены без потерь данных", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const perioRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({
					id: perioCharts.id,
					chartDate: perioCharts.chartDate,
					notes: perioCharts.notes,
				})
				.from(perioCharts)
				.where(eq(perioCharts.patientId, PATIENT_PRIMARY_ID))
				.orderBy(desc(perioCharts.chartDate)),
		);

		assert.equal(
			perioRows.length,
			2,
			`Ожидалось 2 пародонтологические карты у Primary, получено: ${perioRows.length}`,
		);

		const ids = perioRows.map((r) => r.id);
		assert.ok(ids.includes(PERIO_PRIMARY_ID), "Карта Primary должна остаться");
		assert.ok(
			ids.includes(PERIO_DUPLICATE_ID),
			"Карта Duplicate должна перенестись",
		);

		console.log(
			`[ВЕКТОР 10.3 ОТБИТ]: Пародонтологические карты (2 шт.) успешно объединены в единой карте пациента.`,
		);
	});

	// =========================================================================
	// ТЕСТ 10.4: ПЕРЕНОС СНИМКОВ И ВЛОЖЕНИЙ (IMAGING STUDIES & ATTACHMENTS)
	// =========================================================================

	test("ВЕКТОР 10.4 [IMAGING & FILES]: Рентген-исследования и файлы перенесены на основную карту", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Снимки
		const studies = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: imagingStudies.id, kind: imagingStudies.kind })
				.from(imagingStudies)
				.where(eq(imagingStudies.patientId, PATIENT_PRIMARY_ID)),
		);
		assert.equal(
			studies.length,
			2,
			`Ожидалось 2 исследования у Primary (ОПТГ + прицельный RVG), получено: ${studies.length}`,
		);

		// Файлы
		const files = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: attachments.id, fileName: attachments.fileName })
				.from(attachments)
				.where(eq(attachments.patientId, PATIENT_PRIMARY_ID)),
		);
		assert.equal(
			files.length,
			1,
			`Ожидался 1 прикрепленный файл у Primary, получено: ${files.length}`,
		);
		assert.equal(files[0]?.id, ATTACHMENT_ID);

		console.log(
			`[ВЕКТОР 10.4 ОТБИТ]: Исследования (ОПТГ, RVG) и вложения (1 шт.) перенесены на основную карту без потерь.`,
		);
	});

	// =========================================================================
	// ТЕСТ 10.5: ПРОВЕРКА ЧЕРЕЗ КЛИНИЧЕСКИЙ ODONTOGRAM API (152-ФЗ / 323-ФЗ)
	// =========================================================================

	test("ВЕКТОР 10.5 [ODONTOGRAM API]: Врач видит актуальную сводную одонтограмму через GET API", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Запрос одонтограммы Primary авторизованным врачом
		const response = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_PRIMARY_ID}/tooth-states`,
			headers: doctorHeaders,
		});

		assert.equal(
			response.statusCode,
			200,
			`Ожидался код 200 OK при запросе одонтограммы, получено: ${response.statusCode}`,
		);
		const body = JSON.parse(response.body);
		assert.equal(body.success, true);
		assert.equal(body.states.length, 3);

		const tooth36 = body.states.find(
			(s: { toothNumber: number }) => s.toothNumber === 36,
		);
		assert.equal(tooth36.state, "Crown");

		// Запрос одонтограммы архивного дубликата
		const resDup = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_DUPLICATE_ID}/tooth-states`,
			headers: doctorHeaders,
		});
		assert.equal(resDup.statusCode, 200);
		const dupBody = JSON.parse(resDup.body);
		assert.equal(
			dupBody.states.length,
			0,
			"У архивного дубликата зубная формула должна быть пустой",
		);

		console.log(
			`[ВЕКТОР 10.5 ОТБИТ]: Клинический API одонтограммы возвращает чистую консистентную зубную формулу с коронкой на 36 зубе.`,
		);
	});
});
