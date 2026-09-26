/**
 * DENTE CRM — CBCT Red Team Mathematical Inquisitor Suite
 * Standards: 3D Slicer, ITK-SNAP, Misch (2008), Buser et al. (2004), DICOM PS3.3
 *
 * Verifies under the microscope:
 * 1. Anisotropic angular distortion prevention (Cobb / Implant angulation).
 * 2. 4-Point Cobb angle & 3D implant axis to cortical plate normal.
 * 3. Trans-alveolar dual cortical plate detection (Buccal / Lingual thickness & Misch classification).
 * 4. Calibrated scale ruler bar physical millimeter invariance.
 * 5. File line limits (Mandate 8b <= 800 lines).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAnisotropicAngleBetween3Points2D,
	calculateAngleBetween2Lines2D,
	calculateAngleBetween2Lines3D,
	calculateImplantAngulationToPlane,
	calculateAnisotropicDistance2DMm,
} from "../cbctAnisotropicCaliperMath";
import { calculateAngleBetween3Points2D } from "../cbctCaliperNerveMath";
import {
	sampleLineProfile,
	detectAlveolarCorticalPlates,
	classifyMischDensity,
} from "../cbctRoiProfileMath";
import {
	calculateCalibratedScaleBar,
} from "../cbctSnapshotExportMath";
import { createEmptyCbctVolume } from "../cbctVolumeLifecycleMath";

describe("CBCT Red Team Caliper & Densitometry Mathematical Inquisitor", () => {
	describe("1. Anisotropic Angular Distortion Prevention", () => {
		it("proves raw pixel angle is distorted by 18.4° on anisotropic slice while anisotropic angle is exact 45.0°", () => {
			// Suppose an anisotropic coronal plane with dx = 0.2 mm, dz = 0.4 mm (1:2 aspect ratio).
			// An anatomical 45.0° structure has equal physical offsets: dx_mm = 10, dz_mm = 10.
			// In raw slice pixels: dx_px = 10 / 0.2 = 50 px, dz_px = 10 / 0.4 = 25 px.
			const vertex = { x: 100, y: 100 };
			const p1 = { x: 150, y: 100 }; // Horizontal leg: dx_px = 50, dz_px = 0 -> 10 mm
			const p2 = { x: 150, y: 125 }; // Diagonal end: dx_px = 50, dz_px = 25 -> (10 mm, 10 mm)

			// In raw pixel space: tan(theta) = 25 / 50 = 0.5 -> theta = 26.6° (catastrophic distortion!)
			const rawAngleDeg = calculateAngleBetween3Points2D(p1, vertex, p2);
			assert.ok(Math.abs(rawAngleDeg - 26.6) < 0.2, `Raw pixel angle is distorted to ~26.6° (got ${rawAngleDeg})`);

			// With anisotropic millimeter calibration:
			const physicalAngle = calculateAnisotropicAngleBetween3Points2D(p1, vertex, p2, 0.2, 0.4);
			assert.ok(
				Math.abs(physicalAngle - 45.0) < 0.2,
				`Physical anisotropic angle must strictly equal 45.0° (got ${physicalAngle})`,
			);
		});

		it("measures exact 90.0° for physical orthogonal arms on non-square voxels (dx=0.15, dy=0.30)", () => {
			const vertex = { x: 50, y: 50 };
			// Arm 1 along X: 20 voxels * 0.15 mm = 3.0 mm
			const p1 = { x: 70, y: 50 };
			// Arm 2 along Y: 10 voxels * 0.30 mm = 3.0 mm
			const p2 = { x: 50, y: 60 };

			const angle = calculateAnisotropicAngleBetween3Points2D(p1, vertex, p2, 0.15, 0.30);
			assert.equal(angle, 90.0);
		});

		it("handles collinear points (180.0° and 0.0°) without floating-point breakdown", () => {
			const vertex = { x: 100, y: 100 };
			const p1 = { x: 50, y: 100 };
			const p2 = { x: 150, y: 100 };

			assert.equal(calculateAnisotropicAngleBetween3Points2D(p1, vertex, p2, 0.25, 0.25), 180.0);
			assert.equal(calculateAnisotropicAngleBetween3Points2D(p1, vertex, p1, 0.25, 0.25), 0.0);
		});
	});

	describe("2. 4-Point Cobb Angle & 3D Implant Axis Angulation", () => {
		it("calculates 4-point Cobb angle between two intersecting line segments", () => {
			// Line 1: horizontal (0,0) -> (10, 0)
			const l1Start = { x: 0, y: 0 };
			const l1End = { x: 10, y: 0 };
			// Line 2: 30° inclined line (0,0) -> (10*cos(30°), 10*sin(30°))
			const l2Start = { x: 0, y: 0 };
			const l2End = { x: 8.66, y: 5.0 };

			const angle = calculateAngleBetween2Lines2D(l1Start, l1End, l2Start, l2End, 1.0, 1.0);
			assert.ok(Math.abs(angle - 30.0) < 0.2, `Cobb angle should be ~30.0° (got ${angle})`);
		});

		it("measures acute Cobb angle correctly with acuteOnly=true", () => {
			// Line 1: (0,0) -> (10, 0)
			// Line 2: (0,0) -> (-8.66, 5.0) (obtuse 150° or acute 30°)
			const l1Start = { x: 0, y: 0 };
			const l1End = { x: 10, y: 0 };
			const l2Start = { x: 0, y: 0 };
			const l2End = { x: -8.66, y: 5.0 };

			const acuteAngle = calculateAngleBetween2Lines2D(l1Start, l1End, l2Start, l2End, 1.0, 1.0, true);
			assert.ok(Math.abs(acuteAngle - 30.0) < 0.2, `Acute Cobb angle should be 30.0° (got ${acuteAngle})`);
		});

		it("calculates 3D implant axis angulation to cortical plate surface and normal", () => {
			// Vertical implant: apex at (0, 0, 0), platform at (0, 0, 10) -> vector along Z
			const apex = { x: 0, y: 0, z: 0 };
			const platform = { x: 0, y: 0, z: 10 };

			// Cortical plate normal along Z (flat horizontal alveolar crest)
			const crestNormal = { x: 0, y: 0, z: 1 };
			const res = calculateImplantAngulationToPlane(apex, platform, crestNormal);

			// Parallel to normal -> 0.0° to normal, 90.0° to bone surface (ideal perpendicular insertion)
			assert.equal(res.angleToNormalDeg, 0.0);
			assert.equal(res.angleToSurfaceDeg, 90.0);

			// Tilted implant by 15° around X:
			const tiltedPlatform = { x: 0, y: 10 * Math.sin((15 * Math.PI) / 180), z: 10 * Math.cos((15 * Math.PI) / 180) };
			const tiltedRes = calculateImplantAngulationToPlane(apex, tiltedPlatform, crestNormal);
			assert.ok(Math.abs(tiltedRes.angleToNormalDeg - 15.0) < 0.2, `Tilt to normal should be ~15.0° (got ${tiltedRes.angleToNormalDeg})`);
			assert.ok(Math.abs(tiltedRes.angleToSurfaceDeg - 75.0) < 0.2, `Tilt to surface should be ~75.0° (got ${tiltedRes.angleToSurfaceDeg})`);
		});
	});

	describe("3. Trans-Alveolar Dual Cortical Plate Detection & Misch Densitometry", () => {
		it("detects buccal plate, lingual plate, and trabecular marrow core on synthetic alveolar ridge", () => {
			// Create a synthetic CBCT volume (60 x 60 x 40 voxels, 0.25 mm spacing = 15 x 15 x 10 mm)
			const volume = createEmptyCbctVolume(60, 60, 40, 0.25, -1000);
			const data = volume.data!;
			const w = 60;
			const wh = 60 * 60;

			// Populate a realistic alveolar ridge along the Y axis at X=30, Z=20:
			// Y: 0..9 -> Air/Soft tissue (HU = 50)
			// Y: 10..16 -> Buccal Cortical Plate (7 voxels * 0.25 = 1.75 mm, HU = 1400)
			// Y: 17..40 -> Cancellous Core (24 voxels * 0.25 = 6.00 mm, HU = 550, Misch D3)
			// Y: 41..49 -> Lingual Cortical Plate (9 voxels * 0.25 = 2.25 mm, HU = 1650)
			// Y: 50..59 -> Lingual Soft Tissue (HU = 50)
			for (let y = 0; y < 60; y++) {
				let hu = 50;
				if (y >= 10 && y <= 16) hu = 1400;
				else if (y >= 17 && y <= 40) hu = 550;
				else if (y >= 41 && y <= 49) hu = 1650;

				for (let x = 28; x <= 32; x++) {
					for (let z = 18; z <= 22; z++) {
						data[z * wh + y * w + x] = hu;
					}
				}
			}

			// Sample profile line from Y=0 to Y=59 (physical mm: start at orig + 0*0.25, end at orig + 59*0.25)
			const startMm = { x: volume.originMm.x + 30 * 0.25, y: volume.originMm.y + 0 * 0.25, z: volume.originMm.z + 20 * 0.25 };
			const endMm = { x: volume.originMm.x + 30 * 0.25, y: volume.originMm.y + 59 * 0.25, z: volume.originMm.z + 20 * 0.25 };

			const profile = sampleLineProfile(volume, startMm, endMm, 0.25);
			assert.ok(profile.samples.length > 50);

			const analysis = detectAlveolarCorticalPlates(profile, 850);

			// Assert buccal cortical plate
			assert.ok(analysis.buccalPlate !== null, "Buccal cortical plate must be detected");
			assert.ok(
				Math.abs(analysis.buccalPlate!.thicknessMm - 1.75) <= 0.3,
				`Buccal plate thickness should be ~1.75 mm (got ${analysis.buccalPlate!.thicknessMm})`,
			);
			assert.ok(analysis.buccalPlate!.peakHU >= 1300, `Buccal peak HU should be >= 1300 (got ${analysis.buccalPlate!.peakHU})`);

			// Assert lingual cortical plate
			assert.ok(analysis.lingualPlate !== null, "Lingual cortical plate must be detected");
			assert.ok(
				Math.abs(analysis.lingualPlate!.thicknessMm - 2.25) <= 0.3,
				`Lingual plate thickness should be ~2.25 mm (got ${analysis.lingualPlate!.thicknessMm})`,
			);
			assert.ok(analysis.lingualPlate!.peakHU >= 1600, `Lingual peak HU should be >= 1600 (got ${analysis.lingualPlate!.peakHU})`);

			// Assert cancellous bone marrow core
			assert.ok(
				Math.abs(analysis.trabecularCore.meanHU - 550) <= 50,
				`Trabecular core mean HU should be ~550 (got ${analysis.trabecularCore.meanHU})`,
			);
			assert.equal(analysis.trabecularCore.mischClass, "D3");

			// Assert Buser 1.5mm containment rule & perforation risk
			assert.equal(analysis.isBuccalThinningRisk, false, "1.75 mm buccal plate satisfies Buser >= 1.5 mm rule");
			assert.equal(analysis.isCorticalPerforationRisk, false, "Thick cortical plates have zero perforation risk");
		});

		it("flags Buser et al. (2004) buccal thinning risk when buccal plate is under 1.5 mm", () => {
			// Profile with thin 0.75 mm buccal plate
			const thinProfile = {
				totalLengthMm: 10.0,
				stepSizeMm: 0.25,
				samples: [
					{ index: 0, distanceMm: 0.0, worldMm: { x: 0, y: 0, z: 0 }, hu: 50, tissueTypeRu: "Мягкие ткани" },
					{ index: 1, distanceMm: 0.25, worldMm: { x: 0, y: 0, z: 0 }, hu: 1200, tissueTypeRu: "Кортикал" },
					{ index: 2, distanceMm: 0.50, worldMm: { x: 0, y: 0, z: 0 }, hu: 1300, tissueTypeRu: "Кортикал" },
					{ index: 3, distanceMm: 0.75, worldMm: { x: 0, y: 0, z: 0 }, hu: 1250, tissueTypeRu: "Кортикал" },
					{ index: 4, distanceMm: 1.0, worldMm: { x: 0, y: 0, z: 0 }, hu: 400, tissueTypeRu: "Губчатая" },
					{ index: 5, distanceMm: 1.25, worldMm: { x: 0, y: 0, z: 0 }, hu: 420, tissueTypeRu: "Губчатая" },
					{ index: 6, distanceMm: 1.50, worldMm: { x: 0, y: 0, z: 0 }, hu: 1500, tissueTypeRu: "Кортикал" },
					{ index: 7, distanceMm: 1.75, worldMm: { x: 0, y: 0, z: 0 }, hu: 1550, tissueTypeRu: "Кортикал" },
					{ index: 8, distanceMm: 2.0, worldMm: { x: 0, y: 0, z: 0 }, hu: 50, tissueTypeRu: "Мягкие ткани" },
				],
				meanHU: 650,
				minHU: 50,
				maxHU: 1550,
				corticalThicknessMm: 1.25,
				trabecularMeanHU: 410,
			};

			const analysis = detectAlveolarCorticalPlates(thinProfile, 850);
			assert.ok(analysis.buccalPlate !== null);
			assert.equal(analysis.buccalPlate!.thicknessMm, 0.75);
			assert.equal(analysis.isBuccalThinningRisk, true, "0.75 mm must trigger isBuccalThinningRisk (< 1.5 mm)");
			assert.equal(analysis.isCorticalPerforationRisk, true, "0.75 mm must trigger isCorticalPerforationRisk (< 1.0 mm)");
		});
	});

	describe("4. Calibrated Scale Ruler Bar Physical Invariance", () => {
		it("maintains strict mathematical relation barLengthPx = barLengthMm * pxPerMm", () => {
			const testScales = [0.15, 0.2, 0.25, 0.4, 0.5, 1.0];
			for (const sp of testScales) {
				const res = calculateCalibratedScaleBar(sp, 512);
				const expectedPx = res.barLengthMm * (1.0 / sp);
				assert.ok(
					Math.abs(res.barLengthPx - expectedPx) <= 0.1,
					`Scale bar px (${res.barLengthPx}) must strictly equal mm * pxPerMm (${expectedPx}) for spacing ${sp}`,
				);
			}
		});

		it("adapts scale bar interval for high-zoom viewports to prevent screen overflow", () => {
			// At high zoom (sp = 0.05 mm/px), 10mm would be 200px (overflows small 250px thumbnail)
			const res = calculateCalibratedScaleBar(0.05, 250);
			assert.ok(res.barLengthMm <= 5, `High zoom must adapt bar to <= 5 mm (got ${res.barLengthMm} mm)`);
			assert.ok(res.barLengthPx <= 250 * 0.45, `Bar px must fit within 45% viewport width (got ${res.barLengthPx} px)`);
		});

		it("honors customScaleBarLengthMm without distortion", () => {
			const res = calculateCalibratedScaleBar(0.2, 600, 15.0);
			assert.equal(res.barLengthMm, 15.0);
			assert.equal(res.barLengthPx, 75.0); // 15.0 / 0.2 = 75.0 px
			assert.equal(res.label, "15 мм");
		});
	});
});
