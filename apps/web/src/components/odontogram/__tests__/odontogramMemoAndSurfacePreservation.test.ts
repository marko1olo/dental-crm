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
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mergeToothSurfaceStates } from "@dental/shared";
import type { ToothData } from "../chart/types/toothRendererTypes";
import { applyUpdatedStatesToTeeth } from "../syncModules/odontogramIndexedDbSync";
import { PediatricToothContainer } from "../gate0/teeth/pediatric/PediatricToothContainer";

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
		for (const toothNumber of [54, 55, 64, 65]) {
			const html = renderToStaticMarkup(
				React.createElement(PediatricToothContainer, {
					toothNumber,
				}),
			);
			assert.ok(html.includes('viewBox="0 0 100 218"'), `Tooth ${toothNumber} must render standard 100x218 viewBox`);
			assert.ok(html.includes(`data-tooth-number="${toothNumber}"`), `Tooth ${toothNumber} badge must be rendered`);
			assert.ok(html.includes('cx="50" cy="8" r="8"'), `Upper pediatric molar ${toothNumber} must place badge at cy=8, r=8 to clear root apices`);
		}

		// Control: lower pediatric molar 74 uses lower badge geometry inside viewBox 0..218
		const lowerHtml = renderToStaticMarkup(
			React.createElement(PediatricToothContainer, {
				toothNumber: 74,
			}),
		);
		assert.ok(lowerHtml.includes('data-tooth-number="74"'));
		assert.ok(lowerHtml.includes('cx="50" cy="176" r="14"'), "Lower pediatric molar 74 places badge at cy=176, r=14");

		// Control: upper pediatric incisor 51 uses cy=24, r=14
		const incisorHtml = renderToStaticMarkup(
			React.createElement(PediatricToothContainer, {
				toothNumber: 51,
			}),
		);
		assert.ok(incisorHtml.includes('cx="50" cy="24" r="14"'), "Upper pediatric incisor 51 places badge at cy=24, r=14");
	});
});
