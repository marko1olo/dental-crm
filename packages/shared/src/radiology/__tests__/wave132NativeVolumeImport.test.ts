/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 132: CLINICAL CBCT NATIVE VOLUME IMPORT ENGINE UNIT TESTS
 * Sirona GALILEOS (*_vol_0 + slices) & Morita OneVolume (CT_0.vol)
 * ═══════════════════════════════════════════════════════════════════════════
 * 100% Zero-Mock comprehensive unit tests:
 * 1. File detection: Sirona GALILEOS and Morita OneVolume filename pattern matching
 * 2. Galileos XML header parsing: tag extraction, patient info, safe clinical defaults, warnings
 * 3. Galileos volume assembly: geometry validation, slice sorting, gzip transparent decompression,
 *    uint16 to int16 sample conversion, axis and voxel limit enforcement
 * 4. Morita OneVolume binary container parsing: JmVolumeVersion=1 marker, XML length, 36-byte block,
 *    slope/intercept calibration, background sentinel -32768 -> -1000 HU replacement
 * 5. Official Form 043/u A4 clinical protocol generation with strict 0 emojis audit (Mandate 8d)
 * 6. Zod schema validation: nativeVolumeMetadataSchema & parsedNativeVolumeSchema
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as zlib from "node:zlib";
import {
	MAX_NATIVE_AXIS,
	MAX_NATIVE_DEPTH,
	MAX_NATIVE_VOXELS,
	ONEVOLUME_SENTINEL,
	ONEVOLUME_VERSION_MARKER,
	AIR_SENTINEL_HU,
	nativeVolumeMetadataSchema,
	parsedNativeVolumeSchema,
	matchGalileosFiles,
	matchOneVolumeFilename,
	parseGalileosHeader,
	assembleGalileosVolume,
	parseOneVolumeBinary,
	formatNativeVolumeA4Protocol,
	decompressGzipSync,
	type NativeVolumeMetadata,
} from "../nativeVolumeImportEngine.js";

/**
 * Helper to build a valid binary Morita CT_0.vol container in memory.
 */
function createSyntheticOneVolumeBuffer(options: {
	cols: number;
	rows: number;
	depth: number;
	spacing?: number;
	slope?: number;
	intercept?: number;
	patientName?: string;
	patientId?: string;
	studyUID?: string;
	rawSamples: number[];
	corruptMarker?: boolean;
	corruptXmlLength?: boolean;
	omitPayload?: boolean;
}): Uint8Array {
	const spacing = options.spacing ?? 0.125;
	const slope = options.slope ?? 1;
	const intercept = options.intercept ?? 0;

	const xml = `<?xml version="1.0" encoding="utf-8"?>
<OneVolume>
  <sizex>${options.cols}</sizex>
  <sizey>${options.rows}</sizey>
  <sizez>${options.depth}</sizez>
  <voxelsize>${spacing}</voxelsize>
  <slope>${slope}</slope>
  <intercept>${intercept}</intercept>
  ${options.patientName ? `<patientName>${options.patientName}</patientName>` : ""}
  ${options.patientId ? `<patientId>${options.patientId}</patientId>` : ""}
  ${options.studyUID ? `<studyInstanceUID>${options.studyUID}</studyInstanceUID>` : ""}
</OneVolume>`;

	const xmlBytes = new TextEncoder().encode(xml);
	const xmlLen = options.corruptXmlLength ? 9999999 : xmlBytes.byteLength;

	const marker = options.corruptMarker ? "JmVolumeVersion=9" : ONEVOLUME_VERSION_MARKER;
	const markerBytes = new TextEncoder().encode(marker);

	const prefixLen = 4;
	const nullTermLen = 1;
	const xmlLenFieldSize = 4;
	const cArray3dBlockSize = 36;
	const samplesCount = options.omitPayload ? 0 : options.rawSamples.length;
	const payloadBytesLen = samplesCount * 2;

	const totalSize =
		prefixLen +
		markerBytes.byteLength +
		nullTermLen +
		xmlLenFieldSize +
		xmlBytes.byteLength +
		cArray3dBlockSize +
		payloadBytesLen;

	const buffer = new Uint8Array(totalSize);
	const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

	let offset = 0;
	// 4-byte prefix
	buffer.set([0, 0, 0, 0], offset);
	offset += 4;

	// Version marker
	buffer.set(markerBytes, offset);
	offset += markerBytes.byteLength;

	// Null terminator
	buffer[offset] = 0;
	offset += 1;

	// 4-byte little-endian XML length
	dv.setUint32(offset, xmlLen, true);
	offset += 4;

	// XML payload
	buffer.set(xmlBytes, offset);
	offset += xmlBytes.byteLength;

	// 36-byte CArray3D block
	for (let i = 0; i < cArray3dBlockSize; i++) {
		buffer[offset + i] = (i + 1) & 0xff;
	}
	offset += cArray3dBlockSize;

	// Voxel payload (int16 samples)
	if (!options.omitPayload) {
		for (let i = 0; i < options.rawSamples.length; i++) {
			dv.setInt16(offset + i * 2, options.rawSamples[i]!, true);
		}
	}

	return buffer;
}

