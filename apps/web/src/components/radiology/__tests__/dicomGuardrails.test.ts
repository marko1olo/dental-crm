/**
 * dicomGuardrails.test.ts — Industrial Verification of DICOM Ingestion Guardrails
 *
 * Verifies:
 * 1. Scout / Localizer / Surview rejection based on DICOM Tag (0008, 0008) ImageType.
 * 2. Automatic exclusion of dimension outliers (e.g. 256x256 preview mixed into 600x600 CT volume).
 * 3. Caudal -> Cranial physical Z sorting and deduplication of slices at duplicate physical Z (<0.01 mm).
 * 4. Robust median step delta calculation for slice spacing (Z-spacing resilience against dropped slices).
 *
 * Governed by Mandate 8b (file length <= 800 lines) and Mandate 8e (Doctor Autonomy).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isLocalizerOrScoutSlice,
	parseDicomSliceHeader,
	computeSliceNormalDistance,
	type ParsedDicomSliceHeader,
} from "../dicomSliceHeaderParser";
import { buildVolumeFromDicomBuffers } from "../realDicomVolumeLoader";

/**
 * Constructs a synthetic Part 10 Explicit VR Little Endian DICOM slice buffer.
 */
function createSyntheticDicomSlice(options: {
	rows?: number;
	cols?: number;
	z?: number;
	imageType?: string;
	instanceNumber?: number;
	pixelSpacing?: [number, number];
	sliceThickness?: number;
	rescaleSlope?: number;
	rescaleIntercept?: number;
}): ArrayBuffer {
	const rows = options.rows ?? 16;
	const cols = options.cols ?? 16;
	const z = options.z ?? 0.0;
	const imageType = options.imageType ?? "ORIGINAL\\PRIMARY\\AXIAL";
	const instanceNumber = options.instanceNumber ?? 1;
	const pixelSpacing = options.pixelSpacing ?? [0.25, 0.25];
	const sliceThickness = options.sliceThickness ?? 0.25;
	const rescaleSlope = options.rescaleSlope ?? 1.0;
	const rescaleIntercept = options.rescaleIntercept ?? 0.0;

	const pixelBytes = rows * cols * 2;
	const buffer = new ArrayBuffer(4096 + pixelBytes);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// DICM preamble marker at offset 128
	bytes[128] = 0x44; // 'D'
	bytes[129] = 0x49; // 'I'
	bytes[130] = 0x43; // 'C'
	bytes[131] = 0x4d; // 'M'

	let offset = 132;

	function writeStringTag(group: number, element: number, vr: string, value: string) {
		view.setUint16(offset, group, true);
		view.setUint16(offset + 2, element, true);
		bytes[offset + 4] = vr.charCodeAt(0);
		bytes[offset + 5] = vr.charCodeAt(1);
		let str = value;
		if (str.length % 2 !== 0) str += " "; // Even padding per DICOM PS 3.5
		view.setUint16(offset + 6, str.length, true);
		for (let i = 0; i < str.length; i++) {
			bytes[offset + 8 + i] = str.charCodeAt(i);
		}
		offset += 8 + str.length;
	}

	function writeUint16Tag(group: number, element: number, vr: string, val: number) {
		view.setUint16(offset, group, true);
		view.setUint16(offset + 2, element, true);
		bytes[offset + 4] = vr.charCodeAt(0);
		bytes[offset + 5] = vr.charCodeAt(1);
		view.setUint16(offset + 6, 2, true);
		view.setUint16(offset + 8, val, true);
		offset += 10;
	}

	// (0008, 0008) ImageType (CS)
	writeStringTag(0x0008, 0x0008, "CS", imageType);

	// (0018, 0050) SliceThickness (DS)
	writeStringTag(0x0018, 0x0050, "DS", sliceThickness.toString());

	// (0020, 0013) InstanceNumber (IS)
	writeStringTag(0x0020, 0x0013, "IS", instanceNumber.toString());

	// (0020, 0032) ImagePositionPatient (DS)
	writeStringTag(0x0020, 0x0032, "DS", `0\\0\\${z}`);

	// (0020, 0037) ImageOrientationPatient (DS)
	writeStringTag(0x0020, 0x0037, "DS", "1\\0\\0\\0\\1\\0");

	// (0028, 0010) Rows (US)
	writeUint16Tag(0x0028, 0x0010, "US", rows);

	// (0028, 0011) Cols (US)
	writeUint16Tag(0x0028, 0x0011, "US", cols);

	// (0028, 0030) PixelSpacing (DS)
	writeStringTag(0x0028, 0x0030, "DS", `${pixelSpacing[0]}\\${pixelSpacing[1]}`);

	// (0028, 0100) BitsAllocated (US)
	writeUint16Tag(0x0028, 0x0100, "US", 16);

	// (0028, 0101) BitsStored (US)
	writeUint16Tag(0x0028, 0x0101, "US", 16);

	// (0028, 0103) PixelRepresentation (US)
	writeUint16Tag(0x0028, 0x0103, "US", 0);

	// (0028, 1052) RescaleIntercept (DS)
	writeStringTag(0x0028, 0x1052, "DS", rescaleIntercept.toString());

	// (0028, 1053) RescaleSlope (DS)
	writeStringTag(0x0028, 0x1053, "DS", rescaleSlope.toString());

	// (7FE0, 0010) PixelData (OW)
	view.setUint16(offset, 0x7fe0, true);
	view.setUint16(offset + 2, 0x0010, true);
	bytes[offset + 4] = 79; // 'O'
	bytes[offset + 5] = 87; // 'W'
	view.setUint16(offset + 6, 0, true);
	view.setUint32(offset + 8, pixelBytes, true);
	offset += 12;

	// Fill pixel data with HU = 150
	const int16 = new Int16Array(buffer, offset, rows * cols);
	int16.fill(150);
	offset += pixelBytes;

	return buffer.slice(0, offset);
}

