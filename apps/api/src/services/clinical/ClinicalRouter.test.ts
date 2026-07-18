import assert from "node:assert";
import { describe, test } from "node:test";
import { ClinicalRouter } from "./ClinicalRouter.js";

describe("ClinicalRouter", () => {
	const router = new ClinicalRouter();
	const orgId = "org-123";
	const patientId = "patient-456";
	const notes = "Test notes";
	const toothCodes = ["11", "21"];

	test("returns prosthetics handoff task for PHASE_1_THERAPY", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"PHASE_1_THERAPY",
			notes,
			toothCodes,
		);

		assert.notStrictEqual(result, null);
		assert.strictEqual(result?.organizationId, orgId);
		assert.strictEqual(result?.patientId, patientId);
		assert.strictEqual(result?.taskType, "prosthetics_handoff");
		assert.strictEqual(result?.title, "Phase II: Orthopedic Handoff");
		assert.strictEqual(
			result?.description,
			`Therapy phase completed for teeth: 11, 21. Handoff notes: Test notes. Please review for prosthetics.`,
		);
		assert.strictEqual(result?.status, "pending");
		assert.ok(result?.id); // Should have a UUID
	});

	test("returns prosthetics handoff task for PHASE_2_SURGERY", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"PHASE_2_SURGERY",
			notes,
			toothCodes,
		);

		assert.notStrictEqual(result, null);
		assert.strictEqual(result?.organizationId, orgId);
		assert.strictEqual(result?.patientId, patientId);
		assert.strictEqual(result?.taskType, "prosthetics_handoff");
		assert.strictEqual(
			result?.title,
			"Phase II: Orthopedic Handoff after Surgery",
		);
		assert.strictEqual(
			result?.description,
			`Surgery completed for teeth: 11, 21. Notes: Test notes. Proceed with prosthetics after healing.`,
		);
		assert.strictEqual(result?.status, "pending");
		assert.ok(result?.id); // Should have a UUID
	});

	test("returns null for unknown phase code", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"UNKNOWN_PHASE",
			notes,
			toothCodes,
		);

		assert.strictEqual(result, null);
	});
});
