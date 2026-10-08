import "./setupCornerstonePolyfill";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import * as fflate from "fflate";

import {
	detectExternalCtViewers,
	detectInstalledCtViewers,
	launchExternalCtViewer,
	openInExternalViewer,
	scanDownloadsForCt,
} from "../native/desktopBridge";
import {
	filterDicomArchiveEntries,
	isDicomEntry,
	isDicomdirEntry,
	sortDicomEntries,
} from "../components/dicom/dicomArchiveFilter";
import { CtSelectorModal } from "../components/radiology/CtSelectorModal";
import { CtSelectorModal as ImagingCtSelectorModal } from "../components/imaging";

describe("CtSelectorModal - Clinical Intake & Viewer Selector Integration", () => {
	test("exports CtSelectorModal from both radiology and imaging domains", () => {
		assert.equal(typeof CtSelectorModal, "function");
		assert.equal(typeof ImagingCtSelectorModal, "function");
		assert.equal(CtSelectorModal, ImagingCtSelectorModal);
	});

	test("scanDownloadsForCt respects Zero Mocks invariant and returns empty array in web environment", async () => {
		const downloads = await scanDownloadsForCt();
		assert.ok(Array.isArray(downloads), "Should return an array");
		assert.equal(downloads.length, 0, "Web environment must not return fake mock CTs");
	});

	test("detectInstalledCtViewers always guarantees internal DENTE CBCT Studio availability", async () => {
		const viewers = await detectInstalledCtViewers();
		assert.ok(Array.isArray(viewers));
		assert.ok(viewers.length >= 1);

		const defaultViewer = viewers.find((v) => v.id === "dente-cbct-studio");
		assert.ok(defaultViewer, "Internal studio must be present in installed viewers");
		assert.equal(defaultViewer.exePath, "internal://cbct-studio");
		assert.equal(defaultViewer.isDefault, true);
	});

	test("detectExternalCtViewers maps installed viewers to external viewer descriptors", async () => {
		const viewers = await detectExternalCtViewers();
		assert.ok(Array.isArray(viewers));
		assert.ok(viewers.length >= 1);

		const denteViewer = viewers.find((v) => v.id === "dente-cbct-studio");
		assert.ok(denteViewer);
		assert.equal(denteViewer.executablePath, "internal://cbct-studio");
		assert.equal(denteViewer.isAvailable, true);
	});

	test("launchExternalCtViewer and openInExternalViewer handle internal studio fallback safely", async () => {
		// In browser / PWA context, window.open is used to open pop-out studio
		const originalWindow = (globalThis as any).window;
		(globalThis as any).window = {
			open: (url: string, name: string, features: string) => ({
				focus: () => {},
				closed: false,
			}),
		};

		try {
			const result = await launchExternalCtViewer({
				viewerId: "dente-cbct-studio",
				studyPath: "study_fixture_123",
			});
			assert.equal(result.success, true);
			assert.ok(result.viewerName?.includes("DENTE"));

			const legacyResult = await openInExternalViewer({
				viewerId: "dente-cbct-studio",
				filePath: "study_fixture_123",
			});
			assert.equal(legacyResult.success, true);
		} finally {
			if (typeof originalWindow === "undefined") {
				delete (globalThis as any).window;
			} else {
				(globalThis as any).window = originalWindow;
			}
		}
	});

	test("simulates in-memory ZIP extraction of CBCT archive with DICOMDIR exclusion and slice sorting", async () => {
		// Prepare a synthetic KaVo OP300 / CyberMed style CBCT ZIP with DICOMDIR and unordered slices
		const dicomHeader = new Uint8Array(132);
		dicomHeader[128] = "D".charCodeAt(0);
		dicomHeader[129] = "I".charCodeAt(0);
		dicomHeader[130] = "C".charCodeAt(0);
		dicomHeader[131] = "M".charCodeAt(0);

		// DICOMDIR file with DICM header
		const dicomdirData = new Uint8Array(132);
		dicomdirData.set(dicomHeader);

		const filesToZip: fflate.AsyncZippable = {
			"DICOMDIR": [dicomdirData, { level: 0 }],
			"readme.txt": [new TextEncoder().encode("Patient CT scan CyberMed"), { level: 0 }],
			"Thumbs.db": [new Uint8Array(64), { level: 0 }],
			"DICOM/CT_SLICE_010.dcm": [dicomHeader, { level: 0 }],
			"DICOM/CT_SLICE_002.dcm": [dicomHeader, { level: 0 }],
			"DICOM/CT_SLICE_001.dcm": [dicomHeader, { level: 0 }],
		};

		const zipData = await new Promise<Uint8Array>((resolve, reject) => {
			fflate.zip(filesToZip, (err, out) => {
				if (err) reject(err);
				else resolve(out);
			});
		});

		assert.ok(zipData.length > 0, "ZIP archive created in memory");

		// Unzip using fflate.unzip
		const unzipped = await new Promise<fflate.Unzipped>((resolve, reject) => {
			fflate.unzip(zipData, (err, out) => {
				if (err) reject(err);
				else resolve(out);
			});
		});

		const filenames = Object.keys(unzipped);
		assert.equal(filenames.length, 6, "Total entries in zip archive");

		// filterDicomArchiveEntries takes string[] and removes DICOMDIR & OS junk
		const nonJunkEntries = filterDicomArchiveEntries(filenames);
		assert.equal(nonJunkEntries.length, 4, "DICOMDIR and Thumbs.db excluded by filename filter");
		assert.ok(!nonJunkEntries.includes("DICOMDIR"), "DICOMDIR must be excluded");
		assert.ok(!nonJunkEntries.includes("Thumbs.db"), "Thumbs.db must be excluded");

		// isDicomEntry performs deep validation on slice content
		const dicomSlices = nonJunkEntries.filter((name) => isDicomEntry(name, unzipped[name]));
		assert.equal(dicomSlices.length, 3, "Only the 3 DICOM slices should remain; readme.txt rejected by content validator");

		// Validate DICOMDIR exclusion explicitly
		for (const name of dicomSlices) {
			assert.equal(isDicomdirEntry(name), false, `${name} must not be DICOMDIR`);
			const data = unzipped[name];
			assert.equal(isDicomEntry(name, data), true, `${name} must be a valid DICOM slice`);
		}

		// Sort slices
		const sorted = sortDicomEntries(dicomSlices);
		assert.equal(sorted[0], "DICOM/CT_SLICE_001.dcm");
		assert.equal(sorted[1], "DICOM/CT_SLICE_002.dcm");
		assert.equal(sorted[2], "DICOM/CT_SLICE_010.dcm");
	});

	test("verifies CtSelector integration anchors across all primary CRM views", () => {
		const webRoot = path.resolve(process.cwd(), "apps/web/src");

		// 1. ImagingHeader.tsx: CTA button exists
		const imagingHeaderContent = fs.readFileSync(
			path.join(webRoot, "components/imaging/ImagingHeader.tsx"),
			"utf-8"
		);
		assert.ok(
			imagingHeaderContent.includes('data-testid="btn-open-ct-selector"'),
			"ImagingHeader must contain data-testid='btn-open-ct-selector'"
		);
		assert.ok(
			imagingHeaderContent.includes("onOpenCtSelector"),
			"ImagingHeader must accept onOpenCtSelector callback"
		);

		// 2. ImagingView.tsx: mounts CtSelectorModal
		const imagingViewContent = fs.readFileSync(
			path.join(webRoot, "ImagingView.tsx"),
			"utf-8"
		);
		assert.ok(
			imagingViewContent.includes("<CtSelectorModal"),
			"ImagingView must mount CtSelectorModal"
		);
		assert.ok(
			imagingViewContent.includes("isCtSelectorOpen"),
			"ImagingView must manage isCtSelectorOpen state"
		);

		// 3. PatientRadiologyTab.tsx: CTA button & modal mount
		const patientTabContent = fs.readFileSync(
			path.join(webRoot, "components/patients/tabs/PatientRadiologyTab.tsx"),
			"utf-8"
		);
		assert.ok(
			patientTabContent.includes('data-testid="btn-patient-open-ct-selector"'),
			"PatientRadiologyTab must contain data-testid='btn-patient-open-ct-selector'"
		);
		assert.ok(
			patientTabContent.includes("<CtSelectorModal"),
			"PatientRadiologyTab must mount CtSelectorModal"
		);

		// 4. VisitDiagnosticsTab.tsx: CTA button & modal mount
		const visitTabContent = fs.readFileSync(
			path.join(webRoot, "components/visit/VisitDiagnosticsTab.tsx"),
			"utf-8"
		);
		assert.ok(
			visitTabContent.includes('data-testid="btn-open-ct-selector"'),
			"VisitDiagnosticsTab must contain data-testid='btn-open-ct-selector'"
		);
		assert.ok(
			visitTabContent.includes("<CtSelectorModal"),
			"VisitDiagnosticsTab must mount CtSelectorModal"
		);

		// 5. RadiologyModule.tsx: CTA button & modal mount
		const radiologyModuleContent = fs.readFileSync(
			path.join(webRoot, "components/radiology/RadiologyModule.tsx"),
			"utf-8"
		);
		assert.ok(
			radiologyModuleContent.includes('data-testid="btn-open-radiology-ct-selector"'),
			"RadiologyModule must contain data-testid='btn-open-radiology-ct-selector'"
		);
		assert.ok(
			radiologyModuleContent.includes("<CtSelectorModal"),
			"RadiologyModule must mount CtSelectorModal"
		);
	});

	test("verifies clinical Russian domain language and Anti-Matryoshka compliance in CtSelectorModal", () => {
		const webRoot = path.resolve(process.cwd(), "apps/web/src");
		const modalContent = fs.readFileSync(
			path.join(webRoot, "components/radiology/CtSelectorModal.tsx"),
			"utf-8"
		);

		// No developer jargon
		assert.equal(modalContent.includes("lorem ipsum"), false, "No lorem ipsum allowed");
		assert.equal(modalContent.includes("dummy"), false, "No dummy text allowed");

		// Russian clinical language
		assert.ok(
			modalContent.includes("В папке «Загрузки» нет свежих КТ"),
			"Must include honest Russian empty state for Downloads"
		);
		assert.ok(
			modalContent.includes("3D КТ"),
			"Must include 3D CT badge"
		);
		assert.ok(
			modalContent.includes("Клинический КТ-селектор"),
			"Must include clinical header title"
		);
		assert.ok(
			modalContent.includes("createPortal"),
			"Must render via Portal for clean depth=1 stacking"
		);
	});
});
