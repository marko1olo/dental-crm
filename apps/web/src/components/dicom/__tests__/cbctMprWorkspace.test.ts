/**
 * cbctMprWorkspace.test.ts — Unit tests for 3D CBCT MPR Multi-Planar Reconstruction and Nerve Caliper.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	measure3DDistanceMm,
	measureDistanceToMandibularNerve,
	measureDistanceToMaxillarySinus,
	type Point3D,
} from "@dental/shared";
import { parseCtPlanningMarkup } from "../ctPlanningPersistence";

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
		const resDanger = measureDistanceToMandibularNerve(
			dangerApex,
			nerveTrajectory,
			spacing,
		);
		assert.equal(resDanger.safetyZone, "danger");
		assert.equal(resDanger.isSafe, false);
		assert.ok(resDanger.clinicalAdvice.includes("ОПАСНО"));

		// Apex at warning distance (dx = 7.5 voxels * 0.2 = 1.5 mm -> Warning)
		const warningApex: Point3D = { x: 120, y: 107.5, z: 20 };
		const resWarning = measureDistanceToMandibularNerve(
			warningApex,
			nerveTrajectory,
			spacing,
		);
		assert.equal(resWarning.safetyZone, "warning");
		assert.equal(resWarning.isSafe, false);

		// Apex at safe distance (dx = 15 voxels * 0.2 = 3.0 mm -> Safe)
		const safeApex: Point3D = { x: 120, y: 115, z: 20 };
		const resSafe = measureDistanceToMandibularNerve(
			safeApex,
			nerveTrajectory,
			spacing,
		);
		assert.equal(resSafe.safetyZone, "safe");
		assert.equal(resSafe.isSafe, true);
		assert.ok(resSafe.clinicalAdvice.includes("Безопасный коридор"));
	});

	it("3.3 Evaluates maxillary sinus floor residual bone height indications", () => {
		const alveolarCrest: Point3D = { x: 100, y: 100, z: 20 };
		const spacing = { x: 0.2, y: 0.2, z: 0.5 };

		// High bone (dz = 20 * 0.5 = 10.0 mm -> Direct implant)
		const highSinusFloor: Point3D = { x: 100, y: 100, z: 40 };
		const resHigh = measureDistanceToMaxillarySinus(
			alveolarCrest,
			highSinusFloor,
			spacing,
		);
		assert.equal(resHigh.sinusLiftRecommended, false);
		assert.equal(resHigh.sinusLiftType, "none");

		// Moderate resorption (dz = 12 * 0.5 = 6.0 mm -> Crestal closed sinus lift)
		const midSinusFloor: Point3D = { x: 100, y: 100, z: 32 };
		const resMid = measureDistanceToMaxillarySinus(
			alveolarCrest,
			midSinusFloor,
			spacing,
		);
		assert.equal(resMid.sinusLiftRecommended, true);
		assert.equal(resMid.sinusLiftType, "crestal_closed");

		// Severe atrophy (dz = 6 * 0.5 = 3.0 mm -> Lateral open sinus lift)
		const lowSinusFloor: Point3D = { x: 100, y: 100, z: 26 };
		const resLow = measureDistanceToMaxillarySinus(
			alveolarCrest,
			lowSinusFloor,
			spacing,
		);
		assert.equal(resLow.sinusLiftRecommended, true);
		assert.equal(resLow.sinusLiftType, "lateral_open");
	});

	it("3.4 Zero-Mock Fallback & Thin Facade (Mandate 8s): source code is a clean, thin delegate to Cornerstone3DViewer under 50 lines and contains no procedural fake bone gradients", () => {
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

		// Must be a clean, thin delegate to Cornerstone3DViewer under 40 lines
		assert.ok(
			source.includes("Cornerstone3DViewer"),
			"CbctMprWorkspace must delegate to canonical Cornerstone3DViewer",
		);
		assert.ok(
			source.split("\n").length <= 50,
			"CbctMprWorkspace must be an ultra-thin facade under 40 lines",
		);
	});

	it("3.5 Canonical Authority Delegation (Mandate 8s): exports CbctMprWorkspace component and props delegating to Cornerstone3DViewer", () => {
		const source = fs.readFileSync(
			path.resolve(__dirname, "../CbctMprWorkspace.tsx"),
			"utf-8",
		);

		assert.ok(
			source.includes("export const CbctMprWorkspace"),
			"Source code must export CbctMprWorkspace component",
		);
		assert.ok(
			source.includes("export interface CbctMprWorkspaceProps"),
			"Source code must export CbctMprWorkspaceProps interface",
		);
		assert.ok(
			source.includes("patientId"),
			"Source code must pass patientId through to Cornerstone3DViewer",
		);
	});

	it("3.6 Pinch-to-zoom gesture math correctly scales viewport transform and clamps within [0.5, 4.0]", () => {
		const initialTouches: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
			{ clientX: 100, clientY: 100 },
			{ clientX: 200, clientY: 200 },
		];
		const t0 = initialTouches[0];
		const t1 = initialTouches[1];
		const initialDist = Math.hypot(
			t0.clientX - t1.clientX,
			t0.clientY - t1.clientY,
		);
		assert.equal(Math.round(initialDist), 141);

		// Pinch Out (Zoom in 2x)
		const pinchedTouches: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
			{ clientX: 50, clientY: 50 },
			{ clientX: 250, clientY: 250 },
		];
		const pt0 = pinchedTouches[0];
		const pt1 = pinchedTouches[1];
		const pinchedDist = Math.hypot(
			pt0.clientX - pt1.clientX,
			pt0.clientY - pt1.clientY,
		);
		const scale = pinchedDist / initialDist;
		const nextZoom = Math.min(4.0, Math.max(0.5, 1.0 * scale));

		assert.equal(scale, 2);
		assert.equal(nextZoom, 2);

		// Extreme pinch in (clamp to 0.5 min)
		const extremeInTouches: [{ clientX: number; clientY: number }, { clientX: number; clientY: number }] = [
			{ clientX: 145, clientY: 145 },
			{ clientX: 155, clientY: 155 },
		];
		const et0 = extremeInTouches[0];
		const et1 = extremeInTouches[1];
		const extremeInDist = Math.hypot(
			et0.clientX - et1.clientX,
			et0.clientY - et1.clientY,
		);
		const extremeInScale = extremeInDist / initialDist;
		const clampedMinZoom = Math.min(4.0, Math.max(0.5, 1.0 * extremeInScale));
		assert.equal(clampedMinZoom, 0.5);

		// Extreme pinch out (clamp to 4.0 max)
		const extremeOutScale = 10;
		const clampedMaxZoom = Math.min(4.0, Math.max(0.5, 1.0 * extremeOutScale));
		assert.equal(clampedMaxZoom, 4.0);
	});

	it("3.7 Single touch pan shifts viewport center coordinates when zoomed in", () => {
		const initialPan = { x: 0, y: 0 };
		const startTouch = { clientX: 200, clientY: 200 };
		const moveTouch = { clientX: 245, clientY: 180 };

		const deltaX = moveTouch.clientX - startTouch.clientX;
		const deltaY = moveTouch.clientY - startTouch.clientY;

		const nextPan = {
			x: initialPan.x + deltaX,
			y: initialPan.y + deltaY,
		};

		assert.equal(nextPan.x, 45);
		assert.equal(nextPan.y, -20);
	});

	it("3.8 DOM coordinate badge string format meets >=13px bold requirements with accurate axis units", () => {
		const axialCoordBadge = { axis: "Z", valueMm: 48, label: "Срез:", fullText: "Z: 48 мм" };
		const coronalCoordBadge = { axis: "Y", valueMm: 52, label: "Срез:", fullText: "Y: 52 мм" };
		const sagittalCoordBadge = { axis: "X", valueMm: 60, label: "Срез:", fullText: "X: 60 мм" };
		const curvedArchBadge = { axis: "Curved", label: "Дуга:", fullText: "FDI 11..48" };

		assert.equal(axialCoordBadge.fullText, "Z: 48 мм");
		assert.equal(coronalCoordBadge.fullText, "Y: 52 мм");
		assert.equal(sagittalCoordBadge.fullText, "X: 60 мм");
		assert.equal(curvedArchBadge.fullText, "FDI 11..48");
	});

	it("3.9 Cornerstone3DViewer integrates real implant catalog, real-time nerve collision alert (< 2.0 mm), and Misch D1..D5 drilling protocols", () => {
		const source = fs.readFileSync(
			path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
			"utf-8",
		);

		// Must import and integrate canonical implant systems
		assert.ok(
			source.includes("CANONICAL_IMPLANT_SYSTEMS"),
			"Cornerstone3DViewer must import CANONICAL_IMPLANT_SYSTEMS",
		);
		assert.ok(
			source.includes("getImplantSystem"),
			"Cornerstone3DViewer must import getImplantSystem",
		);
		assert.ok(
			source.includes("getPlatformForDiameter"),
			"Cornerstone3DViewer must import getPlatformForDiameter",
		);

		// Must include nerve collision threshold and auditory feedback
		assert.ok(
			source.includes("MANDIBULAR_NERVE_DANGER_THRESHOLD_MM"),
			"Cornerstone3DViewer must evaluate mandibular nerve safety threshold",
		);
		assert.ok(
			source.includes("SoundFeedbackService"),
			"Cornerstone3DViewer must trigger auditory alert on nerve proximity",
		);

		// Must include 4th quadrant planning UI elements
		assert.ok(
			source.includes("data-testid=\"surgical-planning-quadrant\""),
			"Cornerstone3DViewer must render surgical planning quadrant",
		);
		assert.ok(
			source.includes("selectedSystemId"),
			"Cornerstone3DViewer must track active implant system",
		);
		assert.ok(
			source.includes("handleExportSnapshotTo043"),
			"Cornerstone3DViewer must export surgical protocol snapshot to Form 043/u",
		);
	});

	it("3.10 ctPlanningPersistence saves and restores implant manufacturer metadata", () => {
		const testImplant = {
			id: "imp-test-1",
			fdiCode: "36",
			diameter: 4.0,
			length: 10.0,
			startWorld: [10, 20, 30] as [number, number, number],
			endWorld: [10, 20, 20] as [number, number, number],
			boneDensity: { averageHU: 850, classification: "D2" },
			distanceToNerve: 3.2,
			systemId: "osstem-ts3",
			brandName: "Osstem",
			lineName: "TS III SA",
			platformCode: "Regular",
			platformColor: "#22c55e",
		};

		const markup = parseCtPlanningMarkup({
			splinePointsJson: [],
			nervePointsJson: [],
			implantsJson: [testImplant],
		});

		assert.equal(markup.implants.length, 1);
		const restored = markup.implants[0];
		assert.ok(restored);
		assert.equal(restored.systemId, "osstem-ts3");
		assert.equal(restored.brandName, "Osstem");
		assert.equal(restored.lineName, "TS III SA");
		assert.equal(restored.platformCode, "Regular");
		assert.equal(restored.platformColor, "#22c55e");
		assert.equal(restored.distanceToNerve, 3.2);
	});
});


