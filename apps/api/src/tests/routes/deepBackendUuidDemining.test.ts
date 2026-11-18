/**
 * deepBackendUuidDemining.test.ts — Тесты разминирования скрытых крашей PostgreSQL (22P02: invalid input syntax for type uuid)
 * в глубоких уголках бэкенда:
 * 1. PATCH /api/integrations/egisz-blank-permissions/:id валидирует ID на UUID (400 Bad Request при невалидном).
 * 2. POST /treatment-plans/:planId/select-tier и /treatment-plans/:planId/approve валидируют planId на UUID (400 Bad Request).
 * 3. budgetLinkHandler и pepSigner валидируют planId на UUID (400 ValidationError).
 * 4. createSinglePlanDropoutRecall валидирует planId на UUID (возвращает { success: false, message: "Некорректный идентификатор плана лечения" }).
 * 5. GET /api/warranty/certificates/:patientId и GET /api/warranty/patient/:patientId валидируют patientId на UUID (400 Bad Request).
 * 6. PATCH /appointments/:id/cancel валидирует appointmentId на UUID (400 Bad Request) и POST /appointments валидирует doctorId.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { createSinglePlanDropoutRecall } from "../../services/patients/treatmentPlanDropoutService.js";
import { handleCreateBudgetLink } from "../../routes/treatmentPlan/budgetLinkHandler.js";
import { handleSignTreatmentPlanPep } from "../../routes/treatmentPlan/pep/pepSigner.js";
import { registerEgiszModularRoutes } from "../../routes/egiszModules/egiszRoutes.js";
import { registerPortalDocumentsRoutes } from "../../routes/portal/portalDocumentsRoutes.js";
import { registerPortalAppointmentsRoutes } from "../../routes/portal/portalAppointmentsRoutes.js";
import { registerReadCertificateRoutes } from "../../routes/warranty/readCertificateRoutes.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { PORTAL_TOKEN_KIND } from "../../routes/portal/types.js";

const TEST_SECRET = "demining-test-secret";
const ORG_ID = "00000000-0000-0000-0000-000000000001";
const PATIENT_ID = "00000000-0000-0000-0000-000000000002";

describe("Deep Backend UUID Demining & 22P02 Crash Prevention", () => {
	let app: FastifyInstance;
	let portalToken: string;

	before(async () => {
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "test";

		portalToken = signToken(
			{
				kind: PORTAL_TOKEN_KIND,
				sub: PATIENT_ID,
				organizationId: ORG_ID,
			},
			TEST_SECRET,
		);

		app = createTenantTestApp();
		await app.register(registerEgiszModularRoutes);
		await app.register(registerPortalDocumentsRoutes);
		await app.register(registerPortalAppointmentsRoutes);
		await app.register(registerReadCertificateRoutes);
		await app.ready();
	});

	after(async () => {
		if (app) {
			await app.close();
		}
	});

	// --- 1. createSinglePlanDropoutRecall ---
	it("1. createSinglePlanDropoutRecall rejects invalid planId with graceful error instead of 22P02 DB crash", async () => {
		const result = await createSinglePlanDropoutRecall(ORG_ID, "invalid-plan-uuid");
		assert.equal(result.success, false);
		assert.equal(result.message, "Некорректный идентификатор плана лечения");
	});

	it("2. createSinglePlanDropoutRecall rejects invalid organizationId with graceful error", async () => {
		const result = await createSinglePlanDropoutRecall("invalid-org-uuid", "00000000-0000-0000-0000-000000000002");
		assert.equal(result.success, false);
		assert.equal(result.message, "Некорректный идентификатор организации");
	});

	// --- 2. budgetLinkHandler & pepSigner ---
	it("3. handleCreateBudgetLink returns 400 Bad Request when planId is not a valid UUID", async () => {
		let capturedStatus = 0;
		let capturedBody: unknown = null;

		const mockRequest: any = {
			params: { id: "not-a-valid-uuid" },
			log: { warn: () => {} },
		};
		const mockReply: any = {
			code(status: number) {
				capturedStatus = status;
				return this;
			},
			send(body: unknown) {
				capturedBody = body;
				return this;
			},
		};

		await handleCreateBudgetLink(mockRequest, mockReply, ORG_ID);

		assert.equal(capturedStatus, 400);
		assert.deepEqual(capturedBody, {
			error: "ValidationError",
			message: "Идентификатор плана лечения должен быть валидным UUID.",
		});
	});

	it("4. handleSignTreatmentPlanPep returns 400 Bad Request when planId is not a valid UUID", async () => {
		let capturedStatus = 0;
		let capturedBody: unknown = null;

		const mockRequest: any = {
			params: { id: "malformed-uuid-123" },
			body: { action: "confirm", method: "sms" },
			log: { warn: () => {} },
		};
		const mockReply: any = {
			code(status: number) {
				capturedStatus = status;
				return this;
			},
			send(body: unknown) {
				capturedBody = body;
				return this;
			},
		};

		await handleSignTreatmentPlanPep(mockRequest, mockReply, ORG_ID);

		assert.equal(capturedStatus, 400);
		assert.deepEqual(capturedBody, {
			error: "ValidationError",
			message: "Идентификатор плана лечения должен быть валидным UUID.",
		});
	});

	// --- 3. egiszRoutes: PATCH /api/integrations/egisz-blank-permissions/:id ---
	it("5. PATCH /api/integrations/egisz-blank-permissions/:id returns 400 when :id is not a valid UUID", async () => {
		const res = await app.inject({
			method: "PATCH",
			url: "/api/integrations/egisz-blank-permissions/not-a-uuid-at-all",
			headers: {
				"content-type": "application/json",
				"x-organization-id": ORG_ID,
			},
			payload: {
				isExportAllowed: true,
			},
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ValidationError");
		assert.equal(body.message, "Идентификатор правила выгрузки бланка должен быть валидным UUID.");
	});

	// --- 4. portalDocumentsRoutes: /treatment-plans/:planId/select-tier & approve ---
	it("6. POST /treatment-plans/:planId/select-tier returns 400 when planId is not a valid UUID", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/treatment-plans/invalid-tier-plan-id/select-tier",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${portalToken}`,
			},
			payload: {
				tierId: "standard",
			},
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ValidationError");
		assert.equal(body.message, "Идентификатор плана лечения должен быть валидным UUID.");
	});

	it("7. POST /treatment-plans/:planId/approve returns 400 when planId is not a valid UUID", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/treatment-plans/corrupted-plan-uuid/approve",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${portalToken}`,
			},
			payload: {},
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ValidationError");
		assert.equal(body.message, "Идентификатор плана лечения должен быть валидным UUID.");
	});

	// --- 5. warranty: GET /api/warranty/certificates/:patientId & /api/warranty/patient/:patientId ---
	it("8. GET /api/warranty/certificates/:patientId returns 400 when patientId is not a valid UUID", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/warranty/certificates/corrupted-patient-id",
			headers: {
				"x-organization-id": ORG_ID,
			},
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ValidationError");
		assert.equal(body.message, "Идентификатор пациента должен быть валидным UUID");
	});

	it("9. GET /api/warranty/patient/:patientId alias returns 400 when patientId is not a valid UUID", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/warranty/patient/corrupted-patient-id",
			headers: {
				"x-organization-id": ORG_ID,
			},
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ValidationError");
		assert.equal(body.message, "Идентификатор пациента должен быть валидным UUID");
	});

	// --- 6. portalAppointmentsRoutes: PATCH /appointments/:id/cancel & POST /appointments ---
	it("10. PATCH /appointments/:id/cancel returns 400 when appointmentId is not a valid UUID", async () => {
		const res = await app.inject({
			method: "PATCH",
			url: "/appointments/bad-appointment-id/cancel",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${portalToken}`,
			},
			payload: {
				reason: "Передумал",
			},
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ValidationError");
		assert.equal(body.message, "Идентификатор записи на приём должен быть валидным UUID.");
	});

	it("11. POST /appointments returns 400 when doctorId is not a valid UUID", async () => {
		const futureStart = new Date(Date.now() + 86400000).toISOString();
		const futureEnd = new Date(Date.now() + 86400000 + 3600000).toISOString();

		const res = await app.inject({
			method: "POST",
			url: "/appointments",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${portalToken}`,
			},
			payload: {
				doctorId: "not-a-valid-doctor-uuid",
				startsAt: futureStart,
				endsAt: futureEnd,
			},
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ValidationError");
		assert.equal(body.message, "Идентификатор врача должен быть валидным UUID.");
	});
});
