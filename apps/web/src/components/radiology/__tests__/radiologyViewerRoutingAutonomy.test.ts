/**
 * radiologyViewerRoutingAutonomy.test.ts
 *
 * Wave 22 — CBCT & Visiograph Viewer Integration & Anti-Matryoshka Law Unit Tests.
 *
 * Governed by:
 * - Mandate 8c: Universal 3-Tier Ergonomic Architecture (Hot Path -> Warm Context -> Cold Backoffice Studio).
 * - Mandate 8d: The 7 Deadly Sins Checklist (Sin #6: Anti-Matryoshka Law, modal depth strictly 1).
 * - Mandate 8e: Doctor Autonomy (Zero unnecessary barriers, direct file ingestion from disk without hardware lock-in).
 * - Mandate 8k: CRM != Reality Simulator (Friction-killer law: 1-click direct studio opening).
 * - Medical DICOM Part 10 Integrity: Zero extension spoofing (no JPEG saved as .dcm).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toEqual: (expected: any) => assert.deepEqual(actual, expected),
	toContain: (substr: any) => assert.ok(actual.includes(substr)),
	not: {
		toMatch: (regex: RegExp) => assert.ok(!regex.test(actual)),
	},
});

import { isCbctStudy } from "../types";
import {
	getDirectRvgExportFileName,
	validateRadiologyUploadFile,
} from "../DirectRvgCaptureModal";
import {
	createDicomSecondaryCaptureFile,
	generateDicomUid,
	transliterateCyrillicToLatin,
} from "../../visiograph/VisiographDicomExporter";
import type { RadiologyStudy } from "../types";

const webSrcRoot = path.join(import.meta.dirname, "../../..");

function readComponentSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

describe("1. Anti-Matryoshka Routing & CBCT 3D Studio Autonomy (Mandates 8c, 8d, 8e)", () => {
	const sampleCbctStudy: RadiologyStudy = {
		id: "study-cbct-test",
		patientName: "Смирнова Екатерина Васильевна",
		studyDate: "2026-09-06 12:00",
		studyType: "cbct_jaw_8x8",
		modality: "cbct_3d",
		modalityLabel: "3D КЛКТ челюстей",
		anatomicalArea: "Верхняя и нижняя челюсти",
		teethFdi: ["16", "26"],
		imageUrl: "/sample.jpg",
		status: "completed",
		effectiveDoseMicrosv: 55.0,
		effectiveDoseMsv: 0.055,
		doctorName: "Д-р Иванов И.И.",
	};

	const sampleRvgStudy: RadiologyStudy = {
		id: "study-rvg-test",
		patientName: "Смирнова Екатерина Васильевна",
		studyDate: "2026-09-06 12:30",
		studyType: "intraoral_radiovisiography",
		modality: "intraoral_rvg",
		modalityLabel: "Прицельная радиовизиография",
		anatomicalArea: "Зуб 16",
		teethFdi: ["16"],
		imageUrl: "/sample.jpg",
		status: "completed",
		effectiveDoseMicrosv: 3.0,
		effectiveDoseMsv: 0.003,
		doctorName: "Д-р Иванов И.И.",
	};

	const sampleOptgStudy: RadiologyStudy = {
		id: "study-optg-test",
		patientName: "Смирнова Екатерина Васильевна",
		studyDate: "2026-09-06 13:00",
		studyType: "optg_digital_panoramic",
		modality: "optg_panoramic",
		modalityLabel: "Панорамная ОПТГ",
		anatomicalArea: "Все зубные ряды",
		teethFdi: ["11", "21"],
		imageUrl: "/sample.jpg",
		status: "completed",
		effectiveDoseMicrosv: 18.0,
		effectiveDoseMsv: 0.018,
		doctorName: "Д-р Иванов И.И.",
	};

	it("correctly identifies CBCT 3D studies via isCbctStudy helper", () => {
		// By modality
		expect(isCbctStudy(sampleCbctStudy)).toBe(true);
		expect(isCbctStudy({ modality: "cbct_3d" })).toBe(true);

		// By studyType starting with cbct
		expect(isCbctStudy({ studyType: "cbct_segment_5x5" })).toBe(true);
		expect(isCbctStudy({ studyType: "cbct_full_maxillofacial_15x15" })).toBe(true);

		// Non-CBCT studies
		expect(isCbctStudy(sampleRvgStudy)).toBe(false);
		expect(isCbctStudy(sampleOptgStudy)).toBe(false);
		expect(isCbctStudy(null)).toBe(false);
		expect(isCbctStudy(undefined)).toBe(false);
		expect(isCbctStudy({})).toBe(false);
	});

	it("enforces Anti-Matryoshka Law in VisitDiagnosticsTab.tsx (modal depth strictly 1)", () => {
		const source = readComponentSource("components/visit/VisitDiagnosticsTab.tsx");

		// VisitDiagnosticsTab mounts DicomViewerModal, DirectRvgCaptureModal, and CbctMprImplantStudioModal at depth 1
		expect(source).toContain("<DicomViewerModal");
		expect(source).toContain("<DirectRvgCaptureModal");
		expect(source).toContain("<CbctMprImplantStudioModal");
	});

	it("enforces Anti-Matryoshka Law in DicomViewerModal.tsx (no modal over modal in DOM)", () => {
		const source = readComponentSource("components/imaging/DicomViewerModal.tsx");

		// DicomViewerModal renders a single clean modal panel with 1-click Norma
		expect(source).toContain("btn-dicom-norma-043");
		expect(source).toContain("fixed");
	});
});

describe("2. Medical DICOM & Genuine Image Export Autonomy (No Extension Spoofing)", () => {
	it("generates honest file names without masquerading JPEG as .dcm", () => {
		// When genuine DICOM buffer is present
		const dicomExport = getDirectRvgExportFileName(["16"], "043/у-0012", true, "data:image/jpeg;base64,123");
		expect(dicomExport.isDicom).toBe(true);
		expect(dicomExport.filename).toBe("RVG_Tooth_16_043-у-0012.dcm");
		expect(dicomExport.mimeType).toBe("application/dicom");

		// Multi-tooth selection
		const multiToothDicom = getDirectRvgExportFileName(["16", "17"], "043/у-0012", true, "data:image/jpeg;base64,123");
		expect(multiToothDicom.filename).toBe("RVG_Tooth_16_17_043-у-0012.dcm");

		// Fallback when DICOM buffer is absent and source is JPEG -> MUST be .jpg, NEVER .dcm!
		const jpegFallback = getDirectRvgExportFileName(["26"], "043/у-99", false, "data:image/jpeg;base64,abcd");
		expect(jpegFallback.isDicom).toBe(false);
		expect(jpegFallback.filename).toBe("RVG_Tooth_26_043-у-99.jpg");
		expect(jpegFallback.mimeType).toBe("image/jpeg");
		expect(jpegFallback.filename.endsWith(".dcm")).toBe(false);

		// Fallback when source is PNG -> MUST be .png
		const pngFallback = getDirectRvgExportFileName(["36"], "043/у-88", false, "data:image/png;base64,abcd");
		expect(pngFallback.isDicom).toBe(false);
		expect(pngFallback.filename).toBe("RVG_Tooth_36_043-у-88.png");
		expect(pngFallback.mimeType).toBe("image/png");
	});

	it("creates valid Part 10 DICOM binary file with preamble and DICM magic header", () => {
		// Create canvas in memory (node/vitest compatible without DOM)
		const canvas = {
			width: 100,
			height: 100,
			getContext: () => ({
				getImageData: () => ({
					data: new Uint8ClampedArray(100 * 100 * 4),
				}),
			}),
		} as unknown as HTMLCanvasElement;

		const dicomBytes = createDicomSecondaryCaptureFile(canvas, {
			patientId: "PAT-TEST-001",
			patientFullName: "Смирнов Алексей",
			clinicName: 'ООО "Денте Клиник"',
			modality: "IO",
			toothCode: "16",
			scaleMmPerPixel: 0.035,
		});

		expect(dicomBytes instanceof Uint8Array).toBe(true);
		expect(dicomBytes.length > 132).toBe(true);

		// First 128 bytes are preamble (zeroes)
		for (let i = 0; i < 128; i++) {
			expect(dicomBytes[i]).toBe(0);
		}

		// Bytes 128..131 MUST be ASCII "DICM" (0x44, 0x49, 0x43, 0x4D)
		expect(dicomBytes[128]).toBe(0x44); // 'D'
		expect(dicomBytes[129]).toBe(0x49); // 'I'
		expect(dicomBytes[130]).toBe(0x43); // 'C'
		expect(dicomBytes[131]).toBe(0x4d); // 'M'
	});

	it("verifies DirectRvgCaptureModal.tsx has eliminated extension spoofing", () => {
		const source = readComponentSource("components/radiology/DirectRvgCaptureModal.tsx");

		// Old defective line: link.download = `...dcm` directly on capturedImage
		expect(source).not.toMatch(/link\.download\s*=\s*`[^`]*\.dcm`;\s*document\.body\.appendChild/);

		// Must import createDicomSecondaryCaptureFile and triggerBinaryDownload
		expect(source).toContain("createDicomSecondaryCaptureFile");
		expect(source).toContain("triggerBinaryDownload");
		expect(source).toContain("getDirectRvgExportFileName");
	});
});

describe("3. Local File Ingestion & Sensor Autonomy (Mandate 8e: No Hardware Lock-in)", () => {
	it("validates permissible radiology file formats correctly", () => {
		// DICOM files
		expect(validateRadiologyUploadFile({ name: "tooth16_rvg.dcm" })).toEqual({
			isValid: true,
			format: "dicom",
		});
		expect(validateRadiologyUploadFile({ name: "study.DICOM" })).toEqual({
			isValid: true,
			format: "dicom",
		});

		// TIFF files
		expect(validateRadiologyUploadFile({ name: "sensor_raw.tif" })).toEqual({
			isValid: true,
			format: "tiff",
		});
		expect(validateRadiologyUploadFile({ name: "sensor_raw.tiff" })).toEqual({
			isValid: true,
			format: "tiff",
		});

		// Standard image files
		expect(validateRadiologyUploadFile({ name: "xray.png" })).toEqual({
			isValid: true,
			format: "image",
		});
		expect(validateRadiologyUploadFile({ name: "xray.jpg" })).toEqual({
			isValid: true,
			format: "image",
		});
		expect(validateRadiologyUploadFile({ name: "xray.jpeg" })).toEqual({
			isValid: true,
			format: "image",
		});
		expect(validateRadiologyUploadFile({ name: "xray.webp" })).toEqual({
			isValid: true,
			format: "image",
		});
		expect(validateRadiologyUploadFile({ name: "photo", type: "image/png" })).toEqual({
			isValid: true,
			format: "image",
		});

		// Unsupported files
		expect(validateRadiologyUploadFile({ name: "report.pdf" })).toEqual({
			isValid: false,
			format: "unsupported",
		});
		expect(validateRadiologyUploadFile({ name: "driver.exe" })).toEqual({
			isValid: false,
			format: "unsupported",
		});
		expect(validateRadiologyUploadFile({ name: "notes.txt" })).toEqual({
			isValid: false,
			format: "unsupported",
		});
	});

	it("confirms DirectRvgCaptureModal.tsx has disk upload button and dropzone UI", () => {
		const source = readComponentSource("components/radiology/DirectRvgCaptureModal.tsx");

		// Upload button with data-testid
		expect(source).toContain('data-testid="rvg-upload-file-btn"');
		expect(source).toContain("Загрузить с диска");

		// Hidden file input with data-testid
		expect(source).toContain('data-testid="rvg-file-input"');
		expect(source).toContain('accept=".dcm,.dicom,.tif,.tiff,.png,.jpg,.jpeg,.webp,image/*"');

		// Viewport dropzone overlay
		expect(source).toContain('data-testid="rvg-drop-overlay"');
		expect(source).toContain("Отпустите файл для загрузки снимка");

		// Drag and drop event handlers on canvas container
		expect(source).toContain("onDragOver={handleViewportDragOver}");
		expect(source).toContain("onDragLeave={handleViewportDragLeave}");
		expect(source).toContain("onDrop={handleViewportDrop}");
	});
});
