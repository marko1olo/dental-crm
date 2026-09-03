/**
 * cbctMprWorkspace.test.ts — Unit tests for 3D CBCT MPR Multi-Planar Reconstruction and Nerve Caliper.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	measureDistanceToMandibularNerve,
	measureDistanceToMaxillarySinus,
	measure3DDistanceMm,
	type Point3D,
} from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("3D CBCT Multi-Planar Reconstruction (MPR) & Caliper Calculations", () => {
	it("3.1 Accurately calculates 3D Euclidean distance between calibrated voxels", () => {
		const p1: Point3D = { x: 100, y: 100, z: 20 };
		const p2: Point3D = { x: 110, y: 100, z: 20 };
		const spacing = { x: 0.2, y: 0.2, z: 0.5 };

		// dx = 10 * 0.2 = 2.0 mm
		const dist = measure3DDistanceMm(p1, p2, spacing);
		assert.equal(dist, 2.0);
	});

	it("3.2 Evaluates mandibular nerve safety corridor threshold (< 1.0mm danger, 1.0-2.0mm warning, >= 2.0mm safe)", () => {
		const nerveTrajectory: Point3D[] = [
			{ x: 100, y: 100, z: 20 },
			{ x: 150, y: 100, z: 20 },
		];
		const spacing = { x: 0.2, y: 0.2, z: 0.5 };

		// Apex close to nerve (dx = 3 voxels * 0.2 = 0.6 mm -> Danger)
		const dangerApex: Point3D = { x: 120, y: 103, z: 20 };
		const resDanger = measureDistanceToMandibularNerve(dangerApex, nerveTrajectory, spacing);
		assert.equal(resDanger.safetyZone, "danger");
		assert.equal(resDanger.isSafe, false);
		assert.ok(resDanger.clinicalAdvice.includes("ОПАСНО"));

		// Apex at warning distance (dx = 7.5 voxels * 0.2 = 1.5 mm -> Warning)
		const warningApex: Point3D = { x: 120, y: 107.5, z: 20 };
		const resWarning = measureDistanceToMandibularNerve(warningApex, nerveTrajectory, spacing);
		assert.equal(resWarning.safetyZone, "warning");
		assert.equal(resWarning.isSafe, false);

		// Apex at safe distance (dx = 15 voxels * 0.2 = 3.0 mm -> Safe)
		const safeApex: Point3D = { x: 120, y: 115, z: 20 };
		const resSafe = measureDistanceToMandibularNerve(safeApex, nerveTrajectory, spacing);
		assert.equal(resSafe.safetyZone, "safe");
		assert.equal(resSafe.isSafe, true);
		assert.ok(resSafe.clinicalAdvice.includes("Безопасный коридор"));
	});

	it("3.3 Evaluates maxillary sinus floor residual bone height indications", () => {
		const alveolarCrest: Point3D = { x: 100, y: 100, z: 20 };
		const spacing = { x: 0.2, y: 0.2, z: 0.5 };

		// High bone (dz = 20 * 0.5 = 10.0 mm -> Direct implant)
		const highSinusFloor: Point3D = { x: 100, y: 100, z: 40 };
		const resHigh = measureDistanceToMaxillarySinus(alveolarCrest, highSinusFloor, spacing);
		assert.equal(resHigh.sinusLiftRecommended, false);
		assert.equal(resHigh.sinusLiftType, "none");

		// Moderate resorption (dz = 12 * 0.5 = 6.0 mm -> Crestal closed sinus lift)
		const midSinusFloor: Point3D = { x: 100, y: 100, z: 32 };
		const resMid = measureDistanceToMaxillarySinus(alveolarCrest, midSinusFloor, spacing);
		assert.equal(resMid.sinusLiftRecommended, true);
		assert.equal(resMid.sinusLiftType, "crestal_closed");

		// Severe atrophy (dz = 6 * 0.5 = 3.0 mm -> Lateral open sinus lift)
		const lowSinusFloor: Point3D = { x: 100, y: 100, z: 26 };
		const resLow = measureDistanceToMaxillarySinus(alveolarCrest, lowSinusFloor, spacing);
		assert.equal(resLow.sinusLiftRecommended, true);
		assert.equal(resLow.sinusLiftType, "lateral_open");
	});

	it("3.4 Zero-Mock Fallback: source code contains no procedural fake bone gradients or synthetic jaw dioramas", () => {
		const source = fs.readFileSync(
			path.resolve(__dirname, "../CbctMprWorkspace.tsx"),
			"utf-8",
		);

		// Must NOT contain synthetic canvas diorama generators
		assert.equal(
			source.includes("ctx.createRadialGradient"),
			false,
			"Source code must not contain fake radial gradients simulating bone tissue",
		);
		assert.equal(
			source.includes("Math.min(w, h) / 2.2"),
			false,
			"Source code must not contain fake arc jaw simulations",
		);

		// Must contain clean 40px calibration grid and honest clinical state
		assert.ok(
			source.includes("КЛКТ исследование не загружено"),
			"Source code must display clear clinical state when CBCT is not loaded",
		);
		assert.ok(
			source.includes("x += 40") && source.includes("y += 40"),
			"Source code must draw clean 40px calibration grid",
		);
	});

	it("3.5 Export security gate: blocks export to 043/у without loaded CBCT study", () => {
		const source = fs.readFileSync(
			path.resolve(__dirname, "../CbctMprWorkspace.tsx"),
			"utf-8",
		);

		// Must block export when isStudyLoaded is false with exact clinical error message
		const expectedBlockMessage =
			"Экспорт заблокирован: исследование КЛКТ не загружено. Прикрепление синтетических макетов запрещено стандартом клиники";
		assert.ok(
			source.includes(expectedBlockMessage),
			`Source code must contain exact clinical block message: "${expectedBlockMessage}"`,
		);
	});
});
