/**
 * apps/api/src/routes/integrations/__tests__/diagnocatIntegration.test.ts
 * Red Team Test Suite for Diagnocat / Clinical AI Webhook Integration (DEF-DC-01).
 * Verifies:
 * 1. Webhook authentication via secret/api-key header without internal JWT session.
 * 2. Tenant isolation & organization context resolution via payload, query, or patient ID.
 * 3. Validation of required fields (patientId, reportUrl, odontogramData).
 * 4. Successful report persistence in radiologyAiReports.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { organizations, patients, radiologyAiReports } from "../../../db/schema.js";
import { registerDiagnocatRoutes } from "../diagnocat.js";

describe("Diagnocat / Clinical AI Webhook Authentication & Ingress Suite (DEF-DC-01)", () => {
	let app: FastifyInstance;
	let testOrgId: string;
	let testPatientId: string;
	const originalSecret = process.env.DIAGNOCAT_WEBHOOK_SECRET;

	before(async () => {
		process.env.DIAGNOCAT_WEBHOOK_SECRET = "test-diagnocat-secret-key-2026";

		app = Fastify();
		await registerDiagnocatRoutes(app);
		await app.ready();

		const [firstOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
		if (firstOrg) {
			testOrgId = firstOrg.id;
		} else {
			const [createdOrg] = await db
				.insert(organizations)
				.values({
					name: "Тестовая клиника Диагнокат",
					loginId: `test-dc-org-${Date.now()}`,
				})
				.returning({ id: organizations.id });
			testOrgId = createdOrg!.id;
		}

		const [createdPat] = await db
			.insert(patients)
			.values({
				organizationId: testOrgId,
				fullName: "Пациент Тестовый Диагнокатович",
				gender: "male",
				birthDate: "1985-05-15",
			})
			.returning({ id: patients.id });
		testPatientId = createdPat!.id;
	});

	after(async () => {
		if (originalSecret !== undefined) {
			process.env.DIAGNOCAT_WEBHOOK_SECRET = originalSecret;
		} else {
			delete process.env.DIAGNOCAT_WEBHOOK_SECRET;
		}

		try {
			await db.delete(radiologyAiReports).where(eq(radiologyAiReports.patientId, testPatientId));
			await db.delete(patients).where(eq(patients.id, testPatientId));
		} catch {
			// Non-blocking cleanup
		}
		await app.close();
	});

	it("1. Неавторизованный запрос без секрета отклоняется 401 Unauthorized", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical-ai/webhook",
			headers: { "content-type": "application/json" },
			payload: {
				patientId: testPatientId,
				reportUrl: "https://diagnocat.test/report/123",
				odontogramData: { 11: "caries" },
			},
		});
		assert.equal(res.statusCode, 401);
	});

	it("2. Авторизованный запрос с x-diagnocat-api-key успешно сохраняет AI-отчет без сессии сотрудника", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical-ai/webhook",
			headers: {
				"content-type": "application/json",
				"x-diagnocat-api-key": "test-diagnocat-secret-key-2026",
			},
			payload: {
				patientId: testPatientId,
				reportUrl: "https://diagnocat.test/report/123",
				odontogramData: { teeth: { 36: { pathology: "caries_media" } } },
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.ok(body.reportId);

		// Проверяем запись в БД
		const [savedReport] = await db
			.select()
			.from(radiologyAiReports)
			.where(eq(radiologyAiReports.id, body.reportId))
			.limit(1);

		assert.ok(savedReport);
		assert.equal(savedReport.patientId, testPatientId);
		assert.equal(savedReport.organizationId, testOrgId);
	});

	it("3. Отклонение 400 при отсутствии обязательных полей", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical-ai/webhook",
			headers: {
				"content-type": "application/json",
				"x-diagnocat-api-key": "test-diagnocat-secret-key-2026",
			},
			payload: {
				patientId: testPatientId,
				// reportUrl отсутствует
				odontogramData: {},
			},
		});

		assert.equal(res.statusCode, 400);
	});

	it("4. Отклонение 400 при невозможности определить организацию для несуществующего пациента", async () => {
		const phantomPatientId = "00000000-0000-0000-0000-000000000099";
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical-ai/webhook",
			headers: {
				"content-type": "application/json",
				"x-diagnocat-api-key": "test-diagnocat-secret-key-2026",
			},
			payload: {
				patientId: phantomPatientId,
				reportUrl: "https://diagnocat.test/report/phantom",
				odontogramData: { status: "ok" },
			},
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "MissingOrganizationContext");
	});
});
