/**
 * DicomProcessorService.test.ts — модульное тестирование сервиса обработки DICOM.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DicomProcessorService,
	createDicomPixelSampler,
	isDicomArchivePath,
	isDicomHeaderCandidatePath,
	isDicomLikeEntry,
	modalityToKind,
	normalizeDicomDate,
	normalizeDicomUid,
	normalizeModality,
	parseDicomHeader,
	parseDicomUnsignedInt,
} from "./DicomProcessorService.js";

describe("DicomProcessorService — Unit & Domain Logic", () => {
	it("normalizes DICOM modality correctly across Russian and standard codes", () => {
		assert.equal(normalizeModality("CBCT"), "CBCT");
		assert.equal(normalizeModality("клкт"), "CBCT");
		assert.equal(normalizeModality("ККТ"), "CBCT");
		assert.equal(normalizeModality("CT"), "CT");
		assert.equal(normalizeModality("кт"), "CT");
		assert.equal(normalizeModality("DX"), "DX");
		assert.equal(normalizeModality("CR"), "CR");
		assert.equal(normalizeModality("PX"), "PX");
		assert.equal(normalizeModality("ОПТГ"), "PX");
		assert.equal(normalizeModality("ортопантомограмма"), "PX");
		assert.equal(normalizeModality("CEPH"), "CEPH");
		assert.equal(normalizeModality("ТРГ"), "CEPH");
		assert.equal(normalizeModality("IO"), "IO");
		assert.equal(normalizeModality("RVG"), "IO");
		assert.equal(normalizeModality(null), null);
		assert.equal(normalizeModality(undefined), null);
	});

	it("modalityToKind maps modality and text to correct study kinds", () => {
		assert.equal(modalityToKind("CBCT", null), "cbct");
		assert.equal(modalityToKind("PX", null), "opg");
		assert.equal(modalityToKind("CEPH", null), "ceph");
		assert.equal(modalityToKind("IO", null), "periapical");
		assert.equal(modalityToKind("DX", null), "periapical");

		// Free text detection takes priority if explicit kind is mentioned
		assert.equal(modalityToKind(null, "Панорамный снимок челюсти"), "opg");
		assert.equal(modalityToKind(null, "Конусно-лучевая КТ"), "cbct");
		assert.equal(modalityToKind(null, "Прицельный снимок зуба 36"), "periapical");
	});

	it("normalizeDicomUid validates and normalizes DICOM UIDs", () => {
		assert.equal(
			normalizeDicomUid("1.2.840.10008.5.1.4.1.1.1"),
			"1.2.840.10008.5.1.4.1.1.1",
		);
		assert.equal(
			normalizeDicomUid("  1.2.3.4.5.6.789  "),
			"1.2.3.4.5.6.789",
		);
		assert.equal(normalizeDicomUid("invalid-uid-string"), null);
		assert.equal(normalizeDicomUid(null), null);
		assert.equal(normalizeDicomUid(undefined), null);
	});

	it("normalizeDicomDate converts compact YYYYMMDD to ISO YYYY-MM-DD", () => {
		assert.equal(normalizeDicomDate("20260816"), "2026-08-16");
		assert.equal(normalizeDicomDate("2026-08-16"), "2026-08-16");
		assert.equal(normalizeDicomDate(null), null);
	});

	it("detects DICOM file paths and archives accurately", () => {
		assert.equal(isDicomArchivePath("study.zip"), true);
		assert.equal(isDicomArchivePath("C:\\data\\export.zip::1.dcm"), true);
		assert.equal(isDicomArchivePath("photo.jpg"), false);

		assert.equal(isDicomLikeEntry("series/001.dcm"), true);
		assert.equal(isDicomLikeEntry("series/image.ima"), true);
		assert.equal(isDicomLikeEntry("DICOMDIR"), true);
		assert.equal(isDicomLikeEntry("info.txt"), false);

		assert.equal(isDicomHeaderCandidatePath("C:\\scans\\test.dcm"), true);
		assert.equal(isDicomHeaderCandidatePath("C:\\scans\\bundle.zip"), true);
	});

	it("parseDicomHeader handles empty or short buffers safely", () => {
		const shortBuf = Buffer.alloc(8);
		const meta = parseDicomHeader(shortBuf);
		assert.ok(meta.warnings.length > 0);
		assert.equal(meta.tagsRead, 0);
		assert.equal(meta.patientName, null);
	});

	it("parseDicomUnsignedInt parses text and binary 16-bit integers", () => {
		assert.equal(parseDicomUnsignedInt(Buffer.from("512")), 512);
		const binBuf = Buffer.alloc(2);
		binBuf.writeUInt16LE(1024, 0);
		assert.equal(parseDicomUnsignedInt(binBuf), 1024);
	});

	it("parseManifest returns empty structure with note on blank raw text", async () => {
		const result = await DicomProcessorService.parseManifest("test-org", {
			sourceName: "test.csv",
			sourceKind: "folder_watch",
			rawText: "   \n\r\n   ",
		});
		assert.equal(result.totalRows, 0);
		assert.deepEqual(result.rows, []);
		assert.deepEqual(result.parserNotes, ["Нет строк для разбора."]);
	});

	it("parses PatientID, StudyDate, Modality, and SliceThickness tags accurately", () => {
		// Build synthetic DICOM buffer with standard preamble
		const buf = Buffer.alloc(512);
		buf.write("DICM", 128, "latin1");

		let offset = 132;

		// 1. PatientName (0010, 0010) PN
		buf.writeUInt16LE(0x0010, offset);
		buf.writeUInt16LE(0x0010, offset + 2);
		buf.write("PN", offset + 4, "latin1");
		buf.writeUInt16LE(12, offset + 6);
		buf.write("Ivanov^Ivan ", offset + 8, "latin1");
		offset += 20;

		// 2. PatientID (0010, 0020) LO
		buf.writeUInt16LE(0x0010, offset);
		buf.writeUInt16LE(0x0020, offset + 2);
		buf.write("LO", offset + 4, "latin1");
		buf.writeUInt16LE(10, offset + 6);
		buf.write("PAT-987654", offset + 8, "latin1");
		offset += 18;

		// 3. Modality (0008, 0060) CS
		buf.writeUInt16LE(0x0008, offset);
		buf.writeUInt16LE(0x0060, offset + 2);
		buf.write("CS", offset + 4, "latin1");
		buf.writeUInt16LE(4, offset + 6);
		buf.write("CT  ", offset + 8, "latin1");
		offset += 12;

		// 4. StudyDate (0008, 0020) DA
		buf.writeUInt16LE(0x0008, offset);
		buf.writeUInt16LE(0x0020, offset + 2);
		buf.write("DA", offset + 4, "latin1");
		buf.writeUInt16LE(8, offset + 6);
		buf.write("20260925", offset + 8, "latin1");
		offset += 16;

		// 5. SliceThickness (0018, 0050) DS
		buf.writeUInt16LE(0x0018, offset);
		buf.writeUInt16LE(0x0050, offset + 2);
		buf.write("DS", offset + 4, "latin1");
		buf.writeUInt16LE(6, offset + 6);
		buf.write("0.500 ", offset + 8, "latin1");
		offset += 14;

		const metadata = parseDicomHeader(buf);
		assert.equal(metadata.patientName, "Ivanov Ivan");
		assert.equal(metadata.patientId, "PAT-987654");
		assert.equal(metadata.modality, "CT");
		assert.equal(metadata.studyDate, "2026-09-25");
		assert.equal(metadata.sliceThickness, 0.5);
		assert.equal(metadata.tagsRead, 5);
	});

	it("parseDicomBufferSafe returns 400 Bad Request for non-DICOM or empty files", () => {
		const emptyRes = DicomProcessorService.parseBufferSafe(Buffer.alloc(0));
		assert.equal(emptyRes.success, false);
		assert.equal(emptyRes.errorCode, 400);

		const txtRes = DicomProcessorService.parseBufferSafe(Buffer.from("This is a plain text file, definitely not DICOM"));
		assert.equal(txtRes.success, false);
		assert.equal(txtRes.errorCode, 400);
		assert.ok(txtRes.error?.includes("400 Bad Request"));
	});

	it("parseDicomBufferSafe returns 422 Unprocessable for damaged/truncated DICOM without crashing Node.js", () => {
		// Truncated DICOM: has preamble but corrupt tag structure
		const corruptBuf = Buffer.alloc(140);
		corruptBuf.write("DICM", 128, "latin1");
		// Write invalid tag with huge length that exceeds buffer
		corruptBuf.writeUInt16LE(0x0010, 132);
		corruptBuf.writeUInt16LE(0x0020, 134);
		corruptBuf.write("LO", 136, "latin1");
		corruptBuf.writeUInt16LE(9999, 138); // 9999 bytes length on a 140-byte buffer

		const corruptRes = DicomProcessorService.parseBufferSafe(corruptBuf);
		assert.equal(corruptRes.success, false);
		assert.equal(corruptRes.errorCode, 422);
		assert.ok(corruptRes.error?.includes("422 Unprocessable Entity"));
	});

	it("createDicomPixelSampler safely returns 0 for truncated pixel buffers without throwing RangeError", () => {
		const smallBuf = Buffer.alloc(10);
		// 16-bit sampler with 10-byte buffer: reading beyond index 4 requires >= 12 bytes
		const sampler16 = createDicomPixelSampler(smallBuf, 0, 2, 16, 0, 1, 0);
		// Safe within bounds
		assert.equal(sampler16(0), 0);
		assert.equal(sampler16(4), 0);
		// Out of bounds: index 5 needs offset 10..12, buffer is only 10 bytes -> must return 0 instead of throwing
		assert.doesNotThrow(() => {
			const val = sampler16(5);
			assert.equal(val, 0);
		});
		assert.doesNotThrow(() => {
			const val = sampler16(100);
			assert.equal(val, 0);
		});
	});
});
