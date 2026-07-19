import assert from "node:assert";
import { describe, test, mock } from "node:test";
import { ClinicalRouter } from "./ClinicalRouter.js";

describe("ClinicalRouter", () => {
	describe("handlePhaseCompletion", () => {
		test("creates handoff task for PHASE_1_THERAPY", async () => {
			const router = new ClinicalRouter();
			const result = await router.handlePhaseCompletion(
				"org-1",
				"patient-1",
				"PHASE_1_THERAPY",
				"Completed therapy successfully",
				["11", "12", "13"],
			);

			assert.notStrictEqual(result, null);
			if (result) {
				assert.strictEqual(result.organizationId, "org-1");
				assert.strictEqual(result.patientId, "patient-1");
				assert.strictEqual(result.taskType, "prosthetics_handoff");
				assert.strictEqual(result.title, "Phase II: Orthopedic Handoff");
				assert.strictEqual(
					result.description,
					"Therapy phase completed for teeth: 11, 12, 13. Handoff notes: Completed therapy successfully. Please review for prosthetics.",
				);
				assert.strictEqual(result.status, "pending");
				assert.ok(result.id);
			}
		});

		test("creates handoff task for PHASE_2_SURGERY", async () => {
			const router = new ClinicalRouter();
			const result = await router.handlePhaseCompletion(
				"org-2",
				"patient-2",
				"PHASE_2_SURGERY",
				"Implants placed",
				["36", "46"],
			);

			assert.notStrictEqual(result, null);
			if (result) {
				assert.strictEqual(result.organizationId, "org-2");
				assert.strictEqual(result.patientId, "patient-2");
				assert.strictEqual(result.taskType, "prosthetics_handoff");
				assert.strictEqual(
					result.title,
					"Phase II: Orthopedic Handoff after Surgery",
				);
				assert.strictEqual(
					result.description,
					"Surgery completed for teeth: 36, 46. Notes: Implants placed. Proceed with prosthetics after healing.",
				);
				assert.strictEqual(result.status, "pending");
				assert.ok(result.id);
			}
		});

		test("returns null for unknown phase code", async () => {
			const router = new ClinicalRouter();
			const result = await router.handlePhaseCompletion(
				"org-3",
				"patient-3",
				"UNKNOWN_PHASE",
				"Some notes",
				["21"],
			);

			assert.strictEqual(result, null);
		});
	});
});
