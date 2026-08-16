import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	OdontogramEvolutionEngine,
	type OdontogramSnapshot,
} from "./OdontogramEvolutionEngine.js";

describe("OdontogramEvolutionEngine — Feature #126 Odontogram History & Anatomy Rules", () => {
	test("1. Validates normal anatomical transitions", () => {
		// Healthy -> Caries
		const t1 = OdontogramEvolutionEngine.validateToothTransition("16", "healthy", "caries");
		assert.equal(t1.isValid, true);

		// Caries -> Filled
		const t2 = OdontogramEvolutionEngine.validateToothTransition("16", "caries", "filled");
		assert.equal(t2.isValid, true);

		// Periodontitis -> Extracted
		const t3 = OdontogramEvolutionEngine.validateToothTransition("46", "periodontitis", "extracted");
		assert.equal(t3.isValid, true);

		// Extracted -> Implant
		const t4 = OdontogramEvolutionEngine.validateToothTransition("46", "extracted", "implant");
		assert.equal(t4.isValid, true);
	});

	test("2. Strictly rejects impossible anatomical transitions", () => {
		// Cannot fill an extracted tooth
		const t1 = OdontogramEvolutionEngine.validateToothTransition("36", "extracted", "filled");
		assert.equal(t1.isValid, false);
		assert.ok(t1.message?.includes("Анатомическая ошибка"));

		// Cannot extract an already missing tooth
		const t2 = OdontogramEvolutionEngine.validateToothTransition("18", "missing_congenital", "extracted");
		assert.equal(t2.isValid, false);

		// Cannot place implant on healthy tooth without prior extraction
		const t3 = OdontogramEvolutionEngine.validateToothTransition("11", "healthy", "implant");
		assert.equal(t3.isValid, false);
	});

	test("3. Diffs two odontogram snapshots accurately", () => {
		const snapshot1: OdontogramSnapshot = {
			version: 1,
			visitId: "visit-1",
			recordedAt: new Date("2026-01-10"),
			teeth: {
				"16": { fdiNumber: "16", condition: "caries", surfaces: ["occlusal"] },
				"36": { fdiNumber: "36", condition: "periodontitis" },
				"46": { fdiNumber: "46", condition: "extracted" },
			},
		};

		const snapshot2: OdontogramSnapshot = {
			version: 2,
			visitId: "visit-2",
			recordedAt: new Date("2026-02-15"),
			teeth: {
				"16": { fdiNumber: "16", condition: "filled", surfaces: ["occlusal"] },
				"36": { fdiNumber: "36", condition: "extracted" },
				"46": { fdiNumber: "46", condition: "implant" },
			},
		};

		const diff = OdontogramEvolutionEngine.diffOdontograms(snapshot1, snapshot2);
		assert.equal(diff.totalChangedTeeth, 3);
		assert.equal(diff.hasAnatomicalErrors, false);

		const change16 = diff.changes.find((c) => c.fdiNumber === "16");
		assert.equal(change16?.changeType, "filling_placed");

		const change36 = diff.changes.find((c) => c.fdiNumber === "36");
		assert.equal(change36?.changeType, "tooth_extracted");

		const change46 = diff.changes.find((c) => c.fdiNumber === "46");
		assert.equal(change46?.changeType, "implant_placed");
	});
});
