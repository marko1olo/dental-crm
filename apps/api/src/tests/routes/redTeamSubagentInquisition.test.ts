import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	anesthesiaLogs,
	electronicPrescriptions,
	labItems,
	labOrders,
	organizations,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import { registerAnesthesiaRoutes } from "../../routes/anesthesia.js";
import { registerLabOrderRoutes } from "../../routes/labOrders.js";
import { registerPrescriptionRoutes } from "../../routes/prescriptions.js";
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
 * RED TEAM SUPREME INQUISITOR: PENTEST НА ЭНДПОИНТЫ АНЕСТЕЗИИ, ЗТЛ И РЕЦЕПТОВ
 * ============================================================================
 *
 * 1. Анестезия:
 *    - POST /api/anesthesia/calculate-safety: отрицательный вес, токсическая доза
 *    - POST /api/anesthesia/patients/:patientId/logs: отрицательный вес, чужой/несуществующий visitId
 *    - Изоляция тенантов: попытка добавить/прочесть протокол анестезии пациента другой клиники
 *    - Ролевой барьер (152-ФЗ / 323-ФЗ ст. 13): запрет доступа маркетологам / ресепшену
 *
 * 2. Зуботехническая лаборатория (ЗТЛ):
 *    - POST /api/clinical/lab-orders/:id/items: невалидные номера зубов (< 11, > 85, фантомные 19/20/49)
 *    - Отрицательная цена в наряде ЗТЛ
 *    - Изоляция тенантов: попытка добавить позицию в наряд ЗТЛ чужой клиники
 *    - Изоляция выборки: невозможность утечки нарядов ЗТЛ между клиниками
 *
 * 3. Рецепты (Минздрав 1094н / 63-ФЗ УКЭП):
 *    - POST /api/prescriptions/:id/sign-ukep: подписание рецепта без роли врача (403)
 *    - Изоляция тенантов: подписание рецепта чужой клиники (404)
 */

const FIXTURE = "redTeamSubagentInquisition";
const ORG_A_ID = fixtureUuid(FIXTURE, 1);
const ORG_B_ID = fixtureUuid(FIXTURE, 2);

const DOCTOR_A_ID = fixtureUuid(FIXTURE, 10);
const MARKETER_A_ID = fixtureUuid(FIXTURE, 11);
const RECEPTIONIST_A_ID = fixtureUuid(FIXTURE, 12);
const DOCTOR_B_ID = fixtureUuid(FIXTURE, 20);

const PATIENT_A1_ID = fixtureUuid(FIXTURE, 31);
const PATIENT_A2_ID = fixtureUuid(FIXTURE, 32);
const PATIENT_B1_ID = fixtureUuid(FIXTURE, 41);

const VISIT_A1_ID = fixtureUuid(FIXTURE, 51);
const VISIT_A2_ID = fixtureUuid(FIXTURE, 52);
const VISIT_B1_ID = fixtureUuid(FIXTURE, 53);

const LAB_ORDER_A_ID = fixtureUuid(FIXTURE, 61);
const LAB_ORDER_B_ID = fixtureUuid(FIXTURE, 62);

const PRESCRIPTION_A_ID = fixtureUuid(FIXTURE, 71);

