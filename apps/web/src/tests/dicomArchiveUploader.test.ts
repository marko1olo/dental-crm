import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import * as fflate from "fflate";
import {
	filterDicomArchiveEntries,
	isDicomEntry,
	isDicomdirEntry,
	sortDicomEntries,
} from "../components/dicom/dicomArchiveFilter";
import {
	filterDicomArchiveEntries as uploaderFilterEntries,
	isDicomEntry as uploaderIsDicomEntry,
	isDicomdirEntry as uploaderIsDicomdirEntry,
	sortDicomEntries as uploaderSortEntries,
	DicomArchiveUploader,
} from "../components/dicom/DicomArchiveUploader";
import { DicomArchiveUploader as ImagingDicomArchiveUploader } from "../components/imaging/DicomArchiveUploader";

describe("DicomArchiveUploader - DICOM filter and format validation", () => {
	test("identifies standard DICOM with 128-byte preamble and DICM magic", () => {
		const buffer = new Uint8Array(256);
		// Preamble 128 bytes of zeroes
		buffer[128] = "D".charCodeAt(0);
		buffer[129] = "I".charCodeAt(0);
		buffer[130] = "C".charCodeAt(0);
		buffer[131] = "M".charCodeAt(0);

		assert.equal(isDicomEntry("slice_001.raw", buffer), true);
		assert.equal(uploaderIsDicomEntry("slice_001.raw", buffer), true);
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

	test("rejects DICOMDIR files with DICM magic header (KaVo OP300 / CyberMed OnDemand3D)", () => {
		// Construct DICOMDIR buffer: 128 bytes preamble + "DICM" prefix + Media Storage SOP Class UID
		const dicomdirBuffer = new Uint8Array(512);
		dicomdirBuffer[128] = "D".charCodeAt(0);
		dicomdirBuffer[129] = "I".charCodeAt(0);
		dicomdirBuffer[130] = "C".charCodeAt(0);
		dicomdirBuffer[131] = "M".charCodeAt(0);

		// DICOMDIR must be strictly rejected regardless of case or nested folder path
		assert.equal(isDicomEntry("DICOMDIR", dicomdirBuffer), false);
		assert.equal(isDicomEntry("dicomdir", dicomdirBuffer), false);
		assert.equal(isDicomEntry("DATA/DICOMDIR", dicomdirBuffer), false);
		assert.equal(isDicomEntry("STUDY/dicomdir.dat", dicomdirBuffer), false);
		assert.equal(isDicomEntry("CBCT/SUBDIR/DICOMDIR", dicomdirBuffer), false);

		// Uploader exported entry point must match
		assert.equal(uploaderIsDicomEntry("DICOMDIR", dicomdirBuffer), false);
		assert.equal(uploaderIsDicomdirEntry("DICOMDIR"), true);
		assert.equal(uploaderIsDicomdirEntry("DATA/DICOMDIR"), true);
		assert.equal(isDicomdirEntry("slice_001.dcm"), false);
	});

	test("filters out companion tomograph service files from KaVo / CyberMed CBCT archives", () => {
		const archiveFiles = [
			"DICOMDIR",
			"Autorun.inf",
			"CDViewer.exe",
			"PicassoViewer.exe",
			"OnDemand3D_CD_Viewer_Instructor.pdf",
			"LUCIONCD.MDE",
			"SUID.ini",
			"ReadMe.txt",
			"__MACOSX/._I0000001.dcm",
			"Thumbs.db",
			"IMGDATA/20250714/S0000001/I0000001.dcm",
			"IMGDATA/20250714/S0000001/I0000002.dcm",
			"IMGDATA/20250714/S0000001/I0000003.dcm",
		];

		const filtered = filterDicomArchiveEntries(archiveFiles);
		assert.deepEqual(filtered, [
			"Autorun.inf",
			"CDViewer.exe",
			"PicassoViewer.exe",
			"OnDemand3D_CD_Viewer_Instructor.pdf",
			"LUCIONCD.MDE",
			"SUID.ini",
			"ReadMe.txt",
			"IMGDATA/20250714/S0000001/I0000001.dcm",
			"IMGDATA/20250714/S0000001/I0000002.dcm",
			"IMGDATA/20250714/S0000001/I0000003.dcm",
		]);

		// Now filter through isDicomEntry with actual data buffers to ensure only genuine slices survive
		const sliceBuffer = new Uint8Array(256);
		sliceBuffer[128] = "D".charCodeAt(0);
		sliceBuffer[129] = "I".charCodeAt(0);
		sliceBuffer[130] = "C".charCodeAt(0);
		sliceBuffer[131] = "M".charCodeAt(0);

		const dummyText = new TextEncoder().encode("Service file text");

		const validSlices = filtered.filter((name) => {
			const data = name.endsWith(".dcm") ? sliceBuffer : dummyText;
			return isDicomEntry(name, data);
		});

		assert.deepEqual(validSlices, [
			"IMGDATA/20250714/S0000001/I0000001.dcm",
			"IMGDATA/20250714/S0000001/I0000002.dcm",
			"IMGDATA/20250714/S0000001/I0000003.dcm",
		]);
	});

	test("simulates in-memory ZIP extraction of KaVo / CyberMed archive with DICOMDIR", () => {
		// Prepare mock slices with DICM header
		const sliceBytes = new Uint8Array(256);
		sliceBytes[128] = 0x44; // 'D'
		sliceBytes[129] = 0x49; // 'I'
		sliceBytes[130] = 0x43; // 'C'
		sliceBytes[131] = 0x4d; // 'M'

		// DICOMDIR file with DICM header but no pixel data
		const dicomdirBytes = new Uint8Array(512);
		dicomdirBytes[128] = 0x44;
		dicomdirBytes[129] = 0x49;
		dicomdirBytes[130] = 0x43;
		dicomdirBytes[131] = 0x4d;

		// Companion files
		const autorunBytes = new TextEncoder().encode("[autorun]\nopen=CDViewer.exe");
		const viewerBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // MZ executable

		// Create ZIP archive
		const zipData = fflate.zipSync({
			DICOMDIR: dicomdirBytes,
			"Autorun.inf": autorunBytes,
			"CDViewer.exe": viewerBytes,
			"IMGDATA/S0000001/I0000001.dcm": sliceBytes,
			"IMGDATA/S0000001/I0000002.dcm": sliceBytes,
			"IMGDATA/S0000001/I0000003.dcm": sliceBytes,
		});

		// Unzip and apply DicomArchiveUploader filtering logic
		const unzipped = fflate.unzipSync(zipData);
		const entries = Object.keys(unzipped);

		const acceptedImageFiles: string[] = [];
		for (const filename of entries) {
			if (isDicomdirEntry(filename)) {
				continue;
			}
			const fileData = unzipped[filename];
			if (!fileData) continue;

			if (isDicomEntry(filename, fileData)) {
				acceptedImageFiles.push(filename);
			}
		}

		assert.equal(acceptedImageFiles.length, 3);
		assert.deepEqual(acceptedImageFiles, [
			"IMGDATA/S0000001/I0000001.dcm",
			"IMGDATA/S0000001/I0000002.dcm",
			"IMGDATA/S0000001/I0000003.dcm",
		]);
		assert.ok(!acceptedImageFiles.includes("DICOMDIR"));
		assert.ok(!acceptedImageFiles.includes("Autorun.inf"));
		assert.ok(!acceptedImageFiles.includes("CDViewer.exe"));
	});

	test("verifies live clinical fixture from clinic archive when available on disk", () => {
		const candidatePaths = [
			"C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/_Organized/Folder_Medical_DICOM_Cases/Егорова Ирина Сергеевна КЛКТ 13х15 14.07.25/Егорова Ирина Сергеевна КЛКТ 13х15 14.07.25/IMGDATA/20250714/S0000001/I0000001.dcm",
			"C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/_Organized/Folder_Medical_DICOM_Cases/Хадьков_Александр_Владимирович_1143/Хадьков_Александр_Владимирович/Data/1_001.dcm",
			"C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/Медицина_и_Снимки/клкт 1/клкт 1/Data/2ae71j14j10i03011000.dcm",
		];

		const existingPath = candidatePaths.find((p) => fs.existsSync(p));
		if (!existingPath) {
			// If not present in current environment, pass cleanly
			return;
		}

		const sliceBuf = fs.readFileSync(existingPath);
		const u8 = new Uint8Array(sliceBuf);

		// Real slice must be accepted with its actual filename
		assert.equal(isDicomEntry(path.basename(existingPath), u8), true);
		assert.equal(isDicomdirEntry(path.basename(existingPath)), false);

		// But if passed with DICOMDIR name, it MUST be safely rejected
		assert.equal(isDicomEntry("DICOMDIR", u8), false);
		assert.equal(isDicomEntry("DATA/DICOMDIR", u8), false);
	});

	test("verifies DicomArchiveUploader components are exported in both dicom and imaging domains", () => {
		assert.equal(typeof DicomArchiveUploader, "function");
		assert.equal(typeof ImagingDicomArchiveUploader, "function");
		assert.equal(DicomArchiveUploader, ImagingDicomArchiveUploader);
	});

	test("sortDicomEntries sorts KaVo OP300 and standard DICOM slices numerically", () => {
		const kavoSlices = [
			{ name: "I0000010" },
			{ name: "I0000002" },
			{ name: "I0000001" },
			{ name: "I0000100" },
			{ name: "I0000020" },
		];
		const sorted = sortDicomEntries(kavoSlices);
		assert.deepEqual(
			sorted.map((s) => s.name),
			["I0000001", "I0000002", "I0000010", "I0000020", "I0000100"],
		);

		const uploaderSorted = uploaderSortEntries(kavoSlices);
		assert.deepEqual(
			uploaderSorted.map((s) => s.name),
			["I0000001", "I0000002", "I0000010", "I0000020", "I0000100"],
		);
	});
});
