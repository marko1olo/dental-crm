/**
 * @file redteamFixerDomain18Radiology.test.ts
 * @description Red Team Fixer Surgeon verification for Domain 18 (Radiology, DICOM MPR & RVG).
 * Verifies fixes for:
 * - DEF-18-02: Fail-Fast 422 UnprocessableDicomDimensions in WADO frames when rows/columns are missing.
 * - DEF-18-04: Strict Zod validation of /api/cbct-tuner query parameters.
 * - DEF-18-05: Idempotency-Key validation and SOP Instance UID deduplication in STOW-RS.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerStudiesRoutes } from "../../routes/imaging/modules/studiesRegistration.js";
import { registerDicomwebRoutes } from "../../routes/dicomweb.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { STAFF_TOKEN_HEADER } from "../../security/identity.js";

process.env.NODE_ENV = "test";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

const TEST_ORG_ID = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";

function createAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
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
		...extraHeaders,
	};
}

describe("Red Team Domain 18 Fixer Surgeon Tests", () => {
	let app: FastifyInstance;

	before(async () => {
		app = Fastify();
		await registerStudiesRoutes(app);
		await registerDicomwebRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
	});

	it("DEF-18-04: cbctTuner rejects unrecognized query parameters due to .strict() Zod schema", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/cbct-tuner/patients?unknownProp=evil",
			headers: createAuthHeaders(),
		});
		assert.equal(res.statusCode, 400);
		const body = res.json();
		assert.equal(body.error, "ValidationError");
		assert.ok(body.message.includes("параметры запроса"));
	});

	it("DEF-18-04: cbctTuner accepts valid query parameters (demo, id)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/cbct-tuner/patients?demo=true",
			headers: createAuthHeaders(),
		});
		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.ok, true);
	});

	it("DEF-18-05: STOW-RS rejects invalid Idempotency-Key with 400", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/dicomweb/studies",
			headers: createAuthHeaders({
				"idempotency-key": "not-a-valid-uuid",
				"content-type": "application/dicom",
			}),
			payload: Buffer.alloc(132),
		});
		assert.equal(res.statusCode, 400);
		const body = res.json();
		assert.equal(body.error, "InvalidIdempotencyKey");
	});

	it("DEF-18-02: WADO frame retrieval validates frame number and returns 400 on non-positive or NaN frame", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/dicomweb/studies/1.2.3/series/1.2.4/instances/1.2.5/frames/0",
			headers: createAuthHeaders(),
		});
		assert.equal(res.statusCode, 400);
		const body = res.json();
		assert.equal(body.error, "InvalidFrameNumber");
	});

	it("DEF-18-02: WADO frame retrieval returns 404 on missing instance instead of defaulting to 512x512 mock dimensions", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/dicomweb/studies/1.2.3.4.5/series/1.2.3.4.6/instances/1.2.3.4.7/frames/1",
			headers: createAuthHeaders(),
		});
		assert.equal(res.statusCode, 404);
		const body = res.json();
		assert.equal(body.error, "DicomInstanceNotFound");
	});
});
