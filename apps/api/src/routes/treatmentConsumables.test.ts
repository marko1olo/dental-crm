import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { treatmentConsumablesRoutes } from "./treatmentConsumables.js";

describe("Treatment Consumables Routes", () => {
	let app: FastifyInstance;
	const orgId = "123e4567-e89b-12d3-a456-426614174000";
	let staffToken: string;

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";

		staffToken = signToken(
			{ organizationId: orgId, userId: "usr-admin-1", role: "admin" },
			authTokenSecret(),
		);

		app = Fastify();
		await app.register(treatmentConsumablesRoutes, {
			prefix: "/api/treatment-consumables",
		});
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
	});

	test("rejects invalid request body with 400 on link creation", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/treatment-consumables/${orgId}/links`,
			headers: {
				"x-dente-staff-token": staffToken,
				"content-type": "application/json",
			},
			payload: {
				serviceId: "",
				inventoryItemId: "",
				quantity: -1,
			},
		});

		assert.strictEqual(res.statusCode, 400);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "ValidationError");
	});

	test("rejects mismatched organization header with 403", async () => {
		const otherOrgToken = signToken(
			{ organizationId: "other-org-id", userId: "usr-admin-2", role: "admin" },
			authTokenSecret(),
		);

		const res = await app.inject({
			method: "GET",
			url: `/api/treatment-consumables/${orgId}/links`,
			headers: {
				"x-dente-staff-token": otherOrgToken,
			},
		});

		assert.strictEqual(res.statusCode, 403);
	});

	test("rejects invalid deduct payload with 400", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/treatment-consumables/${orgId}/deduct/visit`,
			headers: {
				"x-dente-staff-token": staffToken,
				"content-type": "application/json",
			},
			payload: {
				visitId: "",
			},
		});

		assert.strictEqual(res.statusCode, 400);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "ValidationError");
	});

	test("rejects invalid check-availability payload with 400", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/treatment-consumables/${orgId}/check-availability`,
			headers: {
				"x-dente-staff-token": staffToken,
				"content-type": "application/json",
			},
			payload: {
				items: [],
			},
		});

		assert.strictEqual(res.statusCode, 400);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "ValidationError");
	});
});
