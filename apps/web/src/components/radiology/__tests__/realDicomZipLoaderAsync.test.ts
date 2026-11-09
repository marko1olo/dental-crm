import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fflate from "fflate";
import { buildVolumeFromDicomZip, buildVolumeFromDicomFiles } from "../dicomLoader/realDicomZipLoader";

describe("RAD-02: Real DICOM Zip Loader Async Non-Freezing Inquisition", () => {
	// Helper to generate a valid synthetic DICOM slice buffer
	function createSyntheticDicomSlice(sliceIndex: number): Uint8Array {
		// Minimum 132 bytes for DICOM preamble + prefix "DICM"
		const buf = new Uint8Array(512);
		// Preamble 128 zeros
		// Magic DICM at offset 128..131
		buf[128] = 0x44; // 'D'
		buf[129] = 0x49; // 'I'
		buf[130] = 0x43; // 'C'
		buf[131] = 0x4d; // 'M'
		// Write dummy tag for Rows (0x0028, 0x0010) = 2
		buf[132] = 0x28; buf[133] = 0x00; buf[134] = 0x10; buf[135] = 0x00;
		buf[136] = 0x55; buf[137] = 0x53; // 'US'
		buf[138] = 0x02; buf[139] = 0x00; // length 2
		buf[140] = 0x02; buf[141] = 0x00; // 2 rows

		// Columns (0x0028, 0x0011) = 2
		buf[142] = 0x28; buf[143] = 0x00; buf[144] = 0x11; buf[145] = 0x00;
		buf[146] = 0x55; buf[147] = 0x53; // 'US'
		buf[148] = 0x02; buf[149] = 0x00; // length 2
		buf[150] = 0x02; buf[151] = 0x00; // 2 cols

		// Pixel Data (0x7fe0, 0x0010)
		buf[152] = 0xe0; buf[153] = 0x7f; buf[154] = 0x10; buf[155] = 0x00;
		buf[156] = 0x4f; buf[157] = 0x57; // 'OW'
		buf[158] = 0x00; buf[159] = 0x00; // reserved
		buf[160] = 0x08; buf[161] = 0x00; buf[162] = 0x00; buf[163] = 0x00; // length 8 bytes (4 voxels)
		// 4 voxels int16
		buf[164] = sliceIndex;
		return buf;
	}

	it("asynchronously unzips archive without freezing UI thread and streams progress", async () => {
		const zipFiles: Record<string, Uint8Array> = {};
		for (let i = 1; i <= 6; i++) {
			zipFiles[`study_01/slice_${String(i).padStart(3, "0")}.dcm`] = createSyntheticDicomSlice(i);
		}
		// Add garbage/aux files to verify filtering
		zipFiles["__MACOSX/._slice_001.dcm"] = new Uint8Array([1, 2, 3]);
		zipFiles["study_01/DICOMDIR"] = new Uint8Array([4, 5, 6]);
		zipFiles["study_01/readme.txt"] = new TextEncoder().encode("Patient study report");

		const zipBuffer = fflate.zipSync(zipFiles).buffer;

		const progressLog: Array<{ pct: number; msg: string }> = [];
		const onProgress = (pct: number, msg: string) => {
			progressLog.push({ pct, msg });
		};

		const volume = await buildVolumeFromDicomZip(zipBuffer, onProgress);

		assert.ok(volume !== undefined);
		assert.strictEqual(volume.dimensions.depth, 6);
		assert.strictEqual(volume.dimensions.width, 2);
		assert.strictEqual(volume.dimensions.height, 2);

		// Verify that progress log tracked unpacking and building
		assert.ok(progressLog.length > 3);
		assert.ok(progressLog.some((p) => p.pct <= 35 && p.msg.includes("Распаковка архива КТ")));
		assert.strictEqual(progressLog[progressLog.length - 1]?.pct, 100);
	});

	it("throws clear error when ZIP has no valid DICOM slices", async () => {
		const zipFiles: Record<string, Uint8Array> = {
			"notes.txt": new TextEncoder().encode("no dicom here"),
			"DICOMDIR": new Uint8Array([1, 2, 3]),
		};
		const zipBuffer = fflate.zipSync(zipFiles).buffer;

		await assert.rejects(
			async () => buildVolumeFromDicomZip(zipBuffer),
			/В переданном ZIP-архиве не найдено файлов DICOM/,
		);
	});

	it("throws clear error when empty file array is passed to buildVolumeFromDicomFiles", async () => {
		await assert.rejects(
			async () => buildVolumeFromDicomFiles([]),
			/Не передано ни одного файла DICOM для загрузки/,
		);
	});
});
