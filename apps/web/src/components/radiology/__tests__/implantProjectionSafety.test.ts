import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateApexCoordinates,
	calculateAxialImplantIntersection,
	calculateImplant3DWorldPose,
	auditMandibularNerveSafety,
	calculateApexToNerve3DDistance,
	auditMandibularNerveSafety3D,
	getMischClinicalGuidance,
	performCbctPlanningAudit,
	checkImplantSliceIntersection,
	computeLiveImplantTelemetry,
	classifyBone,
	getMischProfile,
	DEFAULT_SAFETY_THRESHOLDS,
	MISCH_BONE_PROFILES,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
	findImplantSpec,
	sampleCrossSectionHUProfile,
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
	type Vec3,
	type VolumeSamplingData,
} from "../implantSafetyEngine";
import {
	drawMandibularNerveCanal2D,
	drawVirtualImplantOverlay2D,
	drawMischBoneQualityHUD,
	drawNerveSafetyAlertBanner,
	OVERLAY_COLORS,
} from "../cbctOverlayRenderers";
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
		assert.equal(dangerAudit.shouldTriggerAudioAlarm, false);
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
		assert.match(audit.form043DiaryText, /Дистанция до канала: 1\.5 мм/);
		assert.equal(audit.form043DiaryText.includes("ТРЕБУЕТСЯ УМЕНЬШЕНИЕ ДЛИНЫ"), false);
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

	describe("computeLiveImplantTelemetry Misch Bone Density & Safety Sentinel (Mandate 8e)", () => {
		function createUniformVolume(huValue: number, dim = 30): VolumeSamplingData {
			return {
				dims: [dim, dim, dim],
				origin: [-15, -15, -15],
				invSx: 1.0,
				invSy: 1.0,
				invSz: 1.0,
				zMin: -15,
				zMax: 14,
				vSpacing: 1.0,
				getVoxel: (i: number, j: number, k: number) => {
					if (i < 0 || j < 0 || k < 0 || i >= dim || j >= dim || k >= dim) return -1024;
					return huValue;
				},
			};
		}

		it("correctly samples HU and classifies all Misch bone classes D1..D5 with torque & protocol", () => {
			const implant = {
				id: "implant-misch-test",
				entry: [0, 0, 8] as Vec3,
				apex: [0, 0, -2] as Vec3,
				radius: 2.0,
			};

			// Test D1 (> 1250 HU)
			const volD1 = createUniformVolume(1400);
			const telemD1 = computeLiveImplantTelemetry(implant, volD1, [], []);
			assert.equal(telemD1.boneClass, "D1");
			assert.equal(telemD1.boneDensity.isMeasured, true);
			assert.equal(telemD1.meanHU, 1400);
			assert.equal(telemD1.recommendedTorqueNcm, "45–60 Н·см");
			assert.ok(telemD1.drillingProtocol.includes("метчиком"));
			assert.ok(telemD1.tissueDescription.length > 0);

			// Test D2 (850..1250 HU)
			const volD2 = createUniformVolume(1000);
			const telemD2 = computeLiveImplantTelemetry(implant, volD2, [], []);
			assert.equal(telemD2.boneClass, "D2");
			assert.equal(telemD2.meanHU, 1000);
			assert.equal(telemD2.recommendedTorqueNcm, "35–45 Н·см");

			// Test D3 (350..850 HU)
			const volD3 = createUniformVolume(550);
			const telemD3 = computeLiveImplantTelemetry(implant, volD3, [], []);
			assert.equal(telemD3.boneClass, "D3");
			assert.equal(telemD3.meanHU, 550);
			assert.equal(telemD3.recommendedTorqueNcm, "25–35 Н·см");
			assert.ok(telemD3.drillingProtocol.includes("under-drilling") || telemD3.drillingProtocol.includes("недопрепарирования"));

			// Test D4 (150..350 HU)
			const volD4 = createUniformVolume(220);
			const telemD4 = computeLiveImplantTelemetry(implant, volD4, [], []);
			assert.equal(telemD4.boneClass, "D4");
			assert.equal(telemD4.meanHU, 220);
			assert.equal(telemD4.recommendedTorqueNcm, "15–25 Н·см");
			assert.ok(telemD4.drillingProtocol.includes("биконденсацией"));

			// Test D5 (< 150 HU)
			const volD5 = createUniformVolume(80);
			const telemD5 = computeLiveImplantTelemetry(implant, volD5, [], []);
			assert.equal(telemD5.boneClass, "D5");
			assert.equal(telemD5.meanHU, 80);
			assert.ok(telemD5.recommendedTorqueNcm.includes("< 15 Н·см"));
		});

		it("evaluates 3D IAN nerve clearance with Green (>=2.0mm), Amber (1.0..1.99mm), and Red (<1.0mm) statuses", () => {
			// Vertical implant: Entry [0, 0, 5], Apex [0, 0, -5], radius = 2.0 mm (cylinder outer radius = 2.0 mm)
			const implant = {
				id: "implant-ian-test",
				entry: [0, 0, 5] as Vec3,
				apex: [0, 0, -5] as Vec3,
				radius: 2.0,
			};

			// Case 1: Green / Safe (clearance = 7.4 - 2.0 - 1.4 = 4.0 mm >= 2.0 mm)
			const greenNerve = [
				{
					id: "ian-safe",
					type: "nerve" as const,
					radius: 1.4,
					points: [
						[7.4, 0, 10] as Vec3,
						[7.4, 0, -10] as Vec3,
					],
				},
			];
			const telemGreen = computeLiveImplantTelemetry(implant, null, greenNerve, []);
			assert.equal(telemGreen.nerveClearanceMm, 4.0);
			assert.equal(telemGreen.isNerveSafe, true);
			assert.equal(telemGreen.worstSafetyStatus, "safe");

			// Case 2: Amber / Warning (clearance = 4.9 - 2.0 - 1.4 = 1.5 mm, within 1.0..1.99 mm corridor)
			const amberNerve = [
				{
					id: "ian-warning",
					type: "nerve" as const,
					radius: 1.4,
					points: [
						[4.9, 0, 10] as Vec3,
						[4.9, 0, -10] as Vec3,
					],
				},
			];
			const telemAmber = computeLiveImplantTelemetry(implant, null, amberNerve, []);
			assert.equal(telemAmber.nerveClearanceMm, 1.5);
			assert.equal(telemAmber.isNerveSafe, false);
			assert.equal(telemAmber.worstSafetyStatus, "warning");
			assert.ok(telemAmber.warnings.some((w) => w.includes("Опасное сближение с нижнечелюстным каналом")));

			// Case 3: Red / Critical Danger (clearance = 3.8 - 2.0 - 1.4 = 0.4 mm < 1.0 mm)
			const redNerve = [
				{
					id: "ian-danger",
					type: "nerve" as const,
					radius: 1.4,
					points: [
						[3.8, 0, 10] as Vec3,
						[3.8, 0, -10] as Vec3,
					],
				},
			];
			const telemRed = computeLiveImplantTelemetry(implant, null, redNerve, []);
			assert.equal(telemRed.nerveClearanceMm, 0.4);
			assert.equal(telemRed.isNerveSafe, false);
			assert.equal(telemRed.worstSafetyStatus, "danger");
		});

		it("evaluates maxillary sinus and neighbouring implant clearances", () => {
			const implant = {
				id: "implant-main",
				entry: [0, 0, 10] as Vec3,
				apex: [0, 0, 0] as Vec3,
				radius: 2.0,
			};

			const sinusMarker = [
				{
					id: "sinus-floor",
					type: "sinus" as const,
					radius: 0.0,
					points: [
						[-10, 0, -4.5] as Vec3,
						[10, 0, -4.5] as Vec3,
					],
				},
			];

			const neighborImplant = {
				id: "implant-adjacent",
				entry: [7.0, 0, 10] as Vec3,
				apex: [7.0, 0, 0] as Vec3,
				radius: 2.0,
			};

			const telem = computeLiveImplantTelemetry(implant, null, sinusMarker, [neighborImplant]);
			// Sinus clearance: distance from apex [0, 0, 0] to Z = -4.5 is 4.5 mm - 2.0 mm = 2.5 mm >= 1.0 mm (safe)
			assert.equal(telem.sinusClearanceMm, 2.5);
			assert.equal(telem.isSinusSafe, true);

			// Neighbor clearance: center distance 7.0 - 2.0 - 2.0 = 3.0 mm >= 3.0 mm (safe)
			assert.equal(telem.neighborClearanceMm, 3.0);
			assert.equal(telem.isNeighborSafe, true);
		});

		it("respects Mandate 8e: returns telemetry for HUD without throwing or blocking", () => {
			// Direct collision with nerve
			const collisionNerve = [
				{
					id: "ian-collision",
					type: "nerve" as const,
					radius: 1.5,
					points: [
						[0, 0, 5] as Vec3,
						[0, 0, -5] as Vec3,
					],
				},
			];

			const implant = {
				id: "implant-collision-test",
				entry: [0, 0, 5] as Vec3,
				apex: [0, 0, -5] as Vec3,
				radius: 2.0,
			};

			// Must NOT throw! Must cleanly return danger status and negative clearance for HUD
			assert.doesNotThrow(() => {
				const telem = computeLiveImplantTelemetry(implant, null, collisionNerve, []);
				assert.equal(telem.worstSafetyStatus, "danger");
				assert.ok(telem.nerveClearanceMm !== null && telem.nerveClearanceMm < 0);
				assert.equal(telem.isNerveSafe, false);
				assert.ok(telem.warnings.length > 0);
			});
		});
	});

	describe("6. 3D Mandibular Nerve Distance & Clearance Calculus", () => {
		// Linear nerve segment along X axis: from (0, 10, -10) to (20, 10, -10), radius = 1.4 mm
		const linearNerve = [
			{ x: 0, y: 10, z: -10 },
			{ x: 20, y: 10, z: -10 },
		];

		it("calculates exact 3D distance and flags GREEN SAFE (clearance >= 2.0 mm)", () => {
			// Apex at (10, 10, -5.0) -> center distance is 5.0 mm -> net clearance = 5.0 - 1.4 = 3.6 mm
			const res = calculateApexToNerve3DDistance({ x: 10, y: 10, z: -5.0 }, linearNerve, 1.4, 2.0);
			assert.equal(res.distanceToCanalCenterMm, 5.0);
			assert.equal(res.netClearanceToCanalWallMm, 3.6);
			assert.equal(res.safetyStatus, "safe");
			assert.equal(res.isDangerous, false);
			assert.equal(res.isWarning, false);
			assert.equal(res.shouldTriggerAudioAlarm, false);
		});

		it("flags warning buffer when clearance is in 1.5..2.0 mm range", () => {
			// Center distance = 3.2 mm -> net clearance = 3.2 - 1.4 = 1.8 mm (1.5 <= 1.8 < 2.0)
			const res = calculateApexToNerve3DDistance({ x: 10, y: 10, z: -6.8 }, linearNerve, 1.4, 2.0);
			assert.equal(res.distanceToCanalCenterMm, 3.2);
			assert.equal(res.netClearanceToCanalWallMm, 1.8);
			assert.equal(res.safetyStatus, "warning");
			assert.equal(res.isWarning, true);
			assert.equal(res.isDangerous, false);
			assert.equal(res.shouldTriggerAudioAlarm, false);
			assert.match(res.clinicalMessageRu, /Дистанция до канала: 1\.8 мм/);
		});

		it("flags danger when clearance is critical (< 1.5 mm) with zero audio alarm", () => {
			// Center distance = 2.5 mm -> net clearance = 2.5 - 1.4 = 1.1 mm (< 1.5 mm)
			const res = calculateApexToNerve3DDistance({ x: 10, y: 10, z: -7.5 }, linearNerve, 1.4, 2.0);
			assert.equal(res.distanceToCanalCenterMm, 2.5);
			assert.equal(res.netClearanceToCanalWallMm, 1.1);
			assert.equal(res.safetyStatus, "danger");
			assert.equal(res.isDangerous, true);
			assert.equal(res.shouldTriggerAudioAlarm, false);
			assert.match(res.clinicalMessageRu, /Дистанция до канала: 1\.1 мм/);
		});

		it("detects direct canal collision / penetration when clearance < 0 mm", () => {
			// Center distance = 0.5 mm -> net clearance = 0.5 - 1.4 = -0.9 mm
			const res = calculateApexToNerve3DDistance({ x: 10, y: 10, z: -9.5 }, linearNerve, 1.4, 2.0);
			assert.equal(res.distanceToCanalCenterMm, 0.5);
			assert.equal(res.netClearanceToCanalWallMm, -0.9);
			assert.equal(res.safetyStatus, "danger");
			assert.equal(res.isDangerous, true);
		});

		it("handles clamped scalar projection when apex is beyond spline segment endpoints", () => {
			// Apex at (30, 10, -10): beyond endpoint (20, 10, -10) by 10 mm
			const res = calculateApexToNerve3DDistance({ x: 30, y: 10, z: -10 }, linearNerve, 1.4, 2.0);
			assert.equal(res.distanceToCanalCenterMm, 10.0);
			assert.equal(res.netClearanceToCanalWallMm, 8.6);
			assert.equal(res.safetyStatus, "safe");
		});

		it("returns honest unmeasured status without throwing on empty or single-point nerve spline", () => {
			const resEmpty = calculateApexToNerve3DDistance({ x: 10, y: 10, z: 0 }, [], 1.4, 2.0);
			assert.equal(resEmpty.safetyStatus, "unmeasured");
			assert.equal(resEmpty.isDangerous, false);

			const resSingle = calculateApexToNerve3DDistance({ x: 10, y: 10, z: 0 }, [{ x: 0, y: 0, z: 0 }], 1.4, 2.0);
			assert.equal(resSingle.safetyStatus, "unmeasured");
		});

		it("auditMandibularNerveSafety3D inspects both apex and body cylinder against nerve", () => {
			// Case A: Implant safely placed with apex at (10, 10, -4.0) and entry at (10, 10, 6.0)
			// Distance to canal center = 6.0 mm. Apex clearance = 4.6 mm. Body clearance = 6.0 - 1.4 - 2.0 = 2.6 mm (>= 2.0 mm SAFE)
			const resSafe = auditMandibularNerveSafety3D(
				{
					entry3D: { x: 10, y: 10, z: 6.0 },
					apex3D: { x: 10, y: 10, z: -4.0 },
					lengthMm: 10.0,
					diameterMm: 4.0,
				},
				linearNerve,
				1.4,
				2.0,
			);
			assert.equal(resSafe.apexClearanceMm, 4.6);
			assert.equal(resSafe.bodyClearanceMm, 2.6);
			assert.equal(resSafe.worstClearanceMm, 2.6);
			assert.equal(resSafe.safetyStatus, "safe");
			assert.equal(resSafe.isDangerous, false);

			// Case B: Apex alone at (10, 10, -5.0) has 3.6 mm clearance, but the 2.0 mm cylinder radius
			// leaves only 1.6 mm body clearance to the canal wall (triggers Misch WARNING buffer < 2.0 mm)
			const resWarning = auditMandibularNerveSafety3D(
				{
					entry3D: { x: 10, y: 10, z: 5.0 },
					apex3D: { x: 10, y: 10, z: -5.0 },
					lengthMm: 10.0,
					diameterMm: 4.0,
				},
				linearNerve,
				1.4,
				2.0,
			);
			assert.equal(resWarning.apexClearanceMm, 3.6);
			assert.equal(resWarning.bodyClearanceMm, 1.6);
			assert.equal(resWarning.worstClearanceMm, 1.6);
			assert.equal(resWarning.safetyStatus, "warning");
			assert.equal(resWarning.isWarning, true);
		});

		it("auditMandibularNerveSafety3D flags danger if tilted implant body approaches nerve", () => {
			// Implant tilted such that body encroaches on nerve
			const res = auditMandibularNerveSafety3D(
				{
					entry3D: { x: 10, y: 10, z: 5.0 },
					apex3D: { x: 10, y: 10, z: -7.6 }, // apex clearance = 2.4 - 1.4 = 1.0 mm (< 1.5)
					lengthMm: 12.6,
					diameterMm: 4.0,
				},
				linearNerve,
				1.4,
				2.0,
			);
			assert.equal(res.isDangerous, true);
			assert.equal(res.safetyStatus, "danger");
			assert.equal(res.shouldTriggerAudioAlarm, false);
		});
	});

	describe("7. Misch Bone Density Clinical Guidance & Torque Protocol", () => {
		it("provides Misch D1 protocol: 35–45 N·cm, under-drilling forbidden, copious 4°C irrigation", () => {
			const d1 = getMischClinicalGuidance("D1");
			assert.equal(d1.boneClass, "D1");
			assert.equal(d1.recommendedTorqueNcm, "35–45 Н·см");
			assert.equal(d1.torqueMinNcm, 35);
			assert.equal(d1.torqueMaxNcm, 45);
			assert.equal(d1.isUnderdrillingAllowed, false);
			assert.match(d1.drillingProtocolRu, /Протокол недопрепарирования исключен/);
			assert.match(d1.riskWarningRu, /Риск перегрева кости/);
		});

		it("provides Misch D2 protocol: 35–45 N·cm, under-drilling forbidden", () => {
			const d2 = getMischClinicalGuidance(1000); // 1000 HU -> D2
			assert.equal(d2.boneClass, "D2");
			assert.equal(d2.recommendedTorqueNcm, "35–45 Н·см");
			assert.equal(d2.isUnderdrillingAllowed, false);
		});

		it("provides Misch D3 protocol: 25–35 N·cm, mild compression, under-drilling allowed", () => {
			const d3 = getMischClinicalGuidance(500); // 500 HU -> D3
			assert.equal(d3.boneClass, "D3");
			assert.equal(d3.recommendedTorqueNcm, "25–35 Н·см");
			assert.equal(d3.isUnderdrillingAllowed, true);
		});

		it("provides Misch D4 protocol: 25–35 N·cm, bone condensation via osteotomes, under-drilling allowed", () => {
			const d4 = getMischClinicalGuidance("D4");
			assert.equal(d4.boneClass, "D4");
			assert.equal(d4.recommendedTorqueNcm, "25–35 Н·см");
			assert.equal(d4.torqueMinNcm, 25);
			assert.equal(d4.torqueMaxNcm, 35);
			assert.equal(d4.isCondensationRequired, true);
			assert.equal(d4.isUnderdrillingAllowed, true);
			assert.match(d4.drillingProtocolRu, /конденсации кости/);
			assert.match(d4.riskWarningRu, /риск недостаточной первичной стабильности/);
		});

		it("provides Misch D5 protocol: < 15 N·cm, GBR required before implantation", () => {
			const d5 = getMischClinicalGuidance(50); // < 150 HU -> D5
			assert.equal(d5.boneClass, "D5");
			assert.equal(d5.recommendedTorqueNcm, "< 15 Н·см");
			assert.equal(d5.isCondensationRequired, true);
			assert.match(d5.drillingProtocolRu, /остеопластики/);
		});

		it("provides honest unmeasured profile when input is null, undefined, or unmeasured", () => {
			const unmeas = getMischClinicalGuidance(null);
			assert.equal(unmeas.boneClass, "unmeasured");
			assert.equal(unmeas.recommendedTorqueNcm, "—");
			assert.equal(unmeas.isUnderdrillingAllowed, false);
			assert.match(unmeas.boneTypeRu, /Не определено/);
		});
	});

	describe("8. CBCT 2D Canvas Overlay Renderers Suite", () => {
		const createMockCanvasContext = (): CanvasRenderingContext2D =>
			({
				save: () => {},
				restore: () => {},
				beginPath: () => {},
				closePath: () => {},
				moveTo: () => {},
				lineTo: () => {},
				stroke: () => {},
				fill: () => {},
				arc: () => {},
				rect: () => {},
				roundRect: () => {},
				fillText: () => {},
				measureText: (text: string) => ({ width: text.length * 7 }),
				setLineDash: () => {},
			}) as unknown as CanvasRenderingContext2D;

		it("drawMandibularNerveCanal2D executes without throwing in all safety states", () => {
			const ctx = createMockCanvasContext();
			const curve = [{ x: 50, y: 100 }, { x: 150, y: 120 }, { x: 250, y: 110 }];

			assert.doesNotThrow(() => drawMandibularNerveCanal2D(ctx, { curvePoints: curve, clearanceMm: 3.5, implantApexPx: { x: 150, y: 80 } }));
			assert.doesNotThrow(() => drawMandibularNerveCanal2D(ctx, { curvePoints: curve, clearanceMm: 1.8, implantApexPx: { x: 150, y: 105 } }));
			assert.doesNotThrow(() => drawMandibularNerveCanal2D(ctx, { curvePoints: curve, clearanceMm: 0.9, implantApexPx: { x: 150, y: 115 } }));
			assert.doesNotThrow(() => drawMandibularNerveCanal2D(ctx, { curvePoints: curve, clearanceMm: null }));
		});

		it("drawVirtualImplantOverlay2D executes without throwing across safe, danger, and selected states", () => {
			const ctx = createMockCanvasContext();
			assert.doesNotThrow(() =>
				drawVirtualImplantOverlay2D(ctx, {
					entryPx: { x: 150, y: 40 },
					apexPx: { x: 150, y: 100 },
					diameterPx: 16,
					targetToothFdi: 46,
					label: "Ø4.0×10.0",
					clearanceMm: 3.2,
					isSelected: false,
					showSafetyHalo: true,
					showCentralAxis: true,
				}),
			);
			assert.doesNotThrow(() =>
				drawVirtualImplantOverlay2D(ctx, {
					entryPx: { x: 150, y: 40 },
					apexPx: { x: 150, y: 100 },
					diameterPx: 16,
					targetToothFdi: 46,
					label: "Ø4.0×10.0",
					clearanceMm: 1.2,
					isSelected: true,
				}),
			);
		});

		it("drawMischBoneQualityHUD renders both compact and expanded HUD cards", () => {
			const ctx = createMockCanvasContext();
			assert.doesNotThrow(() => drawMischBoneQualityHUD(ctx, { posPx: { x: 20, y: 20 }, boneClass: "D1", meanHU: 1350, compact: false }));
			assert.doesNotThrow(() => drawMischBoneQualityHUD(ctx, { posPx: { x: 20, y: 20 }, boneClass: "D4", meanHU: 250, compact: true }));
			assert.doesNotThrow(() => drawMischBoneQualityHUD(ctx, { posPx: { x: 20, y: 20 }, boneClass: null }));
		});

		it("drawNerveSafetyAlertBanner renders all 4 safety states with exact banner texts", () => {
			const ctx = createMockCanvasContext();
			assert.doesNotThrow(() => drawNerveSafetyAlertBanner(ctx, { posPx: { x: 200, y: 10 }, clearanceMm: null }));
			assert.doesNotThrow(() => drawNerveSafetyAlertBanner(ctx, { posPx: { x: 200, y: 10 }, clearanceMm: 1.2, targetToothFdi: 46 }));
			assert.doesNotThrow(() => drawNerveSafetyAlertBanner(ctx, { posPx: { x: 200, y: 10 }, clearanceMm: 1.8, targetToothFdi: 46 }));
			assert.doesNotThrow(() => drawNerveSafetyAlertBanner(ctx, { posPx: { x: 200, y: 10 }, clearanceMm: 3.5, targetToothFdi: 46 }));
		});
	});
});

