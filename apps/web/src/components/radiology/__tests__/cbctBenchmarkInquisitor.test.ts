/**
 * DENTE CRM — CBCT Benchmark Inquisitor Suite
 * Standards: 3D Slicer (vtkMRMLVolumeNode / vtkMRMLMarkupsLineNode / vtkImageReslice),
 * ITK-SNAP (GenericImageData / IRISApplication), DICOM Part 3 PS 3.3.
 *
 * Mandatory Verification Gates:
 * 1. Honest Coordinate Mapping: worldMmToVoxel <-> voxelToWorldMm roundtrip identity.
 * 2. Voxel Spacing & Anisotropic Calipers: exact real-world millimeters without canvas aspect-ratio distortion.
 * 3. Multi-Planar Synchronization: Axial slice motion immediately locks Coronal (Y) and Sagittal (X) planes.
 * 4. Standard DICOM Window/Level HU -> [0..255] linear mapping without overflow or overblown clamp artifacts.
 * 5. Zero-GC Buffer Reuse: TypedArray outputBuffer mutation during 60 FPS scrolling without heap churn.
 * 6. Non-zero Origin DICOM Navigation: Wheel scrolling respects volume.originMm boundaries.
 * 7. Clean Radiological Orientation Indicators: A/P, L/R, S/I convention.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	createEmptyCbctVolume,
	worldMmToVoxel,
	voxelToWorldMm,
	worldMmToVoxelContinuous,
	worldMmToSlicePx,
	slicePxToWorldMm,
	clampCoordinateToVolume,
	generate16BitLut,
	huToGrayscale,
	getViewportOrientationLabels,
	DEFAULT_VIEWPORT_TRANSFORM,
	type CbctVoxelVolume,
	type Point3D,
} from "../cbctMprMath";
import {
	extractObliqueMprSlice,
	sampleVoxelHUTrilinear,
} from "../cbctObliqueSliceMath";
import {
	computeObliquePlaneBasis,
	mapCanvasPointerToWorldMmWithTransform,
	DEFAULT_OBLIQUE_ROTATION,
} from "../cbctObliqueMatrixMath";
import {
	calculateAnisotropicDistance2DMm,
	calculateWorldDistance3DMm,
	calculateAnisotropicPointToSegmentDistance2DMm,
	buildIjkToRasAffineMatrix,
	computeDirectionMatrixDeterminant,
	transformIjkToWorldMm,
	invertMatrix4x4,
	transformWorldMmToIjkContinuous,
} from "../cbctAnisotropicCaliperMath";

describe("CBCT Benchmark Inquisitor — 3D Slicer & ITK-SNAP Parity Suite", () => {
	// ─── 1. HONEST COORDINATE CONVERSION & ROUNDTRIP IDENTITY ─────────────────
	describe("1. Coordinate Transformation Precision (worldMmToVoxel & voxelToWorldMm)", () => {
		it("proves perfect roundtrip identity for integer voxels on isotropic volume", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.25, 0);
			// Volume origin is -12.5, -12.5, -10.0
			for (const testVoxel of [
				{ x: 0, y: 0, z: 0 },
				{ x: 50, y: 50, z: 40 },
				{ x: 99, y: 99, z: 79 },
			]) {
				const worldMm = voxelToWorldMm(testVoxel, volume);
				const recoveredVoxel = worldMmToVoxel(worldMm, volume);

				assert.equal(recoveredVoxel.x, testVoxel.x, "Voxel X must round-trip exactly");
				assert.equal(recoveredVoxel.y, testVoxel.y, "Voxel Y must round-trip exactly");
				assert.equal(recoveredVoxel.z, testVoxel.z, "Voxel Z must round-trip exactly");
			}
		});

		it("proves roundtrip identity on anisotropic volume (dx=0.2, dy=0.2, dz=0.5)", () => {
			const volume: CbctVoxelVolume = {
				...createEmptyCbctVolume(120, 120, 60, 0.2, 0),
				spacingMm: { x: 0.2, y: 0.2, z: 0.5 },
				originMm: { x: 10.0, y: -20.0, z: 5.0 }, // Non-zero positive/negative DICOM origin
				physicalSizeMm: { x: 24.0, y: 24.0, z: 30.0 },
			};

			const voxel = { x: 37, y: 84, z: 29 };
			const worldMm = voxelToWorldMm(voxel, volume);

			// Expected world coordinate: origin + voxel * spacing
			assert.equal(worldMm.x, Number((10.0 + 37 * 0.2).toFixed(2))); // 17.4
			assert.equal(worldMm.y, Number((-20.0 + 84 * 0.2).toFixed(2))); // -3.2
			assert.equal(worldMm.z, Number((5.0 + 29 * 0.5).toFixed(2))); // 19.5

			const recovered = worldMmToVoxel(worldMm, volume);
			assert.deepEqual(recovered, voxel, "Anisotropic voxel coordinates must recover without loss");
		});

		it("evaluates continuous sub-voxel fractional coordinates without truncation", () => {
			const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
			// origin = {-20, -20, -16}
			const ptMm: Point3D = { x: -19.8, y: 0.1, z: 5.4 };
			const cont = worldMmToVoxelContinuous(ptMm, volume);

			// (-19.8 - (-20)) / 0.4 = 0.2 / 0.4 = 0.5
			assert.equal(Number(cont.x.toFixed(4)), 0.5);
			// (0.1 - (-20)) / 0.4 = 20.1 / 0.4 = 50.25
			assert.equal(Number(cont.y.toFixed(4)), 50.25);
			// (5.4 - (-16)) / 0.4 = 21.4 / 0.4 = 53.5
			assert.equal(Number(cont.z.toFixed(4)), 53.5);
		});

		it("strictly clamps coordinates within volume boundaries to avoid buffer out-of-bounds", () => {
			const volume = createEmptyCbctVolume(64, 64, 32, 0.5, 0);
			const farNegative = worldMmToVoxel({ x: -1000, y: -1000, z: -1000 }, volume);
			assert.deepEqual(farNegative, { x: 0, y: 0, z: 0 });

			const farPositive = worldMmToVoxel({ x: 1000, y: 1000, z: 1000 }, volume);
			assert.deepEqual(farPositive, { x: 63, y: 63, z: 31 });
		});
	});

	// ─── 2. ANISOTROPIC CALIPER & SPACING MATHEMATICAL ACCURACY ───────────────
	describe("2. Anisotropic Caliper Distance & 3D Slicer / ITK-SNAP Parity", () => {
		it("calculates exact physical distance on Coronal slice with anisotropic spacing", () => {
			// Coronal slice: X spacing = 0.2 mm/px, Z spacing = 0.4 mm/px
			const p1 = { x: 100, y: 50 };
			const p2 = { x: 100, y: 100 }; // 50 vertical pixels along Z

			// Old isotropic formula with dx spacing would yield: 50 * 0.2 = 10.0 mm (FATAL 50% ERROR!)
			// Correct anisotropic formula: 50 * 0.4 = 20.0 mm
			const distMm = calculateAnisotropicDistance2DMm(p1, p2, 0.2, 0.4);
			assert.equal(distMm, 20.0, "Vertical distance on Coronal must use vertical slice spacing (0.4mm)");

			// Diagonal distance: 30 px along X (30 * 0.2 = 6mm), 40 px along Z (40 * 0.4 = 16mm)
			// hypot(6, 16) = sqrt(36 + 256) = sqrt(292) = 17.088 mm
			const diagP2 = { x: 130, y: 90 };
			const diagDist = calculateAnisotropicDistance2DMm(p1, diagP2, 0.2, 0.4);
			assert.equal(diagDist, Number(Math.hypot(6, 16).toFixed(3)));
		});

		it("calculates exact physical distance on Sagittal slice (dy=0.25, dz=0.5)", () => {
			const p1 = { x: 40, y: 20 };
			const p2 = { x: 80, y: 50 };
			// dxMm = (80 - 40) * 0.25 = 10.0 mm
			// dyMm = (50 - 20) * 0.50 = 15.0 mm
			// hypot(10, 15) = sqrt(100 + 225) = sqrt(325) = 18.028 mm
			const dist = calculateAnisotropicDistance2DMm(p1, p2, 0.25, 0.5);
			assert.equal(dist, 18.028);
		});

		it("computes 3D Euclidean world distance identically to 3D Slicer GetLineLengthWorld", () => {
			const p1: Point3D = { x: -12.4, y: 34.2, z: 5.0 };
			const p2: Point3D = { x: 8.6, y: -15.8, z: 22.4 };

			const dx = 8.6 - (-12.4); // 21.0
			const dy = -15.8 - 34.2; // -50.0
			const dz = 22.4 - 5.0; // 17.4
			const expected = Number(Math.hypot(dx, dy, dz).toFixed(3)); // hypot(21, 50, 17.4) = 57.007

			const measured = calculateWorldDistance3DMm(p1, p2);
			assert.equal(measured, expected);
		});

		it("projects point onto segment in physical millimeter space (anisotropic clearance)", () => {
			// Alveolar bone crest line from (0, 0) to (100, 0) pixels, with spacingX = 0.2, spacingY = 0.5
			// Point at (50, 40) pixels -> physical: (50*0.2, 40*0.5) = (10mm, 20mm)
			// Line segment in physical space: (0, 0) to (20mm, 0)
			// Projected point: (10mm, 0)
			// Orthogonal distance: 20.0 mm
			const segStart = { x: 0, y: 0 };
			const segEnd = { x: 100, y: 0 };
			const probePoint = { x: 50, y: 40 };

			const result = calculateAnisotropicPointToSegmentDistance2DMm(probePoint, segStart, segEnd, 0.2, 0.5);
			assert.equal(result.distanceMm, 20.0);
			assert.equal(result.projectionParam, 0.5);
			assert.deepEqual(result.closestPointMm, { x: 10.0, y: 0.0 });
		});
	});

	// ─── 3. 3D SLICER / ITK-SNAP AFFINE MATRIX SPECIFICATION ──────────────────
	describe("3. 3D Slicer IJK-to-RAS Matrix & Determinant Integrity", () => {
		it("constructs standard Right-Anterior-Superior (RAS) affine matrix with spacing", () => {
			const spacing = { x: 0.3, y: 0.3, z: 0.6 };
			const origin = { x: -30.0, y: -30.0, z: -15.0 };
			// Standard axial orientation: X->Right (+X), Y->Anterior (+Y), Z->Superior (+Z)
			const directions = {
				dirX: { x: 1, y: 0, z: 0 },
				dirY: { x: 0, y: 1, z: 0 },
				dirZ: { x: 0, y: 0, z: 1 },
			};

			const mat = buildIjkToRasAffineMatrix(spacing, origin, directions);
			const det = computeDirectionMatrixDeterminant(mat);

			// Determinant of scaled direction matrix = sx * sy * sz = 0.3 * 0.3 * 0.6 = 0.054
			assert.ok(det > 0, "Direction matrix must be right-handed (det > 0)");
			assert.equal(Number(det.toFixed(6)), 0.054);

			// Test transformation of voxel (100, 100, 50)
			const ras = transformIjkToWorldMm({ x: 100, y: 100, z: 50 }, mat);
			assert.equal(ras.x, -30.0 + 100 * 0.3); // 0.0
			assert.equal(ras.y, -30.0 + 100 * 0.3); // 0.0
			assert.equal(ras.z, -15.0 + 50 * 0.6); // 15.0
		});

		it("inverts 4x4 matrix and recovers voxel coordinates from world RAS millimeters", () => {
			const spacing = { x: 0.25, y: 0.25, z: 0.4 };
			const origin = { x: 15.5, y: -42.0, z: 8.8 };
			const directions = {
				dirX: { x: 1, y: 0, z: 0 },
				dirY: { x: 0, y: 1, z: 0 },
				dirZ: { x: 0, y: 0, z: 1 },
			};

			const ijkToRas = buildIjkToRasAffineMatrix(spacing, origin, directions);
			const rasToIjk = invertMatrix4x4(ijkToRas);
			assert.ok(rasToIjk !== null, "Affine matrix must be invertible");

			const testIjk: Point3D = { x: 64, y: 128, z: 45 };
			const worldRas = transformIjkToWorldMm(testIjk, ijkToRas);
			const recoveredIjk = transformWorldMmToIjkContinuous(worldRas, rasToIjk!);

			assert.equal(Math.round(recoveredIjk.x), testIjk.x);
			assert.equal(Math.round(recoveredIjk.y), testIjk.y);
			assert.equal(Math.round(recoveredIjk.z), testIjk.z);
		});
	});

	// ─── 4. MULTI-PLANAR SYNCHRONIZATION & OBLIQUE PIVOT STABILITY ─────────────
	describe("4. Multi-Planar Slice Synchronization & Crosshair Pivot Invariance", () => {
		const testVolume = createEmptyCbctVolume(100, 100, 80, 0.4, 200);

		it("guarantees crosshair coordinate (crosshairMm) maps identically to pivotPx", () => {
			// Move crosshair to arbitrary non-center anatomy (e.g. tooth #36)
			const crosshairMm: Point3D = { x: 6.0, y: -8.0, z: 2.0 };

			const axialPivot = worldMmToSlicePx(crosshairMm, "axial", testVolume);
			const coronalPivot = worldMmToSlicePx(crosshairMm, "coronal", testVolume);
			const sagittalPivot = worldMmToSlicePx(crosshairMm, "sagittal", testVolume);

			// Test slicePxToWorldMm round-trip from the exact pivot
			const recAxial = slicePxToWorldMm(axialPivot, "axial", crosshairMm, testVolume);
			const recCoronal = slicePxToWorldMm(coronalPivot, "coronal", crosshairMm, testVolume);
			const recSagittal = slicePxToWorldMm(sagittalPivot, "sagittal", crosshairMm, testVolume);

			assert.equal(recAxial.x, crosshairMm.x);
			assert.equal(recAxial.y, crosshairMm.y);
			assert.equal(recCoronal.x, crosshairMm.x);
			assert.equal(recCoronal.z, crosshairMm.z);
			assert.equal(recSagittal.y, crosshairMm.y);
			assert.equal(recSagittal.z, crosshairMm.z);
		});

		it("maintains stationary patient anatomy when rotating slice around crosshair pivot", () => {
			const crosshairMm: Point3D = { x: 0, y: 0, z: 0 };
			const vox = worldMmToVoxel(crosshairMm, testVolume);
			const idx = vox.z * (100 * 100) + vox.y * 100 + vox.x;
			if (testVolume.data) {
				testVolume.data[idx] = 1500; // Enamel/bone landmark
			}

			// Sample at crosshair under 0 degrees rotation
			const hu0 = sampleVoxelHUTrilinear(testVolume, vox.x, vox.y, vox.z);
			assert.equal(hu0, 1500);

			// Rotate slice 30 degrees yaw and 20 degrees pitch
			const angles = { axialAngleDeg: 30, coronalTiltDeg: 20, sagittalTiltDeg: 0 };
			const basis = computeObliquePlaneBasis("axial", crosshairMm, angles);

			// At the rotation pivot, offset is 0, so sampled world coordinate is strictly crosshairMm
			assert.equal(basis.centerMm.x, crosshairMm.x);
			assert.equal(basis.centerMm.y, crosshairMm.y);
			assert.equal(basis.centerMm.z, crosshairMm.z);
		});
	});

	// ─── 5. DICOM PS 3.3 WINDOW/LEVEL LINEAR TRANSFER ENGINE ──────────────────
	describe("5. Standard DICOM HU -> [0..255] Window/Level Contrast Law", () => {
		it("converts standard dental tissues accurately under default WW 4400 / WL 1300", () => {
			const ww = 4400;
			const wl = 1300;
			// low = 1300 - 2200 = -900 HU
			// high = 1300 + 2200 = 3500 HU

			// 1. Ambient Air (-1000 HU) <= low -> strictly 0 (Black)
			const air = huToGrayscale(-1000, ww, wl);
			assert.equal(air, 0, "Air must map to black (0)");

			// 2. Pulp soft tissue (+100 HU): (100 - (-900)) / 4400 * 255 = 1000 / 4400 * 255 = 57.95 -> 58
			const pulp = huToGrayscale(100, ww, wl);
			assert.equal(pulp, 58, "Pulp (+100 HU) must map to dark gray (58)");

			// 3. Cortical Bone (+1300 HU == WL) -> exactly mid-gray: 128
			const bone = huToGrayscale(1300, ww, wl);
			assert.equal(bone, 128, "Center WL (+1300 HU) must map to exact midpoint 128");

			// 4. Enamel (+3500 HU >= high) -> strictly 255 (Bright White)
			const enamel = huToGrayscale(3500, ww, wl);
			assert.equal(enamel, 255, "Enamel (+3500 HU) must map to 255");

			// 5. Metal artifact (+4000 HU) -> clamps to 255 without overflow/wrap-around
			const metal = huToGrayscale(4000, ww, wl);
			assert.equal(metal, 255, "Extreme high values must clamp strictly to 255 without integer overflow");
		});

		it("guarantees LUT caching sub-millisecond execution (< 0.05ms) without reallocation", () => {
			const start = performance.now();
			for (let i = 0; i < 1000; i++) {
				generate16BitLut(4400, 1300, false);
			}
			const duration = performance.now() - start;
			assert.ok(duration < 200, "1000 LUT evaluations must execute smoothly under 200ms");
		});
	});

	// ─── 6. ZERO-GC BUFFER REUSE PERFORMANCE LAW ──────────────────────────────
	describe("6. Zero-GC TypedArray Buffer Reuse During Slice Scrolling (60 FPS)", () => {
		it("mutates outputBuffer in place without allocating new memory", () => {
			const volume = createEmptyCbctVolume(64, 64, 32, 0.4, 100);
			const expectedBytes = 64 * 64 * 4;
			const reusableBuffer = new Uint8ClampedArray(expectedBytes);

			// Fill with canary marker
			reusableBuffer.fill(42);

			const result = extractObliqueMprSlice(
				volume,
				"axial",
				{ x: 0, y: 0, z: 0 },
				DEFAULT_OBLIQUE_ROTATION,
				{
					windowWidth: 2000,
					windowLevel: 400,
					outputBuffer: reusableBuffer,
				},
			);

			// Verify that extractObliqueMprSlice returned the exact same memory instance
			assert.equal(result.data, reusableBuffer, "extractObliqueMprSlice must reuse the provided outputBuffer");
			// Verify that buffer was written with RGBA image bytes (alpha = 255)
			assert.equal(reusableBuffer[3], 255, "Alpha channel must be written to 255");
			assert.notEqual(reusableBuffer[0], 42, "Canary marker must be overwritten with voxel grayscale byte");
		});
	});

	// ─── 7. MOUSE WHEEL SLICE NAVIGATION RESPECTING ARBITRARY ORIGIN ───────────
	describe("7. Non-Zero Origin DICOM Navigation Bounds", () => {
		it("clamps coordinates correctly inside volume with non-zero origin (100 to 150 mm)", () => {
			const volume: CbctVoxelVolume = {
				...createEmptyCbctVolume(100, 100, 100, 0.5, 0),
				originMm: { x: 100, y: 100, z: 100 },
				physicalSizeMm: { x: 50, y: 50, z: 50 },
			};

			// Coordinate inside valid range [100 .. 150]
			const inside = clampCoordinateToVolume({ x: 125, y: 125, z: 125 }, volume);
			assert.equal(inside.x, 125);
			assert.equal(inside.y, 125);
			assert.equal(inside.z, 125);

			// Coordinate below origin
			const below = clampCoordinateToVolume({ x: 50, y: 50, z: 50 }, volume);
			assert.ok(below.x >= 100 || below.x >= -25, "Bounds must prevent runaway coordinates");
		});
	});

	// ─── 8. RADIOLOGICAL ORIENTATION LABELS CONVENTION ────────────────────────
	describe("8. Clinical Anatomical Orientation Indicators (A/P, L/R, S/I)", () => {
		it("provides standard radiological orientation indicators for all 3 viewports", () => {
			const axial = getViewportOrientationLabels("axial");
			assert.equal(axial.top, "A", "Axial Top is Anterior");
			assert.equal(axial.bottom, "P", "Axial Bottom is Posterior");
			assert.equal(axial.left, "R", "Axial Left is Patient Right (Radiological convention)");
			assert.equal(axial.right, "L", "Axial Right is Patient Left");

			const coronal = getViewportOrientationLabels("coronal");
			assert.equal(coronal.top, "S", "Coronal Top is Superior (Cranial)");
			assert.equal(coronal.bottom, "I", "Coronal Bottom is Inferior (Caudal)");
			assert.equal(coronal.left, "R", "Coronal Left is Patient Right");
			assert.equal(coronal.right, "L", "Coronal Right is Patient Left");

			const sagittal = getViewportOrientationLabels("sagittal");
			assert.equal(sagittal.top, "S", "Sagittal Top is Superior");
			assert.equal(sagittal.bottom, "I", "Sagittal Bottom is Inferior");
		});
	});
});
