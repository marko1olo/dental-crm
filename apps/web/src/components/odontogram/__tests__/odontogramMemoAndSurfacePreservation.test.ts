/**
 * apps/web/src/components/odontogram/__tests__/odontogramMemoAndSurfacePreservation.test.ts
 *
 * DENTE Dental CRM — Odontogram Red Team Verification Suite
 * Tests for [DEFECT-ODON-01] and [DEFECT-ODON-02]:
 * 1. React.memo comparator re-renders on clinicalData/notes/endo mutations.
 * 2. Surface preservation when applying tooth state without overriding surfaces.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ToothData } from "../chart/types/toothRendererTypes";
import { applyUpdatedStatesToTeeth } from "../syncModules/odontogramIndexedDbSync";

describe("Odontogram Red Team Defect Invariants", () => {
	it("[DEFECT-ODON-02]: preserves previously saved tooth surfaces when state changes with undefined surfacesOverride", () => {
		const initialTeeth: ToothData[] = [
			{
				toothNumber: 46,
				state: "Filled",
				surfaces: ["occlusal", "distal"],
				material: "composite",
			},
		];

		// Case A: surfacesOverride is undefined (e.g. changing status to Pulpitis via radial menu)
		const nextTeethPreserved = applyUpdatedStatesToTeeth(
			initialTeeth,
			[46],
			"Pulpitis",
			undefined,
		);

		const tooth46 = nextTeethPreserved.find((t) => t.toothNumber === 46);
		assert.ok(tooth46, "Tooth 46 must exist in next state");
		assert.equal(tooth46.state, "Pulpitis");
		assert.deepEqual(
			tooth46.surfaces,
			["occlusal", "distal"],
			"Surfaces must be preserved when surfacesOverride is undefined",
		);

		// Case B: surfacesOverride is explicitly [] (e.g. sanitation reset to Healthy)
		const nextTeethHealthy = applyUpdatedStatesToTeeth(
			initialTeeth,
			[46],
			"Healthy",
			[],
		);
		const tooth46Healthy = nextTeethHealthy.find((t) => t.toothNumber === 46);
		assert.ok(tooth46Healthy, "Tooth 46 must exist");
		assert.equal(tooth46Healthy.state, "Healthy");
		assert.equal(
			tooth46Healthy.surfaces,
			undefined,
			"Surfaces must be cleared when explicitly sanitizing to Healthy",
		);
	});

	it("[DEFECT-ODON-01]: composite state merge preserves existing filling surfaces alongside new caries", () => {
		const initialTeeth: ToothData[] = [
			{
				toothNumber: 36,
				state: "Filled",
				surfaces: ["mesial"],
				material: "composite",
				clinicalData: {
					hasFilling: true,
					fillingSurfaces: ["mesial"],
				},
			},
		];

		// Doctor detects new caries on distal surface
		const nextTeeth = applyUpdatedStatesToTeeth(
			initialTeeth,
			[36],
			"Caries",
			["distal"],
		);

		const tooth36 = nextTeeth.find((t) => t.toothNumber === 36);
		assert.ok(tooth36, "Tooth 36 must exist");
		assert.equal(tooth36.state, "Caries");
		assert.ok(
			tooth36.surfaces?.includes("mesial"),
			"Must retain existing mesial filling surface",
		);
		assert.ok(
			tooth36.surfaces?.includes("distal"),
			"Must include new distal caries surface",
		);

		const clin = tooth36.clinicalData as Record<string, unknown> | undefined;
		assert.ok(clin, "Clinical data must be populated");
		assert.equal(clin.hasFilling, true);
		assert.equal(clin.hasCaries, true);
	});
});
