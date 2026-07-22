import assert from "node:assert";
import { describe, test } from "node:test";
import { ClinicalRouter } from "./ClinicalRouter.js";

describe("ClinicalRouter", () => {
	const router = new ClinicalRouter();
	const orgId = "org-123";
	const patientId = "patient-456";
	const notes = "Test notes";
	const toothCodes = ["11", "12"];

	test("handlePhaseCompletion returns task for PHASE_1_THERAPY", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"PHASE_1_THERAPY",
			notes,
			toothCodes,
		);

		assert.ok(result);
		assert.strictEqual(result.organizationId, orgId);
		assert.strictEqual(result.patientId, patientId);
		assert.strictEqual(result.taskType, "prosthetics_handoff");
		assert.strictEqual(result.title, "Phase II: Orthopedic Handoff");
		assert.strictEqual(
			result.description,
			"Therapy phase completed for teeth: 11, 12. Handoff notes: Test notes. Please review for prosthetics.",
		);
		assert.strictEqual(result.status, "pending");
		assert.ok(result.id);
	});

	test("handlePhaseCompletion returns task for PHASE_2_SURGERY", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"PHASE_2_SURGERY",
			notes,
			toothCodes,
		);

		assert.ok(result);
		assert.strictEqual(result.organizationId, orgId);
		assert.strictEqual(result.patientId, patientId);
		assert.strictEqual(result.taskType, "prosthetics_handoff");
		assert.strictEqual(result.title, "Phase II: Orthopedic Handoff after Surgery");
		assert.strictEqual(
			result.description,
			"Surgery completed for teeth: 11, 12. Notes: Test notes. Proceed with prosthetics after healing.",
		);
		assert.strictEqual(result.status, "pending");
		assert.ok(result.id);
	});

	test("handlePhaseCompletion returns null for unknown phase code", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"UNKNOWN_PHASE",
			notes,
			toothCodes,
		);

		assert.strictEqual(result, null);
	});

	test("handlePhaseCompletion formats correctly with empty toothCodes array", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"PHASE_1_THERAPY",
			notes,
			[],
		);

		assert.ok(result);
		assert.strictEqual(
			result.description,
			"Therapy phase completed for teeth: . Handoff notes: Test notes. Please review for prosthetics.",
		);
	});

	test("handlePhaseCompletion formats correctly with empty notes string", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"PHASE_1_THERAPY",
			"",
			toothCodes,
		);

		assert.ok(result);
		assert.strictEqual(
			result.description,
			"Therapy phase completed for teeth: 11, 12. Handoff notes: . Please review for prosthetics.",
		);
	});

	test("handlePhaseCompletion formats correctly with empty toothCodes array for PHASE_2_SURGERY", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"PHASE_2_SURGERY",
			notes,
			[],
		);

		assert.ok(result);
		assert.strictEqual(
			result.description,
			"Surgery completed for teeth: . Notes: Test notes. Proceed with prosthetics after healing.",
		);
	});

	test("handlePhaseCompletion formats correctly with empty notes string for PHASE_2_SURGERY", async () => {
		const result = await router.handlePhaseCompletion(
			orgId,
			patientId,
			"PHASE_2_SURGERY",
			"",
			toothCodes,
		);

		assert.ok(result);
		assert.strictEqual(
			result.description,
			"Surgery completed for teeth: 11, 12. Notes: . Proceed with prosthetics after healing.",
		);
	});
});
