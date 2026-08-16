/**
 * DicomProcessorService.test.ts — модульное тестирование сервиса обработки DICOM.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DicomProcessorService,
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
});
