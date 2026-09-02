/**
 * deepRoutesPrivacyAudit.test.ts
 *
 * Тотальный регрессионный пентест 152-ФЗ / 323-ФЗ по всем маршрутам Fastify API:
 * 1. GET /api/diaries/visit/:visitId (043/у) под маркетологом -> 403 Forbidden
 * 2. GET /api/diaries/:id/revisions под маркетологом -> 403 Forbidden
 * 3. GET /api/xray/scans под маркетологом -> 403 Forbidden
 * 4. GET /api/xray/scans/:id под маркетологом -> 403 Forbidden
 * 5. GET /api/anesthesia/patients/:patientId/logs под маркетологом -> 403 Forbidden
 * 6. POST /api/anesthesia/patients/:patientId/logs под маркетологом -> 403 Forbidden
 * 7. GET /api/clinical/implants/patient/:patientId под маркетологом -> 403 Forbidden
 * 8. POST /api/clinical/implants/installations под маркетологом -> 403 Forbidden
 * 9. POST /api/documents под маркетологом -> 403 Forbidden
 * 10. Проверка юридически значимой фиксации в audit_events
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	auditEvents,
	organizations,
	patients,
	users,
	visitDiaries,
	visits,
	xrayScans,
} from "../../db/schema.js";
import { registerAnesthesiaRoutes } from "../../routes/anesthesia.js";
import { registerClinicalImplantRoutes } from "../../routes/clinicalImplants.js";
import registerDiaryRoutes from "../../routes/diary.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
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
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const MARKETER_USER_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const VISIT_ID = fixtureUuid(NAMESPACE, 5);
const DIARY_ID = fixtureUuid(NAMESPACE, 6);
const SCAN_ID = fixtureUuid(NAMESPACE, 7);

describe("152-FZ / 323-ФЗ Deep Routes Privacy Audit & Audit Trail", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let marketerStaffToken: string;
	let doctorStaffToken: string;
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";

		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORGANIZATION_ID,
					name: "Клиника Глубокого Аудита 152-ФЗ",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values([
					{
						id: MARKETER_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Маркетолог Взломщик М.В.",
						role: "marketer",
					},
					{
						id: DOCTOR_USER_ID,
						organizationId: ORGANIZATION_ID,
						fullName: "Врач Стоматолог В.С.",
						role: "doctor",
					},
				])
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Петров Петр Петрович",
					birthDate: "1985-05-15",
					phone: "+79991112233",
					status: "active",
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					status: "signed",
					diagnosis: "K02.1 Кариес дентина",
				})
				.onConflictDoNothing();

			await db
				.insert(visitDiaries)
				.values({
					id: DIARY_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_ID,
					doctorId: DOCTOR_USER_ID,
					diagnosisIcd10: "K02.1",
					isLocked: true,
				})
				.onConflictDoNothing();

			await db
				.insert(xrayScans)
				.values({
					id: SCAN_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_ID,
					status: "done",
					aiReport: "Кариес дентина зуба 36, полость II класса",
					imageDataUri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
				})
				.onConflictDoNothing();
		});

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORGANIZATION_ID }, secret);
		marketerStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: MARKETER_USER_ID,
				role: "marketer",
				fullName: "Маркетолог Взломщик М.В.",
			},
			secret,
		);
		doctorStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: DOCTOR_USER_ID,
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
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	test("1. GET /api/diaries/visit/:visitId under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/diaries/visit/${VISIT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен читать дневник 043/у! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.diary.read");
	});

	test("2. GET /api/diaries/:id/revisions under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/diaries/${DIARY_ID}/revisions`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
		});

		assert.strictEqual(
			res.statusCode,
			403,
			`Маркетолог не должен читать ревизии дневника 043/у! Status: ${res.statusCode}`,
		);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "PermissionDenied");
		assert.strictEqual(body.permission, "clinical.diary.read");
	});

	test("3. GET /api/xray/scans under Marketer is BLOCKED with 403", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/xray/scans?patientId=${PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
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
			url: `/api/xray/scans/${SCAN_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
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
			url: `/api/anesthesia/patients/${PATIENT_ID}/logs`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
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
			url: `/api/anesthesia/patients/${PATIENT_ID}/logs`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
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
			url: `/api/clinical/implants/patient/${PATIENT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
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
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
			payload: {
				patientId: PATIENT_ID,
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
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": marketerStaffToken,
			},
			payload: {
				patientId: PATIENT_ID,
				type: "outpatient_card",
				title: "Медицинская карта 043/у",
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
			url: `/api/diaries/visit/${VISIT_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
			},
		});

		console.log(`[TEST 10]: status=${res.statusCode}, payload=${res.payload}`);
		assert.strictEqual(res.statusCode, 200, "Лечащий врач должен иметь законный доступ к дневнику 043/у");

		// Проверяем фиксацию в audit_events под контекстом арендатора
		const events = await withFixtureTenant(ORGANIZATION_ID, async () => {
			return await db
				.select()
				.from(auditEvents)
				.where(
					and(
						eq(auditEvents.organizationId, ORGANIZATION_ID),
						eq(auditEvents.action, "VIEW_DIARY_043U"),
					),
				)
				.limit(5);
		});

		console.log(`[AUDIT FORENSIC CHECK]: Найдено ${events.length} записей VIEW_DIARY_043U в audit_events`);
		assert.ok(events.length > 0, "Журнал audit_events обязан зафиксировать факт законного чтения дневника врачом!");
	});
});
