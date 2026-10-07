import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isDemoPatientId, isDemoShowcaseMode, setRuntimeDemoMode } from "../lib/demoMode";
const getWebRoot = () =>
	fs.existsSync(path.resolve(process.cwd(), "apps/web"))
		? path.resolve(process.cwd(), "apps/web")
		: process.cwd();

describe("Radiology Clinical Autonomy & Demo Isolation Mandate (8c, 8e, 8n)", () => {
	it("verifies physical DICOM and RVG assets are in apps/web/public/radiology/", () => {
		const radiologyDir = path.resolve(getWebRoot(), "public/radiology");
		assert.ok(fs.existsSync(radiologyDir), "radiology directory exists");

		const requiredFiles = [
			"sample_rvg_tooth36_periapical.jpg",
			"sample_rvg_tooth16.jpg",
			"sample_rvg_pathology.jpg",
			"kavo_op300_cbct_slice.dcm",
			"xspect_visiograph_sensor.dcm",
		];

		for (const filename of requiredFiles) {
			const filePath = path.join(radiologyDir, filename);
			assert.ok(fs.existsSync(filePath), `Asset ${filename} must exist on disk`);
			const stats = fs.statSync(filePath);
			assert.ok(stats.size > 1000, `Asset ${filename} must have valid non-empty size (>1KB), got ${stats.size} B`);
		}
	});

	it("verifies demoMode helper correctly distinguishes real patients from demo accounts", () => {
		// Real clinical patient identifiers:
		assert.equal(isDemoPatientId("uuid-1234-real-patient"), false);
		assert.equal(isDemoPatientId("ivanov_sergey_1985"), false);
		assert.equal(isDemoPatientId("pat_987654321"), false);
		assert.equal(isDemoPatientId(null), false);
		assert.equal(isDemoPatientId(undefined), false);

		// Demo patient identifiers:
		assert.equal(isDemoPatientId("sample_patient_1"), true);
		assert.equal(isDemoPatientId("demo_patient_smith"), true);
		assert.equal(isDemoPatientId("test_patient_42"), true);
		assert.equal(isDemoPatientId("active_patient"), true);

		// Demo showcase mode runtime toggles:
		setRuntimeDemoMode(null);
		assert.equal(isDemoShowcaseMode(), false);

		setRuntimeDemoMode(true);
		assert.equal(isDemoShowcaseMode(), true);

		setRuntimeDemoMode(false);
		assert.equal(isDemoShowcaseMode(), false);
		setRuntimeDemoMode(null);
	});

	it("verifies VisiographAnalyzer source code enforces demoMode isolation and never auto-injects fake caries for real patients", () => {
		const sourcePath = path.resolve(getWebRoot(), "src/components/imaging/VisiographAnalyzer.tsx");
		const source = fs.readFileSync(sourcePath, "utf-8");

		// Import check
		assert.ok(source.includes("isDemoShowcaseMode"), "Imports isDemoShowcaseMode");
		assert.ok(source.includes("isDemoPatientId"), "Imports isDemoPatientId");

		// Default initial scan must be guarded
		assert.ok(
			source.includes("if (isDemoShowcaseMode() || isDemoPatientId(effectivePatientId))"),
			"defaultInitialScan returns fallback scan only in demo showcase mode or for demo patient",
		);

		// History loading empty state must be guarded
		assert.ok(
			source.includes("setCurrentScan(null)") && source.includes("setCurrentImageUrl(null)"),
			"Real patient with 0 scans gets honest null currentScan and null currentImageUrl",
		);

		// Interactive demo scan button exists in DropZone
		assert.ok(source.includes('data-testid="btn-load-demo-scan"'), "Dropzone includes demo scan action");
		assert.ok(source.includes("handleLoadDemoScan"), "VisiographAnalyzer defines handleLoadDemoScan");
	});

	it("verifies DicomViewerModal renders honest dropzone for real patients when imageSrc is undefined", async () => {
		const { DicomViewerModal } = await import("../components/imaging/DicomViewerModal");

		setRuntimeDemoMode(false);

		// Render with a real patient and no imageSrc
		const html = renderToStaticMarkup(
			React.createElement(DicomViewerModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Кузнецов Дмитрий Павлович",
				toothFdiCode: "36",
			}),
		);

		// Dropzone must be rendered
		assert.ok(html.includes('data-testid="dicom-viewer-dropzone"'), "Renders honest dropzone when no imageSrc for real patient");
		assert.ok(html.includes("Область загрузки снимка: перетащите файл"), "Contains dropzone invitation");
		assert.ok(html.includes('data-testid="btn-dicom-load-demo"'), "Dropzone contains demo scan preview button");
		assert.ok(html.includes("Показать демо-снимок"), "Contains demo scan button label");
	});

	it("verifies DicomViewerModal renders sample scan for demo patients or in showcase mode", async () => {
		const { DicomViewerModal } = await import("../components/imaging/DicomViewerModal");

		// Case A: Demo patient
		setRuntimeDemoMode(false);
		const htmlDemo = renderToStaticMarkup(
			React.createElement(DicomViewerModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "demo_patient_smirnova",
				toothFdiCode: "16",
			}),
		);
		// In demo mode, it renders the DicomViewport container rather than dropzone
		assert.ok(!htmlDemo.includes('data-testid="dicom-viewer-dropzone"'), "Demo patient does not see empty dropzone");

		// Case B: Demo showcase mode
		setRuntimeDemoMode(true);
		const htmlShowcase = renderToStaticMarkup(
			React.createElement(DicomViewerModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Кузнецов Дмитрий Павлович",
				toothFdiCode: "36",
			}),
		);
		assert.ok(!htmlShowcase.includes('data-testid="dicom-viewer-dropzone"'), "Showcase mode does not see empty dropzone");
		setRuntimeDemoMode(null);
	});

	it("verifies VisitDiagnosticsTab passes undefined imageSrc for real patients and sample scan for demo patients", () => {
		const sourcePath = path.resolve(getWebRoot(), "src/components/visit/VisitDiagnosticsTab.tsx");
		const source = fs.readFileSync(sourcePath, "utf-8");

		assert.ok(source.includes("isDemoShowcaseMode() || isDemoPatientId(visitPatientId ?? activePatient?.id)"),
			"VisitDiagnosticsTab guards imageSrc prop with isDemoShowcaseMode and isDemoPatientId",
		);
	});

	it("verifies VisitDiagnosticsTab attached scans gallery renders compact grid previews without horizontal scroll", () => {
		const sourcePath = path.resolve(getWebRoot(), "src/components/visit/VisitDiagnosticsTab.tsx");
		const source = fs.readFileSync(sourcePath, "utf-8");

		assert.ok(source.includes('data-testid="visit-diagnostics-attached-scans-gallery"'),
			"VisitDiagnosticsTab defines visit-diagnostics-attached-scans-gallery",
		);
		assert.ok(source.includes('data-testid="attached-scans-empty-placeholder"'),
			"VisitDiagnosticsTab includes attached scans empty placeholder",
		);
		assert.ok(source.includes('grid-cols-2') && source.includes('data-testid="attached-scans-list"'),
			"VisitDiagnosticsTab renders adaptive CSS grid without horizontal scroll",
		);
		assert.ok(source.includes('aspectRatio: "1 / 1"'),
			"VisitDiagnosticsTab enforces 1/1 square aspect ratio for all radiology/photo thumbnails",
		);
	});

	it("verifies PatientWorkspaceView provides Scans tab with 200x200px radiology gallery (CLS = 0)", () => {
		const sourcePath = path.resolve(getWebRoot(), "src/components/patients/PatientWorkspaceView.tsx");
		const source = fs.readFileSync(sourcePath, "utf-8");

		assert.ok(source.includes('data-testid="patient-tab-scans"'),
			"PatientWorkspaceView defines patient-tab-scans tab button",
		);
		assert.ok(source.includes('data-testid="patient-scans-gallery"'),
			"PatientWorkspaceView renders patient-scans-gallery",
		);
		assert.ok(source.includes('width: "200px"') && source.includes('height: "200px"'),
			"PatientWorkspaceView reserves 200x200px dimensions for study cards (CLS = 0)",
		);
	});

	it("verifies ImagingView ImagingStudyThumbnail reserves dimensions to guarantee zero layout shift", () => {
		const sourcePath = path.resolve(getWebRoot(), "src/ImagingView.tsx");
		const source = fs.readFileSync(sourcePath, "utf-8");

		assert.ok(source.includes('function ImagingStudyThumbnail'),
			"ImagingView defines ImagingStudyThumbnail",
		);
		assert.ok(source.includes('style={{ width: "48px", height: "48px"') && source.includes('aspectRatio: "1 / 1"'),
			"ImagingStudyThumbnail explicitly reserves fixed dimensions to guarantee CLS = 0",
		);
	});
});
