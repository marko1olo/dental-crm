/**
 * DENTE CRM — Unit & Integration Test Suite for CBCT 3D MPR, Dental Curve & Implant Studio
 * Test File: apps/web/src/tests/cbctMprImplantStudio.test.ts
 *
 * Test Coverage:
 * 1. Multi-Planar Reconstruction (MPR 3-Plane Synchronizer & Crosshair Navigation):
 *    - 3-plane orthogonal reslicing (Axial, Coronal, Sagittal) in 60 FPS coordinate space.
 *    - Physical world coordinate (mm) <-> voxel coordinate round-trip determinism.
 *    - Hounsfield Window/Level (WW/WL) linear transfer functions (Bone, Soft Tissue, Enamel, Metal).
 *    - Slab MIP / MinIP / Average IP thickness projections (1-30 mm).
 *    - Explicit buffer disposal and memory leak prevention.
 *
 * 2. Panoramic Dental Arch Spline & Transverse Cross-Sections:
 *    - Interactive Catmull-Rom spline curve with FDI tooth anchors (18..48).
 *    - Tangent and Normal vector field derivation along the alveolar crest.
 *    - Unfolded Dental Panorama (OPG) focal trough reconstruction with adjustable thickness (5-20 mm).
 *    - Perpendicular pararadicular cross-sections carousel with 1.5 mm spacing.
 *
 * 3. Virtual Implant Planning, Bone Density (HU) & Mandibular Nerve Safety:
 *    - Virtual implant catalog specifications (Straumann, Nobel, Osstem, Dentium).
 *    - 3D & 2D Mandibular nerve safety margin check (2.0 mm warning corridor & <1.5 mm critical alert).
 *    - Misch bone quality classification (D1, D2, D3, D4, D5) from 3-zone HU profile.
 *    - Drilling protocol recommendation & underdrilling detection for soft bone.
 *
 * 4. 1-Click Form 043/u Surgical Diary Protocol Export:
 *    - Form 043/u clinical diary generator with exact bone dimensions, Misch class, and implant specs.
 *    - Complete end-to-end audit structure validation.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_HOUNSFIELD_PRESETS,
	type CbctVoxelVolume,
	type Point3D,
	calculateMprSliceIndex,
	clampCoordinateToVolume,
	createSyntheticDentalCbctVolume,
	disposeCbctVolume,
	extractMprSlice,
	huToGrayscale,
	mapCanvasPointerToWorldMm,
	resliceMprSynchronized,
	sampleVoxelHU,
	voxelToWorldMm,
	worldMmToVoxel,
} from "../components/radiology/cbctMprMath";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	type CrossSectionSliceData,
	type DentalArchCurve,
	buildDentalArchCurve,
	calculateArchLengthMm,
	calculateArchTangentsAndNormals,
	extractSingleCrossSectionSlice,
	findNearestAnchorToPoint,
	findNearestToothAnchorToDistance,
	fitSmoothDentalArchSpline,
	generateCrossSectionSlices,
	measureAlveolarRidgeCrossSection,
	reconstructPanoramicView,
} from "../components/radiology/dentalCurveEngine";
import {
	STANDARD_IMPLANT_CATALOG,
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
	auditAlveolarBoneContainment,
	auditMandibularNerveSafety,
	auditNerveSafetyMargin,
	calculateApexCoordinates,
	findImplantSpec,
	generateForm043CbctDiary,
	performCbctPlanningAudit,
	sampleCrossSectionHUProfile,
} from "../components/radiology/implantSafetyEngine";
import {
	MISCH_HU_THRESHOLDS,
	type HUZoneSampling,
	analyzeMischBoneQuality,
	classifyHUToMisch,
	classifyMischBoneQuality,
	computeHUZoneProfile,
	formatMischProtocolToDiaryText,
	generateMischDrillSequence,
} from "../components/radiology/boneDensityMischMath";

describe("CBCT 3D MPR, Dental Curve & Virtual Implant Studio Test Suite", () => {
	// =========================================================================
	// 1. MULTI-PLANAR RECONSTRUCTION (MPR 3-PLANE & CROSSHAIR SYNC)
	// =========================================================================
	describe("1. Multi-Planar Reconstruction (MPR 3-Plane Viewport & Coordinate Sync)", () => {
		const volume: CbctVoxelVolume = createSyntheticDentalCbctVolume(100, 100, 80, 0.4);

		it("correctly creates an isotropic 3D voxel volume with realistic dimensions and origin", () => {
			assert.strictEqual(volume.dimensions.width, 100);
			assert.strictEqual(volume.dimensions.height, 100);
			assert.strictEqual(volume.dimensions.depth, 80);
			assert.strictEqual(volume.spacingMm.x, 0.4);
			assert.strictEqual(volume.physicalSizeMm.x, 40.0);
			assert.strictEqual(volume.physicalSizeMm.y, 40.0);
			assert.strictEqual(volume.physicalSizeMm.z, 32.0);
			assert.strictEqual(volume.originMm.x, -20.0);
			assert.strictEqual(volume.originMm.y, -20.0);
			assert.strictEqual(volume.originMm.z, -16.0);
			assert.strictEqual(volume.isDisposed, false);
		});

		it("accurately converts world physical millimeters to voxel indices and back", () => {
			const centerPointMm: Point3D = { x: 0.0, y: 0.0, z: 0.0 };
			const centerVoxel = worldMmToVoxel(centerPointMm, volume);

			assert.strictEqual(centerVoxel.x, 50);
			assert.strictEqual(centerVoxel.y, 50);
			assert.strictEqual(centerVoxel.z, 40);

			const roundTripMm = voxelToWorldMm(centerVoxel, volume);
			assert.strictEqual(roundTripMm.x, 0.0);
			assert.strictEqual(roundTripMm.y, 0.0);
			assert.strictEqual(roundTripMm.z, 0.0);
		});

		it("clamps out-of-bounds millimeter coordinates strictly inside volume bounds", () => {
			const farPoint: Point3D = { x: 500.0, y: -400.0, z: 200.0 };
			const clamped = clampCoordinateToVolume(farPoint, volume);

			assert.ok(clamped.x <= volume.physicalSizeMm.x / 2.0);
			assert.ok(clamped.x >= -volume.physicalSizeMm.x / 2.0);
			assert.ok(clamped.y <= volume.physicalSizeMm.y / 2.0);
			assert.ok(clamped.y >= -volume.physicalSizeMm.y / 2.0);
			assert.ok(clamped.z <= volume.physicalSizeMm.z / 2.0);
			assert.ok(clamped.z >= -volume.physicalSizeMm.z / 2.0);
		});

		it("extracts orthogonal Axial, Coronal, and Sagittal slices with correct pixel dimensions", () => {
			const axialSlice = extractMprSlice(volume, "axial", 40, { windowWidth: 2000, windowLevel: 400 });
			assert.strictEqual(axialSlice.metadata.widthPx, 100);
			assert.strictEqual(axialSlice.metadata.heightPx, 100);
			assert.strictEqual(axialSlice.data.length, 100 * 100 * 4);

			const coronalSlice = extractMprSlice(volume, "coronal", 50, { windowWidth: 2000, windowLevel: 400 });
			assert.strictEqual(coronalSlice.metadata.widthPx, 100);
			assert.strictEqual(coronalSlice.metadata.heightPx, 80);
			assert.strictEqual(coronalSlice.data.length, 100 * 80 * 4);

			const sagittalSlice = extractMprSlice(volume, "sagittal", 50, { windowWidth: 2000, windowLevel: 400 });
			assert.strictEqual(sagittalSlice.metadata.widthPx, 100);
			assert.strictEqual(sagittalSlice.metadata.heightPx, 80);
			assert.strictEqual(sagittalSlice.data.length, 100 * 80 * 4);
		});

		it("reslices all 3 orthogonal planes synchronously at arbitrary 3D crosshair position", () => {
			const crosshair: Point3D = { x: 5.2, y: -3.4, z: 2.0 };
			const syncResult = resliceMprSynchronized(volume, crosshair, 2000, 400);

			assert.ok(syncResult.axial);
			assert.ok(syncResult.coronal);
			assert.ok(syncResult.sagittal);
			assert.strictEqual(syncResult.axial.metadata.plane, "axial");
			assert.strictEqual(syncResult.coronal.metadata.plane, "coronal");
			assert.strictEqual(syncResult.sagittal.metadata.plane, "sagittal");
		});

		it("maps Hounsfield Units (HU) to 8-bit grayscale correctly according to Window/Level formulas", () => {
			// WindowWidth = 2000, WindowLevel = 400 -> Range is [-600..1400]
			// HU = 400 (Center) -> Gray = 128
			const grayCenter = huToGrayscale(400, 2000, 400);
			assert.ok(Math.abs(grayCenter - 128) <= 1);

			// HU <= -600 (Air / Below Window) -> Gray = 0
			const grayLow = huToGrayscale(-800, 2000, 400);
			assert.strictEqual(grayLow, 0);

			// HU >= 1400 (Dense Cortical / Above Window) -> Gray = 255
			const grayHigh = huToGrayscale(1800, 2000, 400);
			assert.strictEqual(grayHigh, 255);

			// Invert mode
			const grayInverted = huToGrayscale(1800, 2000, 400, true);
			assert.strictEqual(grayInverted, 0);
		});

		it("performs Slab Maximum Intensity Projection (MIP) and Slab MinIP across thickness", () => {
			const singleSlice = extractMprSlice(volume, "axial", 40, {
				windowWidth: 2000,
				windowLevel: 400,
				slabMode: "single",
			});
			const mipSlice = extractMprSlice(volume, "axial", 40, {
				windowWidth: 2000,
				windowLevel: 400,
				slabMode: "mip",
				slabThicknessMm: 4.0,
			});
			const minipSlice = extractMprSlice(volume, "axial", 40, {
				windowWidth: 2000,
				windowLevel: 400,
				slabMode: "minip",
				slabThicknessMm: 4.0,
			});

			assert.strictEqual(singleSlice.data.length, mipSlice.data.length);
			assert.strictEqual(singleSlice.data.length, minipSlice.data.length);
		});

		it("maps 2D canvas mouse clicks and drags back to physical 3D world millimeters", () => {
			const currentCrosshair: Point3D = { x: 0, y: 0, z: 0 };
			// Click center of Axial Canvas (50%, 50%) -> maps to X=0 mm, Y=0 mm, Z stays 0 mm
			const updatedCrosshair = mapCanvasPointerToWorldMm(0.5, 0.5, "axial", currentCrosshair, volume);
			assert.ok(Math.abs(updatedCrosshair.x) <= 0.5);
			assert.ok(Math.abs(updatedCrosshair.y) <= 0.5);
			assert.strictEqual(updatedCrosshair.z, 0.0);
		});

		it("disposes voxel memory buffer cleanly and prevents subsequent access leaks", () => {
			const tempVolume = createSyntheticDentalCbctVolume(30, 30, 30, 0.5);
			assert.strictEqual(tempVolume.isDisposed, false);
			assert.ok(tempVolume.data !== null);

			disposeCbctVolume(tempVolume);
			assert.strictEqual(tempVolume.isDisposed, true);
			assert.strictEqual(tempVolume.data, null);

			// Safe fallback on disposed volume
			const hu = sampleVoxelHU(5, 5, 5, tempVolume);
			assert.strictEqual(hu, -1000);
		});
	});

	// =========================================================================
	// 2. PANORAMIC DENTAL ARCH SPLINE & TRANSVERSE CROSS-SECTIONS
	// =========================================================================
	describe("2. Panoramic Dental Arch Spline & Transverse Cross-Sections", () => {
		const volume: CbctVoxelVolume = createSyntheticDentalCbctVolume(120, 120, 80, 0.4);

		it("builds a smooth Catmull-Rom dental arch spline through FDI landmarks 18..48", () => {
			const arch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 12.0);

			assert.strictEqual(arch.jawType, "mandible");
			assert.strictEqual(arch.anchors.length, 16);
			assert.ok(arch.splinePointsMm.length >= 100);
			assert.ok(arch.totalArcLengthMm >= 80.0 && arch.totalArcLengthMm <= 140.0);
			assert.strictEqual(arch.focalTroughThicknessMm, 12.0);
		});

		it("derives orthogonal tangent and unit normal vector field along the arch", () => {
			const arch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const vectorField = calculateArchTangentsAndNormals(arch.splinePointsMm);

			assert.strictEqual(vectorField.length, arch.splinePointsMm.length);

			for (const node of vectorField) {
				// Tangent length must be ~1.0
				const tLen = Math.hypot(node.tangent.x, node.tangent.y);
				assert.ok(Math.abs(tLen - 1.0) < 0.01);

				// Normal length must be ~1.0
				const nLen = Math.hypot(node.normal.x, node.normal.y);
				assert.ok(Math.abs(nLen - 1.0) < 0.01);

				// Dot product of tangent and normal must be 0 (strictly perpendicular)
				const dot = node.tangent.x * node.normal.x + node.tangent.y * node.normal.y;
				assert.ok(Math.abs(dot) < 0.001);
			}
		});

		it("reconstructs an unfolded dental panorama (OPG) with tooth landmark anchors", () => {
			const arch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 10.0);
			const pano = reconstructPanoramicView(volume, arch, { heightPx: 200, windowWidth: 2000, windowLevel: 400 });

			assert.ok(pano.widthPx >= 100);
			assert.strictEqual(pano.heightPx, 200);
			assert.strictEqual(pano.pixelData.length, pano.widthPx * 200 * 4);
			assert.strictEqual(pano.toothMarkersOnPano.length, 16);
			assert.ok(pano.toothMarkersOnPano.some((m) => m.toothFdi === "46"));
			assert.ok(pano.toothMarkersOnPano.some((m) => m.toothFdi === "36"));
		});

		it("generates perpendicular transverse cross-sections carousel with 1.5 mm step spacing", () => {
			const arch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const slices = generateCrossSectionSlices(volume, arch, 1.5, -4.0, {
				widthMm: 24.0,
				heightMm: 30.0,
			});

			assert.ok(slices.length >= 30);
			const firstSlice = slices[0]!;
			assert.strictEqual(firstSlice.widthMm, 24.0);
			assert.strictEqual(firstSlice.heightMm, 30.0);
			assert.ok(firstSlice.pixelData.length > 0);
			assert.ok(firstSlice.nearestToothFdi.length > 0);
		});

		it("automatically measures alveolar ridge height and crest width from cross-section slices", () => {
			const arch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const slices = generateCrossSectionSlices(volume, arch, 2.0);
			const midSlice = slices[Math.floor(slices.length / 2)]!;

			const measurements = measureAlveolarRidgeCrossSection(midSlice);
			assert.ok(measurements.heightMm >= 5.0 && measurements.heightMm <= 25.0);
			assert.ok(measurements.crestWidthMm >= 3.0 && measurements.crestWidthMm <= 15.0);
			assert.ok(measurements.midWidthMm >= measurements.crestWidthMm * 0.9);
			assert.ok(measurements.baseWidthMm >= measurements.crestWidthMm);
		});
	});

	// =========================================================================
	// 3. VIRTUAL IMPLANT PLANNING, BONE DENSITY (HU) & MANDIBULAR NERVE SAFETY
	// =========================================================================
	describe("3. Virtual Implant Planning, Misch Bone Quality & Mandibular Nerve Safety", () => {
		const volume: CbctVoxelVolume = createSyntheticDentalCbctVolume(120, 120, 100, 0.4);

		it("finds correct implant specifications across standard brands (Straumann, Nobel, Osstem, Dentium)", () => {
			const osstem40 = findImplantSpec("osstem", 4.0, 10.0);
			assert.strictEqual(osstem40.brand, "osstem");
			assert.strictEqual(osstem40.diameterMm, 4.0);
			assert.strictEqual(osstem40.lengthMm, 10.0);
			assert.ok(osstem40.priceKopecks > 0);

			const straumann40 = findImplantSpec("straumann", 4.0, 10.0);
			assert.strictEqual(straumann40.brand, "straumann");
			assert.strictEqual(straumann40.diameterMm, 4.0);
			assert.strictEqual(straumann40.lengthMm, 10.0);
		});

		it("computes accurate implant apex coordinates with angulation", () => {
			const entry = { x: 0.0, y: 2.0 };
			// 0 degrees vertical tilt -> apex is directly downwards (y + length)
			const apexVertical = calculateApexCoordinates(entry, 0.0, 10.0);
			assert.strictEqual(apexVertical.x, 0.0);
			assert.strictEqual(apexVertical.y, 12.0);

			// 30 degrees tilt to right -> dx = 10 * sin(30) = 5.0, dy = 10 * cos(30) = 8.66
			const apexTilted = calculateApexCoordinates(entry, 30.0, 10.0);
			assert.ok(Math.abs(apexTilted.x - 5.0) <= 0.05);
			assert.ok(Math.abs(apexTilted.y - 10.66) <= 0.05);
		});

		it("triggers MANDATORY 2.0 mm warning when implant apex enters safety buffer of mandibular nerve", () => {
			const canal: MandibularCanalCrossSection = {
				center: { x: 0.0, y: 16.0 },
				radiusMm: 1.4, // Wall is at 14.6 mm
				safetyMarginMm: 2.0, // Safety zone reaches 12.6 mm
			};

			const implantPoseSafe: CrossSectionImplantPose = {
				implantSpec: findImplantSpec("osstem", 4.0, 10.0),
				entryPoint: { x: 0.0, y: 0.0 }, // Apex at 10.0 mm -> Distance to wall is 2.6 mm (>= 2.0 mm safety standard)
				angulationDeg: 0,
				targetToothFdi: 46,
			};

			const safeAudit = auditMandibularNerveSafety(implantPoseSafe, canal);
			assert.strictEqual(safeAudit.safetyStatus, "safe");
			assert.strictEqual(safeAudit.isDangerous, false);
			assert.strictEqual(safeAudit.isWarning, false);
			assert.ok(safeAudit.netClearanceToCanalWallMm >= 2.0);

			const implantPoseWarning: CrossSectionImplantPose = {
				implantSpec: findImplantSpec("osstem", 4.0, 10.0),
				entryPoint: { x: 0.0, y: 1.0 }, // Apex at 11.0 mm -> Clearance is 1.6 mm (< 2.0 mm warning corridor)
				angulationDeg: 0,
				targetToothFdi: 46,
			};

			const warningAudit = auditMandibularNerveSafety(implantPoseWarning, canal);
			assert.strictEqual(warningAudit.safetyStatus, "warning");
			assert.strictEqual(warningAudit.isWarning, true);
			assert.strictEqual(warningAudit.isDangerous, false);
			assert.ok(warningAudit.clinicalMessageRu.includes("ВНИМАНИЕ") || warningAudit.clinicalMessageRu.includes("приближения"));
		});

		it("triggers CRITICAL DANGER alarm when implant collides or breaches < 1.0 mm distance to mandibular canal", () => {
			const canal: MandibularCanalCrossSection = {
				center: { x: 0.0, y: 14.0 },
				radiusMm: 1.4,
				safetyMarginMm: 2.0,
			};

			const implantPoseCollision: CrossSectionImplantPose = {
				implantSpec: findImplantSpec("osstem", 4.5, 10.0),
				entryPoint: { x: 0.0, y: 1.0 },
				apexPoint: { x: 0.0, y: 14.0 }, // Apex collides into canal center
				angulationDeg: 0,
				targetToothFdi: 46,
			};

			const dangerAudit = auditMandibularNerveSafety(implantPoseCollision, canal);
			assert.strictEqual(dangerAudit.safetyStatus, "danger");
			assert.strictEqual(dangerAudit.isDangerous, true);
			assert.strictEqual(dangerAudit.shouldTriggerAudioAlarm, true);
			assert.ok(dangerAudit.clinicalMessageRu.includes("КРИТИЧЕСК") || dangerAudit.clinicalMessageRu.includes("ПЕРФОРАЦИЯ"));
		});

		it("classifies bone density into Carl Misch categories (D1, D2, D3, D4, D5) from HU sampling", () => {
			assert.strictEqual(classifyHUToMisch(1350), "D1");
			assert.strictEqual(classifyHUToMisch(950), "D2");
			assert.strictEqual(classifyHUToMisch(550), "D3");
			assert.strictEqual(classifyHUToMisch(250), "D4");
			assert.strictEqual(classifyHUToMisch(50), "D5");

			// 3-Zone HU profile: 25% coronal, 50% trabecular, 25% apical
			const profile = computeHUZoneProfile(1200, 800, 1000);
			assert.strictEqual(profile.coronalCrestalHU, 1200);
			assert.strictEqual(profile.trabecularCoreHU, 800);
			assert.strictEqual(profile.apicalBaseHU, 1000);
			assert.strictEqual(profile.overallMeanHU, 950); // Weighted: 300 + 400 + 250 = 950 -> D2

			const quality = classifyMischBoneQuality(profile);
			assert.strictEqual(quality.mischClass, "D2");
			assert.ok(quality.tactileFeelRu.includes("сосны") || quality.tactileFeelRu.includes("древесин"));
			assert.ok(quality.isImmediateLoadingEligible);
		});

		it("generates specialized surgical drilling protocols (underdrilling for D4, cortical tap for D1)", () => {
			const d4Profile: HUZoneSampling = { coronalCrestalHU: 300, trabecularCoreHU: 200, apicalBaseHU: 250, overallMeanHU: 237 };
			const d4Quality = analyzeMischBoneQuality(d4Profile, 4.0);
			assert.strictEqual(d4Quality.mischClass, "D4");
			assert.strictEqual(d4Quality.underdrillingRecommended, true);
			assert.strictEqual(d4Quality.corticalTapRequired, false);

			const d4Sequence = generateMischDrillSequence(d4Quality, 4.0);
			assert.ok(d4Sequence.some((s) => s.drillName.includes("Пилотное сверло")));
			// Final drill should be under-dimensioned (3.2 mm for 4.0 mm implant)
			const finalDrill = d4Sequence[d4Sequence.length - 1]!;
			assert.ok(finalDrill.diameterMm < 4.0);

			const d1Profile: HUZoneSampling = { coronalCrestalHU: 1500, trabecularCoreHU: 1300, apicalBaseHU: 1400, overallMeanHU: 1375 };
			const d1Quality = analyzeMischBoneQuality(d1Profile, 4.0);
			assert.strictEqual(d1Quality.mischClass, "D1");
			assert.strictEqual(d1Quality.corticalTapRequired, true);
		});
	});

	// =========================================================================
	// 4. 1-CLICK FORM 043/U SURGERY DIARY EXPORT
	// =========================================================================
	describe("4. 1-Click Form 043/u Surgical Diary Protocol Export", () => {
		it("generates complete statutory Form 043/u surgery protocol with all clinical parameters", () => {
			const canal: MandibularCanalCrossSection = {
				center: { x: 0.0, y: 16.0 },
				radiusMm: 1.4,
				safetyMarginMm: 2.0,
			};

			const implantPose: CrossSectionImplantPose = {
				implantSpec: findImplantSpec("dentium", 4.0, 10.0),
				entryPoint: { x: 0.0, y: 1.5 },
				apexPoint: { x: 0.0, y: 11.5 },
				angulationDeg: 2,
				targetToothFdi: 46,
			};

			const envelope = {
				crestPoint: { x: 0, y: 0 },
				basePoint: { x: 0, y: 22 },
				buccalCrestPoint: { x: -4.0, y: 0 },
				lingualCrestPoint: { x: 4.0, y: 0 },
				ridgeWidthMm: 8.0,
				ridgeHeightMm: 22.0,
			};

			const huSampling = computeHUZoneProfile(1100, 750, 900);

			const audit = performCbctPlanningAudit({
				toothFdi: 46,
				implantPose,
				canal,
				envelope,
				huSampling,
				patientName: "Иванов И.И.",
			});

			assert.strictEqual(audit.toothFdi, 46);
			assert.strictEqual(audit.isPlanApproved, true);
			assert.ok(audit.treatmentPlanItem.priceKopecks > 0);

			const diaryText = generateForm043CbctDiary(audit);
			assert.ok(diaryText.includes("ПРОТОКОЛ ОПЕРАЦИИ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (ФОРМА 043/У)"));
			assert.ok(diaryText.includes("Иванов И.И."));
			assert.ok(diaryText.includes("Зуб: FDI #46"));
			assert.ok(diaryText.includes("Dentium"));
			assert.ok(diaryText.includes("Ø 4.0 x 10.0 мм"));
			assert.ok(diaryText.includes("АНАТОМИЧЕСКАЯ БЕЗОПАСНОСТЬ"));
			assert.ok(diaryText.includes("D2") || diaryText.includes("Плотность"));
			assert.ok(diaryText.includes("ОДОБРЕНО"));
		});
	});
});
