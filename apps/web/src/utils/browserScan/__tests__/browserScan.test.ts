import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	addBrowserMigrationKindToScanStats,
	browserFileHasDicomMagic,
	browserImagingScanElapsedFromIso,
	browserImagingScanNowMs,
	browserMigrationFolderHintScore,
	browserMigrationSourceKindFromStats,
	browserPickedFolderFingerprint,
	buildBrowserMigrationDiscovery,
	buildBrowserPickedImagingFolderPreview,
	classifyBrowserImagingFileName,
	classifyBrowserMigrationFileName,
	createBrowserImagingScanRuntime,
	createBrowserMigrationScanRuntime,
	detectDicomRuntimeSurfaceHint,
	hasDentalDesktopShellBridge,
	isBrowserImagingScanAbortError,
	isBrowserMigrationScanAbortError,
	localImagingFolderFingerprint,
	throwIfBrowserImagingScanAborted,
	throwIfBrowserMigrationScanAborted,
} from "../index.js";
import type {
	BrowserMigrationFolderStats,
	BrowserMigrationScanStats,
	BrowserPickedImagingScanStats,
} from "../types.js";

describe("browserScan DAG modules test suite", () => {
	describe("errorClassifiers", () => {
		it("detects and throws abort errors correctly", () => {
			const controller = new AbortController();
			assert.doesNotThrow(() => throwIfBrowserImagingScanAborted(controller.signal));
			assert.doesNotThrow(() => throwIfBrowserMigrationScanAborted(controller.signal));

			controller.abort();
			assert.throws(
				() => throwIfBrowserImagingScanAborted(controller.signal),
				(err: unknown) => isBrowserImagingScanAbortError(err),
			);
			assert.throws(
				() => throwIfBrowserMigrationScanAborted(controller.signal),
				(err: unknown) => isBrowserMigrationScanAbortError(err),
			);
		});

		it("returns false for non-abort errors", () => {
			assert.equal(isBrowserImagingScanAbortError(new Error("Generic")), false);
			assert.equal(isBrowserMigrationScanAbortError(null), false);
			assert.equal(isBrowserMigrationScanAbortError({ name: "TypeError" }), false);
		});
	});

	describe("dicomDiscovery", () => {
		it("fingerprints paths deterministically", () => {
			const hash1 = localImagingFolderFingerprint("C:/DICOM/Patient1");
			const hash2 = localImagingFolderFingerprint("C:/DICOM/Patient1");
			const hash3 = localImagingFolderFingerprint("C:/DICOM/Patient2");
			assert.equal(hash1, hash2);
			assert.notEqual(hash1, hash3);
			assert.equal(typeof hash1, "string");
			assert.equal(hash1.length, 8);
		});

		it("classifies DICOM by name and binary preamble", () => {
			assert.equal(classifyBrowserImagingFileName("scan.dcm"), "dicom");
			assert.equal(classifyBrowserImagingFileName("DICOMDIR"), "dicom");
			assert.equal(classifyBrowserImagingFileName("I0000123"), "dicom");
			assert.equal(classifyBrowserImagingFileName("slice_004"), "dicom");

			// Buffer check
			const bufferWithMagic = new Uint8Array(132);
			bufferWithMagic[128] = 0x44; // D
			bufferWithMagic[129] = 0x49; // I
			bufferWithMagic[130] = 0x43; // C
			bufferWithMagic[131] = 0x4d; // M
			assert.equal(
				classifyBrowserImagingFileName("unknown_extension_file", bufferWithMagic),
				"dicom",
			);

			assert.equal(classifyBrowserImagingFileName("study.zip"), "archive");
			assert.equal(classifyBrowserImagingFileName("jaw.stl"), "model");
			assert.equal(classifyBrowserImagingFileName("photo.jpg"), "image");
			assert.equal(classifyBrowserImagingFileName("notes.txt"), "other");
		});

		it("builds imaging folder preview correctly", () => {
			const stats: BrowserPickedImagingScanStats = {
				rootName: "CT_Study",
				sourceKind: "browser_directory_picker",
				scannedFiles: 50,
				scannedFolders: 3,
				dicomLikeFiles: 45,
				archiveFiles: 0,
				modelFiles: 2,
				imageFiles: 3,
				totalBytes: 50000000,
				warnings: [],
			};
			const preview = buildBrowserPickedImagingFolderPreview(stats);
			assert.equal(preview.version, 1);
			assert.equal(preview.dicomLikeFiles, 45);
			assert.match(preview.safeDisplayName, /Браузерная КТ-папка/);
			assert.match(preview.nextAction, /Найдены файлы КТ\/снимков/);
		});
	});

	describe("directoryTraverser & migration discovery", () => {
		it("classifies migration file extensions properly", () => {
			assert.equal(classifyBrowserMigrationFileName("data.fdb"), "database");
			assert.equal(classifyBrowserMigrationFileName("backup.bak"), "dump");
			assert.equal(classifyBrowserMigrationFileName("report.xlsx"), "table");
			assert.equal(classifyBrowserMigrationFileName("export.7z"), "archive");
			assert.equal(classifyBrowserMigrationFileName("ct.dcm"), "dicom");
			assert.equal(classifyBrowserMigrationFileName("scan.ply"), "model");
			assert.equal(classifyBrowserMigrationFileName("photo.png"), "image");
			assert.equal(classifyBrowserMigrationFileName("readme.docx"), "other");
		});

		it("scores folder hints for migration relevance", () => {
			const score1 = browserMigrationFolderHintScore("IDENT Backup 2025");
			const score2 = browserMigrationFolderHintScore("random_folder");
			assert.ok(score1 > score2);
			assert.ok(score1 >= 0.2);
		});

		it("detects sourceKind from folder stats", () => {
			const folderStats: BrowserMigrationFolderStats = {
				folderKey: "kavo_export",
				folderHint: "KaVo 3D eXam",
				depth: 1,
				databaseFiles: 0,
				dumpFiles: 0,
				tableFiles: 0,
				archiveFiles: 0,
				dicomLikeFiles: 100,
				imageFiles: 0,
				modelFiles: 0,
				hasDicomDir: true,
				latestModifiedAt: "2025-01-01T10:00:00.000Z",
				totalBytes: 12000000,
			};
			const kind = browserMigrationSourceKindFromStats(folderStats);
			assert.equal(kind, "vendor_imaging_system");
		});

		it("builds migration discovery response with candidates", () => {
			const folderStats: BrowserMigrationFolderStats = {
				folderKey: "ident_data",
				folderHint: "IDENT base dump",
				depth: 1,
				databaseFiles: 2,
				dumpFiles: 1,
				tableFiles: 0,
				archiveFiles: 0,
				dicomLikeFiles: 0,
				imageFiles: 0,
				modelFiles: 0,
				hasDicomDir: false,
				latestModifiedAt: "2025-01-01T10:00:00.000Z",
				totalBytes: 50000000,
			};
			const discovery = buildBrowserMigrationDiscovery({
				rootName: "D:/IDENT",
				sourceLabel: "Выбор папки",
				scannedFolders: 1,
				scannedFiles: 3,
				folderStats: [folderStats],
				warnings: [],
			});
			assert.equal(discovery.version, "dental-crm-migration-local-discovery-v1");
			assert.equal(discovery.candidates.length, 1);
			assert.equal(discovery.candidates[0]?.databaseFiles, 2);
		});

		it("accumulates stats accurately in addBrowserMigrationKindToScanStats", () => {
			const stats: BrowserMigrationScanStats = {
				rootName: "root",
				sourceKind: "browser_directory_picker",
				scannedFiles: 0,
				scannedFolders: 0,
				databaseFiles: 0,
				dumpFiles: 0,
				tableFiles: 0,
				archiveFiles: 0,
				dicomLikeFiles: 0,
				imageFiles: 0,
				modelFiles: 0,
				totalBytes: 0,
				warnings: [],
			};
			addBrowserMigrationKindToScanStats(stats, "database", 1024);
			addBrowserMigrationKindToScanStats(stats, "dicom", 2048);
			assert.equal(stats.databaseFiles, 1);
			assert.equal(stats.dicomLikeFiles, 1);
			assert.equal(stats.totalBytes, 3072);
		});

		it("measures scan runtime and elapsed time correctly", () => {
			const runtime = createBrowserImagingScanRuntime("2026-01-01T12:00:00.000Z");
			assert.equal(runtime.startedAt, "2026-01-01T12:00:00.000Z");
			assert.equal(runtime.processedUnits, 0);

			const elapsed = browserImagingScanElapsedFromIso(
				"2026-01-01T12:00:00.000Z",
				"2026-01-01T12:00:05.000Z",
			);
			assert.equal(elapsed, 5000);
		});
	});
});
