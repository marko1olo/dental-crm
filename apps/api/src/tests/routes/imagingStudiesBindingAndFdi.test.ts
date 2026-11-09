/**
 * @file imagingStudiesBindingAndFdi.test.ts
 * @description Unit & integration test suite verifying FDI tooth validation (ISO 3950),
 * zero-mock-defaults, and CBCT Tuner demo vs production tenant isolation.
 *
 * Mandates:
 * - Mandate 8e: Doctor autonomy, robust error reporting.
 * - Mandate 8wy: Zero synthetic mocks in production mode, strict demo isolation.
 * - Mandate 8bd: Red Team Fixer Surgeon verification.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerStudiesRoutes } from "../../routes/imaging/modules/studiesRegistration.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { STAFF_TOKEN_HEADER } from "../../security/identity.js";

process.env.NODE_ENV = "test";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

const TEST_ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";

function createAuthHeaders(): Record<string, string> {
	const token = signToken(
		{
			userId: "11111111-1111-1111-1111-111111111111",
			organizationId: TEST_ORG_ID,
			role: "doctor",
		},
		authTokenSecret(),
	);
	return {
		[STAFF_TOKEN_HEADER]: token,
		authorization: `Bearer ${token}`,
		"x-organization-id": TEST_ORG_ID,
	};
}

describe("Imaging Studies Binding & FDI Validation Suite", () => {
	let app: FastifyInstance;

	before(async () => {
		app = Fastify();
		await registerStudiesRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
	});

	it("1. bindTooth rejects invalid tooth code 'foo' with 400 and FDI error message", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/imaging/studies/00000000-0000-0000-0000-000000000099/bind-tooth",
			headers: createAuthHeaders(),
			payload: { toothCode: "foo" },
		});
		assert.equal(res.statusCode, 400);
		const body = res.json();
		assert.equal(body.error, "ValidationError");
		assert.ok(body.message.includes("FDI"), `Message must reference FDI: ${body.message}`);
	});

	it("2. bindTooth rejects negative and non-FDI teeth (-1, 0, 19, 99) with 400", async () => {
		for (const invalidCode of ["-1", "0", "19", "99", "abc"]) {
			const res = await app.inject({
				method: "POST",
				url: "/api/imaging/studies/00000000-0000-0000-0000-000000000099/bind-tooth",
				headers: createAuthHeaders(),
				payload: { toothCode: invalidCode },
			});
			assert.equal(res.statusCode, 400, `Tooth code "${invalidCode}" must be rejected with 400`);
			const body = res.json();
			assert.equal(body.error, "ValidationError");
		}
	});

	it("3. bindTooth passes valid FDI tooth (16) through to database update (404 on unknown ID, not 400)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/imaging/studies/00000000-0000-0000-0000-000000000099/bind-tooth",
			headers: createAuthHeaders(),
			payload: { toothCode: "16" },
		});
		// Since study 00000000-...-99 doesn't exist, it should return 404 (StudyNotFound), proving FDI validation passed!
		assert.equal(res.statusCode, 404);
	});

	it("4. cbctTunerPatientsHandler isolates demo patient behind showcase/demo mode", async () => {
		// In demo mode:
		const demoRes = await app.inject({
			method: "GET",
			url: "/api/cbct-tuner/patients?demo=true",
			headers: createAuthHeaders(),
		});
		assert.equal(demoRes.statusCode, 200);
		const demoBody = demoRes.json();
		assert.equal(demoBody.ok, true);
		assert.equal(demoBody.patients[0]?.name, "Демо Пациент");

		// In prod mode (no demo flag):
		const prodRes = await app.inject({
			method: "GET",
			url: "/api/cbct-tuner/patients",
			headers: createAuthHeaders(),
		});
		assert.equal(prodRes.statusCode, 200);
		const prodBody = prodRes.json();
		assert.equal(prodBody.ok, true);
		// In production, must NOT return fake "Демо Пациент"
		if (prodBody.patients.length > 0) {
			assert.notEqual(prodBody.patients[0]?.name, "Демо Пациент");
		}
	});

	it("5. cbctTunerVolumeHandler returns 400 if missing id in production, and 404 if file missing", async () => {
		// Missing id in prod -> 400
		const missingIdRes = await app.inject({
			method: "GET",
			url: "/api/cbct-tuner/volume-binary",
			headers: createAuthHeaders(),
		});
		assert.equal(missingIdRes.statusCode, 400);

		// Non-existent id in prod -> 404
		const notFoundRes = await app.inject({
			method: "GET",
			url: "/api/cbct-tuner/volume-binary?id=non-existent-study-volume-id",
			headers: createAuthHeaders(),
		});
		assert.equal(notFoundRes.statusCode, 404);
		assert.equal(notFoundRes.json().error, "NotFound");

		// In demo mode -> returns 200 octet stream
		const demoRes = await app.inject({
			method: "GET",
			url: "/api/cbct-tuner/volume-binary?demo=true",
			headers: createAuthHeaders(),
		});
		assert.equal(demoRes.statusCode, 200);
		assert.equal(demoRes.headers["content-type"], "application/octet-stream");
		assert.equal(demoRes.rawPayload.length, 512 * 512 * 2);
	});
});
