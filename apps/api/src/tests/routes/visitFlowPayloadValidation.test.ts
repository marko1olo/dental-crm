import assert from "node:assert/strict";
import { test, describe, before, after } from "node:test";
import { visitFlowRequestSchema } from "@dental/shared";
import { createDenteApiApp } from "../../server.js";
import type { FastifyInstance } from "fastify";

describe("visitFlowRequestSchema Payload Validation Unit Tests", () => {
	test("1. Missing transcript — fails validation", () => {
		const result = visitFlowRequestSchema.safeParse({});
		assert.equal(result.success, false);
		if (!result.success) {
			const issue = result.error.issues.find((i) => i.path.includes("transcript"));
			assert.ok(issue, "Expected missing transcript issue");
		}
	});

	test("2. Non-string transcript — fails validation", () => {
		const result = visitFlowRequestSchema.safeParse({ transcript: 12345 });
		assert.equal(result.success, false);
	});

	test("3. Valid minimal payload — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Пациент обратился с жалобами на боль в зубе 1.6",
		});
		assert.equal(result.success, true);
	});

	test("4. patientId invalid UUID — fails validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			patientId: "not-a-valid-uuid",
		});
		assert.equal(result.success, false);
	});

	test("5. patientId valid UUID — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			patientId: "11111111-1111-4111-8111-111111111111",
		});
		assert.equal(result.success, true);
	});

	test("6. patientId null — fails validation (optional, not nullable)", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			patientId: null,
		});
		assert.equal(result.success, false);
	});

	test("7. planPayload undefined — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			planPayload: undefined,
		});
		assert.equal(result.success, true);
	});

	test("8. planPayload null — passes validation (explicitly nullable)", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			planPayload: null,
		});
		assert.equal(result.success, true);
	});

	test("9. recommendationsPayload undefined — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			recommendationsPayload: undefined,
		});
		assert.equal(result.success, true);
	});

	test("10. recommendationsPayload null — passes validation (explicitly nullable)", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			recommendationsPayload: null,
		});
		assert.equal(result.success, true);
	});

	test("11. source property — passes validation when provided", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			source: "voice",
		});
		assert.equal(result.success, true);
	});

	test("12. completedServices negative priceRub — fails validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			completedServices: [
				{
					serviceId: "srv-1",
					title: "Лечение кариеса",
					quantity: 1,
					priceRub: -500,
				},
			],
		});
		assert.equal(result.success, false);
	});

	test("13. completedServices valid non-negative priceRub — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			completedServices: [
				{
					serviceId: "srv-1",
					title: "Лечение кариеса",
					quantity: 1,
					priceRub: 3500.5,
				},
			],
		});
		assert.equal(result.success, true);
	});
});

describe("POST /api/ai/visit-flow Fastify Route HTTP Integration Tests", () => {
	let app: FastifyInstance;
	const TEST_ADMIN_SECRET = "visit-flow-test-secret";

	before(async () => {
		process.env.DENTE_CLINICAL_ADMIN_SECRET = TEST_ADMIN_SECRET;
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		app = await createDenteApiApp({
			startTelegramWorker: false,
			startCommunicationWorker: false,
			startMigrationWorker: false,
		});
	});

	after(async () => {
		await app.close();
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
	});

	const TEST_AUTH_HEADERS = {
		"content-type": "application/json",
		"x-dente-admin-secret": TEST_ADMIN_SECRET,
		"x-organization-id": "00000000-0000-0000-0000-000000000001",
	};

	test("HTTP 400 on missing transcript", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/ai/visit-flow",
			headers: TEST_AUTH_HEADERS,
			payload: {
				patientId: "11111111-1111-4111-8111-111111111111",
			},
		});

		assert.equal(response.statusCode, 400);
		const body = response.json();
		assert.equal(body.error, "VisitFlowValidationError");
		assert.equal(body.message, "Некорректные параметры для AI-оркестрации визита.");
	});

	test("HTTP 400 on null patientId", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/ai/visit-flow",
			headers: TEST_AUTH_HEADERS,
			payload: {
				transcript: "Тестовая расшифровка",
				patientId: null,
			},
		});

		assert.equal(response.statusCode, 400);
		const body = response.json();
		assert.equal(body.error, "VisitFlowValidationError");
	});

	test("HTTP 400 on invalid patientId (non-UUID)", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/ai/visit-flow",
			headers: TEST_AUTH_HEADERS,
			payload: {
				transcript: "Тестовая расшифровка",
				patientId: "invalid-uuid-format",
			},
		});

		assert.equal(response.statusCode, 400);
		const body = response.json();
		assert.equal(body.error, "VisitFlowValidationError");
	});

	test("HTTP validation passes (non-400) on valid body with null planPayload & recommendationsPayload", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/ai/visit-flow",
			headers: TEST_AUTH_HEADERS,
			payload: {
				transcript: "Осмотр зуба 3.6, обнаружен средний кариес.",
				planPayload: null,
				recommendationsPayload: null,
				source: "voice",
			},
		});

		// Validation MUST pass — so response is NOT 400 (400 would indicate schema validation failed)
		assert.notEqual(response.statusCode, 400, "Validation should have passed!");
	});
});
