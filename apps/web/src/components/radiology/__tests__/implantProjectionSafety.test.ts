import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateApexCoordinates,
	calculateAxialImplantIntersection,
	calculateImplant3DWorldPose,
	auditMandibularNerveSafety,
	performCbctPlanningAudit,
	checkImplantSliceIntersection,
	findImplantSpec,
	sampleCrossSectionHUProfile,
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
} from "../implantSafetyEngine";
import {
	buildDentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	findNearestCrossSectionIndexByPanoX,
	getPanoramicSliceFanTicks,
	mapSliceToPanoramicX,
	type CrossSectionSliceData,
} from "../dentalCurveEngine";

describe("Synchronized 4-Viewport Implant 3D Projection & Safety Sentinel Suite", () => {
	const mockSpec = findImplantSpec("osstem", 4.0, 10.0);

	const mockPose: CrossSectionImplantPose = {
		entryPoint: { x: 0, y: 2.0 },
		angulationDeg: 0,
		implantSpec: mockSpec,
		targetToothFdi: 46,
	};

	const mockSliceCenter = { x: 23.0, y: 5.5, z: -10.0 };
	const mockNormal2D = { x: 0.8, y: -0.6 };

	it("calculates 3D world coordinates for virtual implant in CBCT volume space", () => {
		const implant3D = calculateImplant3DWorldPose(mockPose, mockSliceCenter, mockNormal2D, 32.0, 4.0);

		// Crest Z = -10.0 + (32/2 - 4) = -10 + 12 = 2.0 mm
		// Entry Z = 2.0 - 2.0 = 0.0 mm
		assert.equal(implant3D.entry3D.z, 0.0);
		assert.equal(implant3D.entry3D.x, 23.0);
		assert.equal(implant3D.entry3D.y, 5.5);

		// Vertical implant (0 deg tilt): Apex Z = 0.0 - 10.0 = -10.0 mm
		assert.equal(implant3D.apex3D.z, -10.0);
		assert.equal(implant3D.lengthMm, 10.0);
		assert.equal(implant3D.diameterMm, 4.0);
		assert.equal(implant3D.targetToothFdi, 46);
	});

	it("calculates 3D world coordinates with angulation tilt", () => {
		const tiltedPose: CrossSectionImplantPose = {
			...mockPose,
			angulationDeg: 15, // 15 degrees tilt
		};

		const implant3D = calculateImplant3DWorldPose(tiltedPose, mockSliceCenter, mockNormal2D, 32.0, 4.0);
		assert.ok(implant3D.apex3D.x !== mockSliceCenter.x || implant3D.apex3D.y !== mockSliceCenter.y);
		assert.ok(implant3D.apex3D.z > -10.0); // Tilted apex has higher Z than vertical
	});

	it("computes axial plane intersection ellipse and 2.0 mm safety halo", () => {
		const implant3D = calculateImplant3DWorldPose(mockPose, mockSliceCenter, mockNormal2D, 32.0, 4.0);

		// Level Z = -5.0 mm is halfway inside the implant span [0.0 .. -10.0]
		const intersection = calculateAxialImplantIntersection(implant3D, -5.0, 2.0);
		assert.equal(intersection.isInsideSpan, true);
		assert.ok(intersection.radiusMm > 1.0);
		assert.ok(intersection.semiMajorMm >= intersection.semiMinorMm);

		// Safety halo semi-major and semi-minor must be radius + 2.0 mm
		assert.equal(intersection.safetyHaloSemiMinorMm, intersection.semiMinorMm + 2.0);

		// Level Z = +10.0 mm is above the implant
		const aboveIntersection = calculateAxialImplantIntersection(implant3D, 10.0, 2.0);
		assert.equal(aboveIntersection.isInsideSpan, false);
		assert.ok(aboveIntersection.signedDistanceToZMm > 0);

		// Level Z = -20.0 mm is below the implant
		const belowIntersection = calculateAxialImplantIntersection(implant3D, -20.0, 2.0);
		assert.equal(belowIntersection.isInsideSpan, false);
		assert.ok(belowIntersection.signedDistanceToZMm < 0);
	});

	it("audits mandibular nerve clearance and triggers danger/warning thresholds", () => {
		// Case 1: Safe distance
		const safeCanal: MandibularCanalCrossSection = {
			center: { x: 0, y: 20.0 },
			radiusMm: 1.4,
			safetyMarginMm: 2.0,
		};
		const safeAudit = auditMandibularNerveSafety(mockPose, safeCanal);
		assert.equal(safeAudit.safetyStatus, "safe");
		assert.equal(safeAudit.isDangerous, false);
		assert.equal(safeAudit.shouldTriggerAudioAlarm, false);
		assert.ok(safeAudit.netClearanceToCanalWallMm >= 2.0);

		// Case 2: Warning distance (Net clearance between 1.0 and 2.0 mm)
		const warningCanal: MandibularCanalCrossSection = {
			center: { x: 0, y: 17.0 },
			radiusMm: 1.4,
			safetyMarginMm: 2.0,
		};
		const warningAudit = auditMandibularNerveSafety(mockPose, warningCanal);
		assert.equal(warningAudit.safetyStatus, "warning");
		assert.equal(warningAudit.isWarning, true);
		assert.equal(warningAudit.isDangerous, false);

		// Case 3: Critical Danger / Collision (Net clearance < 1.0 mm or perforation)
		const dangerCanal: MandibularCanalCrossSection = {
			center: { x: 0, y: 14.0 },
			radiusMm: 1.4,
			safetyMarginMm: 2.0,
		};
		const dangerAudit = auditMandibularNerveSafety(mockPose, dangerCanal);
		assert.equal(dangerAudit.safetyStatus, "danger");
		assert.equal(dangerAudit.isDangerous, true);
		assert.equal(dangerAudit.shouldTriggerAudioAlarm, true);
	});

	it("disapproves plan (isPlanApproved: false) when IAN clearance is in warning corridor (1.0..1.99 mm)", () => {
		const warningCanal: MandibularCanalCrossSection = {
			center: { x: 0, y: 17.0 },
			radiusMm: 1.5,
			safetyMarginMm: 2.0,
		};
		const envelope = {
			crestPoint: { x: 0, y: 2.0 },
			basePoint: { x: 0, y: 20.0 },
			buccalCrestPoint: { x: -4.0, y: 2.0 },
			lingualCrestPoint: { x: 4.5, y: 2.0 },
			ridgeWidthMm: 8.5,
			ridgeHeightMm: 18.0,
		};
		const huSampling = {
			coronalCrestalHU: 1100,
			trabecularCoreHU: 700,
			apicalBaseHU: 850,
			overallMeanHU: 880,
		};

		const audit = performCbctPlanningAudit({
			toothFdi: 46,
			implantPose: mockPose,
			canal: warningCanal,
			envelope,
			huSampling,
		});

		assert.equal(audit.nerveSafety.safetyStatus, "warning");
		assert.equal(audit.nerveSafety.isWarning, true);
		assert.equal(audit.isPlanApproved, false);
		assert.ok(audit.form043DiaryText.includes("ТРЕБУЕТСЯ УМЕНЬШЕНИЕ ДЛИНЫ ИМПЛАНТАТА ДЛЯ ЗАЗОРА >= 2.0 ММ"));
	});

	it("maps cross-section slices to panoramic X columns and performs inverse click lookup", () => {
		const arch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
		const totalLength = arch.totalArcLengthMm;
		const panoWidthPx = 400;

		const mockSlices: CrossSectionSliceData[] = [
			{
				sliceIndex: 1,
				distanceAlongArchMm: 0,
				centerPointMm: { x: -28, y: 22, z: 0 },
				normalVector2D: { x: 1, y: 0 },
				tangentVector2D: { x: 0, y: 1 },
				nearestToothFdi: "48",
				toothLabelRu: "48",
				widthMm: 24,
				heightMm: 32,
				pixelSpacingMm: 0.25,
				widthPx: 96,
				heightPx: 128,
				pixelData: new Uint8ClampedArray(96 * 128 * 4),
			},
			{
				sliceIndex: 20,
				distanceAlongArchMm: totalLength * 0.5,
				centerPointMm: { x: 0, y: -22, z: 0 },
				normalVector2D: { x: 0, y: 1 },
				tangentVector2D: { x: 1, y: 0 },
				nearestToothFdi: "41",
				toothLabelRu: "41",
				widthMm: 24,
				heightMm: 32,
				pixelSpacingMm: 0.25,
				widthPx: 96,
				heightPx: 128,
				pixelData: new Uint8ClampedArray(96 * 128 * 4),
			},
			{
				sliceIndex: 40,
				distanceAlongArchMm: totalLength,
				centerPointMm: { x: 28, y: 22, z: 0 },
				normalVector2D: { x: -1, y: 0 },
				tangentVector2D: { x: 0, y: -1 },
				nearestToothFdi: "38",
				toothLabelRu: "38",
				widthMm: 24,
				heightMm: 32,
				pixelSpacingMm: 0.25,
				widthPx: 96,
				heightPx: 128,
				pixelData: new Uint8ClampedArray(96 * 128 * 4),
			},
		];

		const px0 = mapSliceToPanoramicX(mockSlices[0]!, panoWidthPx, totalLength);
		const pxMid = mapSliceToPanoramicX(mockSlices[1]!, panoWidthPx, totalLength);
		const pxEnd = mapSliceToPanoramicX(mockSlices[2]!, panoWidthPx, totalLength);

		assert.equal(px0, 0);
		assert.ok(pxMid > 180 && pxMid < 220);
		assert.equal(pxEnd, panoWidthPx - 1);

		// Inverse lookup
		const foundIdx0 = findNearestCrossSectionIndexByPanoX(10, panoWidthPx, mockSlices, totalLength);
		assert.equal(foundIdx0, 0);

		const foundIdxMid = findNearestCrossSectionIndexByPanoX(200, panoWidthPx, mockSlices, totalLength);
		assert.equal(foundIdxMid, 1);

		// Fan ticks generation
		const fanTicks = getPanoramicSliceFanTicks(mockSlices, panoWidthPx, totalLength);
		assert.equal(fanTicks.length, 3);
		assert.equal(fanTicks[0]?.sliceIndex, 1);
		assert.equal(fanTicks[0]?.isMajor, true);
		assert.equal(fanTicks[1]?.sliceIndex, 20);
		assert.equal(fanTicks[1]?.isMajor, true);
	});

	it("gates Coronal and Sagittal implant projection by distance to avoid phantom spine/incisor ghosts", () => {
		const implant3D = calculateImplant3DWorldPose(mockPose, mockSliceCenter, mockNormal2D, 32.0, 4.0);

		// Case 1: Coronal slice right at implant Y coordinate (5.5 mm)
		const coronalExact = checkImplantSliceIntersection(implant3D, "coronal", 5.5, 2.5);
		assert.equal(coronalExact.isIntersecting, true);
		assert.ok(coronalExact.alpha >= 0.95);
		assert.ok(coronalExact.distanceMm < 0.1);

		// Case 2: Coronal slice 3.5 mm away from implant center (1.5 mm outside the 2.0 mm cylinder radius)
		const coronalNear = checkImplantSliceIntersection(implant3D, "coronal", 9.0, 2.5);
		assert.equal(coronalNear.isIntersecting, true);
		assert.ok(coronalNear.alpha > 0.3 && coronalNear.alpha < 1.0);

		// Case 3: Coronal slice far away (e.g. Y = 30.0 mm, cervical spine region)
		const coronalSpine = checkImplantSliceIntersection(implant3D, "coronal", 30.0, 2.5);
		assert.equal(coronalSpine.isIntersecting, false);
		assert.equal(coronalSpine.alpha, 0.0);
		assert.ok(coronalSpine.distanceMm > 20.0);

		// Case 4: Sagittal slice right at implant X coordinate (23.0 mm)
		const sagittalExact = checkImplantSliceIntersection(implant3D, "sagittal", 23.0, 2.5);
		assert.equal(sagittalExact.isIntersecting, true);
		assert.ok(sagittalExact.alpha >= 0.95);

		// Case 5: Sagittal slice at midline / front incisors (X = 0.0 mm)
		const sagittalIncisors = checkImplantSliceIntersection(implant3D, "sagittal", 0.0, 2.5);
		assert.equal(sagittalIncisors.isIntersecting, false);
		assert.equal(sagittalIncisors.alpha, 0.0);
		assert.ok(sagittalIncisors.distanceMm > 20.0);
	});

	it("samples real HU density from 3D voxel volume with trilinear interpolation", () => {
		// Build synthetic 40x40x40 CT volume
		const dim = 40;
		const data = new Int16Array(dim * dim * dim);

		// Fill with D2 bone profile (Coronal crest ~1100 HU, Core ~700 HU, Apex ~850 HU)
		for (let z = 0; z < dim; z++) {
			for (let y = 0; y < dim; y++) {
				for (let x = 0; x < dim; x++) {
					const idx = z * dim * dim + y * dim + x;
					if (z >= 36) {
						data[idx] = 1100; // Crest
					} else if (z >= 25) {
						data[idx] = 700; // Trabecular core
					} else {
						data[idx] = 850; // Apical
					}
				}
			}
		}

		const mockVolume = {
			id: "vol-synthetic-test",
			dimensions: { width: dim, height: dim, depth: dim },
			spacingMm: { x: 0.5, y: 0.5, z: 0.5 },
			physicalSizeMm: { x: 20, y: 20, z: 20 },
			originMm: { x: -10, y: -10, z: -10 },
			minHU: -1000,
			maxHU: 3000,
			data,
			dataRange: { min: -1000, max: 3000 },
			windowWidth: 4000,
			windowLevel: 1000,
			photometricInterpretation: "MONOCHROME2",
			isDisposed: false,
		};

		const implant3D = calculateImplant3DWorldPose(mockPose, { x: 0, y: 0, z: 0 }, { x: 1, y: 0 }, 32.0, 4.0);
		const huResult = sampleCrossSectionHUProfile(mockVolume, mockPose, implant3D);

		assert.ok(huResult.coronalCrestalHU >= 900);
		assert.ok(huResult.trabecularCoreHU >= 500 && huResult.trabecularCoreHU <= 900);
		assert.ok(huResult.apicalBaseHU >= 700);
		assert.ok(huResult.overallMeanHU > 600);
	});
});
