import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { db } from "../../db/client.js";

const ORG_ID = "123e4567-e89b-12d3-a456-4266141740ff";
const VISIT_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("visitPerioRoutes integration", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	const originalEnv = process.env;

	beforeEach(async () => {
		app = Fastify();
		await registerVisitRoutes(app);
		process.env = { ...originalEnv };
		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_ID, role: "doctor", userId: "123e4567-e89b-12d3-a456-426614174002" },
				TOKEN_SECRET(),
			),
			"x-organization-id": ORG_ID,
		};
	});

	afterEach(async () => {
		await app.close();
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it("1. GET /api/visits/:visitId/perio rejects unauthenticated call (401)", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/visits/${VISIT_ID}/perio`,
		});
		assert.strictEqual(res.statusCode, 401);
	});

	it("2. GET /api/clinical/visits/:visitId/perio rejects malformed UUID (400)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/clinical/visits/not-a-uuid/perio",
			headers: clinicHeaders,
		});
		assert.strictEqual(res.statusCode, 400);
		const json = JSON.parse(res.body) as { error?: string };
		assert.strictEqual(json.error, "InvalidVisitId");
	});

	it("3. GET /api/visits/:visitId/perio returns 404 if visit does not exist", async () => {
		vi.spyOn(db, "select").mockImplementation(() => {
			return {
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([]),
					}),
				}),
			} as ReturnType<typeof db.select>;
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/visits/${VISIT_ID}/perio`,
			headers: clinicHeaders,
		});
		assert.strictEqual(res.statusCode, 404);
		const json = JSON.parse(res.body) as { error?: string };
		assert.strictEqual(json.error, "VisitNotFound");
	});

	it("4. POST /api/clinical/visits/:visitId/perio rejects malformed UUID (400)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical/visits/invalid-id/perio",
			headers: clinicHeaders,
			payload: { teeth: [] },
		});
		assert.strictEqual(res.statusCode, 400);
		const json = JSON.parse(res.body) as { error?: string };
		assert.strictEqual(json.error, "InvalidVisitId");
	});
});
