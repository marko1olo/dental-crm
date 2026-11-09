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

describe("CtSelectorModal - Clinical Intake & Viewer Selector Integration", () => {
	test("exports canonical CtSelectorModal from radiology domain", () => {
		assert.equal(typeof CtSelectorModal, "function");
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
		const webRoot = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
			? path.resolve(process.cwd(), "apps/web/src")
			: path.resolve(process.cwd(), "src");

		// 1. ImagingHeader.tsx & header submodules: CTA button exists
		const headerFiles = [
			path.join(webRoot, "components/imaging/ImagingHeader.tsx"),
			path.join(webRoot, "components/imaging/header/ImagingHeaderActions.tsx"),
			path.join(webRoot, "components/imaging/header/ImagingHeaderMoreMenu.tsx"),
		];
		const imagingHeaderContent = headerFiles
			.filter((p) => fs.existsSync(p))
			.map((p) => fs.readFileSync(p, "utf-8"))
			.join("\n");
		assert.ok(
			imagingHeaderContent.includes('data-testid="btn-open-ct-selector"'),
			"ImagingHeader must contain data-testid='btn-open-ct-selector'"
		);
		assert.ok(
			imagingHeaderContent.includes("onOpenCtSelector"),
			"ImagingHeader must accept onOpenCtSelector callback"
		);

		// 2. ImagingView.tsx & view modules: mounts CtSelectorModal
		const imagingViewFiles = [
			path.join(webRoot, "ImagingView.tsx"),
			path.join(webRoot, "views/imagingViewModules/ImagingViewModals.tsx"),
			path.join(webRoot, "views/imagingViewModules/useImagingViewController.ts"),
		];
		const imagingViewContent = imagingViewFiles
			.filter((p) => fs.existsSync(p))
			.map((p) => fs.readFileSync(p, "utf-8"))
			.join("\n");
		assert.ok(
			imagingViewContent.includes("<CtSelectorModal"),
			"ImagingView must mount CtSelectorModal"
		);
		assert.ok(
			imagingViewContent.includes("isCtSelectorOpen"),
			"ImagingView must manage isCtSelectorOpen state"
		);

		// 3. PatientRadiologyTab.tsx & tabs modules: CTA button & modal mount
		const patientTabFiles = [
			path.join(webRoot, "components/patients/tabs/PatientRadiologyTab.tsx"),
			path.join(webRoot, "components/patients/tabs/radiology/PatientRadiologyModals.tsx"),
			path.join(webRoot, "components/patients/tabs/radiology/PatientRadiologyToolbar.tsx"),
			path.join(webRoot, "components/patients/tabs/radiology/PatientRadiologyHeader.tsx"),
		];
		const patientTabContent = patientTabFiles
			.filter((p) => fs.existsSync(p))
			.map((p) => fs.readFileSync(p, "utf-8"))
			.join("\n");
		assert.ok(
			patientTabContent.includes('data-testid="btn-patient-open-ct-selector"'),
			"PatientRadiologyTab must contain data-testid='btn-patient-open-ct-selector'"
		);
		assert.ok(
			patientTabContent.includes("<CtSelectorModal"),
			"PatientRadiologyTab must mount CtSelectorModal"
		);

		// 4. VisitDiagnosticsTab.tsx / diagnosticsTab: CTA button & modal mount
		const visitTabPath = path.join(webRoot, "components/visit/VisitDiagnosticsTab.tsx");
		const visitCbctSectionPath = path.join(webRoot, "components/visit/diagnosticsTab/DiagnosticsCbctSection.tsx");
		const visitModalsPath = path.join(webRoot, "components/visit/diagnosticsTab/DiagnosticsModalsHost.tsx");
		const visitContent = fs.readFileSync(visitTabPath, "utf-8") +
			(fs.existsSync(visitCbctSectionPath) ? fs.readFileSync(visitCbctSectionPath, "utf-8") : "") +
			(fs.existsSync(visitModalsPath) ? fs.readFileSync(visitModalsPath, "utf-8") : "");

		assert.ok(
			visitContent.includes('data-testid="btn-open-ct-selector"'),
			"VisitDiagnosticsTab must contain data-testid='btn-open-ct-selector'"
		);
		assert.ok(
			visitContent.includes("<CtSelectorModal"),
			"VisitDiagnosticsTab must mount CtSelectorModal"
		);

		// 5. RadiologyModule.tsx & module submodules: CTA button & modal mount
		const radModuleFiles = [
			path.join(webRoot, "components/radiology/RadiologyModule.tsx"),
			path.join(webRoot, "components/radiology/radiologyModule/RadiologyModuleModals.tsx"),
			path.join(webRoot, "components/radiology/radiologyModule/RadiologyModuleToolbar.tsx"),
			path.join(webRoot, "components/radiology/radiologyModule/RadiologyModuleHeader.tsx"),
		];
		const radiologyModuleContent = radModuleFiles
			.filter((p) => fs.existsSync(p))
			.map((p) => fs.readFileSync(p, "utf-8"))
			.join("\n");
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
		const webRoot = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
			? path.resolve(process.cwd(), "apps/web/src")
			: path.resolve(process.cwd(), "src");
		const modalDir = path.join(webRoot, "components/radiology/ctSelectorModal");
		const modalFiles = fs.readdirSync(modalDir, { recursive: true }) as string[];
		const modalContent = modalFiles
			.filter((f) => typeof f === "string" && (f.endsWith(".tsx") || f.endsWith(".ts")))
			.map((f) => fs.readFileSync(path.join(modalDir, f), "utf-8"))
			.join("\n");

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