describe("DICOM Ingestion Guardrails Suite", () => {
	describe("1. isLocalizerOrScoutSlice Tag Verification", () => {
		it("accurately classifies 2D scouts, localizers, surviews and topograms", () => {
			const dummyHeader = (imageType?: string): ParsedDicomSliceHeader => ({
				rows: 512,
				cols: 512,
				bitsAllocated: 16,
				bitsStored: 16,
				pixelRepresentation: 0,
				pixelSpacing: { x: 0.25, y: 0.25 },
				sliceThickness: 0.25,
				sliceLocationZ: 0,
				instanceNumber: 1,
				rescaleSlope: 1,
				rescaleIntercept: 0,
				windowCenter: 400,
				windowWidth: 2000,
				pixelDataByteOffset: 100,
				pixelDataByteLength: 512 * 512 * 2,
				imageType,
			});

			// Positive matches
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader("ORIGINAL\\PRIMARY\\LOCALIZER")), true);
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader("ORIGINAL\\PRIMARY\\SCOUT")), true);
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader("SURVIEW")), true);
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader("ORIGINAL\\PRIMARY\\TOPOGRAM")), true);
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader("SCANOGRAM")), true);
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader("derived\\scout_view")), true);

			// Negative matches (legitimate CT slices)
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader("ORIGINAL\\PRIMARY\\AXIAL")), false);
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader("DERIVED\\SECONDARY\\MPR")), false);
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader("")), false);
			assert.strictEqual(isLocalizerOrScoutSlice(dummyHeader(undefined)), false);
		});
	});

	describe("2. Scout / Localizer Filtering in buildVolumeFromDicomBuffers", () => {
		it("filters out 2D scout slice mixed into tomographic series", async () => {
			const slices = [
				{ buffer: createSyntheticDicomSlice({ z: 0.0, imageType: "ORIGINAL\\PRIMARY\\AXIAL" }), fileName: "slice0.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 1.0, imageType: "ORIGINAL\\PRIMARY\\AXIAL" }), fileName: "slice1.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 2.0, imageType: "ORIGINAL\\PRIMARY\\AXIAL" }), fileName: "slice2.dcm" },
				// Scout slice at z = -50.0
				{ buffer: createSyntheticDicomSlice({ z: -50.0, imageType: "ORIGINAL\\PRIMARY\\LOCALIZER" }), fileName: "scout.dcm" },
			];

			const volume = await buildVolumeFromDicomBuffers(slices);

			// The scout slice must be eradicated, leaving exactly 3 axial slices
			assert.strictEqual(volume.dimensions.depth, 3);
			assert.strictEqual(volume.spacingMm.z, 1.0);
		});
	});

	describe("3. Matrix Dimension Outlier Filtering", () => {
		it("discards auxiliary slices with non-matching matrix dimensions", async () => {
			const slices = [
				{ buffer: createSyntheticDicomSlice({ rows: 32, cols: 32, z: 0.0 }), fileName: "slice0.dcm" },
				{ buffer: createSyntheticDicomSlice({ rows: 32, cols: 32, z: 1.0 }), fileName: "slice1.dcm" },
				{ buffer: createSyntheticDicomSlice({ rows: 32, cols: 32, z: 2.0 }), fileName: "slice2.dcm" },
				{ buffer: createSyntheticDicomSlice({ rows: 32, cols: 32, z: 3.0 }), fileName: "slice3.dcm" },
				// Outlier preview slice (16x16 instead of dominant 32x32)
				{ buffer: createSyntheticDicomSlice({ rows: 16, cols: 16, z: 1.5 }), fileName: "preview.dcm" },
			];

			const volume = await buildVolumeFromDicomBuffers(slices);

			assert.strictEqual(volume.dimensions.width, 32);
			assert.strictEqual(volume.dimensions.height, 32);
			assert.strictEqual(volume.dimensions.depth, 4);
		});
	});

	describe("4. Caudal-Cranial Sorting & Duplicate Z Deduplication", () => {
		it("sorts slices monotonically by physical Z regardless of file input order", async () => {
			const slices = [
				{ buffer: createSyntheticDicomSlice({ z: 3.0 }), fileName: "file_d.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 0.0 }), fileName: "file_a.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 2.0 }), fileName: "file_c.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 1.0 }), fileName: "file_b.dcm" },
			];

			const volume = await buildVolumeFromDicomBuffers(slices);

			assert.strictEqual(volume.dimensions.depth, 4);
			assert.strictEqual(volume.spacingMm.z, 1.0);
		});

		it("deduplicates redundant slices at identical physical Z (< 0.01 mm)", async () => {
			const slices = [
				{ buffer: createSyntheticDicomSlice({ z: 0.0 }), fileName: "slice0.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 1.0 }), fileName: "slice1.dcm" },
				// Duplicate export of slice 1 at z = 1.0003 mm (< 0.01 mm delta)
				{ buffer: createSyntheticDicomSlice({ z: 1.0003 }), fileName: "slice1_dup.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 2.0 }), fileName: "slice2.dcm" },
			];

			const volume = await buildVolumeFromDicomBuffers(slices);

			assert.strictEqual(volume.dimensions.depth, 3);
			assert.strictEqual(volume.spacingMm.z, 1.0);
		});
	});

	describe("5. Robust Median Step Delta Calculation for SpacingZ", () => {
		it("calculates true slice spacing using median step when intermediate slice is missing", async () => {
			// Slices at Z = 0.0, 0.5, 1.0, 2.0, 2.5
			// Notice slice at 1.5 is missing!
			// Naive division: (2.5 - 0.0) / (5 - 1) = 2.5 / 4 = 0.625 mm (25% error!)
			// Median step delta: deltas are [0.5, 0.5, 1.0, 0.5] -> sorted [0.5, 0.5, 0.5, 1.0] -> median = 0.5 mm
			const slices = [
				{ buffer: createSyntheticDicomSlice({ z: 0.0 }), fileName: "s0.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 0.5 }), fileName: "s1.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 1.0 }), fileName: "s2.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 2.0 }), fileName: "s3.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 2.5 }), fileName: "s4.dcm" },
			];

			const volume = await buildVolumeFromDicomBuffers(slices);

			assert.strictEqual(volume.dimensions.depth, 5);
			assert.strictEqual(volume.spacingMm.z, 0.5);
		});

		it("resists extreme outlier slice jumps when computing spacingZ", async () => {
			// Slices at Z = [0.0, 0.25, 0.50, 0.75, 10.0]
			// Delta array: [0.25, 0.25, 0.25, 9.25]
			// Median step: 0.25 mm!
			const slices = [
				{ buffer: createSyntheticDicomSlice({ z: 0.0 }), fileName: "s0.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 0.25 }), fileName: "s1.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 0.50 }), fileName: "s2.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 0.75 }), fileName: "s3.dcm" },
				{ buffer: createSyntheticDicomSlice({ z: 10.0 }), fileName: "s4_far.dcm" },
			];

			const volume = await buildVolumeFromDicomBuffers(slices);

			assert.strictEqual(volume.spacingMm.z, 0.25);
		});
	});

	describe("6. Physical Slice Normal Distance Projection", () => {
		it("calculates projection distance onto normal vector accurately for standard axial geometry", () => {
			const pos: [number, number, number] = [10.5, -20.2, 45.0];
			const orientAxial: [number, number, number, number, number, number] = [1, 0, 0, 0, 1, 0];
			// Normal vector: (1,0,0) x (0,1,0) = (0, 0, 1). Distance = 45.0
			const dist = computeSliceNormalDistance(pos, orientAxial, 0.0);
			assert.strictEqual(Math.round(dist * 100) / 100, 45.0);
		});

		it("falls back safely to fallbackZ when position or orientation vectors are absent", () => {
			assert.strictEqual(computeSliceNormalDistance(undefined, [1, 0, 0, 0, 1, 0], 12.34), 12.34);
			assert.strictEqual(computeSliceNormalDistance([0, 0, 10], undefined, 56.78), 56.78);
		});
	});

	describe("7. Single-Slice Fallback & Zero-Crash Resilience", () => {
		it("loads a single-slice series gracefully without throwing or producing NaN spacing", async () => {
			const singleSlice = [
				{ buffer: createSyntheticDicomSlice({ z: 15.0, sliceThickness: 0.35 }), fileName: "single.dcm" },
			];

			const volume = await buildVolumeFromDicomBuffers(singleSlice);

			assert.strictEqual(volume.dimensions.depth, 1);
			assert.strictEqual(volume.spacingMm.z, 0.35);
			assert.strictEqual(Number.isFinite(volume.originMm.z), true);
		});
	});
});
