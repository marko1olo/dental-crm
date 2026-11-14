/**
 * insuranceGuaranteeLetterSafety.test.ts
 *
 * Verifies SEV-1 Postgres 22P02 and Date safety for DMS Guarantee Letters:
 * 1. GET /api/insurance/guarantee-letters/:letterId with invalid UUID returns 400 (not 500 / 22P02)
 * 2. PUT /api/insurance/guarantee-letters/:letterId with invalid UUID returns 400 (not 500)
 * 3. DELETE /api/insurance/guarantee-letters/:letterId with invalid UUID returns 400 (not 500)
 * 4. POST /api/insurance/guarantee-letters/:letterId/record-usage with invalid UUID returns 400 (not 500)
 * 5. POST /api/insurance/guarantee-letters/emergency/record-usage returns 200 (Mandate 8e emergency alias)
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { registerInsuranceRoutes } from "../../routes/insurance.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "guaranteeSafety";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);

describe("DMS Guarantee Letters — Postgres 22P02 & Date Safety", () => {
	let app: FastifyInstance;
	let staffToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		app = createTenantTestApp();
		await app.register(registerInsuranceRoutes);
		await app.ready();

		staffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);
	});

	after(async () => {
		await app?.close();
	});

	test("1. GET /api/insurance/guarantee-letters/:letterId with malformed UUID returns 400", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/insurance/guarantee-letters/not-a-valid-uuid",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(res.statusCode, 400, `Expected 400 Bad Request, got ${res.statusCode}: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
		assert.ok(json.message.includes("UUID"));
	});

	test("2. PUT /api/insurance/guarantee-letters/:letterId with malformed UUID returns 400", async () => {
		const res = await app.inject({
			method: "PUT",
			url: "/api/insurance/guarantee-letters/not-a-valid-uuid",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				notes: "Попытка обновления",
			},
		});

		assert.equal(res.statusCode, 400, `Expected 400 Bad Request, got ${res.statusCode}: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
		assert.ok(json.message.includes("UUID"));
	});

	test("3. DELETE /api/insurance/guarantee-letters/:letterId with malformed UUID returns 400", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: "/api/insurance/guarantee-letters/not-a-valid-uuid",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(res.statusCode, 400, `Expected 400 Bad Request, got ${res.statusCode}: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
		assert.ok(json.message.includes("UUID"));
	});

	test("4. POST /api/insurance/guarantee-letters/:letterId/record-usage with malformed UUID returns 400", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/insurance/guarantee-letters/not-a-valid-uuid/record-usage",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				amountRub: 1500,
			},
		});

		assert.equal(res.statusCode, 400, `Expected 400 Bad Request, got ${res.statusCode}: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
		assert.ok(json.message.includes("UUID"));
	});

	test("5. POST /api/insurance/guarantee-letters/emergency/record-usage preserves Mandate 8e acute pain fallback", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/insurance/guarantee-letters/emergency/record-usage",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				amountRub: 3500,
				isEmergency: true,
			},
		});

		assert.equal(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.status, "pending_letter");
		assert.equal(json.isEmergency, true);
		assert.equal(json.debitedAmountRub, 3500);
	});
});
