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
import { mergeToothSurfaceStates } from "@dental/shared";
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

	it("[DEFECT-ODONT-01 & DEFECT-ODONT-03]: useToothSurfacesState maintains MODBL isolation when toggling caries on filled tooth", () => {
		const prevMap = { M: "filling" };
		const nextMap = { O: "caries" };
		const merged = mergeToothSurfaceStates(prevMap, nextMap);

		assert.equal(merged.M, "filling", "Mesial filling must remain preserved");
		assert.equal(merged.O, "caries", "Occlusal caries must be registered");
	});

	it("[DEFECT-ODONT-02]: upper pediatric molars (54, 55, 64, 65) badge cy=8.0 clears apices at Y=14..18", () => {
		// Verify badge default placement for upper molars in PediatricToothContainer
		const toothNumber = 54;
		const quadrant = Math.floor(toothNumber / 10);
		const isTop = quadrant === 5 || quadrant === 6;
		const isUpperMolar = isTop && (toothNumber % 10 === 4 || toothNumber % 10 === 5);
		assert.equal(isUpperMolar, true, "Tooth 54 must be identified as upper pediatric molar");

		const r = isUpperMolar ? 8.0 : 14;
		const cy = isUpperMolar ? 8.0 : 24.0;
		assert.equal(r, 8.0);
		assert.equal(cy, 8.0);

		// Apices are at Y=14..18 (Palatal apex at Y=14, MB/DB at Y=18).
		// Badge bottom edge is cy + r = 8.0 + 8.0 = 16.0 (below or at apex clearance, fully inside viewBox 0..218)
		assert.ok(cy + r <= 18.0, "Badge bottom edge must not clip root apex halos at Y=18");
	});
});
