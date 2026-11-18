import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerPediatricDiplomaRoutes } from "../../routes/pediatric/pediatricDiplomaRoutes.js";
import { registerPediatricIndicesRoutes } from "../../routes/pediatric/pediatricIndicesRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000002";

describe("Pediatric API Routes — PostgreSQL 18 & Data Integrity", () => {
	it("1. Rejects unauthenticated request to bravery diploma audit", async () => {
		const app = await createTenantTestApp();
		registerPediatricDiplomaRoutes(app);

		const response = await app.inject({
			method: "GET",
			url: `/api/patients/${ORG_ID}/pediatric/bravery-diploma`,
		});

		assert.equal(response.statusCode, 401);
		await app.close();
	});

	it("2. Rejects invalid patient UUID for bravery diploma", async () => {
		const app = await createTenantTestApp();
		registerPediatricDiplomaRoutes(app);

		const secret = authTokenSecret();
		const staffToken = signToken(
			{
				userId: USER_ID,
				organizationId: ORG_ID,
				role: "doctor",
			},
			secret,
			3600,
		);

		const response = await app.inject({
			method: "GET",
			url: "/api/patients/not-a-valid-uuid/pediatric/bravery-diploma",
			headers: {
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(response.statusCode, 400);
		await app.close();
	});

	it("3. Rejects non-clinical role for pediatric indices calculation", async () => {
		const app = await createTenantTestApp();
		registerPediatricIndicesRoutes(app);

		const secret = authTokenSecret();
		const staffToken = signToken(
			{
				userId: USER_ID,
				organizationId: ORG_ID,
				role: "accountant",
			},
			secret,
			3600,
		);

		const response = await app.inject({
			method: "GET",
			url: `/api/patients/${ORG_ID}/pediatric/indices`,
			headers: {
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(response.statusCode, 403);
		await app.close();
	});
});
