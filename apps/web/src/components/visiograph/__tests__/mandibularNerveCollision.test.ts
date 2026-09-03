import assert from "node:assert";
import { describe, test } from "node:test";
import { vec3 } from "gl-matrix";
import {
	distancePointToLineSegment,
	distancePointToSpline,
} from "../../../mprMath";
import {
	calculateImplantClearance,
	checkImplantCollision,
	ClinicalStore,
	implantProtocolLog,
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
	type NerveCanal,
	type VirtualImplant,
} from "../../../utils/dicom/clinicalImplants";

describe("Mandibular Nerve Collision & Safety Guard (< 2.0 mm)", () => {
	test("MANDIBULAR_NERVE_DANGER_THRESHOLD_MM is exactly 2.0 mm", () => {
		assert.strictEqual(MANDIBULAR_NERVE_DANGER_THRESHOLD_MM, 2.0);
	});

	test("distancePointToLineSegment computes exact orthogonal distance", () => {
		const p = vec3.fromValues(10, 5, 0);
		const v = vec3.fromValues(0, 0, 0);
		const w = vec3.fromValues(20, 0, 0);

		const dist = distancePointToLineSegment(p, v, w);
		assert.ok(Math.abs(dist - 5.0) < 1e-5);
	});

	test("distancePointToSpline finds shortest distance to multi-segment nerve path", () => {
		const nerveSpline = [
			vec3.fromValues(-30, 10, -50),
			vec3.fromValues(-15, 20, -52),
			vec3.fromValues(0, 25, -53),
			vec3.fromValues(15, 20, -52),
			vec3.fromValues(30, 10, -50),
		];

		// Point placed right at x=0, y=26, z=-53 (1.0 mm away from apex of curve)
		const apexPoint = vec3.fromValues(0, 26, -53);
		const dist = distancePointToSpline(apexPoint, nerveSpline);
		assert.ok(Math.abs(dist - 1.0) < 0.05);
	});

	test("checkImplantCollision returns TRUE when clearance < 2.0 mm", () => {
		ClinicalStore.clear();
		ClinicalStore.nerves.push({
			id: "mandibular_nerve_right",
			points: [
				{ x: 10, y: 0, z: -50 },
				{ x: 30, y: 0, z: -50 },
			],
			diameter: 2.0, // radius = 1.0mm
		});

		// Implant apex placed at x=20, y=0, z=-47.5
		// Implant length 10mm pointing +Z (neck at z=-37.5)
		// Implant diameter 4.0mm (radius = 2.0mm)
		// Axis distance = 2.5mm
		// Surface clearance = 2.5 - 1.0 (implant radius) - 1.0 (nerve radius) = 0.5 mm -> DANGER (<2.0mm)
		const dangerousImplant: VirtualImplant = {
			id: "imp_danger",
			position: { x: 20, y: 0, z: -47.5 },
			direction: { x: 0, y: 0, z: 1 },
			length: 10.0,
			diameter: 2.0, // radius = 1.0
			toothFdi: 46,
		};

		const isCollision = checkImplantCollision(dangerousImplant, 2.0);
		assert.strictEqual(isCollision, true);

		const clearanceRes = calculateImplantClearance(dangerousImplant);
		assert.ok(clearanceRes !== null);
		assert.strictEqual(clearanceRes?.status, "DANGER");
		assert.ok((clearanceRes?.clearanceMm ?? 0) < 2.0);
	});

	test("checkImplantCollision returns FALSE when clearance >= 2.0 mm", () => {
		ClinicalStore.clear();
		ClinicalStore.nerves.push({
			id: "mandibular_nerve_left",
			points: [
				{ x: -30, y: 0, z: -50 },
				{ x: -10, y: 0, z: -50 },
			],
			diameter: 2.0, // radius = 1.0mm
		});

		// Implant apex placed at x=-20, y=0, z=-44.0
		// Axis distance = 6.0mm
		// Surface clearance = 6.0 - 1.0 - 1.0 = 4.0 mm -> SAFE (>= 2.0mm)
		const safeImplant: VirtualImplant = {
			id: "imp_safe",
			position: { x: -20, y: 0, z: -44.0 },
			direction: { x: 0, y: 0, z: 1 },
			length: 10.0,
			diameter: 2.0,
			toothFdi: 36,
		};

		const isCollision = checkImplantCollision(safeImplant, 2.0);
		assert.strictEqual(isCollision, false);

		const clearanceRes = calculateImplantClearance(safeImplant);
		assert.ok(clearanceRes !== null);
		assert.strictEqual(clearanceRes?.status, "SAFE");
		assert.ok((clearanceRes?.clearanceMm ?? 0) >= 2.0);
	});

	test("implantProtocolLog generates prominent warning when distance to nerve < 2.0 mm", () => {
		const dangerImplant = {
			id: "imp_36",
			fdiCode: "36",
			diameter: 4.0,
			length: 10.0,
			startWorld: vec3.fromValues(10, 20, -40),
			endWorld: vec3.fromValues(10, 20, -50),
			boneDensity: {
				averageHU: 900,
				classification: "D2" as const,
			},
			distanceToNerve: 1.4, // < 2.0 mm!
		};

		const protocol = implantProtocolLog(dangerImplant);
		assert.ok(protocol.includes("ВНИМАНИЕ"));
		assert.ok(protocol.includes("1.4 мм"));
		assert.ok(protocol.includes("< 2.0 мм"));
		assert.ok(protocol.includes("опасная зона"));
	});

	test("implantProtocolLog confirms safe corridor when distance >= 2.0 mm", () => {
		const safeImplant = {
			id: "imp_46",
			fdiCode: "46",
			diameter: 4.0,
			length: 10.0,
			startWorld: vec3.fromValues(-10, 20, -40),
			endWorld: vec3.fromValues(-10, 20, -50),
			boneDensity: {
				averageHU: 1100,
				classification: "D2" as const,
			},
			distanceToNerve: 3.8, // Safe >= 2.0 mm
		};

		const protocol = implantProtocolLog(safeImplant);
		assert.ok(!protocol.includes("ВНИМАНИЕ: дистанция"));
		assert.ok(protocol.includes("безопасный коридор ≥ 2.0 мм"));
		assert.ok(protocol.includes("3.8 мм"));
	});

	test("implantProtocolLog emits clinical warning when mandibular nerve is unmapped (null)", () => {
		const unmappedImplant = {
			id: "imp_36_unmapped",
			fdiCode: "36",
			diameter: 4.0,
			length: 10.0,
			distanceToNerve: null,
		};

		const protocol = implantProtocolLog(unmappedImplant);
		assert.ok(
			protocol.includes(
				"Нижнечелюстной нерв не размечен. Контроль дистанции безопасности невозможен.",
			),
		);
		assert.ok(!protocol.includes("4.5 мм"));
	});

	test("implantProtocolLog emits clinical warning when mandibular nerve is omitted (undefined)", () => {
		const unmappedImplant = {
			id: "imp_36_unmapped_undef",
			fdiCode: "36",
			diameter: 4.0,
			length: 10.0,
		};

		const protocol = implantProtocolLog(unmappedImplant);
		assert.ok(
			protocol.includes(
				"Нижнечелюстной нерв не размечен. Контроль дистанции безопасности невозможен.",
			),
		);
	});
});
