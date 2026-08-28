import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	type ObliqueRotationAngles,
	type ViewportTransform,
	applyCursorZoom,
	applyPanDrag,
	applyWindowLevelDrag,
	calculateAngleFromHandleDrag,
	calculateAngleFromShiftDrag,
	hitTestCrosshairCenter,
	resetPlaneObliqueAngle,
	resetObliqueRotationAngles,
	getObliqueRotationLabel,
	computeObliquePlaneBasis,
	computeObliqueRotationMatrix,
	createEmptyCbctVolume,
	degToRad,
	dotProduct3D,
	drawObliqueCrosshairWithRotationHandles,
	extractObliqueMprSlice,
	getRotationHandles,
	hitTestRotationHandle,
	mapCanvasPointerToWorldMmWithTransform,
	normalizeVector3D,
	radToDeg,
	resetViewportTransform,
	resliceObliqueMprSynchronized,
	sampleVoxelHU,
	sampleVoxelHUTrilinear,
} from "../cbctMprMath";

describe("CBCT Oblique MPR Rotation, Sub-Voxel Trilinear & Interactive Navigation Suite", () => {
	const testVolume = createEmptyCbctVolume(80, 80, 60, 0.5, 400);

	describe("1. 3D Vector & Angle Conversion Utilities", () => {
		it("converts degrees to radians and back with high precision", () => {
			assert.equal(degToRad(0), 0);
			assert.equal(degToRad(180), Math.PI);
			assert.equal(degToRad(90), Math.PI / 2);
			assert.equal(radToDeg(Math.PI), 180);
			assert.equal(radToDeg(Math.PI / 2), 90);
		});

		it("normalizes 3D vectors to unit length", () => {
			const v = normalizeVector3D({ x: 3, y: 4, z: 0 });
			assert.ok(Math.abs(v.x - 0.6) < 1e-6);
			assert.ok(Math.abs(v.y - 0.8) < 1e-6);
			assert.equal(v.z, 0);
			const len = Math.hypot(v.x, v.y, v.z);
			assert.ok(Math.abs(len - 1.0) < 1e-6);
		});

		it("handles zero vector normalization safely without NaN", () => {
			const zero = normalizeVector3D({ x: 0, y: 0, z: 0 });
			assert.equal(Number.isNaN(zero.x), false);
			assert.equal(Number.isNaN(zero.y), false);
			assert.equal(Number.isNaN(zero.z), false);
			assert.equal(zero.z, 1);
		});

		it("computes 3D dot product accurately", () => {
			const dot = dotProduct3D({ x: 1, y: 2, z: 3 }, { x: 4, y: -5, z: 6 });
			assert.equal(dot, 4 - 10 + 18); // 12
		});
	});

	describe("2. Oblique 3x3 Rotation Matrix Computation", () => {
		it("computes identity rotation matrix for zero angles", () => {
			const mat = computeObliqueRotationMatrix(DEFAULT_OBLIQUE_ROTATION);
			assert.equal(mat.length, 3);
			assert.ok(Math.abs(mat[0]![0]! - 1) < 1e-6);
			assert.ok(Math.abs(mat[0]![1]! - 0) < 1e-6);
			assert.ok(Math.abs(mat[1]![1]! - 1) < 1e-6);
			assert.ok(Math.abs(mat[2]![2]! - 1) < 1e-6);
		});

		it("computes 90-degree Z-axis yaw rotation matrix", () => {
			const angles: ObliqueRotationAngles = { axialAngleDeg: 90, coronalTiltDeg: 0, sagittalTiltDeg: 0 };
			const mat = computeObliqueRotationMatrix(angles);
			// R_z(90): cos(90)=0, sin(90)=1 -> [ [0, -1, 0], [1, 0, 0], [0, 0, 1] ]
			assert.ok(Math.abs(mat[0]![0]!) < 1e-6);
			assert.ok(Math.abs(mat[0]![1]! - (-1)) < 1e-6);
			assert.ok(Math.abs(mat[1]![0]! - 1) < 1e-6);
			assert.ok(Math.abs(mat[1]![1]!) < 1e-6);
		});

		it("computes 45-degree Y-axis coronal tilt matrix", () => {
			const angles: ObliqueRotationAngles = { axialAngleDeg: 0, coronalTiltDeg: 45, sagittalTiltDeg: 0 };
			const mat = computeObliqueRotationMatrix(angles);
			const cos45 = Math.SQRT1_2;
			assert.ok(Math.abs(mat[0]![0]! - cos45) < 1e-6);
			assert.ok(Math.abs(mat[2]![2]! - cos45) < 1e-6);
		});
	});

	describe("3. Oblique Plane Basis Vectors & Orthonormality", () => {
		it("generates orthogonal basis vectors for standard Axial plane", () => {
			const basis = computeObliquePlaneBasis("axial", { x: 0, y: 0, z: 0 }, DEFAULT_OBLIQUE_ROTATION);
			// Basis u, v, normal must be unit vectors and mutually perpendicular
			assert.ok(Math.abs(Math.hypot(basis.u.x, basis.u.y, basis.u.z) - 1.0) < 1e-6);
			assert.ok(Math.abs(Math.hypot(basis.v.x, basis.v.y, basis.v.z) - 1.0) < 1e-6);
			assert.ok(Math.abs(Math.hypot(basis.normal.x, basis.normal.y, basis.normal.z) - 1.0) < 1e-6);

			assert.ok(Math.abs(dotProduct3D(basis.u, basis.v)) < 1e-6, "u and v must be orthogonal");
			assert.ok(Math.abs(dotProduct3D(basis.u, basis.normal)) < 1e-6, "u and normal must be orthogonal");
			assert.ok(Math.abs(dotProduct3D(basis.v, basis.normal)) < 1e-6, "v and normal must be orthogonal");
		});

		it("maintains strict orthonormality under combined 3D oblique tilts", () => {
			const angles: ObliqueRotationAngles = {
				axialAngleDeg: 35.5,
				coronalTiltDeg: -18.2,
				sagittalTiltDeg: 12.0,
			};
			const basis = computeObliquePlaneBasis("coronal", { x: 5, y: -10, z: 15 }, angles);

			assert.ok(Math.abs(Math.hypot(basis.u.x, basis.u.y, basis.u.z) - 1.0) < 1e-6);
			assert.ok(Math.abs(Math.hypot(basis.v.x, basis.v.y, basis.v.z) - 1.0) < 1e-6);
			assert.ok(Math.abs(Math.hypot(basis.normal.x, basis.normal.y, basis.normal.z) - 1.0) < 1e-6);

			assert.ok(Math.abs(dotProduct3D(basis.u, basis.v)) < 1e-6, "u and v must remain orthogonal");
			assert.ok(Math.abs(dotProduct3D(basis.u, basis.normal)) < 1e-6, "u and normal must remain orthogonal");
			assert.ok(Math.abs(dotProduct3D(basis.v, basis.normal)) < 1e-6, "v and normal must remain orthogonal");
		});

		it("preserves crosshair center coordinate in basis", () => {
			const center = { x: 12.5, y: -7.2, z: 3.8 };
			const basis = computeObliquePlaneBasis("sagittal", center, DEFAULT_OBLIQUE_ROTATION);
			assert.deepEqual(basis.centerMm, center);
		});
	});

	describe("4. Sub-Voxel Trilinear HU Interpolation Engine", () => {
		it("returns exact voxel value when sampling on integer coordinates", () => {
			const sampleDirect = sampleVoxelHU(40, 40, 30, testVolume);
			const sampleTrilinear = sampleVoxelHUTrilinear(testVolume, 40, 40, 30);
			assert.equal(sampleTrilinear, sampleDirect);
		});

		it("interpolates smooth mid-point values between adjacent voxels", () => {
			const v0 = sampleVoxelHU(40, 40, 30, testVolume);
			const v1 = sampleVoxelHU(41, 40, 30, testVolume);
			const midSample = sampleVoxelHUTrilinear(testVolume, 40.5, 40, 30);

			const expectedMid = Math.round((v0 + v1) / 2.0);
			assert.equal(midSample, expectedMid);
		});

		it("returns air fallback (-1000 HU) for coordinates outside volume bounds", () => {
			assert.equal(sampleVoxelHUTrilinear(testVolume, -5, 40, 30), -1000);
			assert.equal(sampleVoxelHUTrilinear(testVolume, 40, 150, 30), -1000);
			assert.equal(sampleVoxelHUTrilinear(testVolume, 40, 40, 200), -1000);
		});
	});

	describe("5. Oblique MPR Slice Extraction (Axial, Coronal, Sagittal)", () => {
		it("extracts valid oblique axial slice with correct buffer dimensions and metadata", () => {
			const result = extractObliqueMprSlice(testVolume, "axial", { x: 0, y: 0, z: 0 }, {
				axialAngleDeg: 15,
				coronalTiltDeg: 0,
				sagittalTiltDeg: 0,
			});

			assert.equal(result.metadata.plane, "axial");
			assert.equal(result.metadata.widthPx, testVolume.dimensions.width);
			assert.equal(result.metadata.heightPx, testVolume.dimensions.height);
			assert.equal(result.data.length, testVolume.dimensions.width * testVolume.dimensions.height * 4);
		});

		it("extracts valid oblique coronal and sagittal slices", () => {
			const coronal = extractObliqueMprSlice(testVolume, "coronal", { x: 0, y: 0, z: 0 }, {
				axialAngleDeg: 0,
				coronalTiltDeg: 20,
				sagittalTiltDeg: 0,
			});
			assert.equal(coronal.metadata.plane, "coronal");
			assert.equal(coronal.metadata.widthPx, testVolume.dimensions.width);
			assert.equal(coronal.metadata.heightPx, Math.max(testVolume.dimensions.width, testVolume.dimensions.depth));

			const sagittal = extractObliqueMprSlice(testVolume, "sagittal", { x: 0, y: 0, z: 0 }, {
				axialAngleDeg: 0,
				coronalTiltDeg: 0,
				sagittalTiltDeg: -15,
			});
			assert.equal(sagittal.metadata.plane, "sagittal");
			assert.equal(sagittal.metadata.widthPx, testVolume.dimensions.height);
			assert.equal(sagittal.metadata.heightPx, Math.max(testVolume.dimensions.height, testVolume.dimensions.depth));
		});

		it("reslices all 3 oblique planes simultaneously in resliceObliqueMprSynchronized", () => {
			const resliced = resliceObliqueMprSynchronized(
				testVolume,
				{ x: 2, y: -5, z: 0 },
				{ axialAngleDeg: 10, coronalTiltDeg: -10, sagittalTiltDeg: 5 },
				2000,
				400,
				"single",
				2.0,
			);

			assert.ok(resliced.axial);
			assert.ok(resliced.coronal);
			assert.ok(resliced.sagittal);
			assert.equal(resliced.axial.data.length > 0, true);
			assert.equal(resliced.coronal.data.length > 0, true);
			assert.equal(resliced.sagittal.data.length > 0, true);
		});

		it("supports Oblique Slab MIP, MinIP, and Average projections without errors", () => {
			const mip = extractObliqueMprSlice(testVolume, "axial", { x: 0, y: 0, z: 0 }, DEFAULT_OBLIQUE_ROTATION, {
				windowWidth: 2000,
				windowLevel: 400,
				slabMode: "mip",
				slabThicknessMm: 5.0,
			});
			assert.equal(mip.metadata.slabThicknessMm, 5.0);

			const minip = extractObliqueMprSlice(testVolume, "coronal", { x: 0, y: 0, z: 0 }, DEFAULT_OBLIQUE_ROTATION, {
				windowWidth: 2000,
				windowLevel: 400,
				slabMode: "minip",
				slabThicknessMm: 4.0,
			});
			assert.equal(minip.metadata.slabThicknessMm, 4.0);

			const avg = extractObliqueMprSlice(testVolume, "sagittal", { x: 0, y: 0, z: 0 }, DEFAULT_OBLIQUE_ROTATION, {
				windowWidth: 2000,
				windowLevel: 400,
				slabMode: "average",
				slabThicknessMm: 3.0,
			});
			assert.equal(avg.metadata.slabThicknessMm, 3.0);
		});
	});

	describe("6. Interactive Window/Level Mouse Drag Math", () => {
		it("increases Window Width on positive horizontal drag (contrast adjustment)", () => {
			const { windowWidth, windowLevel } = applyWindowLevelDrag(2000, 400, 50, 0, 2.0);
			assert.equal(windowWidth, 2100);
			assert.equal(windowLevel, 400);
		});

		it("adjusts Window Level on vertical drag (brightness adjustment, inverted Y)", () => {
			const { windowWidth, windowLevel } = applyWindowLevelDrag(2000, 400, 0, -30, 2.0);
			assert.equal(windowWidth, 2000);
			assert.equal(windowLevel, 460);
		});

		it("clamps Window Width and Level within valid clinical bounds", () => {
			const clamped = applyWindowLevelDrag(2000, 400, 10000, -10000, 2.0);
			assert.equal(clamped.windowWidth, 6000);
			assert.equal(clamped.windowLevel, 3000);

			const clampedMin = applyWindowLevelDrag(2000, 400, -10000, 10000, 2.0);
			assert.equal(clampedMin.windowWidth, 1);
			assert.equal(clampedMin.windowLevel, -1500);
		});
	});

	describe("7. Cursor-Anchored Zoom & Pan Transformation Math", () => {
		it("zooms in toward cursor while clamping within max zoom [0.5 .. 5.0]", () => {
			const initialTransform: ViewportTransform = { zoom: 1.0, panX: 0, panY: 0 };
			const cursor = { x: 100, y: 100 };
			const zoomed = applyCursorZoom(initialTransform, cursor, -200); // deltaY < 0 = zoom in

			assert.ok(zoomed.zoom > 1.0, "Zoom factor should increase");
			assert.ok(zoomed.zoom <= 5.0, "Zoom factor should be clamped to 5.0");
		});

		it("zooms out while clamping within min zoom 0.5", () => {
			const initialTransform: ViewportTransform = { zoom: 1.0, panX: 0, panY: 0 };
			const cursor = { x: 100, y: 100 };
			const zoomed = applyCursorZoom(initialTransform, cursor, 5000); // large deltaY = zoom out

			assert.equal(zoomed.zoom, 0.5);
		});

		it("updates pan coordinates during middle-click drag", () => {
			const initialTransform: ViewportTransform = { zoom: 1.5, panX: 10, panY: -20 };
			const panned = applyPanDrag(initialTransform, 25, -15);

			assert.equal(panned.zoom, 1.5);
			assert.equal(panned.panX, 35);
			assert.equal(panned.panY, -35);
		});

		it("resets viewport transform to default 1.0x centered state", () => {
			const reset = resetViewportTransform();
			assert.equal(reset.zoom, 1.0);
			assert.equal(reset.panX, 0);
			assert.equal(reset.panY, 0);
		});
	});

	describe("8. Rotation Handles, Hit-Testing & Handle Drag Math", () => {
		it("generates 4 rotation handles at configured radial distance", () => {
			const handles = getRotationHandles("axial", 200, 200, { x: 100, y: 100 }, 60, 0);
			assert.equal(handles.length, 4);
			assert.equal(handles[0]!.position, "u_pos");
			assert.equal(handles[0]!.canvasX, 160);
			assert.equal(handles[0]!.canvasY, 100);

			assert.equal(handles[1]!.position, "u_neg");
			assert.equal(handles[1]!.canvasX, 40);
			assert.equal(handles[1]!.canvasY, 100);

			assert.equal(handles[2]!.position, "v_pos");
			assert.equal(handles[2]!.canvasX, 100);
			assert.equal(handles[2]!.canvasY, 160);

			assert.equal(handles[3]!.position, "v_neg");
			assert.equal(handles[3]!.canvasX, 100);
			assert.equal(handles[3]!.canvasY, 40);
		});

		it("detects hit when cursor is near a handle", () => {
			const handles = getRotationHandles("axial", 200, 200, { x: 100, y: 100 }, 60, 0);
			const hit = hitTestRotationHandle({ x: 162, y: 101 }, handles, 10);
			assert.ok(hit !== null);
			assert.equal(hit?.position, "u_pos");
		});

		it("returns null when cursor is far from all handles", () => {
			const handles = getRotationHandles("axial", 200, 200, { x: 100, y: 100 }, 60, 0);
			const hit = hitTestRotationHandle({ x: 100, y: 100 }, handles, 10); // at center
			assert.equal(hit, null);
		});

		it("calculates angle in degrees from handle drag relative to center", () => {
			const center = { x: 100, y: 100 };
			// Pointer at (100 + 50, 100 + 50) = 45 degrees
			const angle = calculateAngleFromHandleDrag(center, { x: 150, y: 150 }, "u_pos");
			assert.equal(angle, 45.0);

			// Pointer at (100, 100 + 50) = 90 degrees
			const angle90 = calculateAngleFromHandleDrag(center, { x: 100, y: 150 }, "u_pos");
			assert.equal(angle90, 90.0);
		});
	});

	describe("9. Transformed Canvas Pointer Mapping", () => {
		it("maps pointer correctly with zoom and pan applied", () => {
			const transform: ViewportTransform = { zoom: 2.0, panX: 20, panY: 20 };
			const pointer = { x: 100, y: 100 };
			const worldMm = mapCanvasPointerToWorldMmWithTransform(
				pointer,
				{ width: 200, height: 200 },
				"axial",
				{ x: 0, y: 0, z: 0 },
				DEFAULT_OBLIQUE_ROTATION,
				transform,
				testVolume,
			);

			assert.equal(typeof worldMm.x, "number");
			assert.equal(typeof worldMm.y, "number");
			assert.equal(typeof worldMm.z, "number");
		});
	});

	describe("10. Oblique Crosshair Canvas Drawing Engine", () => {
		interface MockCall {
			method: string;
			args: unknown[];
		}

		const createMockCtx = () => {
			const calls: MockCall[] = [];
			return {
				calls,
				beginPath: () => calls.push({ method: "beginPath", args: [] }),
				moveTo: (x: number, y: number) => calls.push({ method: "moveTo", args: [x, y] }),
				lineTo: (x: number, y: number) => calls.push({ method: "lineTo", args: [x, y] }),
				stroke: () => calls.push({ method: "stroke", args: [] }),
				arc: (x: number, y: number, r: number) => calls.push({ method: "arc", args: [x, y, r] }),
				fill: () => calls.push({ method: "fill", args: [] }),
				save: () => calls.push({ method: "save", args: [] }),
				restore: () => calls.push({ method: "restore", args: [] }),
				setLineDash: (d: number[]) => calls.push({ method: "setLineDash", args: [d] }),
				measureText: (t: string) => ({ width: t.length * 7 }),
				roundRect: (x: number, y: number, w: number, h: number, r: number) => calls.push({ method: "roundRect", args: [x, y, w, h, r] }),
				fillText: (t: string, x: number, y: number) => calls.push({ method: "fillText", args: [t, x, y] }),
				strokeStyle: "",
				fillStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
			};
		};

		it("renders rotated crosshair lines and rotation handles onto canvas context without throwing", () => {
			const mockCtx = createMockCtx();
			assert.doesNotThrow(() => {
				drawObliqueCrosshairWithRotationHandles(mockCtx as unknown as CanvasRenderingContext2D, {
					widthPx: 256,
					heightPx: 256,
					centerPx: { x: 128, y: 128 },
					plane: "axial",
					rotationDeg: 25.0,
					showHandles: true,
					showAngleBadge: true,
				});
			});

			const strokeCalls = mockCtx.calls.filter((c) => c.method === "stroke");
			const arcCalls = mockCtx.calls.filter((c) => c.method === "arc");
			const fillTextCalls = mockCtx.calls.filter((c) => c.method === "fillText");

			assert.ok(strokeCalls.length > 0, "Should stroke crosshair lines and handles");
			assert.ok(arcCalls.length >= 4, "Should draw at least 4 rotation handle knobs");
			assert.equal(fillTextCalls.length, 1, "Should render rotation degree badge text");
		});
	});

	describe("11. Self-Criticism & Defensive Edge Cases (NaN, Infinity, Zero Division)", () => {
		it("safely handles NaN and Infinity coordinates in sampleVoxelHUTrilinear without crashing", () => {
			assert.equal(sampleVoxelHUTrilinear(testVolume, Number.NaN, 40, 30), -1000);
			assert.equal(sampleVoxelHUTrilinear(testVolume, 40, Number.POSITIVE_INFINITY, 30), -1000);
			assert.equal(sampleVoxelHUTrilinear(testVolume, Number.NEGATIVE_INFINITY, Number.NaN, 30), -1000);
		});

		it("safely handles disposed or empty volume in sampleVoxelHUTrilinear", () => {
			const disposedVolume = {
				...testVolume,
				data: null,
				isDisposed: true,
			};
			assert.equal(sampleVoxelHUTrilinear(disposedVolume, 40, 40, 30), -1000);
		});

		it("safely handles NaN and zero zoom in applyCursorZoom", () => {
			const initialTransform: ViewportTransform = { zoom: 0, panX: 0, panY: 0 };
			const result = applyCursorZoom(initialTransform, { x: 100, y: 100 }, Number.NaN);
			assert.ok(result.zoom >= 0.5, "Zoom should fallback to valid range");
			assert.ok(!Number.isNaN(result.panX));
			assert.ok(!Number.isNaN(result.panY));
		});

		it("safely handles zero canvas dimensions in mapCanvasPointerToWorldMmWithTransform", () => {
			const transform: ViewportTransform = { zoom: 1.0, panX: 0, panY: 0 };
			const worldMm = mapCanvasPointerToWorldMmWithTransform(
				{ x: 50, y: 50 },
				{ width: 0, height: 0 },
				"axial",
				{ x: 0, y: 0, z: 0 },
				DEFAULT_OBLIQUE_ROTATION,
				transform,
				testVolume,
			);
			assert.ok(!Number.isNaN(worldMm.x));
			assert.ok(!Number.isNaN(worldMm.y));
			assert.ok(!Number.isNaN(worldMm.z));
		});

		it("calculates sub-degree angle with precision during handle drag", () => {
			const center = { x: 100, y: 100 };
			// Drag to dx = 100, dy = 1 -> tiny angle
			const angle = calculateAngleFromHandleDrag(center, { x: 200, y: 101 }, "u_pos");
			assert.ok(Math.abs(angle - 0.6) <= 0.1, `Expected ~0.6 deg, got ${angle}`);
		});
	});

	describe("12. Interactive Shift-Drag Rotation, Crosshair Center Hit-Test & 1-Click Reset", () => {
		const centerPx = { x: 200, y: 200 };

		it("returns initial angle when Shift-drag pointer position has not changed", () => {
			const startPointer = { x: 300, y: 200 }; // 0 rad from center
			const currentPointer = { x: 300, y: 200 };
			const result = calculateAngleFromShiftDrag(centerPx, currentPointer, startPointer, 15.0);
			assert.equal(result, 15.0);
		});

		it("calculates positive angle change when dragging clockwise around center", () => {
			const startPointer = { x: 300, y: 200 }; // 0 deg
			const currentPointer = { x: 200, y: 300 }; // 90 deg down (in canvas coords +Y is down, clockwise)
			const result = calculateAngleFromShiftDrag(centerPx, currentPointer, startPointer, 0.0);
			assert.equal(result, 90.0);
		});

		it("calculates negative angle change when dragging counter-clockwise", () => {
			const startPointer = { x: 300, y: 200 }; // 0 deg
			const currentPointer = { x: 200, y: 100 }; // -90 deg up
			const result = calculateAngleFromShiftDrag(centerPx, currentPointer, startPointer, 0.0);
			assert.equal(result, -90.0);
		});

		it("wraps angles cleanly within [-180, 180] range during continuous Shift-drag rotation", () => {
			const startPointer = { x: 300, y: 200 }; // 0 deg
			const currentPointer = { x: 100, y: 200 }; // 180 deg
			const result = calculateAngleFromShiftDrag(centerPx, currentPointer, startPointer, 45.0);
			// 45 + 180 = 225 -> wrapped to -135
			assert.equal(result, -135.0);
		});

		it("handles pointer at exact center without NaN or zero division", () => {
			const startPointer = { x: 200, y: 200 }; // center
			const currentPointer = { x: 200, y: 200 }; // center
			const result = calculateAngleFromShiftDrag(centerPx, currentPointer, startPointer, 20.0);
			assert.equal(result, 20.0);
		});

		it("detects clicks on central reticle with hitTestCrosshairCenter", () => {
			assert.equal(hitTestCrosshairCenter({ x: 200, y: 200 }, centerPx, 14), true);
			assert.equal(hitTestCrosshairCenter({ x: 210, y: 200 }, centerPx, 14), true);
			assert.equal(hitTestCrosshairCenter({ x: 200, y: 213 }, centerPx, 14), true);
			assert.equal(hitTestCrosshairCenter({ x: 215, y: 200 }, centerPx, 14), false);
			assert.equal(hitTestCrosshairCenter({ x: 300, y: 300 }, centerPx, 14), false);
		});

		it("resets individual plane angle while preserving other planes with resetPlaneObliqueAngle", () => {
			const initial: ObliqueRotationAngles = {
				axialAngleDeg: 25.5,
				coronalTiltDeg: -12.0,
				sagittalTiltDeg: 8.4,
			};

			const resetAxial = resetPlaneObliqueAngle(initial, "axial");
			assert.deepEqual(resetAxial, {
				axialAngleDeg: 0.0,
				coronalTiltDeg: -12.0,
				sagittalTiltDeg: 8.4,
			});

			const resetCoronal = resetPlaneObliqueAngle(initial, "coronal");
			assert.deepEqual(resetCoronal, {
				axialAngleDeg: 25.5,
				coronalTiltDeg: 0.0,
				sagittalTiltDeg: 8.4,
			});

			const resetSagittal = resetPlaneObliqueAngle(initial, "sagittal");
			assert.deepEqual(resetSagittal, {
				axialAngleDeg: 25.5,
				coronalTiltDeg: -12.0,
				sagittalTiltDeg: 0.0,
			});
		});

		it("resets all plane angles to 0.0 with resetObliqueRotationAngles", () => {
			const resetAll = resetObliqueRotationAngles();
			assert.deepEqual(resetAll, {
				axialAngleDeg: 0.0,
				coronalTiltDeg: 0.0,
				sagittalTiltDeg: 0.0,
			});
		});

		it("formats clinical rotation and tilt badges correctly with getObliqueRotationLabel", () => {
			assert.equal(getObliqueRotationLabel("axial", 15.2), "Поворот: +15.2°");
			assert.equal(getObliqueRotationLabel("axial", -8.0), "Поворот: -8.0°");
			assert.equal(getObliqueRotationLabel("coronal", -5.5), "Наклон: -5.5°");
			assert.equal(getObliqueRotationLabel("coronal", 10.0), "Наклон: +10.0°");
			assert.equal(getObliqueRotationLabel("sagittal", 8.4), "Наклон: +8.4°");
			assert.equal(getObliqueRotationLabel("axial", 0.0), "Поворот: 0.0°");
			assert.equal(getObliqueRotationLabel("coronal", 0.0), "Наклон: 0.0°");
		});
	});
});
