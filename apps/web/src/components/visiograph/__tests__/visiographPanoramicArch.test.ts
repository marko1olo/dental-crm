import assert from "node:assert";
import { describe, test } from "node:test";
import {
	buildPanoramicArch,
	catmullRomSegment,
	orientArchPatientRightFirst,
	polylineReturnsToStart,
	projectToAxialPlane,
} from "../../dicom/panoramicArch";

describe("Panoramic Dental Arch Math & Reconstruction", () => {
	test("projectToAxialPlane discards non-finite numbers and keeps X,Y", () => {
		const raw = [[10, 20, 30], [Number.NaN, 5, 10], [15, 25, -40], null as unknown as number[], [30]];
		const projected = projectToAxialPlane(raw as readonly number[][]);
		assert.strictEqual(projected.length, 2);
		assert.deepStrictEqual(projected, [{ x: 10, y: 20 }, { x: 15, y: 25 }]);
	});

	test("orientArchPatientRightFirst sorts patient right (smallest X) first", () => {
		const leftToRight = [{ x: 30, y: 10 }, { x: 10, y: 25 }, { x: -20, y: 10 }];
		const oriented = orientArchPatientRightFirst(leftToRight);
		assert.strictEqual(oriented[0]?.x, -20);
		assert.strictEqual(oriented[oriented.length - 1]?.x, 30);
	});

	test("catmullRomSegment passes through p1 at t=0 and p2 at t=1", () => {
		const p0 = { x: 0, y: 0 };
		const p1 = { x: 10, y: 10 };
		const p2 = { x: 20, y: 15 };
		const p3 = { x: 30, y: 10 };

		const start = catmullRomSegment(p0, p1, p2, p3, 0);
		assert.ok(Math.abs(start.x - p1.x) < 1e-6 && Math.abs(start.y - p1.y) < 1e-6);

		const end = catmullRomSegment(p0, p1, p2, p3, 1);
		assert.ok(Math.abs(end.x - p2.x) < 1e-6 && Math.abs(end.y - p2.y) < 1e-6);
	});

	test("polylineReturnsToStart detects closed loop annotations", () => {
		const closedLoop = [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 20, y: 20 }, { x: 30, y: 0 }, { x: 0, y: 0.1 }];
		assert.strictEqual(polylineReturnsToStart(closedLoop), true);

		const openArch = [{ x: -30, y: 0 }, { x: -15, y: 25 }, { x: 0, y: 30 }, { x: 15, y: 25 }, { x: 30, y: 0 }];
		assert.strictEqual(polylineReturnsToStart(openArch), false);
	});

	test("buildPanoramicArch builds smooth reconstruction from open Spline ROI", () => {
		const annotation = {
			metadata: { viewPlaneNormal: [0, 0, 1] },
			data: {
				handles: {
					points: [
						[-30, 0, 0],
						[-15, 25, 0],
						[0, 30, 0],
						[15, 25, 0],
						[30, 0, 0],
					],
				},
			},
		};
		const arch = buildPanoramicArch([annotation]);
		assert.strictEqual(arch.status, "ready");
		if (arch.status === "ready") {
			assert.ok(arch.curve.length >= 5);
			assert.ok(arch.lengthMm > 0);
		}
	});
});
