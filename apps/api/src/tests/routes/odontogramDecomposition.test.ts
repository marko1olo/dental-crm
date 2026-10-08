import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CLINICAL_TOOTH_STATE_VALUES,
	clinicalToothStateSchema,
	endoCanalMeasurementSchema,
	endoToothClinicalDataSchema,
	normalizeClinicalToothState,
	registerOdontogramRoutes,
} from "../../routes/odontogram.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

describe("Odontogram Monolith Safe Decomposition Parity Test", () => {
	it("1. Public Export Parity: All 8 canonical symbols exported from facade", () => {
		assert.ok(Array.isArray(CLINICAL_TOOTH_STATE_VALUES));
		assert.equal(CLINICAL_TOOTH_STATE_VALUES.length, 23);
		assert.ok(clinicalToothStateSchema);
		assert.ok(endoCanalMeasurementSchema);
		assert.ok(endoToothClinicalDataSchema);
		assert.equal(typeof normalizeClinicalToothState, "function");
		assert.equal(typeof registerOdontogramRoutes, "function");
	});

	it("2. Normalization logic verbatim parity", () => {
		assert.equal(normalizeClinicalToothState("done"), "Filled");
		assert.equal(normalizeClinicalToothState("filled"), "Filled");
		assert.equal(normalizeClinicalToothState("caries"), "Caries");
		assert.equal(normalizeClinicalToothState("pulpitis"), "Pulpitis");
		assert.equal(normalizeClinicalToothState("periodontitis"), "Periodontitis");
		assert.equal(normalizeClinicalToothState("crown"), "Crown");
		assert.equal(normalizeClinicalToothState("missing"), "Missing");
		assert.equal(normalizeClinicalToothState("healthy"), "Healthy");
		assert.equal(normalizeClinicalToothState("idle"), "Healthy");
		assert.equal(normalizeClinicalToothState("treatment"), "Root_Canal_Treated");
		assert.equal(normalizeClinicalToothState("root_canal_treated"), "Root_Canal_Treated");
		assert.equal(normalizeClinicalToothState("implant"), "Implant");
		assert.equal(normalizeClinicalToothState("planned_implant"), "Planned_Implant");
		assert.equal(normalizeClinicalToothState("root"), "Root");
		assert.equal(normalizeClinicalToothState("retained"), "Retained");
		assert.equal(normalizeClinicalToothState("extracted"), "Extracted");
		assert.equal(normalizeClinicalToothState("impacted"), "Impacted");
		assert.equal(normalizeClinicalToothState("Mobility_II"), "Mobility_II");
		assert.equal(normalizeClinicalToothState("unknown_junk"), "Healthy");
	});

	it("3. Endodontic Canal measurement schema validation", () => {
		const validCanal = {
			canalName: "MB1",
			referencePoint: "Вершина бугра",
			workingLengthMm: 21.5,
			masterApicalFile: "#25.04",
			taper: "04",
			obturationTechnique: "Латеральная компакция",
			sealer: "AH Plus",
			notes: "Без особенностей",
		};
		const parsed = endoCanalMeasurementSchema.safeParse(validCanal);
		assert.equal(parsed.success, true);
	});

	it("4. Fastify Route Registration: 100% of expected endpoints are mounted", async () => {
		const app = createTenantTestApp();
		await registerOdontogramRoutes(app);
		await app.ready();

		// Tooth States
		assert.ok(app.hasRoute({ method: "GET", url: "/api/patients/:patientId/tooth-states" }), "GET /api/patients/:patientId/tooth-states");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/patients/:patientId/tooth-states/batch" }), "POST /api/patients/:patientId/tooth-states/batch");

		// Endo
		assert.ok(app.hasRoute({ method: "GET", url: "/api/patients/:patientId/tooth-states/:toothNumber/endo" }), "GET /api/patients/:patientId/tooth-states/:toothNumber/endo");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/patients/:patientId/tooth-states/:toothNumber/endo" }), "POST /api/patients/:patientId/tooth-states/:toothNumber/endo");

		// History
		assert.ok(app.hasRoute({ method: "GET", url: "/api/patients/:patientId/tooth-states/:toothNumber/history" }), "GET /api/patients/:patientId/tooth-states/:toothNumber/history");
		assert.ok(app.hasRoute({ method: "GET", url: "/api/patients/:patientId/tooth-states/history" }), "GET /api/patients/:patientId/tooth-states/history");

		// Periodontal
		assert.ok(app.hasRoute({ method: "GET", url: "/api/patients/:patientId/tooth-states/:toothNumber/periodontal" }), "GET /api/patients/:patientId/tooth-states/:toothNumber/periodontal");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/patients/:patientId/tooth-states/:toothNumber/periodontal" }), "POST /api/patients/:patientId/tooth-states/:toothNumber/periodontal");

		// Pediatric
		assert.ok(app.hasRoute({ method: "GET", url: "/api/patients/:patientId/odontogram/pediatric-indices" }), "GET /api/patients/:patientId/odontogram/pediatric-indices");

		// Treatment Plans Core
		assert.ok(app.hasRoute({ method: "GET", url: "/api/treatment-plans/:id" }), "GET /api/treatment-plans/:id");
		assert.ok(app.hasRoute({ method: "GET", url: "/api/patients/:patientId/treatment-plans" }), "GET /api/patients/:patientId/treatment-plans");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/patients/:patientId/treatment-plans" }), "POST /api/patients/:patientId/treatment-plans");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/patients/:patientId/treatment-plans/:planId/complete-items" }), "POST /api/patients/:patientId/treatment-plans/:planId/complete-items");

		// Treatment Plans Variants & Financial
		assert.ok(app.hasRoute({ method: "POST", url: "/api/patients/:patientId/treatment-plans/:planId/approve-variant" }), "POST /api/patients/:patientId/treatment-plans/:planId/approve-variant");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/patients/:patientId/treatment-plans/alternative-group" }), "POST /api/patients/:patientId/treatment-plans/alternative-group");
		assert.ok(app.hasRoute({ method: "GET", url: "/api/patients/:patientId/treatment-plans/alternative-groups" }), "GET /api/patients/:patientId/treatment-plans/alternative-groups");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/patients/:patientId/treatment-plans/:planId/price-freeze" }), "POST /api/patients/:patientId/treatment-plans/:planId/price-freeze");
		assert.ok(app.hasRoute({ method: "GET", url: "/api/patients/:patientId/treatment-plans/:planId/price-freeze" }), "GET /api/patients/:patientId/treatment-plans/:planId/price-freeze");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/patients/:patientId/treatment-plans/:planId/discount-mode" }), "POST /api/patients/:patientId/treatment-plans/:planId/discount-mode");

		await app.close();
	});
});
