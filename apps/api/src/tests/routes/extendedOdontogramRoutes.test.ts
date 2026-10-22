import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	batchExtendedToothStatesSchema,
	extendedToothStateItemSchema,
	registerExtendedOdontogramRoutes,
} from "../../routes/odontogram/extendedRoutes.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

describe("Extended Odontogram States Relational Integrity Tests", () => {
	it("1. Schema validation accepts valid extended tooth states", () => {
		const item = {
			toothNumber: 36,
			isPrimaryPediatric: false,
			secondaryCariesUnderFilling: true,
			mobilityDegree: 2,
			pediatricCrownPresent: false,
			notes: "Вторичный кариес под пломбой (ПС)",
		};
		const parsed = extendedToothStateItemSchema.safeParse(item);
		assert.equal(parsed.success, true);
		if (parsed.success) {
			assert.equal(parsed.data.toothNumber, 36);
			assert.equal(parsed.data.secondaryCariesUnderFilling, true);
			assert.equal(parsed.data.mobilityDegree, 2);
		}
	});

	it("2. Schema validation rejects invalid tooth numbers or invalid mobility degrees", () => {
		const invalidTooth = {
			toothNumber: 99, // Out of FDI bounds
			mobilityDegree: 1,
		};
		assert.equal(extendedToothStateItemSchema.safeParse(invalidTooth).success, false);

		const invalidMobility = {
			toothNumber: 11,
			mobilityDegree: 9, // Max is 4
		};
		assert.equal(extendedToothStateItemSchema.safeParse(invalidMobility).success, false);
	});

	it("3. Batch schema validation handles multiple teeth", () => {
		const batch = {
			states: [
				{ toothNumber: 11, secondaryCariesUnderFilling: false },
				{ toothNumber: 55, isPrimaryPediatric: true, pediatricCrownPresent: true },
			],
		};
		const parsed = batchExtendedToothStatesSchema.safeParse(batch);
		assert.equal(parsed.success, true);
		if (parsed.success) {
			assert.equal(parsed.data.states.length, 2);
		}
	});

	it("4. Route registration mounts all extended endpoints", async () => {
		const app = createTenantTestApp();
		registerExtendedOdontogramRoutes(app);
		await app.ready();

		assert.ok(
			app.hasRoute({
				method: "GET",
				url: "/api/patients/:patientId/extended-tooth-states",
			}),
			"GET /api/patients/:patientId/extended-tooth-states mounted",
		);

		assert.ok(
			app.hasRoute({
				method: "GET",
				url: "/api/patients/:patientId/extended-tooth-states/:toothNumber",
			}),
			"GET /api/patients/:patientId/extended-tooth-states/:toothNumber mounted",
		);

		assert.ok(
			app.hasRoute({
				method: "POST",
				url: "/api/patients/:patientId/extended-tooth-states/batch",
			}),
			"POST /api/patients/:patientId/extended-tooth-states/batch mounted",
		);

		await app.close();
	});

	it("5. Security gate: Anonymous call without medical staff token returns 401 or 403", async () => {
		const app = createTenantTestApp();
		registerExtendedOdontogramRoutes(app);
		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/api/patients/00000000-0000-0000-0000-000000000001/extended-tooth-states",
			headers: {
				"x-organization-id": "00000000-0000-0000-0000-000000000001",
			},
		});

		// 401 or 403 because unauthenticated / unauthorized
		assert.ok(
			[401, 403].includes(res.statusCode),
			`Expected 401 or 403, got ${res.statusCode}`,
		);
		await app.close();
	});
});
