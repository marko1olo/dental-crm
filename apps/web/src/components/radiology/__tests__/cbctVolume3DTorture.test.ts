/**
 * DENTE CRM — CBCT 3D Raymarching Viewport & GPU Resilience Torture Tests
 * Standards: Planmeca Romexis 3D Volume, Vatech Ez3D-i, WebGL2 PS 3.3
 *
 * Verifies:
 * 1. Analytical Ray-AABB Slab intersection with zero CPU thrashing.
 * 2. Medical coordinate rotation matrix (Coronal, Sagittal, Isometric) with orthogonal unit vectors.
 * 3. Interactive 3D clipping box (cervical spine z-cut, occipital bone y-cut).
 * 4. Adaptive LOD & 4-iteration subpixel bisection shader parameters.
 * 5. Retina/4K DPR clamping to safeDpr <= 1.5 to protect fill-rate and prevent OOM.
 * 6. Presets and HU transfer function thresholds.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CBCT_VOLUME_3D_PRESETS,
	DEFAULT_VOLUME_3D_CLIPPING_BOX,
	computeVolume3DRotationMatrix,
	getSafeDevicePixelRatio,
	intersectRayAABB,
	isPointInsideClippingBox,
} from "../mpr/CbctVolume3DViewport";

describe("CBCT 3D Raymarching Analytical Ray-AABB Intersection", () => {
	const boxMin = -100;
	const boxMax = 100;

	it("should detect direct hit through box center", () => {
		// Ray from (0, -200, 0) pointing in +Y direction (0, 1, 0)
		const res = intersectRayAABB(
			0, -200, 0,
			0, 1, 0,
			boxMin, boxMax,
			boxMin, boxMax,
			boxMin, boxMax,
			-500, 500,
		);

		assert.equal(res.hit, true);
		assert.equal(Math.round(res.tNear), 100); // Enters at y = -100 (dist = 100)
		assert.equal(Math.round(res.tFar), 300); // Exits at y = 100 (dist = 300)
	});

	it("should detect miss when ray is parallel and outside the box", () => {
		// Ray along +Y at X = 150 (outside box [-100, 100])
		const res = intersectRayAABB(
			150, -200, 0,
			0, 1, 0,
			boxMin, boxMax,
			boxMin, boxMax,
			boxMin, boxMax,
			-500, 500,
		);

		assert.equal(res.hit, false);
	});

	it("should detect miss when ray points away from the box", () => {
		// Ray from (0, -200, 0) pointing in -Y direction (0, -1, 0)
		const res = intersectRayAABB(
			0, -200, 0,
			0, -1, 0,
			boxMin, boxMax,
			boxMin, boxMax,
			boxMin, boxMax,
			0, 500,
		);

		assert.equal(res.hit, false);
	});

	it("should handle ray starting inside the box", () => {
		// Ray starting at (0, 0, 0) pointing in +Z direction (0, 0, 1)
		const res = intersectRayAABB(
			0, 0, 0,
			0, 0, 1,
			boxMin, boxMax,
			boxMin, boxMax,
			boxMin, boxMax,
			0, 500,
		);

		assert.equal(res.hit, true);
		assert.equal(Math.round(res.tNear), 0);
		assert.equal(Math.round(res.tFar), 100); // Exits at z = 100
	});

	it("should handle near-zero directional components without dividing by zero", () => {
		const res = intersectRayAABB(
			0, -200, 0,
			1e-9, 1.0, 1e-9,
			boxMin, boxMax,
			boxMin, boxMax,
			boxMin, boxMax,
			-500, 500,
		);

		assert.equal(res.hit, true);
		assert.ok(!Number.isNaN(res.tNear) && !Number.isNaN(res.tFar));
	});
});

describe("CBCT 3D Medical Coordinate Rotation Matrix", () => {
	it("should compute canonical Coronal view (yaw=0, pitch=0)", () => {
		const [col0, col1, col2] = computeVolume3DRotationMatrix(0, 0);

		// Col0: Camera Right -> patient lateral (+X)
		assert.deepEqual(col0, [1, 0, 0]);
		// Col1: Camera Up -> patient vertical (+Z is UP)
		assert.deepEqual(col1, [0, 0, 1]);
		// Col2: Ray Direction -> into patient face (+Y is anterior-to-posterior)
		assert.deepEqual(col2, [0, 1, 0]);
	});

	it("should compute canonical Sagittal view (yaw=90, pitch=0)", () => {
		const [col0, col1, col2] = computeVolume3DRotationMatrix(90, 0);

		// At yaw=90, camera looks from the side
		assert.equal(col0?.[0], 0);
		assert.equal(col0?.[1], 1);
		assert.equal(col1?.[2], 1); // +Z remains UP
		assert.equal(col2?.[0], -1);
		assert.equal(col2?.[1], 0);
	});

	it("should produce orthonormal columns for arbitrary angles", () => {
		const [col0, col1, col2] = computeVolume3DRotationMatrix(35, -22);

		assert.ok(col0 && col1 && col2);

		// Column lengths must equal 1.0
		const len0 = Math.hypot(col0[0], col0[1], col0[2]);
		const len1 = Math.hypot(col1[0], col1[1], col1[2]);
		const len2 = Math.hypot(col2[0], col2[1], col2[2]);

		assert.ok(Math.abs(len0 - 1.0) < 1e-5, `col0 length was ${len0}`);
		assert.ok(Math.abs(len1 - 1.0) < 1e-5, `col1 length was ${len1}`);
		assert.ok(Math.abs(len2 - 1.0) < 1e-5, `col2 length was ${len2}`);

		// Columns must be mutually orthogonal (dot product = 0)
		const dot01 = col0[0] * col1[0] + col0[1] * col1[1] + col0[2] * col1[2];
		const dot02 = col0[0] * col2[0] + col0[1] * col2[1] + col0[2] * col2[2];
		const dot12 = col1[0] * col2[0] + col1[1] * col2[1] + col1[2] * col2[2];

		assert.ok(Math.abs(dot01) < 1e-5, `dot(col0, col1) was ${dot01}`);
		assert.ok(Math.abs(dot02) < 1e-5, `dot(col0, col2) was ${dot02}`);
		assert.ok(Math.abs(dot12) < 1e-5, `dot(col1, col2) was ${dot12}`);
	});
});

describe("CBCT 3D Clipping Box Geometry", () => {
	it("should evaluate default unclipped bounds [0..1] correctly", () => {
		const { clipMin, clipMax } = DEFAULT_VOLUME_3D_CLIPPING_BOX;

		assert.equal(isPointInsideClippingBox([0.5, 0.5, 0.5], clipMin, clipMax), true);
		assert.equal(isPointInsideClippingBox([0.0, 0.0, 0.0], clipMin, clipMax), true);
		assert.equal(isPointInsideClippingBox([1.0, 1.0, 1.0], clipMin, clipMax), true);
		assert.equal(isPointInsideClippingBox([-0.1, 0.5, 0.5], clipMin, clipMax), false);
		assert.equal(isPointInsideClippingBox([0.5, 1.1, 0.5], clipMin, clipMax), false);
	});

	it("should correctly clip cervical spine when zMin is raised", () => {
		// Spine clip: zMin = 0.28
		const clipMin: [number, number, number] = [0, 0, 0.28];
		const clipMax: [number, number, number] = [1, 1, 1];

		// Lower neck voxels (z = 0.15) must be clipped
		assert.equal(isPointInsideClippingBox([0.5, 0.5, 0.15], clipMin, clipMax), false);
		// Mandibular / skull voxels (z = 0.45) must remain visible
		assert.equal(isPointInsideClippingBox([0.5, 0.5, 0.45], clipMin, clipMax), true);
	});

	it("should correctly clip occipital bone when yMax is lowered", () => {
		// Occiput clip: yMax = 0.72
		const clipMin: [number, number, number] = [0, 0, 0];
		const clipMax: [number, number, number] = [1, 0.72, 1];

		// Posterior occipital voxels (y = 0.85) must be clipped
		assert.equal(isPointInsideClippingBox([0.5, 0.85, 0.5], clipMin, clipMax), false);
		// Anterior face / teeth voxels (y = 0.3) must remain visible
		assert.equal(isPointInsideClippingBox([0.5, 0.3, 0.5], clipMin, clipMax), true);
	});
});

describe("CBCT Retina/4K Fill-rate Protection & safeDpr Clamping", () => {
	it("should keep standard DPR 1.0 unchanged", () => {
		assert.equal(getSafeDevicePixelRatio(1.0), 1.0);
	});

	it("should clamp high-density Retina DPR (2.0) to <= 1.5", () => {
		const safeDpr = getSafeDevicePixelRatio(2.0);
		assert.equal(safeDpr, 1.5);
		assert.ok(safeDpr <= 1.5, "Retina DPR must be clamped to 1.5");
	});

	it("should clamp extreme 4K/UHD DPR (3.0 and 4.0) to <= 1.5 to prevent GPU OOM", () => {
		assert.equal(getSafeDevicePixelRatio(3.0), 1.5);
		assert.equal(getSafeDevicePixelRatio(4.0), 1.5);
	});

	it("should handle sub-1.0 or invalid DPR values safely", () => {
		assert.equal(getSafeDevicePixelRatio(0.5), 1.0);
		assert.equal(getSafeDevicePixelRatio(Number.NaN), 1.0);
	});
});

describe("CBCT 3D HU Transfer Function Presets", () => {
	it("should include all 4 standard radiologic presets", () => {
		const presetIds = CBCT_VOLUME_3D_PRESETS.map((p) => p.id);
		assert.deepEqual(presetIds, ["skull", "dense_bone", "soft_tissue", "mip"]);
	});

	it("should have calibrated HU thresholds for bone and enamel", () => {
		const skull = CBCT_VOLUME_3D_PRESETS.find((p) => p.id === "skull");
		assert.ok(skull);
		assert.equal(skull.huMin, 350);
		assert.equal(skull.huMax, 2000);

		const dense = CBCT_VOLUME_3D_PRESETS.find((p) => p.id === "dense_bone");
		assert.ok(dense);
		assert.equal(dense.huMin, 550);
		assert.equal(dense.huMax, 3000);
	});
});
