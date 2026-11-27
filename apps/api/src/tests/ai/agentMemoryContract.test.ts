/**
 * agentMemoryContract.test.ts — Unit & Integration Test Suite for Copilot Memory Contract
 *
 * Verifies:
 * 1. PUT /api/agent/memory accepts string array
 * 2. PUT /api/agent/memory accepts AiMemoryFact object array (fixes HTTP 400 in web client)
 * 3. GET /api/agent/memory returns persisted memory facts
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, before, after } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { doctorPreferences, organizations, users } from "../../db/schema.js";
import { registerAgentRoutes } from "../../routes/agentRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

describe("Agent Memory Contract & Schema Resilience", () => {
	let server: FastifyInstance;
	const orgId = fixtureUuid("agent-memory-contract", 1);
	const userId = fixtureUuid("agent-memory-contract", 2);
	let token: string;

	before(async () => {
		await purgeFixtureOrganizations([orgId]);
		await withFixtureTenant(orgId, async (tx) => {
			await tx
				.insert(organizations)
				.values({ id: orgId, name: "Клиника Тест Памяти Агента" })
				.onConflictDoNothing();
			await tx
				.insert(users)
				.values({
					id: userId,
					organizationId: orgId,
					fullName: "Врач Тестовый Копайлот",
					role: "doctor",
				})
				.onConflictDoNothing();
		});

		server = Fastify({ logger: false });
		await server.register(registerAgentRoutes);
		await server.ready();

		token = signToken({ organizationId: orgId, role: "doctor", userId }, authTokenSecret(), 3600);
	});

	after(async () => {
		await withFixtureTenant(orgId, async (tx) => {
			await tx.delete(doctorPreferences).where(eq(doctorPreferences.organizationId, orgId));
		});
		await purgeFixtureOrganizations([orgId]);
		await server.close();
	});

	it("1. Rejects unauthenticated requests to /api/agent/memory", async () => {
		const res = await server.inject({
			method: "GET",
			url: "/api/agent/memory",
		});
		assert.strictEqual(res.statusCode, 401);
	});

	it("2. Accepts legacy string array without HTTP 400", async () => {
		const res = await server.inject({
			method: "PUT",
			url: "/api/agent/memory",
			headers: {
				[CLINIC_TOKEN_HEADER]: token,
				"content-type": "application/json",
				"idempotency-key": randomUUID(),
			},
			payload: {
				memoryFacts: ["Пациент предпочитает седацию", "Аллергия на пенициллиновый ряд"],
			},
		});
		assert.strictEqual(res.statusCode, 200);
		const data = JSON.parse(res.payload);
		assert.strictEqual(data.success, true);
		assert.strictEqual(data.memoryFacts.length, 2);
	});

	it("3. Accepts structured AiMemoryFact objects from web client (Fixes DEF-COP HTTP 400)", async () => {
		const facts = [
			{
				id: "fact-1",
				category: "materials",
				fact: "Предпочитает композиты Ceram.X SphereTEC one",
				createdAt: "2026-11-21T10:00:00.000Z",
			},
			{
				id: "fact-2",
				category: "anesthesia",
				fact: "Непереносимость вазоконстрикторов (только мепивакаин 3% без адреналина)",
				createdAt: "2026-11-21T10:05:00.000Z",
			},
		];

		const res = await server.inject({
			method: "PUT",
			url: "/api/agent/memory",
			headers: {
				[CLINIC_TOKEN_HEADER]: token,
				"content-type": "application/json",
				"idempotency-key": randomUUID(),
			},
			payload: {
				memoryFacts: facts,
			},
		});
		assert.strictEqual(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}: ${res.payload}`);
		const data = JSON.parse(res.payload);
		assert.strictEqual(data.success, true);
		assert.strictEqual(data.memoryFacts.length, 2);
		assert.strictEqual(data.memoryFacts[0].category, "materials");
	});

	it("4. Retrieves persisted memory facts via GET /api/agent/memory", async () => {
		const res = await server.inject({
			method: "GET",
			url: "/api/agent/memory",
			headers: {
				[CLINIC_TOKEN_HEADER]: token,
			},
		});
		assert.strictEqual(res.statusCode, 200);
		const data = JSON.parse(res.payload);
		assert.ok(Array.isArray(data.memoryFacts));
		assert.strictEqual(data.memoryFacts.length, 2);
	});

	it("5. Blocks SSRF targets (loopback, AWS metadata, RFC1918, localhost, non-https in prod) on /api/agent/validate-key", async () => {
		const blockedUrls = [
			"http://127.0.0.1:8080/v1",
			"http://169.254.169.254/latest/meta-data",
			"http://10.0.0.1/v1",
			"http://localhost:11434/v1",
		];

		for (const baseUrl of blockedUrls) {
			const res = await server.inject({
				method: "POST",
				url: "/api/agent/validate-key",
				headers: {
					[CLINIC_TOKEN_HEADER]: token,
					"content-type": "application/json",
				},
				payload: {
					provider: "custom",
					apiKey: "sk-synthetic-ssrf-test",
					baseUrl,
				},
			});
			assert.strictEqual(
				res.statusCode,
				400,
				`Expected HTTP 400 SSRF block for ${baseUrl}, got ${res.statusCode}: ${res.payload}`,
			);
		}

		const strictUnknownRes = await server.inject({
			method: "PUT",
			url: "/api/agent/memory",
			headers: {
				[CLINIC_TOKEN_HEADER]: token,
				"content-type": "application/json",
				"idempotency-key": randomUUID(),
			},
			payload: {
				memoryFacts: ["Valid fact"],
				unexpectedField: true,
			},
		});
		assert.strictEqual(strictUnknownRes.statusCode, 400);

		const missingIdemRes = await server.inject({
			method: "PUT",
			url: "/api/agent/memory",
			headers: {
				[CLINIC_TOKEN_HEADER]: token,
				"content-type": "application/json",
			},
			payload: {
				memoryFacts: ["Valid fact"],
			},
		});
		assert.strictEqual(missingIdemRes.statusCode, 400);

		const clinicOnlyToken = signToken({ organizationId: orgId }, authTokenSecret(), 3600);
		const noStaffRes = await server.inject({
			method: "GET",
			url: "/api/agent/memory",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicOnlyToken,
			},
		});
		assert.strictEqual(noStaffRes.statusCode, 401);

		const { validateSsrfSafeAiBaseUrl } = await import("../../ai/agentRouterClient.js");
		const prevNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			const prodHttp = await validateSsrfSafeAiBaseUrl("http://api.openai.com/v1");
			assert.strictEqual(prodHttp.valid, false, "Non-HTTPS baseUrl must be rejected in production");
		} finally {
			process.env.NODE_ENV = prevNodeEnv;
		}
	});
});
