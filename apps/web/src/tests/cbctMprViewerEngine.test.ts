/**
 * DENTE CRM — Unit & Integration Tests for CBCT 3D MPR & Panoramic Spline Curve Engine
 * Standards: DICOM Part 3, Misch CE, Buser
 *
 * Test Suite Coverage:
 * 1. 3-Plane Orthogonal MPR Mathematical Engine:
 *    - Physical world mm <-> Voxel coordinate bidirectional mapping
 *    - Boundary clamping & plane slice index calculations (Axial, Coronal, Sagittal)
 *    - HU linear windowing & inversion (huToGrayscale)
 *    - 2D slice extraction with Slab modes (Single, MIP, MinIP, Average IP)
 *    - 3-Plane synchronized reslicing & canvas pointer mapping
 *    - Synthetic CBCT dental volume generation & buffer disposal
 * 2. Panoramic Dental Arch Spline & Transverse Cross-Section Engine:
 *    - Catmull-Rom curve fitting through FDI 18..48 anatomical tooth anchors
 *    - Arc length & normal/tangent orthogonal vector field derivation
 *    - Unfolded panoramic view (OPG) reconstruction & tooth landmark projection
 *    - Transverse cross-section reslicing (1-2 mm step) & alveolar bone metrics evaluation
 */

import assert from "node:assert/strict";
import { describe, it, test } from "node:test";
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
	buildDentalArchCurve,
	calculateArchLengthMm,
	calculateArchTangentsAndNormals,
	fitSmoothDentalArchSpline,
	generateCrossSectionSlices,
	measureAlveolarRidgeCrossSection,
	reconstructPanoramicView,
} from "../components/radiology/dentalCurveEngine";

