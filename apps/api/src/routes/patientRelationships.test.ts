/**
 * patientRelationships.test.ts — HTTP Route tests for Patient Family Relationships API.
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerPatientRelationshipsRoutes } from "./patientRelationships.js";

describe("Patient Relationships HTTP Routes (Fastify Inject)", () => {
	const orgId = "00000000-0000-7000-8000-000000000001";
	const patientId = "00000000-0000-7000-8000-000000000010";
	const relatedPatientId = "00000000-0000-7000-8000-000000000020";

	let staffToken: string;

	async function buildTestApp() {
		process.env.NODE_ENV = "test";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";

		staffToken = signToken(
			{ organizationId: orgId, userId: "00000000-0000-7000-8000-000000000099", role: "admin" },
			authTokenSecret(),
		);

		const app = Fastify();
		await registerPatientRelationshipsRoutes(app);
		await app.ready();
		return app;
	}

	it("GET /api/v1/patients/:id/relationships handles 400 for invalid patient UUID", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "GET",
				url: "/api/v1/patients/invalid-uuid/relationships",
				headers: {
					"x-dente-staff-token": staffToken,
					"x-organization-id": orgId,
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const json = JSON.parse(res.body);
			assert.strictEqual(json.error, "Bad Request");
		} finally {
			await app.close();
		}
	});

	it("POST /api/v1/patients/:id/relationships rejects self-linking with 400", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "POST",
				url: `/api/v1/patients/${patientId}/relationships`,
				headers: {
					"x-dente-staff-token": staffToken,
					"x-organization-id": orgId,
					"content-type": "application/json",
				},
				payload: {
					relatedPatientId: patientId,
					relationshipType: "parent",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const json = JSON.parse(res.body);
			assert.match(json.message, /Пациент не может быть связан сам с собой/);
		} finally {
			await app.close();
		}
	});

	it("POST /api/v1/patients/:id/relationships rejects invalid payload schema with 400", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "POST",
				url: `/api/v1/patients/${patientId}/relationships`,
				headers: {
					"x-dente-staff-token": staffToken,
					"x-organization-id": orgId,
					"content-type": "application/json",
				},
				payload: {
					relatedPatientId: "not-a-uuid",
					relationshipType: "invalid_type",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const json = JSON.parse(res.body);
			assert.strictEqual(json.error, "Validation Error");
		} finally {
			await app.close();
		}
	});

	it("DELETE /api/v1/patients/:id/relationships/:relationId validates UUID format", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "DELETE",
				url: `/api/v1/patients/${patientId}/relationships/not-a-uuid`,
				headers: {
					"x-dente-staff-token": staffToken,
					"x-organization-id": orgId,
				},
			});

			assert.strictEqual(res.statusCode, 400);
		} finally {
			await app.close();
		}
	});
});
