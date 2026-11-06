/**
 * deepRoutesPrivacyAudit.test.ts
 *
 * Тотальный регрессионный пентест 152-ФЗ / 323-ФЗ и межклинической изоляции арендаторов (Multi-Tenant Isolation):
 *
 * БЛОК 1 (RBAC & 152-ФЗ / 323-ФЗ Врачебная тайна):
 * 1. GET /api/diaries/visit/:visitId под маркетологом -> 403 Forbidden
 * 2. GET /api/diaries/:id/revisions под маркетологом -> 403 Forbidden
 * 3. GET /api/xray/scans под маркетологом -> 403 Forbidden
 * 4. GET /api/xray/scans/:id под маркетологом -> 403 Forbidden
 * 5. GET /api/anesthesia/patients/:patientId/logs под маркетологом -> 403 Forbidden
 * 6. POST /api/anesthesia/patients/:patientId/logs под маркетологом -> 403 Forbidden
 * 7. GET /api/clinical/implants/patient/:patientId под маркетологом -> 403 Forbidden
 * 8. POST /api/clinical/implants/installations под маркетологом -> 403 Forbidden
 * 9. POST /api/documents под маркетологом -> 403 Forbidden
 * 10. Проверка юридически значимой фиксации чтения дневника врачом в audit_events (200 OK)
 *
 * БЛОК 2 (MULTI-TENANT ISOLATION: Защита от межклинических утечек между организацией А и Б):
 * 11. GET /api/patients/:patientIdB под токеном клиники А -> 404 Not Found (ноль утечки ПДн чужого пациента)
 * 12. PUT /api/patients/:patientIdB под токеном клиники А -> 404 Not Found (запрет мутации чужой карточки)
 * 13. GET /api/diaries/visit/:visitIdB под токеном клиники А -> 404 VisitNotFound (чужой дневник недостижим)
 * 14. GET /api/treatment-plans/:planIdB под токеном клиники А -> 404 TreatmentPlanNotFound
 * 15. PUT /api/clinical/lab-orders/:labOrderIdB под токеном клиники А -> 404 LabOrderNotFound
 * 16. GET /api/invoices/:invoiceIdB под токеном клиники А -> 404 InvoiceNotFound
 * 17. Контрольный опыт целостности: Врач клиники А успешно читает СВОЕГО пациента, СВОЙ план лечения и СВОЙ счёт (200 OK)
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	auditEvents,
	labOrders,
	organizations,
	patientInvoices,
	patients,
	treatmentPlans,
	users,
	visitDiaries,
	visits,
	xrayScans,
} from "../../db/schema.js";
import { registerAnesthesiaRoutes } from "../../routes/anesthesia.js";
import { registerClinicalImplantRoutes } from "../../routes/clinicalImplants.js";
import registerDiaryRoutes from "../../routes/diary.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
import { registerInvoiceRoutes } from "../../routes/invoices.js";
import { registerLabRoutes } from "../../routes/lab.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { treatmentPlanRoutes } from "../../routes/treatmentPlanRoutes.js";
import { registerXrayRoutes } from "../../routes/xray.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { registerMedicalSecrecyPayloadStripping } from "../../security/medicalSecrecyWarden.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { registerRouteNotFoundHandler } from "../../utils/routeNotFound.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "deepPrivacy";
const ORG_A = fixtureUuid(NAMESPACE, 1);
const ORG_B = fixtureUuid(NAMESPACE, 2);

const MARKETER_A = fixtureUuid(NAMESPACE, 3);
const DOCTOR_A = fixtureUuid(NAMESPACE, 4);
const PATIENT_A = fixtureUuid(NAMESPACE, 5);
const VISIT_A = fixtureUuid(NAMESPACE, 6);
const DIARY_A = fixtureUuid(NAMESPACE, 7);
const SCAN_A = fixtureUuid(NAMESPACE, 8);
const PLAN_A = fixtureUuid(NAMESPACE, 9);
const LAB_ORDER_A = fixtureUuid(NAMESPACE, 10);
const INVOICE_A = fixtureUuid(NAMESPACE, 11);

const DOCTOR_B = fixtureUuid(NAMESPACE, 12);
const PATIENT_B = fixtureUuid(NAMESPACE, 13);
const VISIT_B = fixtureUuid(NAMESPACE, 14);
const DIARY_B = fixtureUuid(NAMESPACE, 15);
const PLAN_B = fixtureUuid(NAMESPACE, 16);
const LAB_ORDER_B = fixtureUuid(NAMESPACE, 17);
const INVOICE_B = fixtureUuid(NAMESPACE, 18);

const FOREIGN_PATIENT_NAME = "Чужой Пациент Секретович";
const FOREIGN_PATIENT_PHONE = "+79998887766";

describe("152-FZ / 323-ФЗ Deep Routes Privacy Audit & Multi-Tenant Isolation", () => {
	let app: FastifyInstance;
	let clinicTokenA: string;
	let marketerStaffTokenA: string;
	let doctorStaffTokenA: string;
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		// 1. Сеем данные организации А
		await withFixtureTenant(ORG_A, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORG_A,
					name: "Клиника Аудита А (Первичная)",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values([
					{
						id: MARKETER_A,
						organizationId: ORG_A,
						fullName: "Маркетолог Взломщик М.В.",
						role: "marketer",
					},
					{
						id: DOCTOR_A,
						organizationId: ORG_A,
						fullName: "Врач Стоматолог В.С.",
						role: "doctor",
					},
				])
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_A,
					organizationId: ORG_A,
					fullName: "Свой Пациент А.А.",
					birthDate: "1985-05-15",
					phone: "+79991112233",
					status: "active",
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					status: "signed",
					diagnosis: "K02.1 Кариес дентина",
				})
				.onConflictDoNothing();

			await db
				.insert(visitDiaries)
				.values({
					id: DIARY_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					visitId: VISIT_A,
					doctorId: DOCTOR_A,
					diagnosisIcd10: "K02.1",
					isLocked: true,
				})
				.onConflictDoNothing();

			await db
				.insert(xrayScans)
				.values({
					id: SCAN_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					visitId: VISIT_A,
					status: "done",
					aiReport: "Кариес дентина зуба 36, полость II класса",
					imageDataUri:
						"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
				})
				.onConflictDoNothing();

			await db
				.insert(treatmentPlans)
				.values({
					id: PLAN_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					doctorId: DOCTOR_A,
					name: "План терапевтического лечения А",
					title: "Лечение кариеса зуба 36",
					status: "Draft",
					totalPrice: "15000.00",
					totalPriceRub: "15000.00",
				})
				.onConflictDoNothing();

			await db
				.insert(labOrders)
				.values({
					id: LAB_ORDER_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					doctorId: DOCTOR_A,
					secureToken: `lab-token-a-${LAB_ORDER_A}`,
					toothFdi: "36",
					material: "e.max CAD",
					colorVita: "A2",
					status: "draft",
					priceRub: 12000,
					labCostRub: 5000,
				})
				.onConflictDoNothing();

			await db
				.insert(patientInvoices)
				.values({
					id: INVOICE_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					visitId: VISIT_A,
					totalAmountRub: 15000,
					totalRub: "15000.00",
					status: "draft",
				})
				.onConflictDoNothing();
		});

		// 2. Сеем данные организации Б (чужой клиники)
		await withFixtureTenant(ORG_B, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORG_B,
					name: "Клиника Аудита Б (Чужая организация)",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values({
					id: DOCTOR_B,
					organizationId: ORG_B,
					fullName: "Врач Чужой Клиники Б.Б.",
					role: "doctor",
				})
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_B,
					organizationId: ORG_B,
					fullName: FOREIGN_PATIENT_NAME,
					birthDate: "1990-10-20",
					phone: FOREIGN_PATIENT_PHONE,
					status: "active",
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_B,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					status: "signed",
					diagnosis: "K04.0 Пульпит зуба 46",
				})
				.onConflictDoNothing();

			await db
				.insert(visitDiaries)
				.values({
					id: DIARY_B,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					visitId: VISIT_B,
					doctorId: DOCTOR_B,
					diagnosisIcd10: "K04.0",
					isLocked: true,
				})
				.onConflictDoNothing();

			await db
				.insert(treatmentPlans)
				.values({
					id: PLAN_B,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					doctorId: DOCTOR_B,
					name: "План протезирования Б",
					title: "Коронка из диоксида циркония на зуб 46",
					status: "Draft",
					totalPrice: "45000.00",
					totalPriceRub: "45000.00",
				})
				.onConflictDoNothing();

			await db
				.insert(labOrders)
				.values({
					id: LAB_ORDER_B,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					doctorId: DOCTOR_B,
					secureToken: `lab-token-b-${LAB_ORDER_B}`,
					toothFdi: "46",
					material: "Zirconia Multi-layer",
					colorVita: "A3",
					status: "draft",
					priceRub: 25000,
					labCostRub: 10000,
				})
				.onConflictDoNothing();

			await db
				.insert(patientInvoices)
				.values({
					id: INVOICE_B,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					visitId: VISIT_B,
					totalAmountRub: 45000,
					totalRub: "45000.00",
					status: "draft",
				})
				.onConflictDoNothing();
		});

		const secret = authTokenSecret();
		clinicTokenA = signToken({ organizationId: ORG_A }, secret);
		marketerStaffTokenA = signToken(
			{
				organizationId: ORG_A,
				userId: MARKETER_A,
				role: "marketer",
				fullName: "Маркетолог Взломщик М.В.",
			},
			secret,
		);
		doctorStaffTokenA = signToken(
			{
				organizationId: ORG_A,
				userId: DOCTOR_A,
				role: "doctor",
				fullName: "Врач Стоматолог В.С.",
			},
			secret,
		);

		app = createTenantTestApp();
		registerRouteNotFoundHandler(app);
		registerMedicalSecrecyPayloadStripping(app);
		await registerDiaryRoutes(app);
		await registerXrayRoutes(app);
		await registerAnesthesiaRoutes(app);
		await registerClinicalImplantRoutes(app);
		await registerDocumentRoutes(app);
		await registerPatientRoutes(app);
		await app.register(treatmentPlanRoutes);
		await registerLabRoutes(app);
		await registerInvoiceRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
	});

	// =========================================================================
	// РАЗДЕЛ 1: RBAC МАТРИЦА 152-ФЗ / 323-ФЗ (БЛОКИРОВКА НЕКЛИНИЧЕСКИХ РОЛЕЙ)
	// =========================================================================

	test("1. GET /api/diaries/visit/:visitId under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/diaries/visit/${VISIT_A}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен читать дневник приёма! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.diary.read");
	});

	test("2. GET /api/diaries/:id/revisions under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/diaries/${DIARY_A}/revisions`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен читать ревизии дневника! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.diary.read");
	});

	test("3. GET /api/xray/scans under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/xray/scans?patientId=${PATIENT_A}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен получать рентгеновские снимки! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.xray.read");
	});

	test("4. GET /api/xray/scans/:id under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/xray/scans/${SCAN_A}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен открывать детальный снимок! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.xray.read");
	});

	test("5. GET /api/anesthesia/patients/:patientId/logs under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/anesthesia/patients/${PATIENT_A}/logs`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен читать протокол анестезии! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.anesthesia.read");
	});

	test("6. POST /api/anesthesia/patients/:patientId/logs under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/anesthesia/patients/${PATIENT_A}/logs`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerStaffTokenA,
			},
			payload: {
				drug: "articaine",
				carpulesAdministered: 1,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен оформлять протокол анестезии! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.anesthesia.write");
	});

	test("7. GET /api/clinical/implants/patient/:patientId under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/clinical/implants/patient/${PATIENT_A}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен открывать имплантологический паспорт! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.implants.read");
	});

	test("8. POST /api/clinical/implants/installations under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/clinical/implants/installations`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerStaffTokenA,
			},
			payload: {
				patientId: PATIENT_A,
				toothNumberFdi: 36,
				implantSystem: "Nobel Biocare",
				finalInsertionTorqueNcm: 35,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен регистрировать протокол имплантации! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.implants.write");
	});

	test("9. POST /api/documents under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/documents`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerStaffTokenA,
			},
			payload: {
				patientId: PATIENT_A,
				type: "outpatient_card",
				title: "Медицинская карта приёма",
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен создавать медицинские документы! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.document.write");
	});

	test("10. Legitimate Doctor access is permitted (200 OK) and logged to audit trail", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/diaries/visit/${VISIT_A}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
		});

		assert.strictEqual(res.statusCode, 200, "Лечащий врач должен иметь законный доступ к своему дневнику");

		const events = await withFixtureTenant(ORG_A, async () => {
			return await db
				.select()
				.from(auditEvents)
				.where(
					and(
						eq(auditEvents.organizationId, ORG_A),
						eq(auditEvents.action, "VIEW_DIARY_043U"),
					),
				)
				.limit(5);
		});

		assert.ok(events.length > 0, "Журнал audit_events обязан зафиксировать факт законного чтения дневника врачом!");
	});

	// =========================================================================
	// РАЗДЕЛ 2: МЕЖКЛИНИЧЕСКАЯ ИЗОЛЯЦИЯ АРЕНДАТОРОВ (MULTI-TENANT ISOLATION)
	// =========================================================================

	test("11. Multi-Tenant Isolation: GET /api/patients/:patientIdB from Org A returns 404 (zero PII leakage)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_B}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			404,
			`Доступ к пациенту чужой организации обязан возвращать 404! Получен: ${res.statusCode}`,
		);
		// Проверяем, что в теле ответа НЕТ ни ФИО, ни номера телефона чужого пациента
		assert.strictEqual(
			res.payload.includes(FOREIGN_PATIENT_NAME),
			false,
			"В теле 404 ответа не должно утекать имя чужого пациента!",
		);
		assert.strictEqual(
			res.payload.includes(FOREIGN_PATIENT_PHONE),
			false,
			"В теле 404 ответа не должно утекать телефон чужого пациента!",
		);
	});

	test("12. Multi-Tenant Isolation: PUT /api/patients/:patientIdB from Org A is REJECTED with 404", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "PUT",
			url: `/api/patients/${PATIENT_B}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
			payload: {
				fullName: "Взлом Карточки Чужой Клиники",
			},
		});

		assert.strictEqual(
			res.statusCode,
			404,
			`Попытка изменения чужого пациента обязана возвращать 404! Получен: ${res.statusCode}`,
		);

		// Проверяем в базе клиники Б, что данные не изменились
		const [patientB] = await withFixtureTenant(ORG_B, async () => {
			return await db.select().from(patients).where(eq(patients.id, PATIENT_B));
		});
		assert.strictEqual(patientB?.fullName, FOREIGN_PATIENT_NAME, "ФИО чужого пациента не должно было измениться!");
	});

	test("13. Multi-Tenant Isolation: GET /api/diaries/visit/:visitIdB from Org A returns 404 VisitNotFound", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/diaries/visit/${VISIT_B}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			404,
			`Чтение дневника приёма чужой клиники обязано блокироваться 404! Получен: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "VisitNotFound");
	});

	test("14. Multi-Tenant Isolation: GET /api/treatment-plans/:planIdB from Org A returns 404 TreatmentPlanNotFound", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/treatment-plans/${PLAN_B}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			404,
			`Чтение плана лечения чужой клиники обязано блокироваться 404! Получен: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "TreatmentPlanNotFound");
	});

	test("15. Multi-Tenant Isolation: PUT /api/clinical/lab-orders/:labOrderIdB from Org A returns 404 LabOrderNotFound", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "PUT",
			url: `/api/clinical/lab-orders/${LAB_ORDER_B}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
			payload: {
				status: "in_progress",
			},
		});

		assert.strictEqual(
			res.statusCode,
			404,
			`Модификация наряда ЗТЛ чужой клиники обязана возвращать 404! Получен: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "LabOrderNotFound");
	});

	test("16. Multi-Tenant Isolation: GET /api/invoices/:invoiceIdB from Org A returns 404 InvoiceNotFound", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/invoices/${INVOICE_B}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
		});

		assert.strictEqual(
			res.statusCode,
			404,
			`Чтение счёта чужой клиники обязано блокироваться 404! Получен: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "InvoiceNotFound");
	});

	test("17. Positive Control: Legitimate Doctor from Org A accesses OWN patient, plan, and invoice (200 OK)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// 1. Свой пациент
		const patientRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_A}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
		});
		assert.strictEqual(patientRes.statusCode, 200);
		const patientData = JSON.parse(patientRes.payload);
		assert.strictEqual(patientData.fullName, "Свой Пациент А.А.");

		// 2. Свой план лечения
		const planRes = await app.inject({
			method: "GET",
			url: `/api/treatment-plans/${PLAN_A}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
		});
		assert.strictEqual(planRes.statusCode, 200);
		const planData = JSON.parse(planRes.payload);
		assert.strictEqual(planData.plan.name, "План терапевтического лечения А");

		// 3. Свой счёт
		const invoiceRes = await app.inject({
			method: "GET",
			url: `/api/invoices/${INVOICE_A}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorStaffTokenA,
			},
		});
		assert.strictEqual(invoiceRes.statusCode, 200);
		const invoiceData = JSON.parse(invoiceRes.payload);
		assert.strictEqual(invoiceData.totalAmountRub, 15000);
	});
});