describe("RED TEAM PENTEST: ANESTHESIA, LAB ORDERS (ЗТЛ), PRESCRIPTIONS & TENANT ISOLATION", () => {
	let app: FastifyInstance;
	let tokenDoctorA: string;
	let tokenMarketerA: string;
	let tokenReceptionistA: string;
	let tokenDoctorB: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_A_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				console.warn("[RED_TEAM] PostgreSQL unavailable, skipping suite");
				return;
			}
			throw err;
		}

		async function cleanTables() {
			for (const org of [ORG_A_ID, ORG_B_ID]) {
				try {
					await withFixtureTenant(org, async (tx) => {
						await tx.delete(labItems).where(eq(labItems.organizationId, org));
						await tx.update(electronicPrescriptions)
							.set({ status: "draft", cryptoSignaturePkcs7: null })
							.where(eq(electronicPrescriptions.organizationId, org));
					});
				} catch (e) {
					// ignore
				}
			}
		}

		console.log("[RED_TEAM SETUP] Resetting fixture state...");
		await cleanTables();

		console.log("[RED_TEAM SETUP] Seeding Tenant A and Tenant B fixtures...");
		// Tenant A
		await withFixtureTenant(ORG_A_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_A_ID,
				name: "Клиника А (Red Team Primary)",
				email: "clinic_a@redteam.test",
			}).onConflictDoNothing();

			await tx.insert(users).values([
				{
					id: DOCTOR_A_ID,
					organizationId: ORG_A_ID,
					email: "doc_a@redteam.test",
					fullName: "Доктор Иванов А.С.",
					role: "doctor",
					phone: "+79001110101",
					passwordHash: "hash-doc-a",
				},
				{
					id: MARKETER_A_ID,
					organizationId: ORG_A_ID,
					email: "market_a@redteam.test",
					fullName: "Маркетолог Сидоров М.М.",
					role: "marketer",
					phone: "+79001110102",
					passwordHash: "hash-market-a",
				},
				{
					id: RECEPTIONIST_A_ID,
					organizationId: ORG_A_ID,
					email: "recep_a@redteam.test",
					fullName: "Администратор Козлова А.В.",
					role: "receptionist",
					phone: "+79001110103",
					passwordHash: "hash-recep-a",
				},
			]).onConflictDoNothing();

			await tx.insert(patients).values([
				{
					id: PATIENT_A1_ID,
					organizationId: ORG_A_ID,
					fullName: "Пациент А1 (Клиника А)",
					phone: "+79991110101",
				},
				{
					id: PATIENT_A2_ID,
					organizationId: ORG_A_ID,
					fullName: "Пациент А2 (Клиника А)",
					phone: "+79991110102",
				},
			]).onConflictDoNothing();

			await tx.insert(visits).values([
				{
					id: VISIT_A1_ID,
					organizationId: ORG_A_ID,
					patientId: PATIENT_A1_ID,
					status: "signed",
				},
				{
					id: VISIT_A2_ID,
					organizationId: ORG_A_ID,
					patientId: PATIENT_A2_ID,
					status: "signed",
				},
			]).onConflictDoNothing();

			await tx.insert(anesthesiaLogs).values({
				id: fixtureUuid(FIXTURE, 81),
				organizationId: ORG_A_ID,
				patientId: PATIENT_A1_ID,
				visitId: VISIT_A1_ID,
				doctorId: DOCTOR_A_ID,
				technique: "infiltration",
				drug: "articaine",
				drugBrandName: "Ультракаин Д-С",
				concentrationPct: "4.0",
				vasoconstrictor: "1:200000",
				carpuleVolumeMl: "1.7",
				carpulesAdministered: "1.0",
				totalDoseMg: "68.0",
				maxAllowedDoseMg: "490.0",
				epinephrineMg: "0.0085",
				maxEpinephrineMg: "0.2000",
				toothNumbers: [16],
				notes: "Протокол анестезии Клиники А",
			}).onConflictDoNothing();

			await tx.insert(labOrders).values({
				id: LAB_ORDER_A_ID,
				organizationId: ORG_A_ID,
				patientId: PATIENT_A1_ID,
				doctorId: DOCTOR_A_ID,
				secureToken: `SEC-TOKEN-A-${Date.now()}`,
				toothFdi: "16",
				material: "zirconia_multilayer_gradient",
				colorVita: "A2",
				status: "draft",
				priceRub: 12000,
			}).onConflictDoNothing();

			await tx.insert(electronicPrescriptions).values({
				id: PRESCRIPTION_A_ID,
				organizationId: ORG_A_ID,
				patientId: PATIENT_A1_ID,
				prescribingDoctorId: DOCTOR_A_ID,
				prescriptionNumber: `RX-A-${Date.now()}`,
				formType: "form_107_1_u",
				status: "draft",
				patientFullName: "Пациент А1 (Клиника А)",
				patientBirthDate: "1990-01-01",
				patientCardNumber: "КАРТА-А1-001",
				doctorFullName: "Доктор Иванов А.С.",
				expiresAt: new Date("2026-11-01T00:00:00Z"),
				safetyAuditSnapshotJson: { drug: "Amoxicillin 500mg" },
			}).onConflictDoNothing();
		});

		// Tenant B
		await withFixtureTenant(ORG_B_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_B_ID,
				name: "Клиника Б (Red Team Foreign)",
				email: "clinic_b@redteam.test",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_B_ID,
				organizationId: ORG_B_ID,
				email: "doc_b@redteam.test",
				fullName: "Доктор Петров Б.В.",
				role: "doctor",
				phone: "+79002220201",
				passwordHash: "hash-doc-b",
			}).onConflictDoNothing();

			await tx.insert(patients).values({
				id: PATIENT_B1_ID,
				organizationId: ORG_B_ID,
				fullName: "Пациент Б1 (Клиника Б)",
				phone: "+79992220201",
			}).onConflictDoNothing();

			await tx.insert(visits).values({
				id: VISIT_B1_ID,
				organizationId: ORG_B_ID,
				patientId: PATIENT_B1_ID,
				status: "signed",
			}).onConflictDoNothing();

			await tx.insert(anesthesiaLogs).values({
				id: fixtureUuid(FIXTURE, 82),
				organizationId: ORG_B_ID,
				patientId: PATIENT_B1_ID,
				visitId: VISIT_B1_ID,
				doctorId: DOCTOR_B_ID,
				technique: "mandibular_block",
				drug: "articaine",
				drugBrandName: "Септонест 1:100000",
				concentrationPct: "4.0",
				vasoconstrictor: "1:100000",
				carpuleVolumeMl: "1.7",
				carpulesAdministered: "2.0",
				totalDoseMg: "136.0",
				maxAllowedDoseMg: "490.0",
				epinephrineMg: "0.0340",
				maxEpinephrineMg: "0.2000",
				toothNumbers: [46],
				notes: "СЕКРЕТНЫЙ ПРОТОКОЛ АНЕСТЕЗИИ КЛИНИКИ Б",
			}).onConflictDoNothing();

			await tx.insert(labOrders).values({
				id: LAB_ORDER_B_ID,
				organizationId: ORG_B_ID,
				patientId: PATIENT_B1_ID,
				doctorId: DOCTOR_B_ID,
				secureToken: `SEC-TOKEN-B-${Date.now()}`,
				toothFdi: "46",
				material: "emax_press",
				colorVita: "B1",
				status: "draft",
				priceRub: 18000,
			}).onConflictDoNothing();
		});

		const secret = authTokenSecret();
		tokenDoctorA = signToken({ organizationId: ORG_A_ID, userId: DOCTOR_A_ID, role: "doctor" }, secret, 3600);
		tokenMarketerA = signToken({ organizationId: ORG_A_ID, userId: MARKETER_A_ID, role: "marketer" }, secret, 3600);
		tokenReceptionistA = signToken({ organizationId: ORG_A_ID, userId: RECEPTIONIST_A_ID, role: "receptionist" }, secret, 3600);
		tokenDoctorB = signToken({ organizationId: ORG_B_ID, userId: DOCTOR_B_ID, role: "doctor" }, secret, 3600);

		app = createTenantTestApp();
		await registerAnesthesiaRoutes(app);
		await registerLabOrderRoutes(app);
		await registerPrescriptionRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
	});

	// =========================================================================
	// 1. АНЕСТЕЗИОЛОГИЧЕСКИЙ МОДУЛЬ: КАЛЬКУЛЯТОР И ПРОТОКОЛЫ
	// =========================================================================
	describe("1. ПЕНТЕСТ АНЕСТЕЗИИ: КАЛЬКУЛЯТОР, ВАЛИДАЦИЯ И ЖУРНАЛ", () => {
		it("1.1. Отклоняет расчет безопасности с отрицательным весом пациента (HTTP 400)", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "POST",
				url: "/api/anesthesia/calculate-safety",
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					drug: "articaine",
					patientWeightKg: -70,
					carpulesAdministered: 1.0,
				},
			});

			console.log(`[PENTEST 1.1] calculate-safety negative weight status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.equal(body.message, "Некорректные параметры расчета безопасности анестетика");
		});

		it("1.2. Выявляет токсическую передозировку при превышении максимальной дозы (HTTP 200 с флагом isAnestheticOverdose)", async (t) => {
			if (!dbAvailable) return t.skip();

			// Ребенок 15 кг, пытаются ввести 8 карпул Артикаина (544 мг при макс 75 мг!)
			const res = await app.inject({
				method: "POST",
				url: "/api/anesthesia/calculate-safety",
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					drug: "articaine",
					patientWeightKg: 15,
					patientAgeYears: 5,
					carpulesAdministered: 8.0,
				},
			});

			console.log(`[PENTEST 1.2] calculate-safety toxic overdose status: ${res.statusCode}`);
			assert.equal(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.equal(body.calculation.isAnestheticOverdose, true, "Должен быть выставлен флаг передозировки анестетика");
			assert.ok(body.calculation.clinicalWarnings.some((w: string) => w.includes("ПРЕВЫШЕНА ТОКСИЧЕСКАЯ ДОЗА")));
		});

		it("1.3. Отклоняет создание протокола анестезии с отрицательным весом (HTTP 400)", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "POST",
				url: `/api/anesthesia/patients/${PATIENT_A1_ID}/logs`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					technique: "infiltration",
					drug: "articaine",
					patientWeightKg: -50,
					carpulesAdministered: 1.0,
				},
			});

			console.log(`[PENTEST 1.3] logs negative weight status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.equal(body.message, "Некорректные параметры протокола анестезии");
		});

		it("1.4. Отклоняет создание протокола с несуществующим visitId (HTTP 404)", async (t) => {
			if (!dbAvailable) return t.skip();

			const fakeVisitId = fixtureUuid(FIXTURE, 999);
			const res = await app.inject({
				method: "POST",
				url: `/api/anesthesia/patients/${PATIENT_A1_ID}/logs`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					visitId: fakeVisitId,
					technique: "infiltration",
					drug: "articaine",
					patientWeightKg: 70,
					carpulesAdministered: 1.0,
				},
			});

			console.log(`[PENTEST 1.4] logs fake visitId status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 404);
			const body = JSON.parse(res.body);
			assert.equal(body.message, "Приём не найден в текущей клинике");
		});

		it("1.5. Отклоняет привязку анестезии к приёму другого пациента (HTTP 400)", async (t) => {
			if (!dbAvailable) return t.skip();

			// Приём VISIT_A2 принадлежит Пациенту А2, но мы шлем в URL Пациента А1
			const res = await app.inject({
				method: "POST",
				url: `/api/anesthesia/patients/${PATIENT_A1_ID}/logs`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					visitId: VISIT_A2_ID,
					technique: "infiltration",
					drug: "articaine",
					patientWeightKg: 70,
					carpulesAdministered: 1.0,
				},
			});

			console.log(`[PENTEST 1.5] logs foreign patient visit status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.equal(body.message, "Приём принадлежит другому пациенту");
		});

		it("1.6. Блокирует межклиническую инфильтрацию: создание анестезии для пациента другой клиники (HTTP 404)", async (t) => {
			if (!dbAvailable) return t.skip();

			// Доктор А пытается записать анестезию пациенту PATIENT_B1 Клиники Б
			const res = await app.inject({
				method: "POST",
				url: `/api/anesthesia/patients/${PATIENT_B1_ID}/logs`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					technique: "infiltration",
					drug: "articaine",
					patientWeightKg: 70,
					carpulesAdministered: 1.0,
				},
			});

			console.log(`[PENTEST 1.6] cross-tenant logs creation status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 404);
			const body = JSON.parse(res.body);
			assert.equal(body.message, "Пациент не найден");
		});

		it("1.7. Блокирует доступ к журналу анестезии неклиническому персоналу (маркетолог) по 152-ФЗ / 323-ФЗ (HTTP 403)", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "GET",
				url: `/api/anesthesia/patients/${PATIENT_A1_ID}/logs`,
				headers: { "x-dente-clinic-token": tokenMarketerA, "x-dente-staff-token": tokenMarketerA },
			});

			console.log(`[PENTEST 1.7] non-clinical read anesthesia status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 403);
			const body = JSON.parse(res.body);
			assert.equal(body.error, "PermissionDenied");
			assert.equal(body.permission, "clinical.anesthesia.read");
		});

		it("1.8. Предотвращает межклиническую утечку (Cross-Tenant Leakage) логов анестезии", async (t) => {
			if (!dbAvailable) return t.skip();

			// Доктор А запрашивает логи пациента PATIENT_B1 из Клиники Б
			const res = await app.inject({
				method: "GET",
				url: `/api/anesthesia/patients/${PATIENT_B1_ID}/logs`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
			});

			console.log(`[PENTEST 1.8] cross-tenant logs read status: ${res.statusCode} | logs count: ${JSON.parse(res.body).logs?.length}`);
			assert.equal(res.statusCode, 200);
			const body = JSON.parse(res.body);
			// ВАЖНО: В массиве logs должно быть строго 0 записей чужой клиники!
			assert.equal(body.logs.length, 0, "Логи анестезии Клиники Б ни в коем случае не должны утечь в Клинику А!");
		});
	});

	// =========================================================================
	// 2. ЗУБОТЕХНИЧЕСКАЯ ЛАБОРАТОРИЯ (ЗТЛ): НАРЯДЫ И ПОЗИЦИИ
	// =========================================================================
	describe("2. ПЕНТЕСТ ЗТЛ: ВАЛИДАЦИЯ НОМЕРОВ ЗУБОВ, ЦЕНЫ И ИЗОЛЯЦИЯ", () => {
		it("2.1. Отклоняет добавление позиции ЗТЛ с номером зуба вне диапазона (FDI < 11 или > 85) (HTTP 400)", async (t) => {
			if (!dbAvailable) return t.skip();

			// toothFdi: 5 (< 11)
			const resLow = await app.inject({
				method: "POST",
				url: `/api/clinical/lab-orders/${LAB_ORDER_A_ID}/items`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					toothFdi: 5,
					restorationType: "crown_monolithic",
					material: "zirconia_multilayer_gradient",
				},
			});

			console.log(`[PENTEST 2.1a] lab item toothFdi=5 status: ${resLow.statusCode}`);
			assert.equal(resLow.statusCode, 400);

			// toothFdi: 99 (> 85)
			const resHigh = await app.inject({
				method: "POST",
				url: `/api/clinical/lab-orders/${LAB_ORDER_A_ID}/items`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					toothFdi: 99,
					restorationType: "crown_monolithic",
					material: "zirconia_multilayer_gradient",
				},
			});

			console.log(`[PENTEST 2.1b] lab item toothFdi=99 status: ${resHigh.statusCode}`);
			assert.equal(resHigh.statusCode, 400);
		});

		it("2.2. АУДИТ ДЕФЕКТА: Проверяет валидацию несуществующих номеров зубов внутри диапазона 11..85 (например, зуб 19)", async (t) => {
			if (!dbAvailable) return t.skip();

			// Зуб 19 не существует в природе и в нотации FDI (зубы 11-18)
			const resGhostTooth = await app.inject({
				method: "POST",
				url: `/api/clinical/lab-orders/${LAB_ORDER_A_ID}/items`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					toothFdi: 19,
					restorationType: "crown_monolithic",
					material: "zirconia_multilayer_gradient",
				},
			});

			console.log(
				`[PENTEST 2.2 DEFECT AUDIT] lab item toothFdi=19 (ghost tooth) status: ${resGhostTooth.statusCode}`,
			);
			assert.equal(
				resGhostTooth.statusCode,
				400,
				"Биологически невозможный зуб 19 обязан отклоняться сервером с HTTP 400",
			);
			const body = JSON.parse(resGhostTooth.body);
			assert.match(body.message, /FDI/i);
		});

		it("2.3. Отклоняет добавление позиции ЗТЛ с отрицательной ценой (HTTP 400)", async (t) => {
			if (!dbAvailable) return t.skip();

			const resNegPrice = await app.inject({
				method: "POST",
				url: `/api/clinical/lab-orders/${LAB_ORDER_A_ID}/items`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					toothFdi: 16,
					restorationType: "crown_monolithic",
					material: "zirconia_multilayer_gradient",
					priceRub: -5000,
				},
			});

			console.log(`[PENTEST 2.3] lab item negative price status: ${resNegPrice.statusCode}`);
			assert.equal(resNegPrice.statusCode, 400);
			const body = JSON.parse(resNegPrice.body);
			assert.equal(body.error, "LabItemValidationError");
		});

		it("2.4. Блокирует добавление зубов в чужой наряд ЗТЛ другой клиники (HTTP 404)", async (t) => {
			if (!dbAvailable) return t.skip();

			// Доктор А пытается добавить зуб в заказ LAB_ORDER_B_ID Клиники Б
			const resCrossOrder = await app.inject({
				method: "POST",
				url: `/api/clinical/lab-orders/${LAB_ORDER_B_ID}/items`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					toothFdi: 46,
					restorationType: "crown_monolithic",
					material: "zirconia_multilayer_gradient",
					priceRub: 5000,
				},
			});

			console.log(`[PENTEST 2.4] cross-tenant lab item insert status: ${resCrossOrder.statusCode} | body: ${resCrossOrder.body}`);
			assert.equal(resCrossOrder.statusCode, 404);
			const body = JSON.parse(resCrossOrder.body);
			assert.equal(body.error, "LabOrderNotFound");
		});

		it("2.5. Полная межклиническая изоляция списка заказов ЗТЛ (GET /api/clinical/lab-orders)", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "GET",
				url: "/api/clinical/lab-orders",
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
			});

			console.log(`[PENTEST 2.5] lab-orders list status: ${res.statusCode}`);
			assert.equal(res.statusCode, 200);
			const orders = JSON.parse(res.body);
			assert.ok(Array.isArray(orders));
			assert.ok(orders.every((o: { id: string }) => o.id !== LAB_ORDER_B_ID), "Заказ Клиники Б не должен присутствовать в выдаче Клиники А!");
		});
	});

	// =========================================================================
	// 3. РЕЦЕПТЫ И УКЭП (ПРИКАЗ 1094н / 63-ФЗ)
	// =========================================================================
	describe("3. ПЕНТЕСТ РЕЦЕПТОВ: ПОДПИСАНИЕ УКЭП И РОЛЕВОЙ БАРЬЕР", () => {
		it("3.1. Запрещает подписание рецепта УКЭП неклиническому сотруднику без прав врача (HTTP 403)", async (t) => {
			if (!dbAvailable) return t.skip();

			// Администратор ресепшена пытается подписать рецепт
			const res = await app.inject({
				method: "POST",
				url: `/api/prescriptions/${PRESCRIPTION_A_ID}/sign-ukep`,
				headers: { "x-dente-clinic-token": tokenReceptionistA, "x-dente-staff-token": tokenReceptionistA },
				payload: {
					pkcs7Signature: "MIIBogYJKoZIhvcNAQcCoIIBkzCCAZMCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BBwGg...",
				},
			});

			console.log(`[PENTEST 3.1] sign-ukep without doctor role status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 403);
			const body = JSON.parse(res.body);
			assert.equal(body.error, "PermissionDenied");
			assert.equal(body.permission, "clinical.prescription.sign_ukep");
		});

		it("3.2. Блокирует подписание рецепта чужой клиники (HTTP 404)", async (t) => {
			if (!dbAvailable) return t.skip();

			// Доктор Б из Клиники Б пытается подписать рецепт PRESCRIPTION_A_ID Клиники А
			const res = await app.inject({
				method: "POST",
				url: `/api/prescriptions/${PRESCRIPTION_A_ID}/sign-ukep`,
				headers: { "x-dente-clinic-token": tokenDoctorB, "x-dente-staff-token": tokenDoctorB },
				payload: {
					pkcs7Signature: "MIIBogYJKoZIhvcNAQcCoIIBkzCCAZMCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BBwGg...",
				},
			});

			console.log(`[PENTEST 3.2] sign-ukep foreign clinic prescription status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 404);
			const body = JSON.parse(res.body);
			assert.equal(body.error, "PrescriptionNotFound");
		});

		it("3.3. Легитимное подписание рецепта УКЭП лечащим врачом клиники завершается успехом (HTTP 200)", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "POST",
				url: `/api/prescriptions/${PRESCRIPTION_A_ID}/sign-ukep`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					pkcs7Signature: "MIIBogYJKoZIhvcNAQcCoIIBkzCCAZMCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BBwGg...",
					certificateIssuer: "Минцифры РФ / УЦ Такском",
					signatureAlgorithm: "ГОСТ Р 34.10-2012 (256 бит)",
				},
			});

			console.log(`[PENTEST 3.3] legitimate sign-ukep status: ${res.statusCode}`);
			assert.equal(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.equal(body.success, true);
			assert.equal(body.status, "signed");
			assert.ok(body.id);
		});

		it("3.4. Повторная попытка подписать уже подписанный рецепт отклоняется с конфликтом (HTTP 409)", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "POST",
				url: `/api/prescriptions/${PRESCRIPTION_A_ID}/sign-ukep`,
				headers: { "x-dente-clinic-token": tokenDoctorA, "x-dente-staff-token": tokenDoctorA },
				payload: {
					pkcs7Signature: "ANOTHER_SIGNATURE_ATTEMPT...",
				},
			});

			console.log(`[PENTEST 3.4] double sign-ukep status: ${res.statusCode} | body: ${res.body}`);
			assert.equal(res.statusCode, 409);
			const body = JSON.parse(res.body);
			assert.equal(body.error, "AlreadySigned");
		});
	});
});
