import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAgentProactiveAndNudgeRoutes } from "../../routes/agent/agentProactiveAndNudgeRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

describe("agentProactiveAndNudgeRoutes RLS, Zod .strict() & Error Handling", () => {
	let app: FastifyInstance;
	const orgId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
	const userId = "11111111-2222-4333-8444-555555555555";
	let clinicToken: string;
	let staffToken: string;

	before(async () => {
		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: orgId, role: "clinic" }, secret, 3600);
		staffToken = signToken(
			{ organizationId: orgId, userId, role: "doctor", clinicalRole: "doctor" },
			secret,
			3600,
		);
		app = Fastify({ logger: false });
		await app.register(registerAgentProactiveAndNudgeRoutes);
		await app.ready();
	});

	after(async () => {
		await app.close();
	});

	it("1. Rejects unauthenticated requests with 401", async () => {
		const nudgesRes = await app.inject({ method: "GET", url: "/api/agent/nudges" });
		assert.equal(nudgesRes.statusCode, 401);

		const pendingRes = await app.inject({ method: "GET", url: "/api/agent/proactive/pending" });
		assert.equal(pendingRes.statusCode, 401);

		const approveRes = await app.inject({
			method: "POST",
			url: "/api/agent/proactive/approve",
			payload: { approvalId: "11111111-2222-4333-8444-555555555555" },
		});
		assert.equal(approveRes.statusCode, 401);
	});

	it("2. Rejects invalid UUIDs and extra unknown properties (.strict()) with 400", async () => {
		const badQueryRes = await app.inject({
			method: "GET",
			url: "/api/agent/nudges?patientId=not-a-uuid",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: staffToken },
		});
		assert.equal(badQueryRes.statusCode, 400);

		const extraQueryRes = await app.inject({
			method: "GET",
			url: "/api/agent/nudges?unexpected=1",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: staffToken },
		});
		assert.equal(extraQueryRes.statusCode, 400);

		const badDismissRes = await app.inject({
			method: "POST",
			url: "/api/agent/dismiss-nudge",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: staffToken },
			payload: { nudgeId: "nudge-1", patientId: "invalid-uuid" },
		});
		assert.equal(badDismissRes.statusCode, 400);

		const badApproveRes = await app.inject({
			method: "POST",
			url: "/api/agent/proactive/approve",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: staffToken },
			payload: { approvalId: "not-uuid", extraField: true },
		});
		assert.equal(badApproveRes.statusCode, 400);

		const badRejectRes = await app.inject({
			method: "POST",
			url: "/api/agent/proactive/reject",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: staffToken },
			payload: { approvalId: "not-uuid" },
		});
		assert.equal(badRejectRes.statusCode, 400);
	});

	it("3. Executes nudges & pending queries inside withTenantCtx and returns 404 for unknown approvalId", async () => {
		const nudgesRes = await app.inject({
			method: "GET",
			url: "/api/agent/nudges",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: staffToken },
		});
		assert.equal(nudgesRes.statusCode, 200);
		assert.equal(nudgesRes.json().ok, true);

		const pendingRes = await app.inject({
			method: "GET",
			url: "/api/agent/proactive/pending",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: staffToken },
		});
		assert.equal(pendingRes.statusCode, 200);
		assert.equal(pendingRes.json().ok, true);

		const approveMissingRes = await app.inject({
			method: "POST",
			url: "/api/agent/proactive/approve",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: staffToken },
			payload: { approvalId: "99999999-9999-4999-8999-999999999999" },
		});
		assert.equal(approveMissingRes.statusCode, 404);

		const rejectMissingRes = await app.inject({
			method: "POST",
			url: "/api/agent/proactive/reject",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken, [STAFF_TOKEN_HEADER]: staffToken },
			payload: { approvalId: "99999999-9999-4999-8999-999999999999" },
		});
		assert.equal(rejectMissingRes.statusCode, 404);
	});
});
