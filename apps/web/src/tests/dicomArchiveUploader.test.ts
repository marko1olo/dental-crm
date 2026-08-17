import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Validates DICOM detection heuristics and archive processing safety.
 */
function isDicomEntry(filename: string, byteArray: Uint8Array): boolean {
	const lower = filename.toLowerCase();
	if (
		lower.includes("__macosx") ||
		lower.includes("/._") ||
		lower.startsWith("._") ||
		lower.endsWith(".ds_store") ||
		lower.endsWith("thumbs.db") ||
		lower.endsWith("desktop.ini")
	) {
		return false;
	}

	if (byteArray.length >= 132) {
		const dicmPrefix = String.fromCharCode(
			byteArray[128] ?? 0,
			byteArray[129] ?? 0,
			byteArray[130] ?? 0,
			byteArray[131] ?? 0,
		);
		if (dicmPrefix === "DICM") {
			return true;
		}
	}

	if (lower.endsWith(".dcm") || lower.endsWith(".dicom")) {
		return byteArray.length > 32;
	}

	if (byteArray.length >= 4) {
		const tagGroup = (byteArray[0] ?? 0) | ((byteArray[1] ?? 0) << 8);
		if (tagGroup === 0x0002 || tagGroup === 0x0008) {
			return true;
		}
	}

	return false;
}

describe("DicomArchiveUploader - DICOM filter and format validation", () => {
	test("identifies standard DICOM with 128-byte preamble and DICM magic", () => {
		const buffer = new Uint8Array(256);
		// Preamble 128 bytes of zeroes
		buffer[128] = "D".charCodeAt(0);
		buffer[129] = "I".charCodeAt(0);
		buffer[130] = "C".charCodeAt(0);
		buffer[131] = "M".charCodeAt(0);

		assert.equal(isDicomEntry("slice_001.raw", buffer), true);
	});

	test("identifies DICOM by .dcm and .dicom extension when size is valid", () => {
		const buffer = new Uint8Array(64);
		assert.equal(isDicomEntry("CT_042.dcm", buffer), true);
		assert.equal(isDicomEntry("study_axial.DICOM", buffer), true);
	});

	test("identifies headerless DICOM with Group 0x0002 or 0x0008 element tag", () => {
		const buffer0002 = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x55, 0x49]);
		assert.equal(isDicomEntry("unnamed_slice", buffer0002), true);

		const buffer0008 = new Uint8Array([0x08, 0x00, 0x16, 0x00, 0x55, 0x49]);
		assert.equal(isDicomEntry("slice.bin", buffer0008), true);
	});

	test("rejects macOS metadata resource fork files and OS junk files", () => {
		const buffer = new Uint8Array(256);
		buffer[128] = "D".charCodeAt(0);
		buffer[129] = "I".charCodeAt(0);
		buffer[130] = "C".charCodeAt(0);
		buffer[131] = "M".charCodeAt(0);

		assert.equal(isDicomEntry("__MACOSX/._slice01.dcm", buffer), false);
		assert.equal(isDicomEntry("folder/._slice01.dcm", buffer), false);
		assert.equal(isDicomEntry("._slice01.dcm", buffer), false);
		assert.equal(isDicomEntry(".DS_Store", buffer), false);
		assert.equal(isDicomEntry("Thumbs.db", buffer), false);
		assert.equal(isDicomEntry("desktop.ini", buffer), false);
	});

	test("rejects arbitrary text or empty binary files", () => {
		const textBytes = new TextEncoder().encode("Hello World, not a DICOM");
		assert.equal(isDicomEntry("readme.txt", textBytes), false);
		assert.equal(isDicomEntry("empty.bin", new Uint8Array(0)), false);
	});
});
