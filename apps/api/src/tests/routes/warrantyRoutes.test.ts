/**
 * WARRANTY & RECLAMATIONS ROUTES TEST SUITE
 * Проверка роутов гарантийных сертификатов, публичной верификации QR и структурированных рекламаций.
 * Mandates 8e, 8bf, 8bg, 8bm.
 */

import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerWarrantyRoutes } from "../../routes/warranty/index.js";
import { registerPatientReclamationRoutes } from "../../routes/patients/reclamationRoutes.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";

const ORG_ID = "cc440000-0000-4000-8000-0000000000c1";
const PATIENT_ID = "cc440000-0000-4000-8000-0000000000d1";
const DOCTOR_ID = "cc440000-0000-4000-8000-0000000000e1";
const TEST_SECRET = "warranty-route-test-secret-key-".padEnd(48, "w");

describe("Warranty & Quality Control Routes Suite", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		clinicToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_ID,
				role: "doctor",
				type: "staff",
			},
			TEST_SECRET,
			3600,
		);

		app = Fastify({ logger: false });
		await app.register(registerWarrantyRoutes);
		registerPatientReclamationRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		process.env = { ...originalEnv };
		resetAuthSecretCacheForTests();
	});

	it("GET /api/public/warranty/:certificateNumber without number returns 400 or 404", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/public/warranty/NON_EXISTENT_CERT_12345",
		});
		assert.equal(res.statusCode, 404);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "CertificateNotFound");
		assert.ok(json.message.includes("NON_EXISTENT_CERT_12345"));
	});

	it("POST /api/warranty/certificates without auth returns 401 AuthRequired", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/warranty/certificates",
			headers: { "content-type": "application/json" },
			payload: {
				certificateNumber: "WAR-2026-TEST",
				patientId: PATIENT_ID,
				warrantyMonths: 24,
				serviceLifeMonths: 60,
				status: "active",
				items: [],
				integritySha256: "0".repeat(64),
			},
		});
		assert.equal(res.statusCode, 401);
	});

	it("POST /api/warranty/certificates with invalid schema returns 400 ValidationError", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/warranty/certificates",
			headers: {
				"content-type": "application/json",
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
			payload: {
				// Missing required fields
				certificateNumber: "",
			},
		});
		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
	});

	it("GET /api/warranty/certificates/:patientId validates UUID parameter", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/warranty/certificates/invalid-uuid",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});
		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
	});

	it("POST /api/patients/:patientId/reclamations accepts structured toothNumber, defectType, warrantyCertificateId", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/reclamations`,
			headers: {
				"content-type": "application/json",
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
			payload: {
				complicationDetails: "Скол композитной реставрации 1.6",
				proposedAction: "Бесплатная гарантийная переделка (0 ₽)",
				doctorId: DOCTOR_ID,
				toothNumber: 16,
				defectType: "filling_loss",
				warrantyCertificateId: "cc440000-0000-4000-8000-0000000000f1",
			},
		});
		// Since DB patient might not exist in unit test, it returns 404 (sendPatientNotFound) instead of 400 ValidationError, proving schema passed!
		assert.ok(
			res.statusCode === 201 || res.statusCode === 404,
			`Expected 201 or 404 patient not found, got ${res.statusCode}: ${res.body}`,
		);
		if (res.statusCode === 404) {
			const json = JSON.parse(res.body);
			assert.equal(json.error, "PatientNotFound");
		}
	});

	it("POST /api/patients/:patientId/reclamations rejects empty complicationDetails", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/reclamations`,
			headers: {
				"content-type": "application/json",
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
			payload: {
				complicationDetails: "   ",
				doctorId: DOCTOR_ID,
			},
		});
		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
	});
});
