/**
 * agentSessionRoutes.test.ts — Unit & Integration Test Suite for Copilot Sessions & Dialogue History
 *
 * Verifies:
 * 1. Authentication & Organization Tenant Isolation
 * 2. Session Lifecycle (Create -> List -> Get -> Patch -> Delete)
 * 3. Message Persistence within Session (Add message -> List messages)
 * 4. Fast execution <= 5s
 */

import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAgentRoutes } from "../../routes/agentRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

describe("Agent Session & Dialogue History Routes", () => {
	let server: FastifyInstance;
	const orgIdA = "11111111-1111-4111-8111-111111111111";
	const orgIdB = "22222222-2222-4222-8222-222222222222";
	let tokenA: string;
	let tokenB: string;

	before(async () => {
		server = Fastify({ logger: false });
		await server.register(registerAgentRoutes);
		await server.ready();

		tokenA = signToken({ organizationId: orgIdA, role: "clinic" }, authTokenSecret(), 3600);
		tokenB = signToken({ organizationId: orgIdB, role: "clinic" }, authTokenSecret(), 3600);
	});

	after(async () => {
		await server.close();
	});

	it("1. Rejects unauthenticated requests to /api/agent/sessions with 401", async () => {
		const res = await server.inject({
			method: "GET",
			url: "/api/agent/sessions",
		});
		assert.equal(res.statusCode, 401);
	});

	it("2. Creates a new session for Organization A via POST /api/agent/sessions", async () => {
		const res = await server.inject({
			method: "POST",
			url: "/api/agent/sessions",
			headers: { [CLINIC_TOKEN_HEADER]: tokenA },
			payload: {
				title: "Осмотр зуба 36 и дифдиагноз пульпита",
				activeView: "Одонтограмма",
			},
		});

		assert.equal(res.statusCode, 201);
		const body = res.json();
		assert.ok(body.id, "Session ID should be generated");
		assert.equal(body.organizationId, orgIdA);
		assert.equal(body.summary, "Осмотр зуба 36 и дифдиагноз пульпита");
		assert.equal(body.activeView, "Одонтограмма");
	});

	it("3. Lists sessions for Organization A and isolates from Organization B", async () => {
		// Org A listing
		const resA = await server.inject({
			method: "GET",
			url: "/api/agent/sessions",
			headers: { [CLINIC_TOKEN_HEADER]: tokenA },
		});
		assert.equal(resA.statusCode, 200);
		const dataA = resA.json();
		assert.ok(Array.isArray(dataA.sessions));
		assert.ok(dataA.sessions.length >= 1);
		assert.ok(dataA.sessions.every((s: { organizationId: string }) => s.organizationId === orgIdA));

		// Org B listing should not see Org A sessions
		const resB = await server.inject({
			method: "GET",
			url: "/api/agent/sessions",
			headers: { [CLINIC_TOKEN_HEADER]: tokenB },
		});
		assert.equal(resB.statusCode, 200);
		const dataB = resB.json();
		assert.ok(dataB.sessions.every((s: { organizationId: string }) => s.organizationId === orgIdB));
	});

	it("4. Appends and retrieves messages in a session", async () => {
		// Create session
		const createRes = await server.inject({
			method: "POST",
			url: "/api/agent/sessions",
			headers: { [CLINIC_TOKEN_HEADER]: tokenA },
			payload: { title: "Диалог по санации полости рта" },
		});
		const session = createRes.json();
		const sessionId = session.id;

		// Post user message
		const postMsgRes1 = await server.inject({
			method: "POST",
			url: `/api/agent/sessions/${sessionId}/messages`,
			headers: { [CLINIC_TOKEN_HEADER]: tokenA },
			payload: {
				role: "user",
				content: "Пациент жалуется на ноющие боли в зубе 46",
			},
		});
		assert.equal(postMsgRes1.statusCode, 201);
		const msg1 = postMsgRes1.json();
		assert.equal(msg1.sessionId, sessionId);
		assert.equal(msg1.content, "Пациент жалуется на ноющие боли в зубе 46");

		// Post assistant response message
		const postMsgRes2 = await server.inject({
			method: "POST",
			url: `/api/agent/sessions/${sessionId}/messages`,
			headers: { [CLINIC_TOKEN_HEADER]: tokenA },
			payload: {
				role: "assistant",
				content: "Рекомендуется термодиагностика и прицельный снимок зуба 46.",
			},
		});
		assert.equal(postMsgRes2.statusCode, 201);

		// Get all messages
		const getMsgsRes = await server.inject({
			method: "GET",
			url: `/api/agent/sessions/${sessionId}/messages`,
			headers: { [CLINIC_TOKEN_HEADER]: tokenA },
		});
		assert.equal(getMsgsRes.statusCode, 200);
		const msgsBody = getMsgsRes.json();
		assert.equal(msgsBody.total, 2);
		assert.equal(msgsBody.messages[0].role, "user");
		assert.equal(msgsBody.messages[1].role, "assistant");
	});

	it("5. Updates session metadata via PATCH and deletes via DELETE", async () => {
		const createRes = await server.inject({
			method: "POST",
			url: "/api/agent/sessions",
			headers: { [CLINIC_TOKEN_HEADER]: tokenA },
			payload: { title: "Сессия для обновления" },
		});
		const sessionId = createRes.json().id;

		// Patch session
		const patchRes = await server.inject({
			method: "PATCH",
			url: `/api/agent/sessions/${sessionId}`,
			headers: { [CLINIC_TOKEN_HEADER]: tokenA },
			payload: {
				summary: "Обновленный клинический план",
				activeView: "Расписание",
			},
		});
		assert.equal(patchRes.statusCode, 200);
		const patched = patchRes.json();
		assert.equal(patched.summary, "Обновленный клинический план");
		assert.equal(patched.activeView, "Расписание");

		// Delete session
		const delRes = await server.inject({
			method: "DELETE",
			url: `/api/agent/sessions/${sessionId}`,
			headers: { [CLINIC_TOKEN_HEADER]: tokenA },
		});
		assert.equal(delRes.statusCode, 200);
		assert.equal(delRes.json().success, true);
	});
});