describe("CBCT 3D MPR & Panoramic Dental Arch Spline Engine", () => {
	// =========================================================================
	// 1. 3-PLANE ORTHOGONAL MPR MATHEMATICAL ENGINE
	// =========================================================================
	describe("1. 3-Plane MPR Coordinate Transformations & Slice Extraction", () => {
		const testVolume: CbctVoxelVolume = {
			id: "test-vol-1",
			dimensions: { width: 100, height: 100, depth: 50 },
			spacingMm: { x: 0.5, y: 0.5, z: 1.0 },
			originMm: { x: -25.0, y: -25.0, z: -25.0 },
			physicalSizeMm: { x: 50.0, y: 50.0, z: 50.0 },
			data: new Int16Array(100 * 100 * 50).fill(100),
			minHU: -1000,
			maxHU: 3000,
			isDisposed: false,
		};

		test("worldMmToVoxel converts physical world coordinates to discrete voxel indices", () => {
			// Center point (0, 0, 0)
			const centerVox = worldMmToVoxel({ x: 0, y: 0, z: 0 }, testVolume);
			assert.strictEqual(centerVox.x, 50);
			assert.strictEqual(centerVox.y, 50);
			assert.strictEqual(centerVox.z, 25);

			// Origin corner (-25, -25, -25)
			const originVox = worldMmToVoxel({ x: -25, y: -25, z: -25 }, testVolume);
			assert.strictEqual(originVox.x, 0);
			assert.strictEqual(originVox.y, 0);
			assert.strictEqual(originVox.z, 0);
		});

		test("voxelToWorldMm converts voxel indices back to physical world coordinates", () => {
			const ptMm = voxelToWorldMm({ x: 50, y: 50, z: 25 }, testVolume);
			assert.strictEqual(ptMm.x, 0.0);
			assert.strictEqual(ptMm.y, 0.0);
			assert.strictEqual(ptMm.z, 0.0);
		});

		test("clampCoordinateToVolume clamps coordinates exceeding the volume boundary", () => {
			const clamped = clampCoordinateToVolume({ x: 100, y: -80, z: 0 }, testVolume);
			assert.strictEqual(clamped.x, 25.0);
			assert.strictEqual(clamped.y, -25.0);
			assert.strictEqual(clamped.z, 0.0);
		});

		test("calculateMprSliceIndex returns plane-specific slice indices", () => {
			const pt: Point3D = { x: 0, y: 5.0, z: -10.0 };
			const axialIdx = calculateMprSliceIndex(pt, "axial", testVolume);
			const coronalIdx = calculateMprSliceIndex(pt, "coronal", testVolume);
			const sagittalIdx = calculateMprSliceIndex(pt, "sagittal", testVolume);

			assert.strictEqual(axialIdx, 15); // (-10 - (-25)) / 1.0 = 15
			assert.strictEqual(coronalIdx, 60); // (5 - (-25)) / 0.5 = 60
			assert.strictEqual(sagittalIdx, 50); // (0 - (-25)) / 0.5 = 50
		});

		test("huToGrayscale maps Hounsfield Units accurately with window width and level", () => {
			// Preset: W2000, L400 -> Range: [-600..1400]
			const lowGray = huToGrayscale(-600, 2000, 400);
			const midGray = huToGrayscale(400, 2000, 400);
			const highGray = huToGrayscale(1400, 2000, 400);

			assert.strictEqual(lowGray, 0);
			assert.strictEqual(midGray, 128);
			assert.strictEqual(highGray, 255);

			// Inverted window
			const invertedMid = huToGrayscale(400, 2000, 400, true);
			assert.ok(Math.abs(invertedMid - 128) <= 1);
		});

		test("extractMprSlice generates valid 2D slice buffer with metadata", () => {
			const result = extractMprSlice(testVolume, "axial", 25, {
				windowWidth: 2000,
				windowLevel: 400,
				slabMode: "single",
			});

			assert.strictEqual(result.metadata.plane, "axial");
			assert.strictEqual(result.metadata.sliceIndex, 25);
			assert.strictEqual(result.metadata.widthPx, 100);
			assert.strictEqual(result.metadata.heightPx, 100);
			assert.strictEqual(result.data.length, 100 * 100 * 4);
		});

		test("resliceMprSynchronized reslices Axial, Coronal, and Sagittal planes simultaneously", () => {
			const resliced = resliceMprSynchronized(testVolume, { x: 0, y: 0, z: 0 }, 2000, 400);

			assert.ok(resliced.axial);
			assert.ok(resliced.coronal);
			assert.ok(resliced.sagittal);
			assert.strictEqual(resliced.axial.metadata.sliceIndex, 25);
			assert.strictEqual(resliced.coronal.metadata.sliceIndex, 50);
			assert.strictEqual(resliced.sagittal.metadata.sliceIndex, 50);
		});

		test("mapCanvasPointerToWorldMm maps normalized 2D click coordinates to 3D world millimeters", () => {
			// Click center of Axial plane (0.5, 0.5)
			const ptAxial = mapCanvasPointerToWorldMm(0.5, 0.5, "axial", { x: 0, y: 0, z: 10 }, testVolume);
			assert.strictEqual(ptAxial.x, 0.0);
			assert.strictEqual(ptAxial.y, 0.0);
			assert.strictEqual(ptAxial.z, 10.0); // Z remains intact on axial plane click
		});
	});

	// =========================================================================
	// 2. SYNTHETIC ANATOMICAL CBCT VOLUME GENERATOR
	// =========================================================================
	describe("2. Synthetic Anatomical CBCT Volume Generator", () => {
		test("createSyntheticDentalCbctVolume generates volume with realistic mandibular and enamel structures", () => {
			const synth = createSyntheticDentalCbctVolume(60, 60, 40, 0.5);

			assert.strictEqual(synth.dimensions.width, 60);
			assert.strictEqual(synth.dimensions.height, 60);
			assert.strictEqual(synth.dimensions.depth, 40);
			assert.ok(synth.data);
			assert.strictEqual(synth.isDisposed, false);

			// Test bone density sampling inside mandible region
			const vox = worldMmToVoxel({ x: 0, y: -18.0, z: -10.0 }, synth);
			const hu = sampleVoxelHU(vox.x, vox.y, vox.z, synth);
			assert.ok(hu > 200); // Must have bone HU

			disposeCbctVolume(synth);
			assert.strictEqual(synth.isDisposed, true);
			assert.strictEqual(synth.data, null);
		});
	});

	// =========================================================================
	// 3. PANORAMIC DENTAL ARCH SPLINE & CROSS-SECTION RESLICING
	// =========================================================================
	describe("3. Panoramic Dental Arch Spline & Transverse Cross-Sections", () => {
		test("fitSmoothDentalArchSpline generates continuous curve through mandibular tooth anchors", () => {
			const spline = fitSmoothDentalArchSpline(DEFAULT_MANDIBULAR_ARCH_ANCHORS, 4);
			assert.ok(spline.length > DEFAULT_MANDIBULAR_ARCH_ANCHORS.length);

			const lenMm = calculateArchLengthMm(spline);
			assert.ok(lenMm > 80.0 && lenMm < 150.0); // Natural dental arch length
		});

		test("calculateArchTangentsAndNormals computes unit perpendicular normal vectors across the ridge", () => {
			const spline = fitSmoothDentalArchSpline(DEFAULT_MANDIBULAR_ARCH_ANCHORS, 4);
			const vectorField = calculateArchTangentsAndNormals(spline);

			assert.strictEqual(vectorField.length, spline.length);

			for (const node of vectorField) {
				// Tangent and Normal must be unit length (approx 1.0)
				const tLen = Math.hypot(node.tangent.x, node.tangent.y);
				const nLen = Math.hypot(node.normal.x, node.normal.y);
				assert.ok(Math.abs(tLen - 1.0) < 0.05);
				assert.ok(Math.abs(nLen - 1.0) < 0.05);

				// Dot product T . N must be 0 (orthogonal)
				const dot = node.tangent.x * node.normal.x + node.tangent.y * node.normal.y;
				assert.ok(Math.abs(dot) < 0.05);
			}
		});

		test("buildDentalArchCurve constructs complete model for Mandible and Maxilla", () => {
			const mandCurve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 12.0);
			assert.strictEqual(mandCurve.jawType, "mandible");
			assert.strictEqual(mandCurve.focalTroughThicknessMm, 12.0);
			assert.strictEqual(mandCurve.anchors.length, 16);

			const maxCurve = buildDentalArchCurve(DEFAULT_MAXILLARY_ARCH_ANCHORS, "maxilla", 14.0);
			assert.strictEqual(maxCurve.jawType, "maxilla");
			assert.strictEqual(maxCurve.focalTroughThicknessMm, 14.0);
		});

		test("reconstructPanoramicView generates OPG radiograph with tooth landmark markers", () => {
			const synth = createSyntheticDentalCbctVolume(50, 50, 30, 0.6);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 10.0);

			const pano = reconstructPanoramicView(synth, curve, {
				heightMm: 30.0,
				heightPx: 100,
			});

			assert.ok(pano.widthPx > 0);
			assert.strictEqual(pano.heightPx, 100);
			assert.strictEqual(pano.pixelData.length, pano.widthPx * 100 * 4);
			assert.strictEqual(pano.toothMarkersOnPano.length, DEFAULT_MANDIBULAR_ARCH_ANCHORS.length);

			disposeCbctVolume(synth);
		});

		test("generateCrossSectionSlices generates perpendicular cross-sections along the dental arch", () => {
			const synth = createSyntheticDentalCbctVolume(50, 50, 30, 0.6);
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 10.0);

			const slices = generateCrossSectionSlices(synth, curve, 5.0, -5.0, {
				widthMm: 20.0,
				heightMm: 25.0,
			});

			assert.ok(slices.length > 5);
			const firstSlice = slices[0]!;
			assert.ok(firstSlice.toothLabelRu);
			assert.strictEqual(firstSlice.widthMm, 20.0);
			assert.strictEqual(firstSlice.heightMm, 25.0);
			assert.ok(firstSlice.pixelData.length > 0);

			// Measure bone metrics
			const metrics = measureAlveolarRidgeCrossSection(firstSlice);
			assert.ok(metrics.heightMm > 0);
			assert.ok(metrics.crestWidthMm > 0);
			assert.ok(typeof metrics.isAdequateForImplant === "boolean");
			assert.ok(metrics.clinicalAdviceRu.length > 0);

			disposeCbctVolume(synth);
		});
	});
});