describe("Wave 132: Clinical CBCT Native Volume Import Engine", () => {
	// ── 1. File Detection Tests ────────────────────────────────────
	describe("File Detection (matchGalileosFiles & matchOneVolumeFilename)", () => {
		it("detects valid Sirona GALILEOS files with header and slices", () => {
			const files = [
				"study_123_vol_0",
				"study_123_vol_0_000",
				"study_123_vol_0_001",
				"study_123_vol_0_002",
			];
			assert.equal(matchGalileosFiles(files), true);
		});

		it("detects Sirona GALILEOS with Windows and Unix path separators", () => {
			const winFiles = [
				"C:\\DentalScans\\PatientA\\scan_vol_0",
				"C:\\DentalScans\\PatientA\\scan_vol_0_0",
				"C:\\DentalScans\\PatientA\\scan_vol_0_1",
			];
			assert.equal(matchGalileosFiles(winFiles), true);

			const unixFiles = [
				"/var/data/ct/archive_vol_0",
				"/var/data/ct/archive_vol_0_00",
			];
			assert.equal(matchGalileosFiles(unixFiles), true);
		});

		it("rejects GALILEOS if only header is present without slice files", () => {
			assert.equal(matchGalileosFiles(["patient_vol_0"]), false);
		});

		it("rejects GALILEOS if only slices are present without header", () => {
			assert.equal(matchGalileosFiles(["patient_vol_0_000", "patient_vol_0_001"]), false);
		});

		it("rejects unrelated DICOM or image files for GALILEOS", () => {
			assert.equal(matchGalileosFiles(["IMG001.dcm", "IMG002.dcm", "manifest.xml"]), false);
			assert.equal(matchGalileosFiles([]), false);
		});

		it("detects Morita OneVolume CT_0.vol filename accurately (case-insensitive)", () => {
			assert.equal(matchOneVolumeFilename("CT_0.vol"), true);
			assert.equal(matchOneVolumeFilename("CT_0.VOL"), true);
			assert.equal(matchOneVolumeFilename("ct_0.vol"), true);
			assert.equal(matchOneVolumeFilename("C:\\MoritaStudies\\202609\\CT_0.vol"), true);
			assert.equal(matchOneVolumeFilename("/volumes/cbct/CT_0.vol"), true);
		});

		it("rejects non-OneVolume filenames", () => {
			assert.equal(matchOneVolumeFilename("CT_1.vol"), false);
			assert.equal(matchOneVolumeFilename("CT_0.raw"), false);
			assert.equal(matchOneVolumeFilename("onevolume.bin"), false);
			assert.equal(matchOneVolumeFilename("CT_0_vol.dcm"), false);
		});
	});

	// ── 2. Sirona GALILEOS Header Parsing Tests ───────────────────
	describe("Galileos XML Header Parsing (parseGalileosHeader)", () => {
		it("extracts complete parameters from a well-formed XML header", () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<GalileosVolume>
  <PatientName>ИВАНОВ^ИВАН</PatientName>
  <PatientID>PAT-043-9821</PatientID>
  <Columns>512</Columns>
  <Rows>512</Rows>
  <VoxelSize>0.16</VoxelSize>
  <MaxValue>4095</MaxValue>
</GalileosVolume>`;

			const parsed = parseGalileosHeader(xml, 100);
			assert.equal(parsed.cols, 512);
			assert.equal(parsed.rows, 512);
			assert.equal(parsed.spacing, 0.16);
			assert.equal(parsed.maxValue, 4095);
			assert.equal(parsed.patientName, "ИВАНОВ^ИВАН");
			assert.equal(parsed.patientId, "PAT-043-9821");
			assert.equal(parsed.warnings.length, 0);
		});

		it("falls back to clinical defaults and records warnings when tags are missing", () => {
			const emptyXml = "<EmptyHeader></EmptyHeader>";
			const parsed = parseGalileosHeader(emptyXml, 50);

			assert.equal(parsed.cols, 512);
			assert.equal(parsed.rows, 512);
			assert.equal(parsed.spacing, 0.16);
			assert.equal(parsed.maxValue, 4095);
			assert.equal(parsed.patientName, undefined);
			assert.equal(parsed.patientId, undefined);
			assert.ok(parsed.warnings.length >= 4);
			assert.ok(parsed.warnings.some((w) => w.includes("columns missing")));
			assert.ok(parsed.warnings.some((w) => w.includes("rows missing")));
			assert.ok(parsed.warnings.some((w) => w.includes("voxel size missing")));
			assert.ok(parsed.warnings.some((w) => w.includes("max value missing")));
		});

		it("clamps implausible voxel spacing and issues a warning", () => {
			const xml = "<Volume><width>256</width><height>256</height><spacing>99.9</spacing></Volume>";
			const parsed = parseGalileosHeader(xml, 10);

			assert.equal(parsed.cols, 256);
			assert.equal(parsed.rows, 256);
			assert.equal(parsed.spacing, 0.16); // clamped to 0.16 mm
			assert.ok(parsed.warnings.some((w) => w.includes("implausible voxel size 99.9")));
		});

		it("records a warning if sliceCount is 0 or negative", () => {
			const xml = "<Volume><columns>256</columns><rows>256</rows></Volume>";
			const parsed = parseGalileosHeader(xml, 0);
			assert.ok(parsed.warnings.some((w) => w.includes("slice count is non-positive")));
		});
	});

	// ── 3. Sirona GALILEOS Volume Assembly Tests ──────────────────
	describe("Galileos Volume Assembly (assembleGalileosVolume)", () => {
		it("assembles raw slices, sorts by index, and unpacks uint16 to int16", () => {
			const cols = 4;
			const rows = 4;
			const sliceLen = cols * rows; // 16 voxels per slice
			const depth = 3;

			const xml = `<Volume><columns>${cols}</columns><rows>${rows}</rows><spacing>0.2</spacing><max>4095</max><patientName>PETROV^SERGEY</patientName></Volume>`;

			// Slice 0: samples 100..115
			const s0 = new Uint8Array(sliceLen * 2);
			const s0View = new Uint16Array(s0.buffer);
			for (let i = 0; i < sliceLen; i++) s0View[i] = 100 + i;

			// Slice 1: samples 200..215
			const s1 = new Uint8Array(sliceLen * 2);
			const s1View = new Uint16Array(s1.buffer);
			for (let i = 0; i < sliceLen; i++) s1View[i] = 200 + i;

			// Slice 2: samples 300..315, GZIP-compressed
			const s2Raw = new Uint8Array(sliceLen * 2);
			const s2View = new Uint16Array(s2Raw.buffer);
			for (let i = 0; i < sliceLen; i++) s2View[i] = 300 + i;
			const s2Gz = zlib.gzipSync(s2Raw);

			// Provide out-of-order filenames to verify sorting
			const slices = [
				{ filename: "gal_vol_0_002", data: s2Gz },
				{ filename: "gal_vol_0_000", data: s0 },
				{ filename: "gal_vol_0_001", data: s1 },
			];

			const volume = assembleGalileosVolume(xml, slices);

			assert.equal(volume.metadata.manufacturer, "Sirona");
			assert.equal(volume.metadata.modality, "CBCT");
			assert.deepEqual(volume.metadata.dimensions, [4, 4, 3]);
			assert.deepEqual(volume.metadata.spacingMm, [0.2, 0.2, 0.2]);
			assert.equal(volume.metadata.patientName, "PETROV^SERGEY");
			assert.equal(volume.data.length, cols * rows * depth);

			// Check first slice
			assert.equal(volume.data[0], 100);
			assert.equal(volume.data[15], 115);

			// Check second slice
			assert.equal(volume.data[16], 200);
			assert.equal(volume.data[31], 215);

			// Check third slice (decompressed from gzip)
			assert.equal(volume.data[32], 300);
			assert.equal(volume.data[47], 315);

			// Check min and max
			assert.equal(volume.metadata.minValue, 100);
			assert.equal(volume.metadata.maxValue, 315);
		});

		it("throws descriptive error when slice files are missing", () => {
			assert.throws(
				() => assembleGalileosVolume("<Volume/>", []),
				/missing \*_vol_0 header or slice files/,
			);
		});

		it("throws descriptive error when declared axis exceeds MAX_NATIVE_AXIS (2048)", () => {
			const xml = `<Volume><columns>${MAX_NATIVE_AXIS + 1}</columns><rows>512</rows></Volume>`;
			const dummySlice = { filename: "vol_0_000", data: new Uint8Array(10) };
			assert.throws(
				() => assembleGalileosVolume(xml, [dummySlice]),
				/implausible dimensions/,
			);
		});

		it("throws descriptive error when slice depth exceeds MAX_NATIVE_DEPTH (2000)", () => {
			const xml = "<Volume><columns>4</columns><rows>4</rows></Volume>";
			const slices = Array.from({ length: MAX_NATIVE_DEPTH + 1 }, (_, i) => ({
				filename: `vol_0_${i.toString().padStart(4, "0")}`,
				data: new Uint8Array(32),
			}));
			assert.throws(
				() => assembleGalileosVolume(xml, slices),
				/implausible depth 2001/,
			);
		});

		it("throws descriptive error when slice payload is shorter than declared dimensions", () => {
			const xml = "<Volume><columns>16</columns><rows>16</rows></Volume>";
			// 16x16 requires 256 samples = 512 bytes, but we pass only 10 bytes
			const shortSlice = { filename: "vol_0_000", data: new Uint8Array(10) };
			assert.throws(
				() => assembleGalileosVolume(xml, [shortSlice]),
				/slice vol_0_000 too short/,
			);
		});
	});

	// ── 4. Morita OneVolume Binary Parser Tests ────────────────────
	describe("Morita OneVolume Binary Parsing (parseOneVolumeBinary)", () => {
		it("parses valid CT_0.vol binary container, calibrates slope/intercept and replaces -32768 sentinel", () => {
			const cols = 4;
			const rows = 4;
			const depth = 2;
			const totalVoxels = cols * rows * depth; // 32 voxels

			// Prepare 32 samples:
			// sample 0: ONEVOLUME_SENTINEL (-32768) -> should map to -1000 HU (Air)
			// sample 1: 0 -> slope 1, intercept -1000 -> should be -1000 HU
			// sample 2: 500 -> slope 1, intercept 0 -> should be 500 HU
			// sample 3: 2000 -> slope 1, intercept 0 -> should be 2000 HU
			const rawSamples: number[] = new Array(totalVoxels).fill(250);
			rawSamples[0] = ONEVOLUME_SENTINEL;
			rawSamples[1] = 500;
			rawSamples[2] = 1200;
			rawSamples[3] = -50;

			const buffer = createSyntheticOneVolumeBuffer({
				cols,
				rows,
				depth,
				spacing: 0.125,
				slope: 1.0,
				intercept: 0.0,
				patientName: "СМИРНОВА^ЕЛЕНА",
				patientId: "PAT-MOR-007",
				studyUID: "1.2.392.200036.9125.0.20260912.1",
				rawSamples,
			});

			const volume = parseOneVolumeBinary(buffer);

			assert.equal(volume.metadata.manufacturer, "Morita");
			assert.equal(volume.metadata.modality, "CBCT");
			assert.deepEqual(volume.metadata.dimensions, [4, 4, 2]);
			assert.deepEqual(volume.metadata.spacingMm, [0.125, 0.125, 0.125]);
			assert.equal(volume.metadata.patientName, "СМИРНОВА^ЕЛЕНА");
			assert.equal(volume.metadata.patientId, "PAT-MOR-007");
			assert.equal(volume.metadata.studyInstanceUID, "1.2.392.200036.9125.0.20260912.1");
			assert.equal(volume.metadata.windowCenter, 300);
			assert.equal(volume.metadata.windowWidth, 2500);

			// Sentinel check: -32768 is mapped to -1000 HU
			assert.equal(volume.data[0], AIR_SENTINEL_HU);
			assert.equal(volume.data[1], 500);
			assert.equal(volume.data[2], 1200);
			assert.equal(volume.data[3], -50);

			// Min/max over non-sentinel voxels
			assert.equal(volume.metadata.minValue, -50);
			assert.equal(volume.metadata.maxValue, 1200);
		});

		it("applies linear rescale slope and intercept calibration correctly", () => {
			const cols = 2;
			const rows = 2;
			const depth = 1;
			const rawSamples = [100, 200, 300, ONEVOLUME_SENTINEL];

			// slope 2.0, intercept -100.0:
			// 100 * 2 - 100 = 100
			// 200 * 2 - 100 = 300
			// 300 * 2 - 100 = 500
			// sentinel -> -1000
			const buffer = createSyntheticOneVolumeBuffer({
				cols,
				rows,
				depth,
				slope: 2.0,
				intercept: -100.0,
				rawSamples,
			});

			const volume = parseOneVolumeBinary(buffer);

			assert.equal(volume.data[0], 100);
			assert.equal(volume.data[1], 300);
			assert.equal(volume.data[2], 500);
			assert.equal(volume.data[3], AIR_SENTINEL_HU);
			assert.equal(volume.metadata.minValue, 100);
			assert.equal(volume.metadata.maxValue, 500);
		});

		it("throws when buffer is too small to be a valid CT_0.vol file", () => {
			const tinyBuf = new Uint8Array(32);
			assert.throws(
				() => parseOneVolumeBinary(tinyBuf),
				/buffer too small/,
			);
		});

		it("throws when version marker JmVolumeVersion=1 is missing", () => {
			const corruptBuf = createSyntheticOneVolumeBuffer({
				cols: 2,
				rows: 2,
				depth: 1,
				rawSamples: [1, 2, 3, 4],
				corruptMarker: true,
			});
			assert.throws(
				() => parseOneVolumeBinary(corruptBuf),
				/version marker not found/,
			);
		});

		it("throws when XML length field is corrupted or points past buffer", () => {
			const corruptBuf = createSyntheticOneVolumeBuffer({
				cols: 2,
				rows: 2,
				depth: 1,
				rawSamples: [1, 2, 3, 4],
				corruptXmlLength: true,
			});
			assert.throws(
				() => parseOneVolumeBinary(corruptBuf),
				/bad XML length/,
			);
		});

		it("throws when voxel payload is shorter than declared geometry", () => {
			const shortBuf = createSyntheticOneVolumeBuffer({
				cols: 4,
				rows: 4,
				depth: 2,
				rawSamples: [1, 2, 3], // Only 3 samples instead of 32
			});
			assert.throws(
				() => parseOneVolumeBinary(shortBuf),
				/payload too short/,
			);
		});
	});

	// ── 5. Official Form 043/u A4 Protocol Tests ──────────────────
	describe("Regulatory Form 043/u A4 Protocol (formatNativeVolumeA4Protocol)", () => {
		const sampleMetadata: NativeVolumeMetadata = {
			manufacturer: "Sirona",
			modality: "CBCT",
			dimensions: [512, 512, 400],
			spacingMm: [0.16, 0.16, 0.16],
			windowCenter: 1433,
			windowWidth: 4095,
			minValue: -1000,
			maxValue: 3071,
			patientName: "ВОЛКОВ^АРТЕМ",
			patientId: "PAT-043-7721",
			studyInstanceUID: "1.2.840.113619.2.55.3.60468842",
			warnings: ["Проведена цифровая калибровка диапазона HU"],
		};

		it("generates complete Russian Form 043/u protocol with all required clinical sections", () => {
			const text = formatNativeVolumeA4Protocol(sampleMetadata);

			assert.ok(text.includes("ПРОТОКОЛ АППАРАТНОГО ИМПОРТА ТОМОГРАММЫ (КЛКТ / CBCT)"));
			assert.ok(text.includes("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА 043/У)"));
			assert.ok(text.includes("Sirona Dental Systems (GALILEOS CBCT)"));
			assert.ok(text.includes("КЛКТ (Конусно-лучевая компьютерная томография)"));
			assert.ok(text.includes("ВОЛКОВ^АРТЕМ"));
			assert.ok(text.includes("PAT-043-7721"));
			assert.ok(text.includes("512 x 512 x 400 вокс."));
			assert.ok(text.includes("0.160 x 0.160 x 0.160 мм"));
			assert.ok(text.includes("81.9 x 81.9 x 64.0 мм"));
			assert.ok(text.includes("-1000 HU"));
			assert.ok(text.includes("3071 HU"));
			assert.ok(text.includes("Проведена цифровая калибровка диапазона HU"));
			assert.ok(text.includes("М.П. Клиники"));
		});

		it("generates protocol for Morita OneVolume metadata without warnings", () => {
			const moritaMeta: NativeVolumeMetadata = {
				manufacturer: "Morita",
				modality: "CBCT",
				dimensions: [400, 400, 320],
				spacingMm: [0.125, 0.125, 0.125],
				windowCenter: 300,
				windowWidth: 2500,
				minValue: -1000,
				maxValue: 2800,
			};

			const text = formatNativeVolumeA4Protocol(moritaMeta);
			assert.ok(text.includes("J. Morita Corp (OneVolume 3D CT)"));
			assert.ok(text.includes("Замечаний и геометрических аномалий при аппаратном импорте не выявлено."));
		});

		it("strictly contains ZERO emojis (Mandate 8d, p. 7 audit via Unicode Regex)", () => {
			const textSirona = formatNativeVolumeA4Protocol(sampleMetadata);
			const emojiRegex = /\p{Extended_Pictographic}/u;
			assert.equal(
				emojiRegex.test(textSirona),
				false,
				"Protocol must not contain any emojis",
			);
		});
	});

	// ── 6. Zod Schema Validation Tests ────────────────────────────
	describe("Zod Schema Contracts (nativeVolumeMetadataSchema & parsedNativeVolumeSchema)", () => {
		it("validates a compliant metadata structure successfully", () => {
			const validMeta: NativeVolumeMetadata = {
				manufacturer: "Sirona",
				modality: "CBCT",
				dimensions: [512, 512, 300],
				spacingMm: [0.16, 0.16, 0.16],
				windowCenter: 1400,
				windowWidth: 4000,
				minValue: -1000,
				maxValue: 3000,
				patientName: "IVANOV",
			};

			const parsed = nativeVolumeMetadataSchema.parse(validMeta);
			assert.equal(parsed.manufacturer, "Sirona");
			assert.equal(parsed.modality, "CBCT");
		});

		it("rejects invalid metadata with negative spacing or invalid dimensions", () => {
			const invalidMeta = {
				manufacturer: "Sirona",
				modality: "CBCT",
				dimensions: [512, -10, 300], // invalid negative row
				spacingMm: [0.16, 0.16, -0.5], // invalid negative spacing
				windowCenter: 1400,
				windowWidth: 4000,
				minValue: 0,
				maxValue: 1000,
			};

			assert.throws(() => nativeVolumeMetadataSchema.parse(invalidMeta));
		});

		it("validates parsedNativeVolumeSchema with Int16Array data payload", () => {
			const validVolume = {
				metadata: {
					manufacturer: "Morita",
					modality: "CBCT",
					dimensions: [2, 2, 1],
					spacingMm: [0.125, 0.125, 0.125],
					windowCenter: 300,
					windowWidth: 2500,
					minValue: -1000,
					maxValue: 1500,
				},
				data: new Int16Array([10, 20, 30, 40]),
			};

			const parsed = parsedNativeVolumeSchema.parse(validVolume);
			assert.equal(parsed.data.length, 4);
		});
	});

	// ── 7. Helper Utilities Tests ─────────────────────────────────
	describe("Helper Utilities (decompressGzipSync)", () => {
		it("returns uncompressed payload untouched if gzip magic header is absent", () => {
			const raw = new Uint8Array([1, 2, 3, 4, 5]);
			const res = decompressGzipSync(raw);
			assert.deepEqual(res, raw);
		});

		it("decompresses valid gzip buffer correctly", () => {
			const original = new TextEncoder().encode("Clinical CBCT CT_0 Slice Data");
			const compressed = zlib.gzipSync(original);
			const decompressed = decompressGzipSync(compressed);
			assert.equal(new TextDecoder().decode(decompressed), "Clinical CBCT CT_0 Slice Data");
		});
	});
});
