import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	areToothStatesSurfaceMergeable,
	isCariesState,
	isFillingState,
	normalizeSurfaces,
} from "../../services/sync/syncGateway/syncConflictResolver.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import { db } from "../../db/client.js";
import { toothStates, toothStateHistory, patients, organizations, users } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";

describe("Domain 27: Odontogram MODBL Surface Union Merge & Pediatric Dentition", () => {
	it("1. areToothStatesSurfaceMergeable taxonomy contracts", () => {
		assert.equal(areToothStatesSurfaceMergeable("Caries", "Filled"), true);
		assert.equal(areToothStatesSurfaceMergeable("caries", "filling"), true);
		assert.equal(areToothStatesSurfaceMergeable("k02.1", "done"), true);
		assert.equal(areToothStatesSurfaceMergeable("Caries", "Caries"), true);
		assert.equal(areToothStatesSurfaceMergeable("Filled", "Filled"), true);
		assert.equal(areToothStatesSurfaceMergeable("Missing", "Caries"), false);
		assert.equal(areToothStatesSurfaceMergeable("Extracted", "Filled"), false);
		assert.equal(areToothStatesSurfaceMergeable("Implant", "Caries"), false);
		assert.equal(areToothStatesSurfaceMergeable("Crown", "Caries"), false);
	});

	it("2. normalizeSurfaces canonical MODBL ordering & parsing", () => {
		assert.deepEqual(normalizeSurfaces(["occlusal", "mesial"]), ["mesial", "occlusal"]);
		assert.deepEqual(normalizeSurfaces("distal, mesial, occlusal"), ["mesial", "occlusal", "distal"]);
		assert.deepEqual(normalizeSurfaces("['vestibular', 'lingual']"), ["vestibular", "lingual"]);
		assert.deepEqual(normalizeSurfaces([]), []);
		assert.deepEqual(normalizeSurfaces(null), []);
	});

	it("3. End-to-end Fastify test: Non-overlapping Surface Union Merge preserves fillings (Mandate 8ar/8as)", async () => {
		const app = createTenantTestApp();
		await registerOdontogramRoutes(app);
		await app.ready();

		const testOrgId = "00000000-0000-0000-0000-000000000001";
		const testPatientId = "11111111-1111-1111-1111-111111111111";
		const testUserId = "22222222-2222-2222-2222-222222222222";

		// Ensure test organization, user and patient exist in DB
		await db
			.insert(organizations)
			.values({
				id: testOrgId,
				name: "Dente Test Clinic",
			})
			.onConflictDoNothing();

		await db
			.insert(users)
			.values({
				id: testUserId,
				organizationId: testOrgId,
				fullName: "Доктор Тест",
				role: "doctor",
				passwordHash: "hash123",
			})
			.onConflictDoNothing();

		await db
			.insert(patients)
			.values({
				id: testPatientId,
				organizationId: testOrgId,
				fullName: "Тестовый Пациент Одонтограмма",
				phone: "+79990001122",
			})
			.onConflictDoNothing();

		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: testOrgId }, secret);
		const staffToken = signToken(
			{
				organizationId: testOrgId,
				userId: testUserId,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
		);

		const headers = {
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": staffToken,
			"content-type": "application/json",
		};

		// Clean up tooth 46 state for idempotent test run
		await db
			.delete(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, testOrgId),
					eq(toothStates.patientId, testPatientId),
					eq(toothStates.toothNumber, 46),
				),
			);

		// Step A: Initial filling on mesial surface (M)
		const step1Res = await app.inject({
			method: "POST",
			url: "/api/odontogram/status",
			headers,
			payload: {
				patientId: testPatientId,
				toothNumber: 46,
				state: "Filled",
				surfaces: ["mesial"],
				reason: "Композитная реставрация медиальной поверхности",
			},
		});

		assert.equal(step1Res.statusCode, 200);
		const step1Body = JSON.parse(step1Res.body);
		assert.equal(step1Body.success, true);
		const tooth46AfterStep1 = (step1Body.states ?? step1Body.data).find((t: { toothNumber: number }) => t.toothNumber === 46);
		assert.ok(tooth46AfterStep1);
		assert.deepEqual(tooth46AfterStep1.surfaces, ["mesial"]);

		// Step B: Subsequent caries discovered on occlusal surface (O)
		const step2Res = await app.inject({
			method: "POST",
			url: "/api/odontogram/status",
			headers,
			payload: {
				patientId: testPatientId,
				toothNumber: 46,
				state: "Caries",
				surfaces: ["occlusal"],
				reason: "Первичный кариес окклюзионной фиссуры при сохранной медиальной пломбе",
			},
		});

		assert.equal(step2Res.statusCode, 200);
		const step2Body = JSON.parse(step2Res.body);
		assert.equal(step2Body.success, true);
		const tooth46AfterStep2 = (step2Body.states ?? step2Body.data).find((t: { toothNumber: number }) => t.toothNumber === 46);
		assert.ok(tooth46AfterStep2);

		// CRITICAL SEV-1 CHECK: Surface Union Merge MUST preserve both surfaces!
		assert.deepEqual(tooth46AfterStep2.surfaces, ["mesial", "occlusal"]);
		assert.ok(tooth46AfterStep2.clinicalData);
		assert.equal(tooth46AfterStep2.clinicalData.hasFilling, true);
		assert.equal(tooth46AfterStep2.clinicalData.hasCaries, true);
		assert.deepEqual(tooth46AfterStep2.clinicalData.fillingSurfaces, ["mesial"]);
		assert.deepEqual(tooth46AfterStep2.clinicalData.defectSurfaces, ["occlusal"]);
		assert.equal(tooth46AfterStep2.clinicalData.hasSecondaryCaries, false);
		assert.equal(tooth46AfterStep2.clinicalData.compositeCondition, "adequate");

		// Step C: Secondary caries on the mesial filling margin (overlapping surface M)
		const step3Res = await app.inject({
			method: "POST",
			url: "/api/odontogram/status",
			headers,
			payload: {
				patientId: testPatientId,
				toothNumber: 46,
				state: "Caries",
				surfaces: ["mesial"],
				reason: "Вторичный кариес по краю пломбы",
			},
		});

		assert.equal(step3Res.statusCode, 200);
		const step3Body = JSON.parse(step3Res.body);
		const tooth46AfterStep3 = (step3Body.states ?? step3Body.data).find((t: { toothNumber: number }) => t.toothNumber === 46);
		assert.ok(tooth46AfterStep3);
		assert.equal(tooth46AfterStep3.clinicalData.hasSecondaryCaries, true);
		assert.equal(tooth46AfterStep3.clinicalData.compositeCondition, "defective");

		// Clean up
		await db
			.delete(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, testOrgId),
					eq(toothStates.patientId, testPatientId),
					eq(toothStates.toothNumber, 46),
				),
			);

		await app.close();
	});

	it("4. Deciduous (Pediatric 51–85) Tooth State persistence & FDI validation", async () => {
		const app = createTenantTestApp();
		await registerOdontogramRoutes(app);
		await app.ready();

		const testOrgId = "00000000-0000-0000-0000-000000000001";
		const testPatientId = "11111111-1111-1111-1111-111111111111";
		const testUserId = "22222222-2222-2222-2222-222222222222";

		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: testOrgId }, secret);
		const staffToken = signToken(
			{
				organizationId: testOrgId,
				userId: testUserId,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
		);

		const headers = {
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": staffToken,
			"content-type": "application/json",
		};

		// Mutate pediatric molar 54
		const pedRes = await app.inject({
			method: "POST",
			url: "/api/odontogram/status",
			headers,
			payload: {
				patientId: testPatientId,
				toothNumber: 54,
				state: "Caries",
				surfaces: ["occlusal"],
				reason: "Кариес молочного моляра 54",
			},
		});

		assert.equal(pedRes.statusCode, 200);
		const pedBody = JSON.parse(pedRes.body);
		assert.equal(pedBody.success, true);
		const tooth54 = (pedBody.states ?? pedBody.data).find((t: { toothNumber: number }) => t.toothNumber === 54);
		assert.ok(tooth54);
		assert.equal(tooth54.state, "Caries");
		assert.deepEqual(tooth54.surfaces, ["occlusal"]);

		// Clean up
		await db
			.delete(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, testOrgId),
					eq(toothStates.patientId, testPatientId),
					eq(toothStates.toothNumber, 54),
				),
			);

		await app.close();
	});
});

