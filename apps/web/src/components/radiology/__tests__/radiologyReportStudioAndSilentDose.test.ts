/**
 * radiologyReportStudioAndSilentDose.test.ts
 * Red Team Inquisitor Verification Gate for Window #5:
 * EzDent-i Report & Print Studio (Screenshots 27, 28, 29) and Silent Radiation Dose Sheet.
 *
 * Mandates:
 * - Mandate 8b: Full-file comprehension & tested contracts
 * - Mandate 8e: Doctor Autonomy (no Soviet obstacles, zero screaming alerts)
 * - Mandate 8z: Human clinical language, zero bureaucratic bird language
 * - User Directives: Purged kV/mA physics clutter from doctor UI; quiet DAP under images.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Window #5: EzDent-i Report Studio & Silent Dose Sheet Inquisitor Gate", () => {
	const readSrcFile = (relPath: string) => {
		const fullPath = path.join(webSrcRoot, relPath);
		assert.ok(fs.existsSync(fullPath), `Target file must exist: ${relPath}`);
		return fs.readFileSync(fullPath, "utf-8");
	};

	it("1. RadiologyReportStudioModal: Virtual Sheet (A4 & 14x17 Film) with 8 resize handles", () => {
		const code = readSrcFile("components/radiology/RadiologyReportStudioModal.tsx");

		// Virtual sheet element
		assert.ok(code.includes('data-testid="radiology-virtual-sheet"'), "Must render virtual layout sheet");
		assert.ok(code.includes('14x17_film'), "Must support 14x17 inch medical film");
		assert.ok(code.includes('A4'), "Must support ISO A4 paper");

		// 8 resize handles for active frame
		assert.ok(code.includes('data-testid="resize-handle-nw"'), "Must contain NW corner handle");
		assert.ok(code.includes('data-testid="resize-handle-se"'), "Must contain SE corner handle");
		assert.ok(code.includes("cursor-n-resize"), "Must contain N handle");
		assert.ok(code.includes("cursor-e-resize"), "Must contain E handle");
		assert.ok(code.includes("cursor-s-resize"), "Must contain S handle");
		assert.ok(code.includes("cursor-w-resize"), "Must contain W handle");
		assert.ok(code.includes("cursor-ne-resize"), "Must contain NE handle");
		assert.ok(code.includes("cursor-sw-resize"), "Must contain SW handle");

		// Drag and Drop move & resize
		assert.ok(code.includes("startMove"), "Must support frame movement via mouse drag");
		assert.ok(code.includes("startResize"), "Must support frame resizing via handles");

		// Template presets (EzDent-i Screenshots 27 & 28)
		assert.ok(code.includes('data-testid="btn-layout-two-vert"'), "Must provide 2-vertical template layout");
		assert.ok(code.includes("grid_four"), "Must provide 4-slice grid layout");
		assert.ok(code.includes('data-testid="btn-add-image-frame"'), "Must allow inserting new image frames");
		assert.ok(code.includes('data-testid="btn-add-text-frame"'), "Must allow inserting text description frames");

		// Bottom filmstrip (EzDent-i Screenshots 27 & 28)
		assert.ok(code.includes('data-testid="radiology-bottom-filmstrip"'), "Must render bottom studies filmstrip");
		assert.ok(code.includes('data-testid="btn-filmstrip-insert"'), "Must allow inserting study from filmstrip");
	});

	it("2. Quiet Dosimetry: DAP dGy*cm^2 formatted strictly under images, zero kV/mA physics clutter in doctor UI", () => {
		const code = readSrcFile("components/radiology/RadiologyReportStudioModal.tsx");

		// Telemetry legend under image
		assert.ok(code.includes('data-testid="frame-telemetry-legend"'), "Must render telemetry legend under image");
		assert.ok(code.includes("dGy*cm² [DAP]"), "Must display statutory DAP (dGy*cm^2) under image for Rospotrebnadzor");
		assert.ok(code.includes("Ratio:"), "Must calculate and display magnification Ratio %");

		// User Directive: We are not physicists, kV and mA purged from doctor UI
		assert.ok(!code.includes("0[kVp]"), "Doctor UI must not force useless kVp physics parameter");
		assert.ok(!code.includes("0[mA]"), "Doctor UI must not force useless mA physics parameter");

		// Zero screaming alarmism
		assert.ok(!code.includes("Зона радиационной опасности"), "Must not display screaming red danger zone banners");
		assert.ok(!code.includes("Использовано 100% от нормы"), "Must not block or scream annual limits before doctor");
	});

	it("3. Print Settings Dialog (Screenshot 29): Full controls for page, headers and footers", () => {
		const code = readSrcFile("components/radiology/RadiologyReportStudioModal.tsx");

		// Settings modal trigger and modal
		assert.ok(code.includes('data-testid="btn-open-print-settings"'), "Must have button to open print settings");
		assert.ok(code.includes('data-testid="print-settings-modal"'), "Must render print settings modal");

		// Page size options
		assert.ok(code.includes('btn-select-size-'), "Must allow selecting page sizes");
		assert.ok(code.includes('"14x17_film"'), "Must support 14x17 film option");
		assert.ok(code.includes('"A4"'), "Must support A4 option");

		// Orientation options
		assert.ok(code.includes('btn-select-orient-'), "Must allow selecting orientation");
		assert.ok(code.includes('"portrait"'), "Must support portrait orientation");
		assert.ok(code.includes('"landscape"'), "Must support landscape orientation");

		// Legend placement
		assert.ok(code.includes('data-testid="radio-legend-below"'), "Must allow legend placement below image");

		// Header checkboxes
		assert.ok(code.includes('data-testid="cb-header-date"'), "Header must have Date checkbox");
		assert.ok(code.includes('data-testid="cb-header-patient"'), "Header must have Patient checkbox");
		assert.ok(code.includes('data-testid="cb-header-logo"'), "Header must have Clinic Logo checkbox");

		// Footer checkboxes
		assert.ok(code.includes('data-testid="cb-footer-name"'), "Footer must have Clinic Name checkbox");
		assert.ok(code.includes('data-testid="cb-footer-phone"'), "Footer must have Phone checkbox");
		assert.ok(code.includes('data-testid="cb-footer-web"'), "Footer must have Website checkbox");
		assert.ok(code.includes('data-testid="cb-footer-address"'), "Footer must have Address checkbox");

		// Action buttons (Screenshot 29: OK and Cancel)
		assert.ok(code.includes('data-testid="btn-apply-print-settings"'), "Must have OK button");
		assert.ok(code.includes('data-testid="btn-cancel-print-settings"'), "Must have Cancel button");

		// Print trigger
		assert.ok(code.includes('data-testid="btn-execute-print"'), "Must have Print button");
	});

	it("4. RadiationSafetyRegistryModal: Quiet statutory archive without red paranoia", () => {
		const code = readSrcFile("components/radiology/RadiationSafetyRegistryModal.tsx");

		assert.ok(code.includes('data-testid="radiation-safety-registry-modal"'), "Must render registry modal");
		assert.ok(code.includes('data-testid="metric-studies-count"'), "Must display quiet studies count");
		assert.ok(code.includes('data-testid="metric-total-dose"'), "Must display total annual dose in mSv and microsieverts");
		assert.ok(code.includes('data-testid="metric-safety-status"'), "Must show safe background status");
		assert.ok(code.includes('data-testid="dose-records-table"'), "Must render clean exposure records table");

		// Statutory quick adds & exports
		assert.ok(code.includes('data-testid="btn-add-rvg-dose"'), "Must allow 1-click RVG dose recording");
		assert.ok(code.includes('data-testid="btn-export-csv"'), "Must allow CSV export for radiation journal");
		assert.ok(code.includes('data-testid="btn-print-sanpin-form"'), "Must allow official SanPiN sheet print");

		// Autonomy: zero capture blocks, zero screaming alarms
		assert.ok(!code.includes("alert-danger"), "Must not feature red danger alerts");
		assert.ok(!code.includes("disabled={true}"), "Must not block doctor buttons");
	});

	it("5. RadiationDoseSheetForm: Canonical SSOT bridge in components/radiology", () => {
		const bridgeCode = readSrcFile("components/radiology/RadiationDoseSheetForm.tsx");
		assert.ok(
			bridgeCode.includes("RadiationDoseSheetForm"),
			"components/radiology/RadiationDoseSheetForm.tsx must cleanly export RadiationDoseSheetForm",
		);

		const canonicalCode = readSrcFile("components/documents/forms/RadiationDoseSheetForm.tsx");
		assert.ok(
			canonicalCode.includes("export const RadiationDoseSheetForm"),
			"Canonical SSOT form must exist in components/documents/forms",
		);
	});

	it("6. RadiologyModule: 100% wired with Report Studio and Radiation Safety Registry", () => {
		const code = readSrcFile("components/radiology/RadiologyModule.tsx");

		// Toolbar button for Window #5 Report Studio
		assert.ok(code.includes('data-testid="btn-open-report-studio"'), "RadiologyModule toolbar must contain 'btn-open-report-studio'");
		assert.ok(code.includes("Отчет и печать"), "Toolbar button must say 'Отчет и печать'");

		// Hub launcher button
		assert.ok(code.includes('data-testid="btn-hub-report-studio"'), "RadiologyModule Hub must contain 'btn-hub-report-studio'");

		// Modal instances
		assert.ok(code.includes("<RadiologyReportStudioModal"), "RadiologyModule must render RadiologyReportStudioModal");
		assert.ok(code.includes("<RadiationSafetyRegistryModal"), "RadiologyModule must render RadiationSafetyRegistryModal");
	});
});
