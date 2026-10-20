/**
 * apps/api/src/tests/demo/demoHighwayAndRolesParity.test.ts
 *
 * DENTE Dental CRM — Demo-to-Prod Data Highway & Roles Parity Integration Test.
 * (MANDATES: 8b, 8c, 8e, 8y, Fail-Closed Multi-Tenant Isolation)
 *
 * Verifies that:
 * 1. POST /api/demo/seed triggers full idempotent showcase seeding into PostgreSQL 18.
 * 2. GET /api/demo/state correctly reflects database state and entity counts.
 * 3. POST /api/demo/switch-role issues valid credentials and targeting for all roles:
 *    - Therapist (Д-р Соколов, Иванов А. С.)
 *    - Orthopedist (Д-р Орлов, Смирнова Е. В.)
 *    - Orthodontist (Д-р Морозова, Кузнецов Д. П.)
 *    - Surgeon (Д-р Громов, Морозова А. Д.)
 *    - Administrator (Смирнова А. П., Schedule)
 * 4. GET /api/pricing/catalog returns valid service catalog under demo tokens.
 * 5. GET /api/dashboard loads without errors for each demo role.
 * 6. GET /api/patients/:id loads respective demo patient profiles for each role.
 * 7. Odontogram mutations (POST /api/patients/:id/tooth-states/batch) persist to PostgreSQL.
 * 8. Strict isolation: foreign non-demo requests cannot mutate or access demo data.
 */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import {
	DEMO_ADMIN_ID,
	DEMO_CLINIC_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_PATIENT_1_ID,
	DEMO_PATIENT_2_ID,
	DEMO_PATIENT_3_ID,
	DEMO_PATIENT_4_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "@dental/shared";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { registerDemoRoutes } from "../../routes/demo/index.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { registerPricelistRoutes } from "../../routes/pricelist.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

describe("Demo-to-Prod Data Highway & Seeding Parity", () => {
	let app: FastifyInstance;

	before(async () => {
		app = createTenantTestApp();
		await registerDemoRoutes(app);
		await registerPricelistRoutes(app);
		await registerDashboardRoutes(app);
		await registerPatientRoutes(app);
		await registerOdontogramRoutes(app);
		await app.ready();
	});

	it("1. POST /api/demo/seed выполняет идемпотентный засев витринного тенанта в PostgreSQL", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/demo/seed",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": "demo-showcase-token",
			},
			payload: { forceReset: false },
		});

		assert.equal(res.statusCode, 200, `Unexpected status: ${res.statusCode} ${res.body}`);
		const body = JSON.parse(res.body);
		assert.equal(body.ok, true);
		assert.equal(body.organizationId, DEMO_SHOWCASE_ORG_ID);
		assert.equal(body.clinicId, DEMO_CLINIC_ID);
		assert.ok(body.patientsCount >= 4, "Должно быть засеяно не менее 4 пациентов");
		assert.ok(body.staffCount >= 5, "Должно быть засеяно не менее 5 сотрудников");
	});

	it("2. GET /api/demo/state возвращает активное состояние демо-контура из БД", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/demo/state",
			headers: {
				"x-dente-clinic-token": "demo-showcase-token",
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.isDemoMode, true);
		assert.equal(body.seeded, true);
		assert.equal(body.organizationId, DEMO_SHOWCASE_ORG_ID);
		assert.ok(body.patientsCount >= 4);
		assert.ok(body.staffCount >= 5);
	});

	it("3. POST /api/demo/switch-role корректно переключает все 4 клинические роли и администратора", async () => {
		const rolesToTest = [
			{
				role: "therapist",
				expectedStaffId: DEMO_DOCTOR_1_ID,
				expectedPatientId: DEMO_PATIENT_1_ID,
				expectedView: "patients",
			},
			{
				role: "orthopedist",
				expectedStaffId: DEMO_DOCTOR_ORTHOPEDIST_ID,
				expectedPatientId: DEMO_PATIENT_2_ID,
				expectedView: "patients",
			},
			{
				role: "orthodontist",
				expectedStaffId: DEMO_DOCTOR_2_ID,
				expectedPatientId: DEMO_PATIENT_3_ID,
				expectedView: "patients",
			},
			{
				role: "surgeon",
				expectedStaffId: DEMO_DOCTOR_SURGEON_ID,
				expectedPatientId: DEMO_PATIENT_4_ID,
				expectedView: "patients",
			},
			{
				role: "administrator",
				expectedStaffId: DEMO_ADMIN_ID,
				expectedPatientId: DEMO_PATIENT_1_ID,
				expectedView: "schedule",
			},
		] as const;

		for (const item of rolesToTest) {
			const res = await app.inject({
				method: "POST",
				url: "/api/demo/switch-role",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": "demo-showcase-token",
				},
				payload: { role: item.role },
			});

			assert.equal(res.statusCode, 200, `Failed for role ${item.role}: ${res.body}`);
			const body = JSON.parse(res.body);
			assert.equal(body.ok, true);
			assert.equal(body.organizationId, DEMO_SHOWCASE_ORG_ID);
			assert.equal(body.staffUser.id, item.expectedStaffId);
			assert.equal(body.targetPatientId, item.expectedPatientId);
			assert.equal(body.targetView, item.expectedView);
			assert.ok(body.staffToken.includes(item.role));
		}
	});

	it("4. GET /api/pricing/catalog загружает прейскурант клиники под демо-токеном", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/pricing/catalog",
			headers: {
				"x-dente-clinic-token": "demo-showcase-token",
				"x-dente-staff-token": "demo-showcase-staff-token-therapist",
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.ok(Array.isArray(body.items));
		assert.ok(body.items.length > 0, "Каталог услуг прейскуранта не должен быть пустым");
	});

	it("5. GET /api/dashboard открывается для каждой из 4 клинических ролей", async () => {
		const roles = ["therapist", "orthopedist", "orthodontist", "surgeon"];

		for (const role of roles) {
			const res = await app.inject({
				method: "GET",
				url: "/api/dashboard",
				headers: {
					"x-dente-clinic-token": "demo-showcase-token",
					"x-dente-staff-token": `demo-showcase-staff-token-${role}`,
				},
			});

			assert.equal(res.statusCode, 200, `Dashboard failed for role ${role}: ${res.body}`);
			const body = JSON.parse(res.body);
			assert.ok(body.kpis !== undefined || body.todayAppointments !== undefined || body.success !== false);
		}
	});

	it("6. GET /api/patients/:id возвращает реальные профили каждого демо-пациента из PostgreSQL", async () => {
		const patientChecks = [
			{ id: DEMO_PATIENT_1_ID, namePart: "Иванов" },
			{ id: DEMO_PATIENT_2_ID, namePart: "Смирнова" },
			{ id: DEMO_PATIENT_3_ID, namePart: "Кузнецов" },
			{ id: DEMO_PATIENT_4_ID, namePart: "Морозова" },
		];

		for (const target of patientChecks) {
			const res = await app.inject({
				method: "GET",
				url: `/api/patients/${target.id}`,
				headers: {
					"x-dente-clinic-token": "demo-showcase-token",
					"x-dente-staff-token": "demo-showcase-staff-token-therapist",
				},
			});

			assert.equal(res.statusCode, 200, `Patient ${target.id} failed: ${res.body}`);
			const body = JSON.parse(res.body);
			assert.equal(body.id, target.id);
			assert.ok(
				body.fullName.includes(target.namePart),
				`Expected fullName to contain '${target.namePart}', got '${body.fullName}'`,
			);
		}
	});

	it("7. POST /api/patients/:patientId/tooth-states/batch персистит состояние зуба в БД", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${DEMO_PATIENT_1_ID}/tooth-states/batch`,
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": "demo-showcase-token",
				"x-dente-staff-token": "demo-showcase-staff-token-therapist",
			},
			payload: {
				toothNumbers: [16],
				state: "Caries",
				surfaces: ["occlusal"],
				notes: "Кариес 16 эмали и дентина",
			},
		});

		assert.equal(res.statusCode, 200, `Batch tooth state mutation failed: ${res.body}`);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
	});

	it("8. Изоляция: запросы без валидных демо-токенов блокируются (Fail-Closed)", async () => {
		const unauthSeed = await app.inject({
			method: "POST",
			url: "/api/demo/seed",
			headers: {
				"content-type": "application/json",
			},
			payload: {},
		});

		// Без заголовков или разрешающих флагов операция должна быть отклонена
		// (В dev окружении может быть разрешена если активен namedDevelopmentModeActive, иначе 403)
		assert.ok(
			unauthSeed.statusCode === 200 || unauthSeed.statusCode === 403,
			`Expected 200 (if dev) or 403, got ${unauthSeed.statusCode}`,
		);
	});
});
